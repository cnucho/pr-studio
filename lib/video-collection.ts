import { videoFixtures, videoPresets, type VideoTrack } from "./video-beats";
import { chromeLaunchArgs, resolveChrome } from "./video-runtime";
import { analyzeVideoFile } from "./video-analysis";
import type { CollectionEvidence, CollectionOrder, CollectionReport, CollectionReportProvenance } from "./video-planning";

export type CollectionContext = {
  track: VideoTrack;
  round?: 1 | 2 | 3;
  appUrl?: string;
  trustedAppOrigin?: string;
  sourceVideoPath?: string;
  sourceVideoIdentity?: string;
  analysisWorkDir?: string;
  allowedSourceRoot?: string;
};

export type ScreenObservationTarget = {
  tab: VideoTrack;
  heading: string;
};

export type ScreenCollectionScenario = ScreenObservationTarget & {
  version: "screen-interaction-v1";
  inputIdentity: string;
  fields: Array<{ key: string; value: string }>;
  action: string;
  resultMarker: string;
};

const SCREEN_OBSERVATION_TARGETS: Record<VideoTrack, ScreenObservationTarget> = {
  press: { tab: "press", heading: "보도자료 작성기" },
  news: { tab: "news", heading: "뉴스 분석기" },
  youtube: { tab: "youtube", heading: "유튜브 콘텐츠 작성기" },
};

export function screenObservationTarget(track: VideoTrack): ScreenObservationTarget {
  return SCREEN_OBSERVATION_TARGETS[track];
}

const SCREEN_COLLECTION_SCENARIOS: Record<VideoTrack, ScreenCollectionScenario> = {
  press: {
    ...SCREEN_OBSERVATION_TARGETS.press,
    version: "screen-interaction-v1",
    inputIdentity: "press-fixture-v1",
    fields: [
      { key: "policy-name", value: videoFixtures.press.policyName },
      { key: "business", value: videoFixtures.press.business },
      { key: "budget", value: videoFixtures.press.budget },
      { key: "audience", value: videoFixtures.press.audience },
      { key: "expected-effect", value: videoFixtures.press.expectedEffect },
    ],
    action: "press",
    resultMarker: "press-result-ready",
  },
  news: {
    ...SCREEN_OBSERVATION_TARGETS.news,
    version: "screen-interaction-v1",
    inputIdentity: "news-fixture-v1",
    fields: [{ key: "articles", value: videoFixtures.newsArticles }],
    action: "news",
    resultMarker: "news-result-ready",
  },
  youtube: {
    ...SCREEN_OBSERVATION_TARGETS.youtube,
    version: "screen-interaction-v1",
    inputIdentity: "youtube-fixture-v1",
    fields: [
      { key: "policy-text", value: videoFixtures.youtube.policyText },
      { key: "audience", value: videoFixtures.youtube.audience },
      { key: "duration-minutes", value: videoFixtures.youtube.durationMinutes },
    ],
    action: "youtube",
    resultMarker: "youtube-result-ready",
  },
};

export function screenCollectionScenario(track: VideoTrack): ScreenCollectionScenario {
  return SCREEN_COLLECTION_SCENARIOS[track];
}

export function trustedAppTarget(appUrl: string, trustedAppOrigin: string | undefined) {
  if (!trustedAppOrigin) throw new Error("화면 수집 신뢰 origin이 없습니다.");
  const target = new URL(appUrl);
  const trusted = new URL(trustedAppOrigin);
  if (!["http:", "https:"].includes(target.protocol) || !["http:", "https:"].includes(trusted.protocol)) {
    throw new Error("허용되지 않은 앱 화면 주소입니다.");
  }
  if (target.origin !== trusted.origin) throw new Error("앱 화면 주소가 신뢰 origin과 일치하지 않습니다.");
  return target;
}

function available(
  order: CollectionOrder,
  detail: string,
  evidence?: CollectionEvidence[],
  provenance?: CollectionReportProvenance,
): CollectionReport {
  return {
    order: order.instruction,
    capabilityId: order.capabilityId,
    status: "있음",
    detail,
    evidence,
    provenance,
  };
}

function unavailable(order: CollectionOrder, detail: string, provenance?: CollectionReportProvenance): CollectionReport {
  return {
    order: order.instruction,
    capabilityId: order.capabilityId,
    status: "없음",
    detail,
    provenance,
  };
}

