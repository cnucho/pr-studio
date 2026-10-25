import { readVideoJob } from "@/lib/video-jobs";
import { NextResponse, type NextRequest } from "next/server";
import { videoAccessStatus, videoOperator } from "@/lib/video-access";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    jobId: string;
  }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const user = await videoOperator(request);
    const { jobId } = await context.params;
    const job = await readVideoJob(jobId, user.id);

    return NextResponse.json({
      ok: true,
      job,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: "영상 생성 작업을 찾을 수 없습니다.",
      },
      { status: videoAccessStatus(error) === 500 ? 404 : videoAccessStatus(error) },
    );
  }
}
