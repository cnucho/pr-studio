import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { buildPlanningDossier, buildReviewRecord, createManifest, hasForbiddenClaim, reportCollection, trackForBrief } from "./video-beats";
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
    expect(dossier.screenIds).toContain("news-input");
    expect(dossier.text).toContain("청년 지역정착 패키지");
    expect(dossier.text).toContain("하단 중앙");
    expect(dossier.text).toContain("ko-KR-Chirp3-HD-Kore");
    expect(dossier.text).toContain("news-input");
    expect(reportCollection("경쟁사 내부 매출표").status).toBe("없음");
    expect(reportCollection("자막 글자 크기").status).toBe("있음");
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
      voice: "google-tts",
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
