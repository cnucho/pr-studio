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
  await page.goto(appUrl, { waitUntil: "load" });
  await page.getByText("PR Studio | 홍보물제작소", { exact: true }).waitFor();
}

async function captureStage(page, buttonName, filename) {
  await page.getByRole("button", { name: buttonName, exact: true }).click();
  await page.waitForTimeout(1100);
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

  await clickUnique(page, "button", "보도자료");
  await page.waitForTimeout(600);
  await captureViewport(page, "press-input.png");
  await clickUnique(page, "button", "생성");
  await page.getByText("SNS 요약", { exact: true }).waitFor();
  await page.waitForTimeout(700);
  await captureViewport(page, "press-output.png");

  await clickUnique(page, "button", "뉴스 분석");
  await page.waitForTimeout(600);
  await captureViewport(page, "news-input.png");
  await clickUnique(page, "button", "분석");
  await page.getByText("자동 보고서", { exact: true }).waitFor();
  await page.waitForTimeout(700);
  await captureViewport(page, "news-output.png");

  await clickUnique(page, "button", "유튜브 제작");
  await page.waitForTimeout(600);
  await captureViewport(page, "youtube-input.png");
  await clickUnique(page, "button", "생성");
  await page.getByText("YouTube 게시 패키지", { exact: true }).waitFor();
  await page.waitForTimeout(700);
  await captureViewport(page, "youtube-output.png");

  await clickUnique(page, "button", "AI 글쓰기");
  await page.waitForTimeout(600);
  await captureViewport(page, "writing-input.png");
  await clickUnique(page, "button", "설계");
  await page.getByText("ReportDesk / gWriter Handoff", { exact: true }).waitFor();
  await page.waitForTimeout(700);
  await captureViewport(page, "writing-output.png");

  await clickUnique(page, "button", "타겟팅 전략");
  await page.getByText("상태 기반 마이크로타겟팅", { exact: true }).waitFor();
  await page.waitForTimeout(700);
  await captureViewport(page, "targeting-strategy.png");

  await clickUnique(page, "button", "성과 수집");
  await page.getByText("YouTube 성과 수집기", { exact: true }).waitFor();
  await page.waitForTimeout(700);
  await captureViewport(page, "performance-collector.png");

  await clickUnique(page, "button", "영상 스튜디오");
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
