import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const videoPath = path.join(process.cwd(), "out", "pr-studio-final.mp4");

export async function GET() {
  try {
    const [file, metadata] = await Promise.all([readFile(videoPath), stat(videoPath)]);

    return new Response(new Uint8Array(file), {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Length": String(metadata.size),
        "Content-Disposition": 'inline; filename="pr-studio-final.mp4"',
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "생성된 영상 파일을 찾을 수 없습니다.",
      },
      { status: 404 },
    );
  }
}
