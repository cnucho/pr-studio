import { z } from "zod";
import type { BeatDraft, VideoTrack } from "./video-beats";

export const VIDEO_BRIEF_LIMITS = {
  purpose: 2_000,
  targetAudience: 500,
  outline: 4_000,
  sourceVideoId: 200,
} as const;

export const videoBriefSchema = z
  .object({
    purpose: z.string().trim().min(1).max(VIDEO_BRIEF_LIMITS.purpose),
    targetAudience: z.string().trim().min(1).max(VIDEO_BRIEF_LIMITS.targetAudience),
    track: z.enum(["press", "news", "youtube"]),
    targetDurationSec: z.number().int().min(15).max(600).optional(),
    outline: z.string().trim().max(VIDEO_BRIEF_LIMITS.outline).optional(),
    sourceVideoId: z.string().trim().max(VIDEO_BRIEF_LIMITS.sourceVideoId).optional(),
  })
  .strict();

export type VideoBrief = z.infer<typeof videoBriefSchema>;

export type CollectionCapabilityId =
  | "fixture"
  | "screen-observation"
  | "preset"
  | "card"
  | "video-analysis"
  | "unknown";

export const collectionOrderSchema = z
  .object({
    instruction: z.string().trim().min(1).max(500),
    capabilityId: z.enum(["fixture", "screen-observation", "preset", "card", "video-analysis", "unknown"]),
  })
  .strict();

export type CollectionOrder = z.infer<typeof collectionOrderSchema>;

export type CollectionEvidence = {
  kind: "text" | "json" | "image" | "file";
  value: string;
};

export type CollectionReportProvenance = {
  track?: VideoTrack;
  round?: 1 | 2 | 3;
  scenarioVersion?: string;
  inputIdentity?: string;
  resultMarker?: string;
};

export type CollectionReport = {
  order: string;
  capabilityId: CollectionCapabilityId;
  status: "있음" | "없음";
  detail: string;
  evidence?: CollectionEvidence[];
  provenance?: CollectionReportProvenance;
};

export const CONTENT_REVIEW_KEYS = [
  "objectiveFit",
  "audienceFit",
  "narrativeLogic",
  "evidenceFit",
  "narrationNaturalness",
  "subtitleFit",
  "visualFit",
] as const;

export type ContentReviewKey = (typeof CONTENT_REVIEW_KEYS)[number];

export const contentCriterionReviewSchema = z
  .object({
    status: z.enum(["pass", "revise"]),
    rationale: z.string().trim().min(1).max(500),
  })
  .strict();

export type ContentCriterionReview = z.infer<typeof contentCriterionReviewSchema>;

export const contentReviewSchema = z
  .object({
    objectiveFit: contentCriterionReviewSchema,
    audienceFit: contentCriterionReviewSchema,
    narrativeLogic: contentCriterionReviewSchema,
    evidenceFit: contentCriterionReviewSchema,
    narrationNaturalness: contentCriterionReviewSchema,
    subtitleFit: contentCriterionReviewSchema,
    visualFit: contentCriterionReviewSchema,
    readyToProduce: z.boolean(),
    blockingIssues: z.array(z.string().trim().min(1).max(500)).max(8),
  })
  .strict();

export type ContentReview = z.infer<typeof contentReviewSchema>;

export type PlanningDecision = "collect" | "produce";

export type PlanningRound = {
  round: 1 | 2 | 3;
  summary: string;
  viewerPromise: string;
  beats: BeatDraft[];
  collectionOrders: CollectionOrder[];
  collectionReports: CollectionReport[];
  contentReview: ContentReview;
  decision: PlanningDecision;
};

export function contentReadyForProduction(review: ContentReview) {
  return (
    review.readyToProduce &&
    review.blockingIssues.length === 0 &&
    CONTENT_REVIEW_KEYS.every((key) => review[key].status === "pass")
  );
}

export function planningRoundReadyForProduction(round: Pick<PlanningRound, "decision" | "contentReview">) {
  return round.decision === "produce" && contentReadyForProduction(round.contentReview);
}

export function blockedContentReview(reason: string): ContentReview {
  const criterion = { status: "revise" as const, rationale: reason };
  return {
    objectiveFit: criterion,
    audienceFit: criterion,
    narrativeLogic: criterion,
    evidenceFit: criterion,
    narrationNaturalness: criterion,
    subtitleFit: criterion,
    visualFit: criterion,
    readyToProduce: false,
    blockingIssues: [reason],
  };
}

export function legacyBrief(purpose: string, track: VideoTrack): VideoBrief {
  return videoBriefSchema.parse({
    purpose,
    targetAudience: "홍보 콘텐츠의 대상 시청자",
    track,
  });
}
