import { createHash, randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import ffmpegPath from "ffmpeg-static";
import ffprobe from "ffprobe-static";

const required = [
  "SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SECRET_KEY", "CREATOMATE_API_KEY",
  "CREATOMATE_TEMPLATE_ID", "CREATOMATE_WEBHOOK_SECRET", "WEBHOOK_BASE_URL",
];
for (const name of required) if (!process.env[name]) throw new Error(`${name} is required`);

const baseUrl = process.env.WEBHOOK_BASE_URL.replace(/\/$/, "");
const service = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const stamp = new Date().toISOString().replace(/[-:.TZ]/g, "");
const password = `Phase1B-${randomUUID()}-Aa1!`;
const evidence = { runId: randomUUID(), startedAt: new Date().toISOString(), checks: {} };
const temp = await mkdtemp(join(tmpdir(), "pr-studio-phase1b-"));

function digest(value) { return createHash("sha256").update(value).digest("hex"); }
function check(name, passed, detail = {}) {
  evidence.checks[name] = { passed, ...detail };
  if (!passed) throw new Error(`${name} failed`);
}
async function command(bin, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { windowsHide: true });
    let stdout = "", stderr = "";
    child.stdout.on("data", (chunk) => stdout += chunk);
    child.stderr.on("data", (chunk) => stderr += chunk);
    child.on("error", reject);
    child.on("close", (code) => code === 0 ? resolve(stdout) : reject(new Error(stderr || `${bin} exited ${code}`)));
  });
}
async function api(path, token, init = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}), ...init.headers },
  });
  const body = await response.json().catch(() => null);
  return { status: response.status, body };
}
async function signIn(email) {
  const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session) throw error ?? new Error("No session");
  return data.session.access_token;
}
function spec(projectId, userId, revision, changed = false) {
  const now = new Date().toISOString();
  return {
    schemaVersion: 1, id: projectId, revision, title: "Phase 1B staging evidence",
    description: changed ? "Immutable revision two" : "Immutable revision one", owner: userId,
    sourceBrief: "Operational evidence only", status: "active", approvalState: "unreviewed",
    createdAt: now, updatedAt: now,
    format: { kind: "product-demo", width: 1280, height: 720, aspectRatio: "16:9", frameRate: 30, targetDuration: 11.5, outputFormat: "mp4", language: "en", safeArea: { top: 24, right: 24, bottom: 24, left: 24 } },
    scenes: [
      { id: "scene-1", order: 0, start: 0, duration: 5.5, transitionOut: "slide", narrationIds: ["narration-1"], captionTrackIds: [], onScreenText: [{ text: changed ? "PR Studio: revision two" : "PR Studio: revision one" }], assetIds: ["visual-1"], bRollAssetIds: [] },
      { id: "scene-2", order: 1, start: 5.5, duration: 6, transitionIn: "slide", narrationIds: ["narration-1"], captionTrackIds: [], onScreenText: [{ text: "Create and automate video" }], assetIds: ["visual-1"], bRollAssetIds: [] },
    ],
    narration: [{ id: "narration-1", provider: "template-audio", voiceId: "template", language: "en", locale: "en-US", text: "PR Studio operational evidence", pronunciationOverrides: {}, speed: 1, timing: [], estimatedCost: 0, actualCost: null, requestMetadata: {} }],
    captionTracks: [], brand: { templateId: process.env.CREATOMATE_TEMPLATE_ID, logoAssetIds: [], fonts: [], colors: [], layoutRefs: [] },
    assets: [{ id: "visual-1", type: "video", uri: "creatomate-template-default", source: "Creatomate Quick Promo template", licenseStatus: "approved", permittedUsage: ["staging-test"], createdAt: now }],
    thumbnails: [], youtube: { title: "Disabled", description: "", tags: [], language: "en", privacy: "private", captionTrackIds: [], audience: "unspecified" },
    providerConfig: { creatomateTemplateId: process.env.CREATOMATE_TEMPLATE_ID },
  };
}
async function insert(table, value) {
  const { data, error } = await service.from(table).insert(value).select("*").single();
  if (error) throw error;
  return data;
}
async function update(table, id, value) {
  const { data, error } = await service.from(table).update(value).eq("id", id).select("*").single();
  if (error) throw error;
  return data;
}
async function probe(path, expectedDuration = 11.5) {
  const raw = JSON.parse(await command(ffprobe.path, ["-v", "error", "-show_streams", "-show_format", "-of", "json", path]));
  const bytes = await readFile(path);
  const video = raw.streams.find((s) => s.codec_type === "video");
  const audio = raw.streams.find((s) => s.codec_type === "audio");
  const duration = Number(raw.format.duration);
  const checks = { nonzero: bytes.length > 0, video: Boolean(video), audio: Boolean(audio), dimensions: video?.width === 1280 && video?.height === 720, duration: Math.abs(duration - expectedDuration) <= 1.5 };
  return { passed: Object.values(checks).every(Boolean), checks, evidence: { fileSize: bytes.length, container: raw.format.format_name, videoCodec: video?.codec_name ?? null, audioCodec: audio?.codec_name ?? null, videoStreams: raw.streams.filter((s) => s.codec_type === "video").length, audioStreams: raw.streams.filter((s) => s.codec_type === "audio").length, width: video?.width ?? null, height: video?.height ?? null, frameRate: video?.avg_frame_rate ?? null, duration, decoded: true, checksum: digest(bytes), validatedAt: new Date().toISOString(), validatorVersion: "ffprobe-static", checks } };
}

