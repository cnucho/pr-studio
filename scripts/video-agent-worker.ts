import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import { createVideoAgentPlan, type VideoAgentPlan, type VideoAgentResult, type VideoAgentRunStep } from "../lib/video-agent";
import { collectPlanningOrders } from "../lib/video-collection";
import { videoArtifactPaths } from "../lib/video-artifacts";
import { VIDEO_ANALYSIS_LIMITS } from "../lib/video-analysis";
import { trackForBrief } from "../lib/video-beats";
import { runPlanningLoop } from "../lib/video-orchestrator";
import { videoBriefSchema, type CollectionReport, type VideoBrief } from "../lib/video-planning";
import { resolveBinary } from "../lib/video-runtime";

type JobRow = {
  id: string;
  brief: string;
  request?: Partial<VideoBrief> & { ownerId?: string };
  app_url: string;
  plan?: VideoAgentPlan | null;
  attempts: number;
  max_attempts: number;
};

function planningBrief(job: JobRow): VideoBrief {
  const purpose = job.request?.purpose?.trim() || job.brief;
  return videoBriefSchema.parse({
    purpose,
    targetAudience: job.request?.targetAudience?.trim() || "홍보 콘텐츠의 대상 시청자",
    track: job.request?.track ?? trackForBrief(purpose),
    targetDurationSec: job.request?.targetDurationSec,
    outline: job.request?.outline?.trim() || undefined,
    sourceVideoId: job.request?.sourceVideoId?.trim() || undefined,
  });
}

type StoredRound = {
  round: number;
  plan: VideoAgentPlan;
  collection_reports: CollectionReport[];
};

const root = process.cwd();
const pollIntervalMs = Number(process.env.VIDEO_AGENT_WORKER_POLL_MS ?? 5000);
const heartbeatIntervalMs = Number(process.env.VIDEO_AGENT_WORKER_HEARTBEAT_MS ?? 60_000);
const bucket = process.env.VIDEO_AGENT_STORAGE_BUCKET ?? "video-agent-results";
const sourceBucket = process.env.VIDEO_AGENT_SOURCE_BUCKET ?? "video-agent-sources";
const workerId = process.env.VIDEO_AGENT_WORKER_ID ?? `${os.hostname()}-${process.pid}`;
const once = process.argv.includes("--once");
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SECRET_KEY are required.");

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

function now() {
  return new Date().toISOString();
}

function run(command: string, args: string[], env: NodeJS.ProcessEnv): Promise<VideoAgentRunStep> {
  const startedAt = Date.now();
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: root,
      env,
      shell: false,
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });
    child.on("error", (error) => {
      stderr += `\n${error.message}`;
    });
    child.on("close", (code) => {
      const output = [stdout, stderr].filter(Boolean).join("\n").trim();
      resolve({
        title: command,
        command: [command, ...args].join(" "),
        status: code === 0 ? "completed" : "failed",
        durationMs: Date.now() - startedAt,
        output: output.length > 1400 ? `...${output.slice(-1400)}` : output,
      });
    });
  });
}

async function claimJob(): Promise<JobRow | null> {
  const { data, error } = await supabase.rpc("claim_video_agent_job", { worker_id: workerId });
  if (error) throw error;
  return (data?.[0] as JobRow | undefined) ?? null;
}

async function updateClaimedJob(id: string, values: Record<string, unknown>) {
  const { data, error } = await supabase
    .from("video_agent_jobs")
    .update(values)
    .eq("id", id)
    .eq("locked_by", workerId)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error(`Video job lease lost: ${id}`);
}

async function loadPlanningRounds(jobId: string): Promise<StoredRound[]> {
  const { data, error } = await supabase
    .from("video_agent_planning_rounds")
    .select("round,plan,collection_reports")
    .eq("job_id", jobId)
    .order("round", { ascending: true });
  if (error) throw error;
  return (data ?? []) as StoredRound[];
}

async function savePlanningRound(jobId: string, plan: VideoAgentPlan, reports: CollectionReport[]) {
  const timestamp = now();
  const { error } = await supabase.from("video_agent_planning_rounds").upsert(
    {
      job_id: jobId,
      round: plan.round,
      plan,
      collection_reports: reports,
      updated_at: timestamp,
    },
    { onConflict: "job_id,round" },
  );
  if (error) throw error;
}

