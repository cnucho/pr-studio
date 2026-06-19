import { NextResponse, type NextRequest } from "next/server";
import { runVideoAgent } from "@/lib/video-agent";

export const runtime = "nodejs";
export const maxDuration = 600;

type VideoAgentRequest = {
  brief?: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as VideoAgentRequest;
    const brief =
      body.brief?.trim() ||
      "PR Studio가 앱 안에서 YouTube 홍보 데모 영상을 직접 생성하는 흐름을 보여 주세요.";
    const appUrl = request.headers.get("origin") ?? request.nextUrl.origin;
    const output = await runVideoAgent({ brief, appUrl });

    return NextResponse.json({
      ok: true,
      output,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "영상 생성에 실패했습니다.",
      },
      { status: 500 },
    );
  }
}