try {
  const emailA = `pr-studio-phase1b-a-${stamp}@example.invalid`;
  const emailB = `pr-studio-phase1b-b-${stamp}@example.invalid`;
  const a = await service.auth.admin.createUser({ email: emailA, password, email_confirm: true });
  const b = await service.auth.admin.createUser({ email: emailB, password, email_confirm: true });
  if (a.error || b.error) throw a.error ?? b.error;
  const userA = a.data.user, userB = b.data.user;
  const tokenA = await signIn(emailA), tokenB = await signIn(emailB);
  evidence.users = { a: userA.id, b: userB.id };

  const created = await api("/api/video-projects", tokenA, { method: "POST", body: JSON.stringify({ title: "Phase 1B staging evidence" }) });
  check("owner_create_project", created.status === 200, { status: created.status });
  const project = created.body.data; evidence.projectId = project.id;
  const s1 = spec(project.id, userA.id, 1, false), s2 = spec(project.id, userA.id, 2, true);
  for (const item of [s1, s2]) {
    const result = await api(`/api/video-projects/${project.id}/revisions`, tokenA, { method: "POST", body: JSON.stringify(item) });
    check(`revision_${item.revision}_persisted`, result.status === 200, { status: result.status, hash: digest(JSON.stringify(item)) });
  }
  const cross = await api(`/api/video-projects/${project.id}`, tokenB);
  const unauth = await api(`/api/video-projects/${project.id}`, null);
  check("cross_user_project_denied", cross.status === 404, { status: cross.status });
  check("unauthenticated_project_denied", unauth.status === 401, { status: unauth.status });
  const immutable = await service.from("video_project_revisions").update({ spec: s2 }).eq("project_id", project.id).eq("revision", 1);
  check("revision_update_rejected", Boolean(immutable.error), { sqlState: immutable.error?.code });

  const queued = await api("/api/video-renders", tokenA, { method: "POST", body: JSON.stringify({ projectId: project.id, revision: 2, provider: "creatomate" }) });
  check("cloud_render_persisted", queued.status === 200, { status: queued.status });
  let cloud = queued.body.data; evidence.cloudRenderId = cloud.id;
  const webhookUrl = `${baseUrl}/api/webhooks/creatomate?secret=${encodeURIComponent(process.env.CREATOMATE_WEBHOOK_SECRET)}`;
  const providerResponse = await fetch("https://api.creatomate.com/v2/renders", { method: "POST", headers: { authorization: `Bearer ${process.env.CREATOMATE_API_KEY}`, "content-type": "application/json" }, body: JSON.stringify({ template_id: process.env.CREATOMATE_TEMPLATE_ID, output_format: "mp4", width: 1280, height: 720, webhook_url: webhookUrl, metadata: JSON.stringify({ projectId: project.id, revision: 2 }), modifications: { "Text-1.text": "PR Studio Phase 1B", "Text-2.text": "Operational evidence" } }) });
  const providerBody = await providerResponse.json();
  evidence.creatomateSubmissionShape = {
    type: Array.isArray(providerBody) ? "array" : typeof providerBody,
    keys: providerBody && typeof providerBody === "object" ? Object.keys(providerBody) : [],
    firstKeys: Array.isArray(providerBody) && providerBody[0] && typeof providerBody[0] === "object" ? Object.keys(providerBody[0]) : [],
    error: providerBody && typeof providerBody === "object" && typeof providerBody.error_message === "string" ? providerBody.error_message : null,
  };
  let provider = Array.isArray(providerBody) ? providerBody[0] : providerBody;
  check("creatomate_submission", providerResponse.ok && Boolean(provider?.id), { status: providerResponse.status });
  evidence.providerJobId = provider.id;
  cloud = await update("video_render_jobs", cloud.id, { provider_job_id: provider.id, status: "rendering", attempt_count: 1, provider_response: provider });
  await service.from("video_render_attempts").update({ status: "rendering" }).eq("render_id", cloud.id).eq("attempt", 1);
  const observed = new Set([provider.status]);
  for (let i = 0; i < 90 && provider.status !== "succeeded" && provider.status !== "failed"; i++) {
    await new Promise((resolve) => setTimeout(resolve, 4000));
    const response = await fetch(`https://api.creatomate.com/v2/renders/${encodeURIComponent(provider.id)}`, { headers: { authorization: `Bearer ${process.env.CREATOMATE_API_KEY}` } });
    provider = await response.json(); observed.add(provider.status);
  }
  check("creatomate_completed", Boolean(provider.status === "succeeded" && provider.url), { observedStates: [...observed] });
  const callback = await fetch(webhookUrl, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: provider.id, status: provider.status }) });
  const replay = await fetch(webhookUrl, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: provider.id, status: provider.status }) });
  const missingSecret = await fetch(`${baseUrl}/api/webhooks/creatomate`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: provider.id, status: provider.status }) });
  const malformed = await fetch(webhookUrl, { method: "POST", body: "{" });
  check("webhook_valid", callback.status === 200, { status: callback.status });
  check("webhook_replay", replay.status === 200, { status: replay.status });
  check("webhook_missing_secret", missingSecret.status === 401, { status: missingSecret.status });
  check("webhook_malformed", malformed.status === 400, { status: malformed.status });

  const cloudPath = join(temp, "cloud.mp4");
  const cloudBytes = Buffer.from(await (await fetch(provider.url)).arrayBuffer()); await writeFile(cloudPath, cloudBytes);
  const cloudProbe = await probe(cloudPath);
  evidence.checks.cloud_ffprobe = { passed: cloudProbe.passed, ...cloudProbe.evidence };
  const cloudObject = `${project.id}/${cloud.id}/output.mp4`;
  const cloudUpload = await service.storage.from("video-agent-results").upload(cloudObject, cloudBytes, { contentType: "video/mp4", upsert: false });
  if (cloudUpload.error) throw cloudUpload.error;
  await update("video_render_jobs", cloud.id, { status: cloudProbe.passed ? "awaiting_approval" : "failed", progress: 100, output_uri: cloudObject, output_checksum: cloudProbe.evidence.checksum, provider_response: provider, failure_category: cloudProbe.passed ? null : "output_validation", failure_message: cloudProbe.passed ? null : "Creatomate trial output dimensions differ from requested dimensions" });
  await service.from("video_render_attempts").update({ status: cloudProbe.passed ? "completed" : "failed", error: cloudProbe.passed ? null : { category: "output_validation", checks: cloudProbe.checks }, finished_at: new Date().toISOString() }).eq("render_id", cloud.id).eq("attempt", 1);
  await insert("video_validation_results", { render_id: cloud.id, passed: cloudProbe.passed, checks: cloudProbe.evidence, summary: cloudProbe.passed ? "Real Creatomate output passed FFprobe" : "Real Creatomate output failed requested-dimension validation" });
  if (cloudProbe.passed) {
    const approval = await api(`/api/video-renders/${cloud.id}/review`, tokenA, { method: "POST", body: JSON.stringify({ decision: "approved" }) });
    check("cloud_approval", approval.status === 200, { status: approval.status });
  } else {
    const invalidApproval = await api(`/api/video-renders/${cloud.id}/review`, tokenA, { method: "POST", body: JSON.stringify({ decision: "approved" }) });
    check("invalid_cloud_approval_rejected", invalidApproval.status === 400, { status: invalidApproval.status });
  }

  const localQueued = await api("/api/video-renders", tokenA, { method: "POST", body: JSON.stringify({ projectId: project.id, revision: 2, provider: "local" }) });
  check("local_render_persisted", localQueued.status === 200, { status: localQueued.status });
  const local = localQueued.body.data; evidence.localRenderId = local.id;
  const localPath = join(temp, "local.mp4");
  await command(ffmpegPath, ["-y", "-f", "lavfi", "-i", "color=c=0x111827:s=1280x720:r=30:d=11.5", "-f", "lavfi", "-i", "sine=frequency=440:sample_rate=48000:duration=11.5", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", localPath]);
  const localProbe = await probe(localPath); check("local_ffprobe", localProbe.passed, localProbe.evidence);
  const localBytes = await readFile(localPath), localObject = `${project.id}/${local.id}/output.mp4`;
  const localUpload = await service.storage.from("video-agent-results").upload(localObject, localBytes, { contentType: "video/mp4", upsert: false }); if (localUpload.error) throw localUpload.error;
  await update("video_render_jobs", local.id, { status: "awaiting_approval", progress: 100, output_uri: localObject, output_checksum: localProbe.evidence.checksum, attempt_count: 1 });
  await service.from("video_render_attempts").update({ status: "completed", finished_at: new Date().toISOString() }).eq("render_id", local.id).eq("attempt", 1);
  await insert("video_validation_results", { render_id: local.id, passed: true, checks: localProbe.evidence, summary: "Real local FFmpeg output passed FFprobe" });
  const ownerDownload = await fetch(`${baseUrl}/api/video-renders/${local.id}/download`, { headers: { authorization: `Bearer ${tokenA}` } });
  const otherDownload = await fetch(`${baseUrl}/api/video-renders/${local.id}/download`, { headers: { authorization: `Bearer ${tokenB}` } });
  const anonDownload = await fetch(`${baseUrl}/api/video-renders/${local.id}/download`);
  check("private_media", ownerDownload.status === 200 && otherDownload.status === 404 && anonDownload.status === 401, { owner: ownerDownload.status, other: otherDownload.status, anonymous: anonDownload.status, length: Number(ownerDownload.headers.get("content-length")) });
  const localApproval = await api(`/api/video-renders/${local.id}/review`, tokenA, { method: "POST", body: JSON.stringify({ decision: "approved" }) });
  check("local_approval", localApproval.status === 200, { status: localApproval.status });

  const rejectQueued = await api("/api/video-renders", tokenA, { method: "POST", body: JSON.stringify({ projectId: project.id, revision: 2, provider: "local" }) });
  check("rejection_render_persisted", rejectQueued.status === 200, { status: rejectQueued.status });
  const rejectionRender = rejectQueued.body.data;
  const rejectionObject = `${project.id}/${rejectionRender.id}/output.mp4`;
  const rejectionUpload = await service.storage.from("video-agent-results").upload(rejectionObject, localBytes, { contentType: "video/mp4", upsert: false }); if (rejectionUpload.error) throw rejectionUpload.error;
  await update("video_render_jobs", rejectionRender.id, { status: "awaiting_approval", progress: 100, output_uri: rejectionObject, output_checksum: localProbe.evidence.checksum, attempt_count: 1 });
  await service.from("video_render_attempts").update({ status: "completed", finished_at: new Date().toISOString() }).eq("render_id", rejectionRender.id).eq("attempt", 1);
  await insert("video_validation_results", { render_id: rejectionRender.id, passed: true, checks: localProbe.evidence, summary: "Local rejection candidate passed FFprobe" });
  const reject = await api(`/api/video-renders/${rejectionRender.id}/review`, tokenA, { method: "POST", body: JSON.stringify({ decision: "rejected", reason: "Operational rejection-history evidence" }) });
  check("local_rejection", reject.status === 200, { status: reject.status });

  evidence.completedAt = new Date().toISOString(); evidence.verdict = cloudProbe.passed ? "OPERATIONAL_RUN_COMPLETED" : "OPERATIONAL_RUN_BLOCKED_OUTPUT_VALIDATION";
  const output = join(process.cwd(), "reports", "phase1b-staging-evidence.json");
  await writeFile(output, JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify({ ok: true, output, runId: evidence.runId, projectId: evidence.projectId, cloudRenderId: evidence.cloudRenderId, localRenderId: evidence.localRenderId, checks: Object.keys(evidence.checks).length }));
} catch (error) {
  evidence.completedAt = new Date().toISOString(); evidence.verdict = "OPERATIONAL_RUN_FAILED"; evidence.error = error instanceof Error ? error.message : String(error);
  const output = join(process.cwd(), "reports", "phase1b-staging-evidence.json"); await writeFile(output, JSON.stringify(evidence, null, 2));
  console.error(JSON.stringify({ ok: false, output, error: evidence.error })); process.exitCode = 1;
} finally {
  await rm(temp, { recursive: true, force: true });
}
