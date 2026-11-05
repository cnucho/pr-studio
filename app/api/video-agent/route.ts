import { NextResponse, type NextRequest } from "next/server";
import { createVideoAgentPlan, runVideoAgent } from "@/lib/video-agent";
import { createVideoJob, shouldQueueVideoJobs } from "@/lib/video-jobs";
import { videoAccessStatus, videoOperator } from "@/lib/video-access";

export const runtime = "nodejs";
export const maxDuration = 600;

type VideoAgentRequest = {
  brief?: string;
};

export async function POST(request: NextRequest) {
  try {
    const user = await videoOperator(request);
    const body = (await request.json().catch(() => ({}))) as VideoAgentRequest;
    const brief =
      body.brief?.trim() ||
      "PR Studio가 앱 안에서 YouTube 홍보 데모 영상을 직접 생성하는 흐름을 보여 주세요.";
    const appUrl = new URL(process.env.PR_STUDIO_CAPTURE_URL ?? request.nextUrl.origin).origin;

    if (shouldQueueVideoJobs()) {
      const plan = await createVideoAgentPlan(brief);
      const job = await createVideoJob({ brief, appUrl, plan, userId: user.id });

      return NextResponse.json({
        ok: true,
        queued: true,
        job,
      });
    }

    const output = await runVideoAgent({ brief, appUrl });

    return NextResponse.json({
      ok: true,
      queued: false,
      output,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "영상 생성에 실패했습니다.",
      },
      { status: videoAccessStatus(error) },
    );
  }
}
