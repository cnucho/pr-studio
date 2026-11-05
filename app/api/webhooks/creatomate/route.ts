import { createHash, timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { CreatomateRenderer } from "@/lib/video-production/creatomate";

export const runtime = "nodejs";

function sameSecret(actual: string, expected: string) {
  const actualBytes = Buffer.from(actual);
  const expectedBytes = Buffer.from(expected);
  return actualBytes.length === expectedBytes.length && timingSafeEqual(actualBytes, expectedBytes);
}

export async function POST(request: NextRequest) {
  const secret = process.env.CREATOMATE_WEBHOOK_SECRET;
  if (!secret || !sameSecret(request.nextUrl.searchParams.get("secret") ?? "", secret)) {
    return NextResponse.json({ ok: false, error: "Unverified webhook" }, { status: 401 });
  }

  const raw = await request.text();
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Malformed payload" }, { status: 400 });
  }
  if (!payload.id || !payload.status) {
    return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });
  }

  let verified;
  try {
    verified = await new CreatomateRenderer().getRenderStatus(String(payload.id));
  } catch {
    return NextResponse.json({ ok: false, error: "Provider verification failed" }, { status: 502 });
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json({ ok: false, error: "Server persistence unavailable" }, { status: 503 });
  }

  const db = createClient(url, key, { auth: { persistSession: false } });
  const eventId = createHash("sha256").update(raw).digest("hex");
  const { data: event, error: eventError } = await db
    .from("video_webhook_events")
    .upsert(
      {
        provider: "creatomate",
        event_id: eventId,
        provider_job_id: verified.providerJobId,
        payload,
        verified: true,
        processed: false,
        error: null,
      },
      { onConflict: "provider,event_id", ignoreDuplicates: true },
    )
    .select("id,processed")
    .maybeSingle();

  if (eventError) {
    return NextResponse.json({ ok: false, error: "Event persistence failed" }, { status: 500 });
  }
  if (!event) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  const { data: renderJob, error: updateError } = await db
    .from("video_render_jobs")
    .update({
      // Provider completion starts our persisted validation stage; `completed`
      // is an adapter state, not a valid durable render-job lifecycle value.
      status: verified.state === "completed" ? "validating" : verified.state,
      output_uri: verified.outputUrl ?? null,
      provider_response: verified.raw,
      updated_at: new Date().toISOString(),
    })
    .eq("provider", "creatomate")
    .eq("provider_job_id", verified.providerJobId)
    .select("id")
    .maybeSingle();

  if (updateError || !renderJob) {
    await db
      .from("video_webhook_events")
      .update({ error: updateError?.message ?? "Render job not found" })
      .eq("id", event.id);
    return NextResponse.json({ ok: false, error: "Render job update failed" }, { status: 409 });
  }

  const { error: completionError } = await db
    .from("video_webhook_events")
    .update({ processed: true, error: null })
    .eq("id", event.id);
  if (completionError) {
    return NextResponse.json({ ok: false, error: "Event completion failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, duplicate: false });
}
