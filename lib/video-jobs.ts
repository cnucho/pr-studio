import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import type { VideoAgentPlan, VideoAgentResult } from "@/lib/video-agent";
import type { CollectionReport, VideoBrief } from "@/lib/video-planning";
import { VIDEO_ANALYSIS_LIMITS } from "./video-analysis";

export type VideoAgentJobStatus = "queued" | "running" | "completed" | "failed";
export type VideoAgentJobPhase = "queued" | "planning" | "collecting" | "producing" | "reviewing" | "completed";
export type VideoAgentJobOutcome = "produced" | "plan_exhausted";

export type VideoAgentJobRequest = VideoBrief & {
  ownerId: string;
};

export type VideoAgentPlanningRoundRecord = {
  round: 1 | 2 | 3;
  plan: VideoAgentPlan;
  collectionReports: CollectionReport[];
  createdAt: string;
  updatedAt: string;
};

export type VideoAgentJob = {
  id: string;
  brief: string;
  appUrl: string;
  request: VideoAgentJobRequest;
  plan?: VideoAgentPlan;
  status: VideoAgentJobStatus;
  phase: VideoAgentJobPhase;
  outcome?: VideoAgentJobOutcome;
  planningRound: number;
  finalDecision?: "collect" | "produce";
  artifactPrefix?: string;
  attempts: number;
  maxAttempts: number;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  output?: VideoAgentResult;
  planningRounds: VideoAgentPlanningRoundRecord[];
};

const bucket = process.env.VIDEO_AGENT_STORAGE_BUCKET ?? "video-agent-results";
const sourceBucket = process.env.VIDEO_AGENT_SOURCE_BUCKET ?? "video-agent-sources";

function adminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SECRET_KEY are required for queued video jobs.");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

function mapJob(row: Record<string, unknown>): VideoAgentJob {
  return {
    id: String(row.id), brief: String(row.brief), appUrl: String(row.app_url),
    request: row.request as VideoAgentJobRequest,
    plan: row.plan ? row.plan as VideoAgentPlan : undefined,
    status: row.status as VideoAgentJobStatus,
    phase: (row.phase ?? "queued") as VideoAgentJobPhase,
    outcome: row.outcome ? row.outcome as VideoAgentJobOutcome : undefined,
    planningRound: Number(row.planning_round ?? 0),
    finalDecision: row.final_decision ? row.final_decision as "collect" | "produce" : undefined,
    artifactPrefix: row.artifact_prefix ? String(row.artifact_prefix) : undefined,
    attempts: Number(row.attempts ?? 0), maxAttempts: Number(row.max_attempts ?? 3),
    createdAt: String(row.created_at), updatedAt: String(row.updated_at),
    startedAt: row.started_at ? String(row.started_at) : undefined,
    completedAt: row.completed_at ? String(row.completed_at) : undefined,
    error: row.error ? String(row.error) : undefined,
    output: row.output as VideoAgentResult | undefined,
    planningRounds: [],
  };
}

export function videoJobOwnedBy(request: unknown, plan: unknown, userId: string) {
  const requestOwner = request && typeof request === "object" ? (request as Record<string, unknown>).ownerId : undefined;
  const legacyPlanOwner = plan && typeof plan === "object" ? (plan as Record<string, unknown>).ownerId : undefined;
  return requestOwner === userId || legacyPlanOwner === userId;
}

export async function readVideoJob(jobId: string, userId: string): Promise<VideoAgentJob> {
  const client = adminClient();
  const { data, error } = await client.from("video_agent_jobs").select("*").eq("id", jobId).single();
  if (error) throw error;
  if (!videoJobOwnedBy(data.request, data.plan, userId)) throw new Error("Video job not found.");
  const { data: rounds, error: roundsError } = await client
    .from("video_agent_planning_rounds")
    .select("round,plan,collection_reports,created_at,updated_at")
    .eq("job_id", jobId)
    .order("round", { ascending: true });
  if (roundsError) throw roundsError;
  return {
    ...mapJob(data),
    planningRounds: (rounds ?? []).map((row) => ({
      round: Number(row.round) as 1 | 2 | 3,
      plan: row.plan as VideoAgentPlan,
      collectionReports: (row.collection_reports ?? []) as CollectionReport[],
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    })),
  };
}

export async function downloadQueuedVideo(jobId: string, userId: string) {
  const job = await readVideoJob(jobId, userId);
  const output = job.output;
  const video = output?.outcome === "produced" ? output.video : undefined;
  const storagePath = video?.storagePath;
  if (!storagePath || !video || job.status !== "completed") throw new Error("Completed video not found.");
  const { data, error } = await adminClient().storage.from(bucket).download(storagePath);
  if (error) throw error;
  const bytes = new Uint8Array(await data.arrayBuffer());
  return { bytes, size: bytes.byteLength, generatedAt: video.generatedAt };
}

export async function createVideoJob({ brief, appUrl, userId }: { brief: VideoBrief; appUrl: string; userId: string }) {
  const { data, error } = await adminClient().from("video_agent_jobs")
    .insert({
      brief: brief.purpose,
      app_url: appUrl,
      request: { ...brief, ownerId: userId },
      phase: "queued",
    })
    .select("*")
    .single();
  if (error) throw error;
  return mapJob(data);
}

export async function uploadSourceVideo({ bytes, userId }: { bytes: Uint8Array; userId: string }) {
  if (bytes.byteLength <= 0 || bytes.byteLength > VIDEO_ANALYSIS_LIMITS.maxBytes) {
    throw new Error(`MP4는 ${VIDEO_ANALYSIS_LIMITS.maxBytes}바이트 이하여야 합니다.`);
  }
  if (Buffer.from(bytes.subarray(4, 8)).toString("ascii") !== "ftyp") throw new Error("유효한 MP4 파일이 아닙니다.");
  const sourceVideoId = `${userId}/${randomUUID()}.mp4`;
  const { error } = await adminClient().storage.from(sourceBucket).upload(sourceVideoId, bytes, {
    contentType: "video/mp4",
    upsert: false,
  });
  if (error) throw error;
  return { sourceVideoId, size: bytes.byteLength };
}

export function shouldQueueVideoJobs() {
  if (process.env.VIDEO_AGENT_EXECUTION === "inline") return false;
  if (process.env.VIDEO_AGENT_EXECUTION === "queue") return true;
  return Boolean(process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PROJECT_ID);
}
