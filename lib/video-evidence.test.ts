import { describe, expect, it } from "vitest";
import { normalizeCollectionReportsForPlanning, pendingCollectionOrders, PLANNING_EVIDENCE_LIMITS } from "./video-evidence";
import type { CollectionReport } from "./video-planning";

function report(overrides: Partial<CollectionReport> = {}): CollectionReport {
  return {
    order: "기존 영상을 분석해 주세요.",
    capabilityId: "video-analysis",
    status: "있음",
    detail: "기존 영상을 분석했습니다.",
    provenance: {
      track: "youtube",
      scenarioVersion: "video-analysis-v1",
      inputIdentity: "source-1",
    },
    ...overrides,
  };
}

describe("planning evidence lifecycle", () => {
  it("deduplicates provenance, prefers success, and stays within the character budget", () => {
    const reports: CollectionReport[] = [
      report({ status: "없음", detail: "초기 분석 실패" }),
      report({ evidence: [{ kind: "text", value: "가".repeat(30_000) }] }),
      ...Array.from({ length: 20 }, (_, index) => report({
        capabilityId: "screen-observation",
        order: `화면 ${index}`,
        provenance: {
          track: "youtube",
          scenarioVersion: `screen-${index}`,
          inputIdentity: `fixture-${index}`,
        },
        evidence: [{ kind: "text", value: "나".repeat(10_000) }],
      })),
    ];

    const normalized = normalizeCollectionReportsForPlanning(reports);

    expect(normalized.filter((item) => item.capabilityId === "video-analysis")).toHaveLength(1);
    expect(normalized.find((item) => item.capabilityId === "video-analysis")?.status).toBe("있음");
    expect(normalized.length).toBeLessThanOrEqual(PLANNING_EVIDENCE_LIMITS.maxReports);
    expect(JSON.stringify(normalized).length).toBeLessThanOrEqual(PLANNING_EVIDENCE_LIMITS.maxTotalChars);
  });

  it("reuses successful versioned capabilities but reruns legacy or failed evidence", () => {
    const orders = [
      { instruction: "영상을 분석해 주세요.", capabilityId: "video-analysis" as const },
      { instruction: "영상을 다시 분석해 주세요.", capabilityId: "video-analysis" as const },
      { instruction: "화면을 확인해 주세요.", capabilityId: "screen-observation" as const },
      { instruction: "프리셋을 확인해 주세요.", capabilityId: "preset" as const },
    ];
    const reports: CollectionReport[] = [
      report(),
      report({
        capabilityId: "screen-observation",
        status: "없음",
        provenance: { track: "youtube", scenarioVersion: "screen-interaction-v1", inputIdentity: "youtube-fixture-v1" },
      }),
      report({ capabilityId: "preset", provenance: undefined }),
    ];

    expect(pendingCollectionOrders(orders, reports).map((order) => order.capabilityId)).toEqual([
      "screen-observation",
      "preset",
    ]);
  });
});
