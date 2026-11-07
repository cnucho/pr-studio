import { readFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

const root = process.cwd();
const finalVideoPath = path.join(root, "out", "pr-studio-final.mp4");
const pollIntervalMs = Number(process.env.VIDEO_AGENT_WORKER_POLL_MS ?? 5000);
const bucket = process.env.VIDEO_AGENT_STORAGE_BUCKET ?? "video-agent-results";
const workerId = process.env.VIDEO_AGENT_WORKER_ID ?? `${os.hostname()}-${process.pid}`;
const once = process.argv.includes("--once");
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SECRET_KEY are required.");
const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

function now() { return new Date().toISOString(); }

function run(command, args, env) {
  const startedAt = Date.now();
  const result = spawnSync(command, args, { cwd: root, env, encoding: "utf8", shell: false, windowsHide: true });
  const output = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
  return { title: command, command: [command, ...args].join(" "), status: result.status === 0 ? "completed" : "failed",
    durationMs: Date.now() - startedAt, output: output.length > 1400 ? `...${output.slice(-1400)}` : output };
}

async function claimJob() {
  const { data, error } = await supabase.rpc("claim_video_agent_job", { worker_id: workerId });
  if (error) throw error;
  return data?.[0] ?? null;
}

async function updateClaimedJob(id, values) {
  const { error } = await supabase.from("video_agent_jobs").update(values).eq("id", id).eq("locked_by", workerId);
  if (error) throw error;
}

async function processJob(job) {
  const env = { ...process.env, PR_STRATEGY_APP_URL: job.app_url };
  const runSteps = [];
  try {
    for (const [title, command, args] of [
      ["화면 캡처", "node", ["scripts/capture-storyboard.mjs"]],
      ["MP4 렌더링", "node", ["scripts/render-video.mjs"]],
      ["영상 검증", "ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height:format=duration,size", "-of", "json", finalVideoPath]],
    ]) {
      const step = { ...run(command, args, env), title };
      runSteps.push(step);
      if (step.status === "failed") throw new Error(step.output || step.command);
    }

    const metadata = JSON.parse(runSteps.at(-1).output);
    const storagePath = `${job.id}/pr-studio-final.mp4`;
    const video = await readFile(finalVideoPath);
    const { error: uploadError } = await supabase.storage.from(bucket).upload(storagePath, video, {
      contentType: "video/mp4", upsert: true,
    });
    if (uploadError) throw uploadError;

    const completedAt = now();
    await updateClaimedJob(job.id, {
      status: "completed", completed_at: completedAt, updated_at: completedAt, locked_at: null, locked_by: null, error: null,
      output: { plan: job.plan, runSteps, video: { storagePath, downloadUrl: `/api/video-agent/file?jobId=${encodeURIComponent(job.id)}`,
        width: metadata.streams?.[0]?.width ?? 0, height: metadata.streams?.[0]?.height ?? 0,
        duration: Number(metadata.format?.duration ?? 0), size: Number(metadata.format?.size ?? 0), generatedAt: completedAt } },
    });
    console.log(`completed ${job.id}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const exhausted = Number(job.attempts) >= Number(job.max_attempts);
    const timestamp = now();
    await updateClaimedJob(job.id, exhausted
      ? { status: "failed", error: message, completed_at: timestamp, updated_at: timestamp, locked_at: null, locked_by: null }
      : { status: "queued", error: message, available_at: new Date(Date.now() + Math.min(300, 15 * 2 ** Number(job.attempts)) * 1000).toISOString(),
          updated_at: timestamp, locked_at: null, locked_by: null });
    console.error(`${exhausted ? "failed" : "retrying"} ${job.id}: ${message}`);
  }
}

do {
  const job = await claimJob();
  if (job) await processJob(job);
  if (once) break;
  if (!job) await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
} while (true);
