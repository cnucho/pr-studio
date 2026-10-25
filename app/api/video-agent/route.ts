import { NextResponse, type NextRequest } from "next/server";
import { runVideoAgent } from "@/lib/video-agent";
import { trackForBrief } from "@/lib/video-beats";
import { createVideoJob, shouldQueueVideoJobs } from "@/lib/video-jobs";
import { videoAccessStatus, videoOperator } from "@/lib/video-access";
import { videoBriefSchema } from "@/lib/video-planning";

export const runtime = "nodejs";
export const maxDuration = 600;

type VideoAgentRequest = {
  brief?: string;
  purpose?: string;
  targetAudience?: string;
  track?: "press" | "news" | "youtube";
  targetDurationSec?: number;
  outline?: string;
  sourceVideoId?: string;
};

export async function POST(request: NextRequest) {
  try {
    const user = await videoOperator(request);
    const body = (await request.json().catch(() => ({}))) as VideoAgentRequest;
    const purpose =
      body.purpose?.trim() || body.brief?.trim() ||
      "PR Studio가 앱 안에서 YouTube 홍보 데모 영상을 직접 생성하는 흐름을 보여 주세요.";
    const brief = videoBriefSchema.parse({
      purpose,
      targetAudience: body.targetAudience?.trim() || "홍보 콘텐츠의 대상 시청자",
      track: body.track ?? trackForBrief(purpose),
      targetDurationSec: body.targetDurationSec,
      outline: body.outline?.trim() || undefined,
      sourceVideoId: body.sourceVideoId?.trim() || undefined,
    });
    const appUrl = new URL(process.env.PR_STUDIO_CAPTURE_URL ?? request.nextUrl.origin).origin;

    if (shouldQueueVideoJobs()) {
      const job = await createVideoJob({ brief, appUrl, userId: user.id });

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
