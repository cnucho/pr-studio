import { createClient } from "@supabase/supabase-js";
import { parseVideoProject } from "./schema";
import { validateApproval } from "./lifecycle";
import { sanitizeDownloadFilename, storagePathBelongsToRender } from "./policy";

function db() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Server persistence is not configured");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

export class AuthorizationError extends Error {}
export class NotFoundError extends Error {}

async function ownerProject(projectId: string, userId: string) {
  const { data, error } = await db()
    .from("video_projects")
    .select("*")
    .eq("id", projectId)
    .eq("owner_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new NotFoundError("Project not found");
  return data;
}

export async function createProject(userId: string, title: string) {
  const cleanTitle = title.trim();
  if (!cleanTitle) throw new Error("Project title is required");
  const { data, error } = await db()
    .from("video_projects")
    .insert({ owner_id: userId, title: cleanTitle, status: "draft", current_revision: 1 })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export function readProject(userId: string, projectId: string) {
  return ownerProject(projectId, userId);
}

export async function createRevision(userId: string, projectId: string, input: unknown) {
  await ownerProject(projectId, userId);
  const spec = parseVideoProject(input);
  if (spec.id !== projectId) throw new Error("Revision project ID mismatch");
  const client = db();
  const { data, error } = await client
    .from("video_project_revisions")
    .insert({
      project_id: projectId,
      revision: spec.revision,
      schema_version: spec.schemaVersion,
      spec,
      created_by: userId,
    })
    .select("*")
    .single();
  if (error) throw error;
  const { error: pointerError } = await client
    .from("video_projects")
    .update({ current_revision: spec.revision, updated_at: new Date().toISOString() })
    .eq("id", projectId)
    .eq("owner_id", userId);
  if (pointerError) throw pointerError;
  return data;
}

export async function listRevisions(userId: string, projectId: string) {
  await ownerProject(projectId, userId);
  const { data, error } = await db()
    .from("video_project_revisions")
    .select("project_id,revision,schema_version,created_by,created_at")
    .eq("project_id", projectId)
    .order("revision");
  if (error) throw error;
  return data;
}

export async function readRevision(userId: string, projectId: string, revision: number) {
  await ownerProject(projectId, userId);
  const { data, error } = await db()
    .from("video_project_revisions")
    .select("*")
    .eq("project_id", projectId)
    .eq("revision", revision)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new NotFoundError("Revision not found");
  return data;
}

export async function submitRender(
  userId: string,
  projectId: string,
  revision: number,
  provider: "creatomate" | "local",
) {
  await readRevision(userId, projectId, revision);
  const client = db();
  const { data: render, error } = await client
    .from("video_render_jobs")
    .insert({ project_id: projectId, revision, provider, status: "queued", attempt_count: 0 })
    .select("*")
    .single();
  if (error) throw error;
  const { error: attemptError } = await client
    .from("video_render_attempts")
    .insert({ render_id: render.id, attempt: 1, status: "queued" });
  if (attemptError) throw attemptError;
  return render;
}

export async function readRender(userId: string, renderId: string) {
  const { data, error } = await db()
    .from("video_render_jobs")
    .select("*")
    .eq("id", renderId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new NotFoundError("Render not found");
  await ownerProject(data.project_id, userId);
  return data;
}

export async function listRenderAttempts(userId: string, renderId: string) {
  await readRender(userId, renderId);
  const { data, error } = await db()
    .from("video_render_attempts")
    .select("*")
    .eq("render_id", renderId)
    .order("attempt");
  if (error) throw error;
  return data;
}

export async function readValidation(userId: string, renderId: string) {
  await readRender(userId, renderId);
  const { data, error } = await db()
    .from("video_validation_results")
    .select("*")
    .eq("render_id", renderId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new NotFoundError("Validation result not found");
  return data;
}

export async function reviewRender(
  userId: string,
  renderId: string,
  decision: "approved" | "rejected",
  reason?: string,
) {
  const render = await readRender(userId, renderId);
  const review = validateApproval(render.status, decision, reason);
  if (decision === "approved") {
    const validation = await readValidation(userId, renderId);
    if (!validation.passed) throw new Error("Invalid output cannot be approved");
  }
  const client = db();
  const { data: history, error } = await client
    .from("video_approval_history")
    .insert({
      render_id: renderId,
      project_id: render.project_id,
      revision: render.revision,
      decision: review.decision,
      reason: review.reason,
      actor_id: userId,
    })
    .select("*")
    .single();
  if (error) throw error;
  const { data: updated, error: updateError } = await client
    .from("video_render_jobs")
    .update({ status: decision, approval_state: decision, updated_at: new Date().toISOString() })
    .eq("id", renderId)
    .eq("status", "awaiting_approval")
    .select("id")
    .maybeSingle();
  if (updateError || !updated) throw updateError ?? new Error("Render review conflict");
  return history;
}

export async function downloadRender(userId: string, renderId: string) {
  const render = await readRender(userId, renderId);
  if (!render.output_uri || !storagePathBelongsToRender(render.output_uri, render.project_id, render.id)) {
    throw new NotFoundError("Private output not found");
  }
  const bucket = process.env.VIDEO_AGENT_STORAGE_BUCKET ?? "video-agent-results";
  const { data, error } = await db().storage.from(bucket).download(render.output_uri);
  if (error) throw error;
  const bytes = new Uint8Array(await data.arrayBuffer());
  return {
    bytes,
    filename: sanitizeDownloadFilename(`pr-studio-${render.id}`),
    contentType: data.type || "video/mp4",
  };
}