async function downloadSourceVideo(job: JobRow, brief: VideoBrief, workDir: string) {
  const sourceVideoId = brief.sourceVideoId;
  if (!sourceVideoId) return undefined;
  const ownerId = job.request?.ownerId;
  if (!ownerId || !sourceVideoId.startsWith(`${ownerId}/`) || !/^[0-9a-f-]+\/[0-9a-f-]+\.mp4$/iu.test(sourceVideoId)) {
    throw new Error("기존 MP4 식별자가 작업 소유자와 일치하지 않습니다.");
  }
  const { data, error } = await supabase.storage.from(sourceBucket).download(sourceVideoId);
  if (error) throw error;
  if (data.size <= 0 || data.size > VIDEO_ANALYSIS_LIMITS.maxBytes) throw new Error("기존 MP4 크기 제한을 초과했습니다.");
  const sourcePath = path.join(workDir, "source", "input.mp4");
  await mkdir(path.dirname(sourcePath), { recursive: true });
  await writeFile(sourcePath, new Uint8Array(await data.arrayBuffer()));
  return sourcePath;
}

async function finishWithoutVideo(job: JobRow, plan: VideoAgentPlan) {
  const completedAt = now();
  const output: VideoAgentResult = {
    outcome: "plan_exhausted",
    plan,
    runSteps: [],
  };
  await updateClaimedJob(job.id, {
    status: "completed",
    phase: "completed",
    outcome: "plan_exhausted",
    final_decision: plan.decision,
    plan,
    manifest: null,
    output,
    completed_at: completedAt,
    updated_at: completedAt,
    locked_at: null,
    locked_by: null,
    error: null,
  });
  console.log(`plan_exhausted ${job.id}`);
}

async function planJob(job: JobRow): Promise<VideoAgentPlan | null> {
  if (job.plan?.productionReady && job.plan.manifest?.beats?.length) return job.plan;

  const brief = planningBrief(job);
  const artifact = videoArtifactPaths(root, job.id);
  const sourceVideoPath = await downloadSourceVideo(job, brief, artifact.workDir);
  const storedRounds = await loadPlanningRounds(job.id);
  const previousPlans = storedRounds.map((item) => item.plan);
  const result = await runPlanningLoop({
    previousPlans,
    collectionReports: storedRounds.at(-1)?.collection_reports ?? [],
    dependencies: {
      createPlan: async ({ round, previousPlans: plans, collectionReports }) => {
        await updateClaimedJob(job.id, {
          phase: "planning",
          planning_round: round,
          updated_at: now(),
        });
        return createVideoAgentPlan(brief, { round, previousPlans: plans, collectionReports });
      },
      collect: async (orders) => {
        await updateClaimedJob(job.id, { phase: "collecting", updated_at: now() });
        return collectPlanningOrders(orders, {
          brief: brief.purpose,
          appUrl: job.app_url,
          sourceVideoPath,
          analysisWorkDir: artifact.workDir,
          allowedSourceRoot: artifact.workDir,
        });
      },
      saveRound: async (plan, reports) => {
        await savePlanningRound(job.id, plan, reports);
        await updateClaimedJob(job.id, {
          planning_round: plan.round,
          final_decision: plan.decision,
          plan,
          manifest: plan.manifest ?? null,
          artifact_prefix: job.id,
          updated_at: now(),
        });
      },
    },
  });

  if (result.outcome === "plan_exhausted") {
    await finishWithoutVideo(job, result.plan);
    return null;
  }

  await updateClaimedJob(job.id, {
    phase: "producing",
    manifest: result.plan.manifest,
    updated_at: now(),
  });
  return result.plan;
}

