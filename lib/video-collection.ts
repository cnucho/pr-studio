import { videoFixtures, videoPresets, trackForBrief } from "./video-beats";
import { chromeLaunchArgs, resolveChrome } from "./video-runtime";
import { analyzeVideoFile } from "./video-analysis";
import type { CollectionEvidence, CollectionOrder, CollectionReport } from "./video-planning";

export type CollectionContext = {
  brief: string;
  appUrl?: string;
  sourceVideoPath?: string;
  analysisWorkDir?: string;
  allowedSourceRoot?: string;
};

function available(order: CollectionOrder, detail: string, evidence?: CollectionEvidence[]): CollectionReport {
  return {
    order: order.instruction,
    capabilityId: order.capabilityId,
    status: "있음",
    detail,
    evidence,
  };
}

function unavailable(order: CollectionOrder, detail: string): CollectionReport {
  return {
    order: order.instruction,
    capabilityId: order.capabilityId,
    status: "없음",
    detail,
  };
}

export async function collectPlanningOrders(
  orders: CollectionOrder[],
  context: CollectionContext,
): Promise<CollectionReport[]> {
  const track = trackForBrief(context.brief);
  let screenObservation: Promise<string> | undefined;

  async function observeAppScreen() {
    if (!context.appUrl) throw new Error("앱 화면 주소가 없습니다.");
    const target = {
      press: { tab: "press", heading: "보도자료 작성기" },
      news: { tab: "news", heading: "뉴스 분석기" },
      youtube: { tab: "youtube", heading: "유튜브 콘텐츠 작성기" },
    }[track];
    const parsedUrl = new URL(context.appUrl);
    if (!["http:", "https:"].includes(parsedUrl.protocol)) throw new Error("허용되지 않은 앱 화면 주소입니다.");

    const { chromium } = await import("playwright");
    const executablePath = resolveChrome();
    const browser = await chromium.launch({
      headless: true,
      args: chromeLaunchArgs(process.env, process.platform),
      ...(executablePath ? { executablePath } : {}),
    });
    try {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
      await page.goto(parsedUrl.origin, { waitUntil: "networkidle", timeout: 30_000 });
      const button = page.locator(`[data-tab-key="${target.tab}"]`);
      await button.click();
      await page.locator(`[data-tab-key="${target.tab}"][data-active="true"]`).waitFor({ timeout: 10_000 });
      const activeTool = page.locator(`[data-active-tool="${target.tab}"]`);
      await activeTool.waitFor({ timeout: 10_000 });
      await activeTool.getByText(target.heading, { exact: true }).first().waitFor({ timeout: 10_000 });
      const text = (await activeTool.innerText()).replace(/\s+/g, " ").trim();
      if (!text.includes(target.heading)) throw new Error(`${target.heading} 화면을 확인하지 못했습니다.`);
      return text.slice(0, 4_000);
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
      ]);
    }

    if (order.capabilityId === "preset") {
      return available(order, `${videoPresets[track].label}의 길이, 자막, 음성과 제작 원칙이 있습니다.`, [
        { kind: "json", value: JSON.stringify(videoPresets[track]) },
      ]);
    }

    if (order.capabilityId === "card") {
      return available(order, "표, 차트 또는 도식이 콘텐츠 이해에 필요하면 제작 단계에서 HTML 카드로 렌더링할 수 있습니다.");
    }

    if (order.capabilityId === "screen-observation") {
      try {
        screenObservation ??= observeAppScreen();
        const observedText = await screenObservation;
        return available(order, `${videoPresets[track].label} 화면을 Chromium으로 열어 실제 표시 문구를 확인했습니다.`, [
          { kind: "text", value: observedText },
        ]);
      } catch (error) {
        return unavailable(order, `화면을 관찰하지 못했습니다: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    if (order.capabilityId === "video-analysis") {
      if (!context.sourceVideoPath || !context.analysisWorkDir || !context.allowedSourceRoot) {
        return unavailable(order, "이 작업에는 분석 가능한 기존 MP4가 없습니다.");
      }
      try {
        const analysis = await analyzeVideoFile({
          sourceVideoPath: context.sourceVideoPath,
          workDir: context.analysisWorkDir,
          allowedRoot: context.allowedSourceRoot,
        });
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
        ]);
      } catch (error) {
        return unavailable(order, `기존 MP4를 분석하지 못했습니다. ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return unavailable(order, "등록된 앱 수집 능력으로 수행할 수 없는 지시입니다.");
  }));
}
