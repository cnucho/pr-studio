import { trackForBrief } from "./video-beats";
import type { CollectionContext } from "./video-collection";
import { videoBriefSchema, type CollectionReport, type VideoBrief } from "./video-planning";

export type PlanningJobInput = {
  brief: string;
  request?: Partial<VideoBrief> & { ownerId?: string };
};

export function planningBrief(job: PlanningJobInput): VideoBrief {
  const purpose = job.request?.purpose?.trim() || job.brief;
  return videoBriefSchema.parse({
    purpose,
    targetAudience: job.request?.targetAudience?.trim() || "홍보 콘텐츠의 대상 시청자",
    track: job.request?.track ?? trackForBrief(purpose),
    targetDurationSec: job.request?.targetDurationSec,
    outline: job.request?.outline?.trim() || undefined,
    sourceVideoId: job.request?.sourceVideoId?.trim() || undefined,
  });
}

export function collectionContextForBrief(
  brief: Pick<VideoBrief, "track">,
  runtime: Omit<CollectionContext, "track">,
): CollectionContext {
  return { ...runtime, track: brief.track };
}

export function restoreCollectionReports(rounds: Array<{ collection_reports: CollectionReport[] }>) {
  return rounds.flatMap((round) => round.collection_reports);
}

export function trustedCaptureOrigin(jobAppUrl: string, configuredCaptureUrl: string | undefined) {
  if (!configuredCaptureUrl) throw new Error("PR_STUDIO_CAPTURE_URL이 없어 화면 수집 신뢰 origin을 확인할 수 없습니다.");
  const configured = new URL(configuredCaptureUrl);
  const stored = new URL(jobAppUrl);
  if (!["http:", "https:"].includes(configured.protocol) || !["http:", "https:"].includes(stored.protocol)) {
    throw new Error("화면 수집 URL은 http 또는 https만 허용됩니다.");
  }
  if (configured.origin !== stored.origin) throw new Error("저장된 앱 URL이 신뢰 origin과 일치하지 않습니다.");
  return configured.origin;
}
