import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "video-assets", "screens");
const require = createRequire(import.meta.url);

const playwrightCandidates = [
  path.join(root, "node_modules", "playwright"),
  "C:/git-app/CI Plan Builder/node_modules/playwright",
  "C:/git-app/AcademicResearchCopilot/node_modules/playwright",
];

let playwright;
for (const candidate of playwrightCandidates) {
  try {
    playwright = require(candidate);
    break;
  } catch {
    // Try the next local workspace dependency.
  }
}

if (!playwright) {
  throw new Error("Playwright를 찾을 수 없습니다.");
}

const chromePath = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const appUrl =
  process.env.PR_STRATEGY_APP_URL ??
  process.env.PR_AI_DEMO_URL ??
  "http://127.0.0.1:3016";

async function waitForApp(page) {
  await page.goto(appUrl, { waitUntil: "networkidle" });
  await page.locator("body", { hasText: "PR Studio" }).waitFor();
  await page.locator("body", { hasText: "홍보물제작소" }).waitFor();
  await page.locator("[data-tab-key='film']").waitFor();
  await page.waitForTimeout(1200);
}

async function captureStage(page, buttonName, filename) {
  const titleText = buttonName.replace(/^\d+\s+/, "");
  const locator = page.getByRole("button").filter({ hasText: titleText }).first();
  await locator.waitFor();
  await locator.click();
  await page.locator(".stage-aspect h2", { hasText: titleText }).waitFor();
  await page.waitForTimeout(950);
  await page.addStyleTag({
    content: ".caption-glass{display:none!important}",
  });
  await page.locator(".stage-aspect").screenshot({
    path: path.join(outDir, filename),
  });
}

async function captureViewport(page, filename) {
  await page.screenshot({
    path: path.join(outDir, filename),
    fullPage: false,
  });
}

async function clickUnique(page, role, name) {
  const locator = page.getByRole(role, { name, exact: true });
  await locator.waitFor();
  const count = await locator.count();
  if (count !== 1) {
    throw new Error(`${name} 요소 수가 ${count}개입니다.`);
  }
  await locator.click();
}

async function clickPrimaryNav(page, name) {
  const tabKeys = new Map([
    ["영상 스튜디오", { key: "film", text: "영상 스튜디오" }],
    ["보도자료", { key: "press", text: "보도자료 작성기" }],
    ["뉴스 분석", { key: "news", text: "뉴스 분석기" }],
    ["유튜브 제작", { key: "youtube", text: "유튜브 콘텐츠 작성기" }],
    ["AI 글쓰기", { key: "writing", text: "AI 친화 글쓰기 설계" }],
    ["타겟팅 전략", { key: "targeting", text: "상태 기반 마이크로타겟팅" }],
    ["성과 수집", { key: "performance", text: "YouTube 성과 수집기" }],
  ]);
  const tab = tabKeys.get(name);
  if (!tab) {
    throw new Error(`${name} 탭 키를 찾을 수 없습니다.`);
  }

  const navButton = page.locator(`[data-tab-key="${tab.key}"]`);
  await navButton.waitFor({ state: "visible" });

  for (let attempt = 0; attempt < 5; attempt += 1) {
    await navButton.click();
    try {
      await page.locator(`[data-tab-key="${tab.key}"][data-active="true"]`).waitFor({
        timeout: 2200,
      });
      await page.locator("body", { hasText: tab.text }).waitFor({ timeout: 2200 });
      await page.waitForTimeout(650);
      return;
    } catch {
      await page.waitForTimeout(500);
    }
  }

  throw new Error(`${name} 탭으로 이동하지 못했습니다.`);
}

await mkdir(outDir, { recursive: true });

const browser = await playwright.chromium.launch({
  headless: true,
  executablePath: chromePath,
  args: ["--disable-dev-shm-usage", "--font-render-hinting=none"],
});

const page = await browser.newPage({
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 1,
});

try {
  await waitForApp(page);

  await captureStage(
    page,
    "1 AI 시대 홍보담당자는 왜 앱을 만들어야 하는가",
    "scene-01-pipeline.png",
  );
  await captureStage(
    page,
    "2 홍보업무는 너무 전문적입니다",
    "scene-02-specialized.png",
  );
  await captureStage(
    page,
    "3 작은 시장의 업무는 제품이 되기 어렵습니다",
    "scene-03-market.png",
  );

  await clickPrimaryNav(page, "보도자료");
  await page.waitForTimeout(600);
  await captureViewport(page, "press-input.png");
  await clickUnique(page, "button", "생성");
  await page.getByText("SNS 요약", { exact: true }).waitFor();
  await page.waitForTimeout(700);
  await captureViewport(page, "press-output.png");

  await clickPrimaryNav(page, "뉴스 분석");
  await page.waitForTimeout(600);
  await captureViewport(page, "news-input.png");
  await clickUnique(page, "button", "분석");
  await page.getByText("자동 보고서", { exact: true }).waitFor();
  await page.waitForTimeout(700);
  await captureViewport(page, "news-output.png");

  await clickPrimaryNav(page, "유튜브 제작");
  await page.waitForTimeout(600);
  await captureViewport(page, "youtube-input.png");
  await clickUnique(page, "button", "생성");
  await page.getByText("YouTube 게시 패키지", { exact: true }).waitFor();
  await page.waitForTimeout(700);
  await captureViewport(page, "youtube-output.png");

  await clickPrimaryNav(page, "AI 글쓰기");
  await page.waitForTimeout(600);
  await captureViewport(page, "writing-input.png");
  await clickUnique(page, "button", "설계");
  await page.getByText("ReportDesk / gWriter Handoff", { exact: true }).waitFor();
  await page.waitForTimeout(700);
  await captureViewport(page, "writing-output.png");

  await clickPrimaryNav(page, "타겟팅 전략");
  await page.getByText("상태 기반 마이크로타겟팅", { exact: true }).waitFor();
  await page.waitForTimeout(700);
  await captureViewport(page, "targeting-strategy.png");

  await clickPrimaryNav(page, "성과 수집");
  await page.getByText("YouTube 성과 수집기", { exact: true }).waitFor();
  await page.waitForTimeout(700);
  await captureViewport(page, "performance-collector.png");

  await clickPrimaryNav(page, "영상 스튜디오");
  await page.waitForTimeout(500);
  await captureStage(page, "10 경쟁의 축이 바뀝니다", "scene-10-future.png");
  await captureStage(
    page,
    "11 홍보용 AI를 만드는 홍보담당자",
    "scene-11-final.png",
  );
} finally {
  await browser.close();
}

console.log(`Captured storyboard screens to ${outDir}`);
