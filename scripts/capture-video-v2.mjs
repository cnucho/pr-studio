import { createRequire } from "node:module";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromeLaunchArgs, resolveChrome } from "./video-runtime.mjs";

const require = createRequire(import.meta.url);
const playwright = require("playwright");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
function argument(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? path.resolve(process.argv[index + 1]) : fallback;
}

const workDir = argument("--work-dir", path.join(root, "video-assets", "v2"));
const manifestPath = argument("--manifest", path.join(workDir, "manifest.json"));
const assetDir = workDir;
const screenDir = path.join(assetDir, "screens");
const appUrl = process.env.PR_STRATEGY_APP_URL ?? process.env.PR_AI_DEMO_URL ?? "http://127.0.0.1:3016";

const tabs = {
  "press-input": ["press", "보도자료 작성기"],
  "press-generate": ["press", "보도자료 작성기"],
  "press-output": ["press", "보도자료 작성기"],
  "news-input": ["news", "뉴스 분석기"],
  "news-analyze": ["news", "뉴스 분석기"],
  "news-output": ["news", "뉴스 분석기"],
  "youtube-input": ["youtube", "유튜브 콘텐츠 작성기"],
  "youtube-generate": ["youtube", "유튜브 콘텐츠 작성기"],
  "youtube-output": ["youtube", "유튜브 콘텐츠 작성기"],
};

function launchOptions() {
  const executablePath = resolveChrome();
  return {
    headless: true,
    args: chromeLaunchArgs(process.env),
    ...(executablePath ? { executablePath } : {}),
  };
}

async function openTab(page, screenId) {
  const tab = tabs[screenId];
  if (!page.__openTab) page.__openTab = "";
  if (page.__openTab === tab[0]) return;
  const button = page.locator(`[data-tab-key="${tab[0]}"]`);
  await button.click();
  await page.locator(`[data-tab-key="${tab[0]}"][data-active="true"]`).waitFor();
  await page.getByText(tab[1], { exact: true }).first().waitFor();
  page.__openTab = tab[0];
}

async function perform(page, beat, fixtures) {
  await openTab(page, beat.screenId);
  if (beat.screenId === "press-input") {
    const policy = page.getByLabel("정책명");
    await policy.fill("");
    await policy.pressSequentially(fixtures.press.policyName, { delay: 20 });
    return;
  }
  if (beat.screenId === "press-generate") {
    await page.getByRole("button", { name: "생성", exact: true }).click();
    await page.getByText("SNS 요약", { exact: true }).waitFor();
    return;
  }
  if (beat.screenId === "news-input") {
    await page.getByLabel("기사 입력").fill(fixtures.newsArticles);
    return;
  }
  if (beat.screenId === "news-analyze") {
    await page.getByRole("button", { name: "분석", exact: true }).click();
    await page.getByText("자동 보고서", { exact: true }).waitFor();
    return;
  }
  if (beat.screenId === "youtube-input") {
    await page.getByLabel("정책자료 텍스트").fill(fixtures.youtube.policyText);
    return;
  }
  if (beat.screenId === "youtube-generate") {
    await page.getByRole("button", { name: "생성", exact: true }).click();
    await page.getByText("YouTube 게시 패키지", { exact: true }).waitFor();
  }
}

async function observedText(page, beat) {
  if (beat.screenId === "press-input") return page.getByLabel("정책명").inputValue();
  if (beat.screenId === "news-input") return page.getByLabel("기사 입력").inputValue();
  if (beat.screenId === "youtube-input") return page.getByLabel("정책자료 텍스트").inputValue();
  return page.getByText(beat.observe).first().innerText();
}

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
await mkdir(screenDir, { recursive: true });
const browser = await playwright.chromium.launch(launchOptions());
const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  recordVideo: { dir: assetDir, size: { width: 1920, height: 1080 } },
});
const page = await context.newPage();
const origin = Date.now();
const marks = [];

try {
  await page.goto(appUrl, { waitUntil: "networkidle" });
  await page.locator("body", { hasText: "PR Studio" }).waitFor();
  for (const beat of manifest.beats.filter((item) => item.medium !== "insert")) {
    const startedAtMs = Date.now() - origin;
    await perform(page, beat, manifest.fixtures);
    const text = await observedText(page, beat);
    if (!text.includes(beat.observe)) {
      throw new Error(`${beat.id} 화면에서 '${beat.observe}'를 확인하지 못했습니다.`);
    }
    const screenshot = path.join(screenDir, `${beat.id}.png`);
    await page.screenshot({ path: screenshot });
    marks.push({
      beatId: beat.id,
      screenId: beat.screenId,
      startedAtMs,
      endedAtMs: Date.now() - origin,
      screenshot,
      observedText: text.slice(0, 500),
    });
  }
} finally {
  const video = page.video();
  await context.close();
  if (video) await video.saveAs(path.join(assetDir, "capture.webm"));
  await browser.close();
}

await writeFile(path.join(assetDir, "capture-log.json"), JSON.stringify({ version: "2.0", marks }, null, 2));
console.log(`captured ${marks.length} beats`);
