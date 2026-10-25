import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { buildPlanningDossier, buildReviewRecord, contentManifestIssues, createManifest, estimateNarrationMs, hasForbiddenClaim, reportCollection, trackForBrief } from "./video-beats";
import { contentReadyForProduction, planningRoundReadyForProduction, videoBriefSchema, type ContentReview } from "./video-planning";
import { chromeLaunchArgs, preferSystemFfmpeg, subtitleFont } from "./video-runtime";

const base = {
  mode: "local" as const,
  model: "local-planner",
  summary: "한 가지 작업을 보여 줍니다.",
  viewerPromise: "담당자가 입력과 결과를 확인할 수 있습니다.",
};

describe("PR Studio 2.0 beats", () => {
  it("builds a content dossier from the brief and the matching screens", () => {
    const dossier = buildPlanningDossier("보도자료 초안을 보여주는 영상");
    expect(dossier.track).toBe("press");
    expect(dossier.screenIds).toContain("press-input");
    expect(dossier.screenIds).not.toContain("news-input");
    expect(dossier.screenIds).not.toContain("youtube-input");
    expect(dossier.text).toContain("청년 지역정착 패키지");
    expect(dossier.text).toContain("하단 중앙");
    expect(dossier.text).toContain("marin");
    expect(dossier.text).not.toContain("news-input");
    expect(reportCollection("경쟁사 내부 매출표").status).toBe("없음");
    expect(reportCollection("자막 글자 크기").status).toBe("있음");
  });

  it("rejects screens that belong to a different video track", () => {
    const result = createManifest({
      ...base,
      mode: "gpt",
      model: "gpt-5.5",
      brief: "보도자료 한 편",
      drafts: [
        { screenId: "feature-summary", narration: "기능을 먼저 확인합니다." },
        { screenId: "press-input", narration: "정책 정보를 입력합니다." },
        { screenId: "news-input", narration: "다른 종류의 화면입니다." },
        { screenId: "press-generate", narration: "생성을 실행합니다." },
        { screenId: "press-output", narration: "결과를 확인합니다." },
      ],
    });

    expect(result.source).toBe("model");
    expect(result.manifest.beats.map((beat) => beat.screenId)).not.toContain("news-input");
  });

  it("chooses a different screen order for each brief", () => {
    const press = createManifest({ ...base, brief: "보도자료 초안을 보여주는 영상" });
    const news = createManifest({ ...base, brief: "뉴스 분석 화면을 보여주는 영상" });
    const youtube = createManifest({ ...base, brief: "유튜브 게시 패키지를 보여주는 영상" });

    expect(press.manifest.beats.map((beat) => beat.screenId)).toEqual([
      "feature-summary",
      "press-input",
      "press-generate",
      "press-output",
      "flow-diagram",
    ]);
    expect(news.manifest.beats.map((beat) => beat.screenId)).not.toEqual(
      press.manifest.beats.map((beat) => beat.screenId),
    );
    expect(news.manifest.beats.some((beat) => beat.insert?.kind === "chart")).toBe(true);
    expect(youtube.manifest.track).toBe("youtube");
    expect(trackForBrief("보도자료와 뉴스 분석을 모두 보여 주세요")).toBe("press");
  });

  it("keeps model narration only inside the allowed screens", () => {
    const result = createManifest({
      ...base,
      mode: "gpt",
      model: "gpt-5.5",
      brief: "보도자료 한 편",
      drafts: [
        { screenId: "press-input", narration: "정책명을 입력합니다." },
        { screenId: "press-generate", narration: "AI가 작성한 보도자료입니다." },
        { screenId: "press-output", narration: "결과 화면의 SNS 요약을 먼저 읽습니다." },
        { screenId: "feature-summary", narration: "표를 먼저 봅니다." },
        { screenId: "not-a-screen", narration: "없는 화면" },
      ],
    });

    expect(result.source).toBe("model");
    expect(result.manifest.beats.map((beat) => beat.screenId)).toEqual([
      "press-input",
      "press-generate",
      "press-output",
      "feature-summary",
    ]);
    expect(result.manifest.beats.find((beat) => beat.screenId === "press-generate")?.narration).toContain("생성을 누릅니다");
    expect(result.manifest.beats.every((beat) => beat.evidence.length > 0)).toBe(true);
    expect(hasForbiddenClaim("AI가 작성한 보도자료")).toBe(true);
  });

  it("falls back when the model misses a required screen", () => {
    const result = createManifest({
      ...base,
      brief: "뉴스 분석만",
      drafts: [{ screenId: "feature-summary", narration: "표만 보여 줍니다." }],
    });
    expect(result.source).toBe("local");
    expect(result.note).toContain("기본 장면");
    expect(result.manifest.runtime).toEqual({
      capture: "chromium",
      cards: "chromium-html",
      voice: "openai-tts",
      assemble: "ffmpeg",
      review: "ffmpeg+tesseract",
    });
  });

  it("marks a review ready only when captured text and audio match", () => {
    const { manifest } = createManifest({ ...base, brief: "보도자료 초안" });
    const marks = manifest.beats
      .filter((beat) => beat.medium !== "insert")
      .map((beat, index) => ({
        beatId: beat.id,
        screenId: beat.screenId,
        startedAtMs: index * 1000,
        endedAtMs: index * 1000 + 800,
        screenshot: `${beat.id}.png`,
        observedText: beat.observe,
      }));
    expect(buildReviewRecord(manifest, marks, { hasAudio: true, width: 1920, height: 1080, ocrAvailable: true }).ready).toBe(true);
    expect(buildReviewRecord(manifest, marks, { hasAudio: false, width: 1920, height: 1080, ocrAvailable: true }).ready).toBe(false);
  });

  it("freezes the content purpose, evidence, transition and timing for every beat", () => {
    const { manifest } = createManifest({ ...base, brief: "보도자료 초안" });

    expect(contentManifestIssues(manifest)).toEqual([]);
    expect(manifest.timing.estimatedSec).toBeGreaterThan(0);
    expect(manifest.beats.every((beat) => beat.purpose && beat.viewerTakeaway && beat.evidence)).toBe(true);
    expect(manifest.beats.every((beat) => beat.screenAction && beat.transitionReason)).toBe(true);
    expect(manifest.beats.every((beat) => beat.minScreenTimeMs >= beat.estimatedNarrationMs)).toBe(true);
    expect(manifest.beats.every((beat) => beat.action === beat.screenAction && beat.point === beat.viewerTakeaway)).toBe(true);
  });

  it("estimates longer speech as requiring more screen time", () => {
    expect(estimateNarrationMs("짧은 문장입니다.")).toBeLessThan(
      estimateNarrationMs("이 문장은 목적과 근거를 조금 더 자세하고 자연스럽게 설명하는 긴 내레이션입니다."),
    );
  });

  it("carries the structured purpose, audience, track and target duration into the manifest", () => {
    const { manifest } = createManifest({
      ...base,
      brief: {
        purpose: "의사결정권자에게 뉴스 분석 근거를 설명한다.",
        targetAudience: "기관 의사결정권자",
        track: "news",
        targetDurationSec: 90,
      },
    });

    expect(manifest.purpose).toContain("뉴스 분석 근거");
    expect(manifest.audience).toBe("기관 의사결정권자");
    expect(manifest.track).toBe("news");
    expect(manifest.timing.targetSec).toBe(90);
    expect(manifest.beats.map((beat) => beat.screenId)).toContain("news-input");
  });
});

