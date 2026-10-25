import { trackForBrief } from "./video-beats";
import type { CollectionContext } from "./video-collection";
import { videoBriefSchema, type VideoBrief } from "./video-planning";

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
