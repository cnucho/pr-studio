import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { downloadQueuedVideo } from "@/lib/video-jobs";
import { NextResponse, type NextRequest } from "next/server";
import { videoAccessStatus, videoOperator } from "@/lib/video-access";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const user = await videoOperator(request);
    const jobId = request.nextUrl.searchParams.get("jobId");
    const runId = request.nextUrl.searchParams.get("runId");
    if (runId && !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(runId)) {
      throw new Error("Invalid video run ID.");
    }
    const queued = jobId ? await downloadQueuedVideo(jobId, user.id) : null;
    const inlineVideoPath = runId
      ? path.join(process.cwd(), "video-assets", "jobs", `inline-${runId}`, "output", "pr-studio-final.mp4")
      : path.join(process.cwd(), "out", "pr-studio-final.mp4");
    const [file, metadata] = queued
      ? [queued.bytes, { size: queued.size, mtimeMs: Date.parse(queued.generatedAt) }]
      : await Promise.all([readFile(inlineVideoPath), stat(inlineVideoPath)]);

    return new Response(new Uint8Array(file), {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Length": String(metadata.size),
        "Content-Disposition": 'inline; filename="pr-studio-final.mp4"',
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: "생성된 영상 파일을 찾을 수 없습니다.",
      },
      { status: videoAccessStatus(error) === 500 ? 404 : videoAccessStatus(error) },
    );
  }
}
