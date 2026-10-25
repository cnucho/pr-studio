import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { downloadQueuedVideo } from "@/lib/video-jobs";
import { NextResponse, type NextRequest } from "next/server";
import { videoAccessStatus, videoOperator } from "@/lib/video-access";

export const runtime = "nodejs";

const videoPath = path.join(process.cwd(), "out", "pr-studio-final.mp4");

export async function GET(request: NextRequest) {
  try {
    const user = await videoOperator(request);
    const jobId = request.nextUrl.searchParams.get("jobId");
    const queued = jobId ? await downloadQueuedVideo(jobId, user.id) : null;
    const [file, metadata] = queued
      ? [queued.bytes, { size: queued.size, mtimeMs: Date.parse(queued.generatedAt) }]
      : await Promise.all([readFile(videoPath), stat(videoPath)]);

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
