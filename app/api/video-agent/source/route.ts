import { NextResponse, type NextRequest } from "next/server";
import { uploadSourceVideo } from "@/lib/video-jobs";
import { videoAccessStatus, videoOperator } from "@/lib/video-access";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const user = await videoOperator(request);
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.type !== "video/mp4") throw new Error("MP4 파일이 필요합니다.");
    const uploaded = await uploadSourceVideo({ bytes: new Uint8Array(await file.arrayBuffer()), userId: user.id });
    return NextResponse.json({ ok: true, ...uploaded });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "기존 영상을 업로드하지 못했습니다." },
      { status: videoAccessStatus(error) },
    );
  }
}