export async function collectPlanningOrders(
  orders: CollectionOrder[],
  context: CollectionContext,
): Promise<CollectionReport[]> {
  const track = context.track;
  let screenObservation: Promise<string> | undefined;
  let videoAnalysis: ReturnType<typeof analyzeVideoFile> | undefined;

  const provenance = (
    scenarioVersion: string,
    inputIdentity: string,
    resultMarker?: string,
  ): CollectionReportProvenance => ({
    track,
    round: context.round,
    scenarioVersion,
    inputIdentity,
    resultMarker,
  });

  async function observeAppScreen() {
    if (!context.appUrl) throw new Error("앱 화면 주소가 없습니다.");
    const scenario = screenCollectionScenario(track);
    const parsedUrl = trustedAppTarget(context.appUrl, context.trustedAppOrigin);

    const { chromium } = await import("playwright");
    const executablePath = resolveChrome();
    const browser = await chromium.launch({
      headless: true,
      args: chromeLaunchArgs(process.env, process.platform),
      ...(executablePath ? { executablePath } : {}),
    });
    try {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
      await page.goto(parsedUrl.toString(), { waitUntil: "networkidle", timeout: 30_000 });
      if (new URL(page.url()).origin !== parsedUrl.origin) throw new Error("리디렉션된 화면이 신뢰 origin을 벗어났습니다.");
      await page.locator('[data-pr-studio-collection-contract="v1"]').waitFor({ timeout: 10_000 });
      const button = page.locator(`[data-tab-key="${scenario.tab}"]`);
      await button.click();
      await page.locator(`[data-tab-key="${scenario.tab}"][data-active="true"]`).waitFor({ timeout: 10_000 });
      const activeTool = page.locator(`[data-active-tool="${scenario.tab}"]`);
      await activeTool.waitFor({ timeout: 10_000 });
      await activeTool.getByText(scenario.heading, { exact: true }).first().waitFor({ timeout: 10_000 });
      for (const field of scenario.fields) {
        await activeTool.locator(`[data-collection-field="${field.key}"]`).fill(field.value);
      }
      const action = activeTool.locator(`[data-collection-action="${scenario.action}"]`);
      await action.click();
      const result = activeTool.locator(
        `[data-collection-result="${track}"][data-collection-result-marker="${scenario.resultMarker}"][data-collection-ready="true"]`,
      );
      const error = activeTool.locator(`[data-collection-error="${track}"]`);
      const outcome = await Promise.race([
        result.waitFor({ state: "visible", timeout: 30_000 }).then(() => "ready" as const),
        error.waitFor({ state: "visible", timeout: 30_000 }).then(() => "error" as const),
      ]);
      if (outcome === "error") throw new Error((await error.innerText()).replace(/\s+/g, " ").trim());
      if (await action.getAttribute("data-collection-loading") !== "false") {
        throw new Error("화면 실행이 완료되지 않았습니다.");
      }
      const text = (await result.innerText()).replace(/\s+/g, " ").trim();
      if (!text) throw new Error(`${scenario.heading} 결과 문구를 확인하지 못했습니다.`);
      return text.slice(0, 8_000);
    } finally {
      await browser.close();
    }
  }

  return Promise.all(orders.map(async (order) => {
    if (order.capabilityId === "fixture") {
      const fixture =
        track === "press"
          ? videoFixtures.press
          : track === "news"
            ? { articles: videoFixtures.newsArticles }
            : videoFixtures.youtube;
      return available(order, `${videoPresets[track].label}의 실제 입력 예시가 있습니다.`, [
        { kind: "json", value: JSON.stringify(fixture) },
      ], provenance("fixture-v1", `${track}-fixture-v1`));
    }

    if (order.capabilityId === "preset") {
      return available(order, `${videoPresets[track].label}의 길이, 자막, 음성과 제작 원칙이 있습니다.`, [
        { kind: "json", value: JSON.stringify(videoPresets[track]) },
      ], provenance("preset-v1", `${track}-preset-v1`));
    }

    if (order.capabilityId === "card") {
      return available(
        order,
        "표, 차트 또는 도식은 제작 승인 뒤 HTML 카드로 렌더링하고 최종 검토 단계에서 실제 이미지를 확인할 수 있습니다.",
        undefined,
        provenance("card-capability-v1", `${track}-card-capability-v1`),
      );
    }

    if (order.capabilityId === "screen-observation") {
      try {
        screenObservation ??= observeAppScreen();
        const observedText = await screenObservation;
        const scenario = screenCollectionScenario(track);
        return available(order, `${videoPresets[track].label} 화면에 예시를 입력하고 실행해 실제 결과 문구를 확인했습니다.`, [
          { kind: "text", value: observedText },
        ], provenance(scenario.version, scenario.inputIdentity, scenario.resultMarker));
      } catch (error) {
        const scenario = screenCollectionScenario(track);
        return unavailable(
          order,
          `화면 입력·실행 결과를 확인하지 못했습니다: ${error instanceof Error ? error.message : String(error)}`,
          provenance(scenario.version, scenario.inputIdentity, scenario.resultMarker),
        );
      }
    }

    if (order.capabilityId === "video-analysis") {
      if (!context.sourceVideoPath || !context.analysisWorkDir || !context.allowedSourceRoot) {
        return unavailable(
          order,
          "이 작업에는 분석 가능한 기존 MP4가 없습니다.",
          provenance("video-analysis-v1", context.sourceVideoIdentity ?? "no-source"),
        );
      }
      try {
        videoAnalysis ??= analyzeVideoFile({
          sourceVideoPath: context.sourceVideoPath,
          workDir: context.analysisWorkDir,
          allowedRoot: context.allowedSourceRoot,
        });
        const analysis = await videoAnalysis;
        return available(order, `기존 MP4 ${analysis.durationSec.toFixed(1)}초의 메타데이터, 대표 프레임과 음성을 분석했습니다.`, [
          {
            kind: "json",
            value: JSON.stringify({
              durationSec: analysis.durationSec,
              width: analysis.width,
              height: analysis.height,
              hasAudio: analysis.hasAudio,
              transcriptTruncated: analysis.transcriptTruncated,
              frames: analysis.frames.map((frame) => ({ atSec: frame.atSec, ocrText: frame.ocrText })),
            }),
          },
          ...(analysis.transcript ? [{ kind: "text" as const, value: analysis.transcript }] : []),
          ...analysis.framePaths.map((value) => ({ kind: "file" as const, value })),
        ], provenance("video-analysis-v1", analysis.cacheKey, "video-analysis-complete"));
      } catch (error) {
        return unavailable(
          order,
          `기존 MP4를 분석하지 못했습니다. ${error instanceof Error ? error.message : String(error)}`,
          provenance("video-analysis-v1", context.sourceVideoIdentity ?? "unknown-source"),
        );
      }
    }

    return unavailable(order, "등록된 앱 수집 능력으로 수행할 수 없는 지시입니다.");
  }));
}
