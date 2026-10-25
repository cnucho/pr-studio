import { describe, expect, it } from "vitest";
import { collectionContextForBrief, planningBrief } from "./video-job-planning";

describe("video worker planning boundary", () => {
  it("preserves an explicit track from the job through the collection context", () => {
    const brief = planningBrief({
      brief: "보도자료 영상을 만들어 주세요.",
      request: {
        purpose: "보도자료 형식으로 정책 내용을 설명해 주세요.",
        targetAudience: "정책 담당자",
        track: "youtube",
      },
    });

    const context = collectionContextForBrief(brief, { appUrl: "https://example.com" });

    expect(brief.track).toBe("youtube");
    expect(context).toEqual({ appUrl: "https://example.com", track: "youtube" });
  });

  it("keeps the legacy purpose fallback at the input boundary", () => {
    const brief = planningBrief({
      brief: "뉴스 분석 영상을 만들어 주세요.",
      request: { targetAudience: "홍보 담당자" },
    });

    expect(brief.track).toBe("news");
  });
});