describe("PR Studio 2.0 planning contract", () => {
  const pass = { status: "pass", rationale: "목적에 맞습니다." } as const;
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

  it("allows production only when the decision and every content criterion pass", () => {
    expect(contentReadyForProduction(readyReview)).toBe(true);
    expect(planningRoundReadyForProduction({ decision: "produce", contentReview: readyReview })).toBe(true);
    expect(planningRoundReadyForProduction({ decision: "collect", contentReview: readyReview })).toBe(false);
    expect(
      contentReadyForProduction({
        ...readyReview,
        subtitleFit: { status: "revise", rationale: "자막이 내레이션을 그대로 반복합니다." },
      }),
    ).toBe(false);
  });

  it("validates the structured brief and rejects unbounded input", () => {
    expect(
      videoBriefSchema.parse({
        purpose: "보도자료 작성 흐름을 설명합니다.",
        targetAudience: "홍보 담당자",
        track: "press",
        targetDurationSec: 75,
      }).track,
    ).toBe("press");
    expect(() =>
      videoBriefSchema.parse({
        purpose: "x".repeat(2_001),
        targetAudience: "홍보 담당자",
        track: "press",
      }),
    ).toThrow();
  });
});

describe("Railway video runtime", () => {
  it("uses the container browser flags and Korean font on Railway", () => {
    expect(chromeLaunchArgs({ RAILWAY_ENVIRONMENT: "production" }, "linux")).toContain("--no-sandbox");
    expect(chromeLaunchArgs({}, "win32")).not.toContain("--no-sandbox");
    expect(subtitleFont({}, "linux")).toBe("Noto Sans CJK KR");
    expect(preferSystemFfmpeg("linux")).toBe(true);
  });

  it("keeps the worker script on the same container flags", () => {
    const result = spawnSync(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        `import { chromeLaunchArgs, subtitleFont } from "./scripts/video-runtime.mjs";
         console.log(JSON.stringify({
           args: chromeLaunchArgs({ RAILWAY_ENVIRONMENT: "production" }, "linux"),
           font: subtitleFont({}, "linux")
         }));`,
      ],
      { cwd: process.cwd(), encoding: "utf8" },
    );
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual({
      args: chromeLaunchArgs({ RAILWAY_ENVIRONMENT: "production" }, "linux"),
      font: subtitleFont({}, "linux"),
    });
  });
});