async function produceVideo(job: JobRow, plan: VideoAgentPlan) {
  if (!plan.manifest?.beats?.length) throw new Error("제작이 승인된 2.0 manifest가 없습니다.");

  const env = { ...process.env, PR_STRATEGY_APP_URL: job.app_url };
  const runSteps: VideoAgentRunStep[] = [];
  const { workDir, manifestPath, finalVideoPath, reviewPath } = videoArtifactPaths(root, job.id);
  await mkdir(path.dirname(finalVideoPath), { recursive: true });
  await writeFile(manifestPath, JSON.stringify(plan.manifest, null, 2));
  const ffprobe = resolveBinary("ffprobe", env);

  for (const [title, command, args] of [
    ["동작 녹화", "node", ["scripts/capture-video-v2.mjs", "--manifest", manifestPath, "--work-dir", workDir]],
    ["MP4 렌더링", "node", ["scripts/render-video-v2.mjs", "--manifest", manifestPath, "--work-dir", workDir, "--output", finalVideoPath]],
    ["프레임 검토", "node", ["scripts/review-video-v2.mjs", "--manifest", manifestPath, "--work-dir", workDir, "--video", finalVideoPath, "--review", reviewPath]],
    [
      "영상 검증",
      ffprobe,
      ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height:format=duration,size", "-of", "json", finalVideoPath],
    ],
  ] as const) {
    await updateClaimedJob(job.id, {
      phase: title === "프레임 검토" || title === "영상 검증" ? "reviewing" : "producing",
      updated_at: now(),
    });
    const step = { ...await run(command, [...args], env), title };
    runSteps.push(step);
    if (step.status === "failed") throw new Error(step.output || step.command);
  }

  const metadata = JSON.parse(runSteps.at(-1)?.output ?? "{}") as {
    streams?: Array<{ width?: number; height?: number }>;
    format?: { duration?: string; size?: string };
  };
  const storagePath = `${job.id}/pr-studio-final.mp4`;
  const video = await readFile(finalVideoPath);
  const { error: uploadError } = await supabase.storage.from(bucket).upload(storagePath, video, {
    contentType: "video/mp4",
    upsert: true,
  });
  if (uploadError) throw uploadError;

  const completedAt = now();
  const output: VideoAgentResult = {
    outcome: "produced",
    plan,
    runSteps,
    video: {
      path: finalVideoPath,
      storagePath,
      downloadUrl: `/api/video-agent/file?jobId=${encodeURIComponent(job.id)}`,
      width: metadata.streams?.[0]?.width ?? 0,
      height: metadata.streams?.[0]?.height ?? 0,
      duration: Number(metadata.format?.duration ?? 0),
      size: Number(metadata.format?.size ?? 0),
      generatedAt: completedAt,
    },
  };
  await updateClaimedJob(job.id, {
    status: "completed",
    phase: "completed",
    outcome: "produced",
    completed_at: completedAt,
    updated_at: completedAt,
    locked_at: null,
    locked_by: null,
    error: null,
    output,
  });
  console.log(`completed ${job.id}`);
}

async function processJob(job: JobRow) {
  const heartbeat = setInterval(() => {
    void updateClaimedJob(job.id, { locked_at: now(), updated_at: now() }).catch((error: unknown) => {
      console.error(`heartbeat failed ${job.id}: ${error instanceof Error ? error.message : String(error)}`);
    });
  }, heartbeatIntervalMs);
  heartbeat.unref();

  try {
    const plan = await planJob(job);
    if (plan) await produceVideo(job, plan);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const exhausted = Number(job.attempts) >= Number(job.max_attempts);
    const timestamp = now();
    await updateClaimedJob(
      job.id,
      exhausted
        ? {
            status: "failed",
            error: message,
            completed_at: timestamp,
            updated_at: timestamp,
            locked_at: null,
            locked_by: null,
          }
        : {
            status: "queued",
            error: message,
            available_at: new Date(Date.now() + Math.min(300, 15 * 2 ** Number(job.attempts)) * 1000).toISOString(),
            updated_at: timestamp,
            locked_at: null,
            locked_by: null,
          },
    );
    console.error(`${exhausted ? "failed" : "retrying"} ${job.id}: ${message}`);
  } finally {
    clearInterval(heartbeat);
  }
}

async function main() {
  do {
    const job = await claimJob();
    if (job) await processJob(job);
    if (once) break;
    if (!job) await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  } while (true);
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
