import { afterEach, describe, expect, it, vi } from "vitest";
import { createVideoAgentPlan, runVideoAgent } from "./video-agent";

describe("PR Studio 2.0 production gate", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("does not turn a missing planning model into an automatic production plan", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");

    const plan = await createVideoAgentPlan("보도자료 작성 흐름을 설명하는 영상");

    expect(plan.decision).toBe("collect");
    expect(plan.productionReady).toBe(false);
    expect(plan.manifest).toBeUndefined();
    expect(plan.contentReview.blockingIssues.length).toBeGreaterThan(0);
  });

  it("stops before capture when content planning is not ready", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");

    await expect(
      runVideoAgent({
        brief: "뉴스 분석 화면을 설명하는 영상",
        appUrl: "http://127.0.0.1:3016",
      }),
    ).rejects.toThrow("영상 제작 보류");
  });

  it("rejects a malformed model payload instead of treating it as production-ready", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-key");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            output_text: JSON.stringify({
              summary: "형식이 불완전한 응답",
              decision: "produce",
            }),
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );

    const plan = await createVideoAgentPlan("유튜브 제작 흐름을 설명하는 영상");

    expect(plan.productionReady).toBe(false);
    expect(plan.manifest).toBeUndefined();
  });

  it("includes collection reports in the next planning round and freezes an approved manifest", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-key");
    const requests: string[] = [];
    const pass = { status: "pass", rationale: "목적과 화면에 맞습니다." };
    const payload = {
      summary: "보도자료 입력과 결과를 짧게 설명합니다.",
      viewerPromise: "입력에서 결과까지의 흐름을 이해할 수 있습니다.",
      steps: [
        { title: "기획", detail: "핵심 내용을 정합니다.", tool: "plan" },
        { title: "촬영", detail: "화면을 촬영합니다.", tool: "capture" },
        { title: "합성", detail: "음성과 자막을 합성합니다.", tool: "render" },
        { title: "검토", detail: "최종 영상을 검토합니다.", tool: "verify" },
      ],
      qualityChecks: ["목적 적합성", "음성 자연스러움", "자막 적절성"],
      beats: [
        { screenId: "feature-summary", purpose: "영상 범위를 소개한다", viewerTakeaway: "기능의 위치를 이해한다", action: "기능을 소개한다", focus: "보도자료 행", narration: "먼저 사용할 기능을 확인합니다.", subtitle: "보도자료 작성 기능", transitionReason: "실제 입력 화면을 확인한다" },
        { screenId: "press-input", purpose: "입력 근거를 보여 준다", viewerTakeaway: "입력 자료를 이해한다", action: "정책 정보를 입력한다", focus: "정책명", narration: "정책명과 사업 내용을 입력합니다.", subtitle: "정책 정보 입력", transitionReason: "입력 뒤 실행을 확인한다" },
        { screenId: "press-generate", purpose: "실행 시점을 보여 준다", viewerTakeaway: "실행 시점을 이해한다", action: "생성을 누른다", focus: "생성 버튼", narration: "생성을 눌러 초안을 만듭니다.", subtitle: "초안 생성", transitionReason: "생성 결과를 확인한다" },
        { screenId: "press-output", purpose: "결과와 검토 책임을 보여 준다", viewerTakeaway: "결과와 검토 필요성을 이해한다", action: "결과를 확인한다", focus: "초안과 요약", narration: "초안과 요약을 확인하고 담당자가 내용을 검토합니다.", subtitle: "결과 확인과 검토", transitionReason: "검토 흐름을 정리한다" },
      ],
      collectionOrders: [],
      contentReview: {
        objectiveFit: pass,
        audienceFit: pass,
        narrativeLogic: pass,
        evidenceFit: pass,
        narrationNaturalness: pass,
        subtitleFit: pass,
        visualFit: pass,
        readyToProduce: true,
        blockingIssues: [],
      },
      decision: "produce",
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async (_url: string, init?: RequestInit) => {
        requests.push(String(init?.body ?? ""));
        return new Response(JSON.stringify({ output_text: JSON.stringify(payload) }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }),
    );

    const plan = await createVideoAgentPlan({
      purpose: "보도자료 작성 흐름",
      targetAudience: "신규 홍보 담당자",
      track: "press",
      targetDurationSec: 60,
    }, {
      round: 2,
      collectionReports: [
        {
          order: "실제 입력 예시를 확인해 주세요.",
          capabilityId: "fixture",
          status: "있음",
          detail: "보도자료 입력 예시가 있습니다.",
        },
      ],
    });

    expect(plan.round).toBe(2);
    expect(plan.productionReady).toBe(true);
    expect(plan.manifest?.track).toBe("press");
    expect(plan.manifest?.audience).toBe("신규 홍보 담당자");
    expect(plan.manifest?.timing.targetSec).toBe(60);
    expect(requests[0]).toContain("직전 수집 보고");
    expect(requests[0]).toContain("신규 홍보 담당자");
    expect(requests[0]).toContain("보도자료 입력 예시가 있습니다");
  });
});
