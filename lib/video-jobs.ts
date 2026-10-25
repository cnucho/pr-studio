import { createClient } from "@supabase/supabase-js";
import type { VideoAgentPlan, VideoAgentResult } from "@/lib/video-agent";

export type VideoAgentJobStatus = "queued" | "running" | "completed" | "failed";

export type VideoAgentJob = {
  id: string;
  brief: string;
  appUrl: string;
  plan: VideoAgentPlan;
  status: VideoAgentJobStatus;
  attempts: number;
  maxAttempts: number;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  output?: VideoAgentResult;
};

const bucket = process.env.VIDEO_AGENT_STORAGE_BUCKET ?? "video-agent-results";

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
    plan: row.plan as VideoAgentPlan, status: row.status as VideoAgentJobStatus,
    attempts: Number(row.attempts ?? 0), maxAttempts: Number(row.max_attempts ?? 3),
    createdAt: String(row.created_at), updatedAt: String(row.updated_at),
    startedAt: row.started_at ? String(row.started_at) : undefined,
    completedAt: row.completed_at ? String(row.completed_at) : undefined,
    error: row.error ? String(row.error) : undefined,
    output: row.output as VideoAgentResult | undefined,
  };
}

export function videoJobOwnedBy(plan: unknown, userId: string) {
  return Boolean(plan && typeof plan === "object" && (plan as Record<string, unknown>).ownerId === userId);
}

export async function readVideoJob(jobId: string, userId: string): Promise<VideoAgentJob> {
  const { data, error } = await adminClient().from("video_agent_jobs").select("*").eq("id", jobId).single();
  if (error) throw error;
  if (!videoJobOwnedBy(data.plan, userId)) throw new Error("Video job not found.");
  return mapJob(data);
}

export async function downloadQueuedVideo(jobId: string, userId: string) {
  const job = await readVideoJob(jobId, userId);
  const storagePath = (job.output?.video as VideoAgentResult["video"] & { storagePath?: string })?.storagePath;
  if (!storagePath || job.status !== "completed") throw new Error("Completed video not found.");
  const { data, error } = await adminClient().storage.from(bucket).download(storagePath);
  if (error) throw error;
  const bytes = new Uint8Array(await data.arrayBuffer());
  return { bytes, size: bytes.byteLength, generatedAt: job.output!.video.generatedAt };
}

export async function createVideoJob({ brief, appUrl, plan, userId }: { brief: string; appUrl: string; plan: VideoAgentPlan; userId: string }) {
  const { data, error } = await adminClient().from("video_agent_jobs")
    .insert({ brief, app_url: appUrl, plan: { ...plan, ownerId: userId } }).select("*").single();
  if (error) throw error;
  return mapJob(data);
}

export function shouldQueueVideoJobs() {
  if (process.env.VIDEO_AGENT_EXECUTION === "inline") return false;
  if (process.env.VIDEO_AGENT_EXECUTION === "queue") return true;
  return Boolean(process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PROJECT_ID);
}
