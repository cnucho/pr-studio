import { describe, expect, it, vi } from "vitest";
import type { VideoAgentPlan } from "./video-agent";
import { runPlanningLoop } from "./video-orchestrator";
import { blockedContentReview, type ContentReview } from "./video-planning";

const pass = { status: "pass", rationale: "콘텐츠 목적에 맞습니다." } as const;
const readyReview: ContentReview = {
  objectiveFit: pass,
  audienceFit: pass,
  narrativeLogic: pass,
  evidenceFit: pass,
  narrationNaturalness: pass,
  subtitleFit: pass,
  visualFit: pass,
  readyToProduce: true,
  blockingIssues: [],
};

function plan(round: 1 | 2 | 3, ready: boolean): VideoAgentPlan {
  return {
    mode: "gpt",
    model: "test-planner",
    pipeline: "2.0",
    round,
    summary: `기획 ${round}`,
    viewerPromise: "시청자가 핵심 흐름을 이해합니다.",
    steps: [],
    qualityChecks: [],
    beats: [],
    collectionOrders: ready
      ? []
      : [{ instruction: "입력 예시를 확인해 주세요.", capabilityId: "fixture" }],
    collectionReports: [],
    contentReview: ready ? readyReview : blockedContentReview("입력 근거가 더 필요합니다."),
    decision: ready ? "produce" : "collect",
    productionReady: ready,
    manifest: ready ? ({ beats: [{ id: "approved" }] } as VideoAgentPlan["manifest"]) : undefined,
  };
}

describe("PR Studio 2.0 planning loop", () => {
  it("returns collection evidence to the next round and produces only after approval", async () => {
    const receivedReports: string[][] = [];
    const saved: Array<{ round: number; reports: number }> = [];
    const result = await runPlanningLoop({
      dependencies: {
        createPlan: vi.fn(async ({ round, collectionReports }) => {
          receivedReports.push(collectionReports.map((report) => report.detail));
          return plan(round, round === 2);
        }),
        collect: vi.fn(async () => [
          {
            order: "입력 예시를 확인해 주세요.",
            capabilityId: "fixture",
            status: "있음",
            detail: "실제 입력 예시가 있습니다.",
          },
        ]),
        saveRound: vi.fn(async (savedPlan, reports) => {
          saved.push({ round: savedPlan.round, reports: reports.length });
        }),
      },
    });

    expect(result.outcome).toBe("produce");
    expect(result.plan.round).toBe(2);
    expect(receivedReports).toEqual([[], ["실제 입력 예시가 있습니다."]]);
    expect(saved).toEqual([
      { round: 1, reports: 1 },
      { round: 2, reports: 0 },
    ]);
  });

  it("stops after three planning calls without running production", async () => {
    const createPlan = vi.fn(async ({ round }: { round: 1 | 2 | 3 }) => plan(round, false));
    const result = await runPlanningLoop({
      dependencies: {
        createPlan,
        collect: vi.fn(async () => []),
        saveRound: vi.fn(async () => undefined),
      },
    });

    expect(result.outcome).toBe("plan_exhausted");
    expect(result.plan.round).toBe(3);
    expect(createPlan).toHaveBeenCalledTimes(3);
  });
});
