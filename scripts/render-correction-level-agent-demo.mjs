import fs from "node:fs";
import { mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");
const require = createRequire(import.meta.url);

const textAppUrl =
  process.env.TEXT_ANALYSIS_DEMO_URL ??
  "http://127.0.0.1:5173/?view=reflection&demo=repair-hard";
const prStudioUrl =
  process.env.PR_STUDIO_DEMO_URL ??
  "http://127.0.0.1:3026/?tab=performance";
const validationUrl =
  process.env.INSIGHT_VALIDATION_URL ??
  "http://127.0.0.1:4020";

const outRoot = path.join(root, "out", "correction-level-agent-demo");
const rawScreenRoot = path.join(outRoot, "screens", "raw");
const slideRoot = path.join(outRoot, "screens", "slides");
const audioRoot = path.join(outRoot, "audio");
const clipRoot = path.join(outRoot, "clips");
const narrationRoot = path.join(outRoot, "narration");
const finalPath = path.join(outRoot, "correction-level-agent-demo.mp4");
const concatPath = path.join(outRoot, "concat.txt");
const reportPath = path.join(outRoot, "render-report.json");
const sampleFramePath = path.join(outRoot, "sample-frame.png");

const playwrightCandidates = [
  path.join(root, "node_modules", "playwright"),
  "C:/git-app/CI Plan Builder/node_modules/playwright",
  "C:/git-app/AcademicResearchCopilot/node_modules/playwright",
];

const chromePath = "C:/Program Files/Google/Chrome/Application/chrome.exe";

function resolvePlaywright() {
  for (const candidate of playwrightCandidates) {
    try {
      return require(candidate);
    } catch {
      // Try the next workspace dependency.
    }
  }

  throw new Error("Could not find Playwright in the configured workspace candidates.");
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    shell: false,
    ...options,
  });

  if (result.status !== 0) {
    throw new Error(`${command} failed with exit code ${result.status}`);
  }
}

function capture(command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    shell: false,
  });

  if (result.status !== 0) {
    throw new Error(result.stderr || `${command} failed`);
  }

  return result.stdout.trim();
}

function ffmpegPath(value) {
  return value.replaceAll("\\", "/");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function imageDataUrl(value) {
  const extension = path.extname(value).toLowerCase();
  const mime = extension === ".jpg" || extension === ".jpeg" ? "image/jpeg" : "image/png";
  return `data:${mime};base64,${fs.readFileSync(value).toString("base64")}`;
}

async function ensureDirs() {
  await mkdir(rawScreenRoot, { recursive: true });
  await mkdir(slideRoot, { recursive: true });
  await mkdir(audioRoot, { recursive: true });
  await mkdir(clipRoot, { recursive: true });
  await mkdir(narrationRoot, { recursive: true });
}

async function waitForHttp(url, label) {
  const deadline = Date.now() + 25_000;
  let lastError = "";

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(4_000) });
      if (response.ok) return;
      lastError = `${response.status} ${response.statusText}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }

    await new Promise((resolve) => setTimeout(resolve, 800));
  }

  throw new Error(`${label} is not reachable at ${url}: ${lastError}`);
}

async function clickIfVisible(locator, timeout = 1800) {
  try {
    await locator.first().waitFor({ state: "visible", timeout });
    await locator.first().click();
    return true;
  } catch {
    return false;
  }
}

async function captureTextAnalysis(page) {
  await page.goto(textAppUrl, { waitUntil: "networkidle" });
  await page.waitForTimeout(1100);

  if (process.env.RUN_TEXT_ANALYSIS_REPAIR === "true") {
    const runButton = page.getByRole("button", { name: /Run|redo|AI judging/i }).first();
    if (await clickIfVisible(runButton, 2500)) {
      await page.waitForFunction(
        () => ![...document.querySelectorAll("button")].some(
          (button) => button.textContent?.includes("AI judging"),
        ),
        { timeout: 18_000 },
      ).catch(() => {});
      await page.waitForTimeout(900);
    }
  }

  await page.screenshot({
    path: path.join(rawScreenRoot, "text-analysis-repair.png"),
    fullPage: false,
  });
}

async function capturePrStudio(page) {
  await page.goto(prStudioUrl, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(500);

  const textareas = page.locator("textarea");
  const textareaCount = await textareas.count();
  if (textareaCount > 0) {
    await textareas.nth(textareaCount - 1).fill([
      "제목은 좋아 보이지만 실제 영상은 무엇을 얻을 수 있는지 불명확합니다.",
      "댓글에서는 근거 자료와 한계 조건을 더 분명히 요구하고 있습니다.",
      "다음 영상은 제목만 바꾸기보다 설명 구조와 고정 댓글 FAQ를 함께 고쳐야 합니다.",
      "타깃 자체를 바꿀 정도는 아니지만, 신뢰 회복 프레임을 보강해야 합니다.",
    ].join("\n"));
  }

  const judgeButton =
    page.getByRole("button", { name: /수정|판단|judge|repair/i }).last();
  if (!(await clickIfVisible(judgeButton, 2000))) {
    await page.locator("button.bg-coral").last().click().catch(() => {});
  }

  await page.waitForTimeout(1200);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(500);

  await page.screenshot({
    path: path.join(rawScreenRoot, "pr-studio-feedback-repair.png"),
    fullPage: false,
  });
}

async function captureValidationUi(page) {
  await page.goto(validationUrl, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await page.screenshot({
    path: path.join(rawScreenRoot, "validation-server.png"),
    fullPage: false,
  });
}

function summarizeValidation(validation) {
  const assessment = validation.assessment ?? {};
  const reports = validation.reports ?? {};
  const resultFlags = reports.analysis?.result?.flags ?? [];
  const evidenceCodes = new Set();

  for (const flag of resultFlags) {
    if (flag?.code) evidenceCodes.add(flag.code);
  }

  for (const dimension of Object.values(assessment.dimensions ?? {})) {
    for (const code of dimension?.evidence_codes ?? []) {
      evidenceCodes.add(code);
    }
  }

  return {
    validation_id: validation.validation_id,
    status: validation.status,
    release_decision: assessment.release_decision ?? "unknown",
    headline: assessment.headline ?? "Validation completed.",
    evidence_codes: [...evidenceCodes],
    required_next_steps: assessment.required_next_steps ?? [],
  };
}

async function runValidationDemo() {
  const casesResponse = await fetch(`${validationUrl.replace(/\/$/, "")}/api/demo-cases`);
  if (!casesResponse.ok) {
    throw new Error(`Demo cases request failed: ${casesResponse.status}`);
  }

  const casesJson = await casesResponse.json();
  const cases = casesJson.cases ?? [];
  const preferred =
    cases.find((item) => item.case_id === "cell_sum_001") ??
    cases.find((item) => /cell|base|sum/i.test(item.case_id)) ??
    cases[0];

  if (!preferred?.request) {
    throw new Error("No validation demo case with a request payload was found.");
  }

  const validateResponse = await fetch(`${validationUrl.replace(/\/$/, "")}/api/validate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(preferred.request),
  });

  if (!validateResponse.ok) {
    const message = await validateResponse.text().catch(() => validateResponse.statusText);
    throw new Error(`Validation request failed: ${message}`);
  }

  return {
    case_id: preferred.case_id,
    description: preferred.description,
    summary: summarizeValidation(await validateResponse.json()),
  };
}

async function captureApps(playwright) {
  await waitForHttp(textAppUrl, "Text Analysis Copilot");
  await waitForHttp(prStudioUrl, "PR Studio");
  await waitForHttp(validationUrl, "Insight Validation Server");

  const launchOptions = {
    headless: true,
    args: ["--disable-dev-shm-usage", "--font-render-hinting=none"],
  };
  if (fs.existsSync(chromePath)) {
    launchOptions.executablePath = chromePath;
  }

  const browser = await playwright.chromium.launch(launchOptions);
  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
  });

  try {
    await captureTextAnalysis(page);
    await capturePrStudio(page);
    await captureValidationUi(page);
  } finally {
    await browser.close();
  }
}

function buildSlides(validationDemo) {
  const validation = validationDemo.summary;
  const evidenceCodes = validation.evidence_codes.length
    ? validation.evidence_codes
    : ["BASE_N_MISMATCH", "CELL_SUM_MISMATCH"];

  return [
    {
      id: "01-question",
      eyebrow: "LECTURE DEMO",
      title: "무엇이 실제로 쓰이는 AI 앱을 만드나?",
      subtitle: "기능 수가 아니라 신뢰, 자동화, 유용성의 균형이 좌우합니다.",
      bullets: [
        "옵션을 많이 주면 사용자는 방법론을 떠안습니다.",
        "완전 자동화는 검증 불안을 만듭니다.",
        "유용성은 결과가 현실 문제와 맞물릴 때 생깁니다.",
      ],
      chips: ["Trust", "Automation", "Usefulness"],
      narration:
        "이 앱들을 만들어 학회에서 소개하고 주변에서 쓰기 시작하면서 본 것이 있습니다. 실제로 쓰이게 만드는 것은 기능 수가 아니라 신뢰, 자동화, 유용성의 균형이었습니다. 옵션을 많이 주면 방법론을 떠안긴다고 느끼고, 모두 자동으로 처리하면 맞는지 확인하기 어렵습니다.",
    },
    {
      id: "02-frame",
      eyebrow: "CORE FRAME",
      title: "에이전트의 다음 단계는 실행보다 판단입니다",
      subtitle: "코드 수정, 규칙 수정, 이론 수정, 질문 수정은 서로 다른 층위의 개입입니다.",
      bullets: [
        "낮은 층위: 오류 수정, 파라미터 조정, 문장 다듬기",
        "중간 층위: 기준, 코드북, 메시지 프레임 수정",
        "높은 층위: 모형, 설명 체계, 연구 질문 재검토",
      ],
      chips: ["Correction Level", "Guardrails", "Coherence"],
      narration:
        "다음 세대 에이전트의 핵심은 실행 자체보다 어느 수준에서 수정해야 하는가를 판단하는 데 있습니다. 코드만 고칠지, 규칙을 고칠지, 이론이나 질문을 다시 볼지 판단할 수 있어야 실제 업무에서 쓸 수 있습니다.",
    },
    {
      id: "03-text-analysis",
      eyebrow: "APP 1 · TEXT ANALYSIS COPILOT",
      title: "결과가 약할 때, 앱이 수정 층위를 고릅니다",
      subtitle: "먼저 코딩 규칙을 고치고, 부족하면 이론/코드북 수준으로 올라갑니다.",
      bullets: [
        "AI가 처음부터 이론을 바꾸지 않고 낮은 층위부터 점검합니다.",
        "수정 과정은 사용자에게 감사 로그로 남습니다.",
        "핵심은 '수정한다'가 아니라 '어느 수준인지 판단한다'입니다.",
      ],
      image: path.join(rawScreenRoot, "text-analysis-repair.png"),
      chips: ["Autonomous repair", "Step-up repair", "Audit"],
      narration:
        "첫 번째 예는 텍스트 분석기입니다. 여기서는 결과가 약할 때 사람이 먼저 판단하지 않고, 앱이 코딩 규칙 수정부터 시작해 필요하면 이론이나 코드북 수준까지 올라갑니다. 중요한 점은 수정한다가 아니라 어느 수준을 수정할지 판단한다는 것입니다.",
    },
    {
      id: "04-pr-studio",
      eyebrow: "APP 2 · PR STUDIO",
      title: "피드백을 보고 다음 수정 수준을 판단합니다",
      subtitle: "댓글과 반응을 읽고 제목, 설명 구조, 메시지 프레임, 타깃 중 어디를 고칠지 정합니다.",
      bullets: [
        "영상 품질을 한 번에 최대화하는 것이 목표가 아닙니다.",
        "피드백의 의미를 해석해 다음 실험 수준을 고릅니다.",
        "가드레일은 과잉 수정과 잘못된 일반화를 막습니다.",
      ],
      image: path.join(rawScreenRoot, "pr-studio-feedback-repair.png"),
      chips: ["Feedback repair", "Next experiment", "Guardrails"],
      narration:
        "두 번째 예는 PR Studio입니다. 유튜브 영상 품질을 한 번에 최대화하는 것이 핵심이 아닙니다. 댓글과 반응을 읽고 제목만 바꿀지, 설명 구조를 바꿀지, 메시지 프레임이나 타깃 자체를 바꿀지 판단하는 것이 핵심입니다. 가드레일은 그 판단이 과잉 수정으로 흐르지 않게 잡아주는 장치입니다.",
    },
    {
      id: "05-validation-ui",
      eyebrow: "APP 3 · INSIGHT VALIDATION SERVER",
      title: "정답률보다 중요한 것은 사용 가능한 정합성입니다",
      subtitle: "분석 결과, 설계, 해석, 사용 목적이 서로 맞는지 검증합니다.",
      bullets: [
        "결과가 그럴듯해도 내부 숫자가 맞지 않으면 공개할 수 없습니다.",
        "방법이 질문에 맞는지, 해석이 근거에 맞는지 따로 봅니다.",
        "정합성은 완전한 진리가 아니라 현실 사용을 위한 검증 장치입니다.",
      ],
      image: path.join(rawScreenRoot, "validation-server.png"),
      chips: ["Validity", "Release decision", "Use boundary"],
      narration:
        "마지막 예는 검증 서버입니다. 여기서는 결과가 그럴듯한 문장인지가 아니라, 분석 결과가 내부적으로 맞는지, 설계와 방법이 맞는지, 사용 목적에 공개해도 되는지를 따집니다. 이것이 강의에서 말한 정합성 판단의 한 예입니다.",
    },
    {
      id: "06-validation-result",
      eyebrow: `LIVE VALIDATION · ${validationDemo.case_id}`,
      title: validation.release_decision === "do_not_release"
        ? "검증 결과: 공개하지 말아야 합니다"
        : `검증 결과: ${validation.release_decision}`,
      subtitle: validation.headline,
      bullets: [
        `status: ${validation.status}`,
        `release decision: ${validation.release_decision}`,
        `evidence: ${evidenceCodes.slice(0, 4).join(", ")}`,
      ],
      chips: evidenceCodes.slice(0, 3),
      validationCard: {
        caseId: validationDemo.case_id,
        codes: evidenceCodes,
        nextSteps: validation.required_next_steps.slice(0, 3),
      },
      narration:
        "실제 데모 케이스를 검증하면 베이스 엔과 셀 합계가 맞지 않아 공개하지 말라는 결론이 나옵니다. 이것은 AI가 문장을 잘 쓰는지의 문제가 아닙니다. 결과가 다른 요소들과 맞물려 사용할 수 있는지의 문제입니다.",
    },
    {
      id: "07-close",
      eyebrow: "TAKEAWAY",
      title: "AI의 정보력과 실행력, 인간의 상상력이 만나는 지점",
      subtitle: "미래의 혁신은 가능성 탐색과 사용 가능성 판단을 함께 요구합니다.",
      bullets: [
        "인간은 문제의 경계를 열어 주고, AI는 넓게 탐색합니다.",
        "AI는 결과를 구체적으로 보여 주고 반복 실행합니다.",
        "마지막 질문은 '맞는가'뿐 아니라 '이 맥락에서 쓸 수 있는가'입니다.",
      ],
      chips: ["Imagination", "Exploration", "Validation"],
      narration:
        "그래서 다음 세대 에이전트의 질문은 AI가 해 주는가에서 끝나지 않습니다. AI가 어느 수준의 문제인지 판단하고, 사람은 그 판단이 업무 목적과 사회적 맥락에 맞는지 볼 수 있어야 합니다. 완전한 정답은 없지만, 정합성 검증은 그 판단을 현실의 사용 가능성 쪽으로 끌어오는 최소한의 장치입니다.",
    },
  ];
}

function slideHtml(slide, index, total) {
  const imageMarkup = slide.image
    ? `<div class="media-frame"><img src="${imageDataUrl(slide.image)}" alt=""></div>`
    : "";
  const bullets = slide.bullets.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  const chips = slide.chips.map((item) => `<span>${escapeHtml(item)}</span>`).join("");
  const validationCard = slide.validationCard
    ? `<div class="validation-card">
        <div>
          <small>Case</small>
          <strong>${escapeHtml(slide.validationCard.caseId)}</strong>
        </div>
        <div>
          <small>Blocking flags</small>
          <strong>${escapeHtml(slide.validationCard.codes.join(" · "))}</strong>
        </div>
        <div>
          <small>Required next step</small>
          <p>${escapeHtml(slide.validationCard.nextSteps[0] ?? "Review before release.")}</p>
        </div>
      </div>`
    : "";

  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      width: 1920px;
      height: 1080px;
      overflow: hidden;
      font-family: "Malgun Gothic", "Noto Sans KR", "Segoe UI", Arial, sans-serif;
      color: #172126;
      background: #f3efe7;
      letter-spacing: 0;
    }
    .slide {
      position: relative;
      width: 1920px;
      height: 1080px;
      padding: 74px 88px 64px;
      background:
        linear-gradient(120deg, rgba(237, 95, 72, 0.08), transparent 42%),
        linear-gradient(180deg, #f8f5ef 0%, #ece7dc 100%);
    }
    .slide::before {
      content: "";
      position: absolute;
      inset: 34px;
      border: 1px solid rgba(23, 33, 38, 0.12);
      pointer-events: none;
    }
    .kicker {
      display: inline-flex;
      align-items: center;
      height: 38px;
      padding: 0 16px;
      border-radius: 6px;
      background: #172126;
      color: #ffffff;
      font-size: 18px;
      font-weight: 800;
      letter-spacing: 0.05em;
    }
    .layout {
      display: grid;
      grid-template-columns: ${slide.image ? "0.86fr 1.14fr" : "1fr"};
      gap: 56px;
      align-items: center;
      height: 820px;
      margin-top: 36px;
    }
    h1 {
      margin: 0;
      font-size: ${slide.image ? "60px" : "82px"};
      line-height: 1.13;
      letter-spacing: 0;
      max-width: ${slide.image ? "760px" : "1400px"};
    }
    .subtitle {
      margin: 28px 0 0;
      max-width: ${slide.image ? "760px" : "1280px"};
      color: #566066;
      font-size: ${slide.image ? "29px" : "34px"};
      line-height: 1.48;
      font-weight: 650;
    }
    ul {
      display: grid;
      gap: 18px;
      margin: 36px 0 0;
      padding: 0;
      list-style: none;
      max-width: ${slide.image ? "740px" : "1180px"};
    }
    li {
      position: relative;
      padding-left: 34px;
      font-size: ${slide.image ? "25px" : "31px"};
      line-height: 1.38;
      font-weight: 720;
      color: #243035;
    }
    li::before {
      content: "";
      position: absolute;
      left: 0;
      top: 0.58em;
      width: 13px;
      height: 13px;
      border-radius: 50%;
      background: #ed5f48;
    }
    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-top: 38px;
    }
    .chips span {
      display: inline-flex;
      align-items: center;
      height: 42px;
      padding: 0 16px;
      border: 1px solid rgba(23, 33, 38, 0.16);
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.72);
      color: #172126;
      font-size: 19px;
      font-weight: 800;
    }
    .media-frame {
      height: 726px;
      border: 10px solid #172126;
      border-radius: 8px;
      background: #ffffff;
      box-shadow: 0 24px 70px rgba(23, 33, 38, 0.22);
      overflow: hidden;
    }
    .media-frame img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      object-position: center center;
      display: block;
    }
    .validation-card {
      display: grid;
      gap: 18px;
      width: 900px;
      margin-top: 44px;
      padding: 34px;
      border-radius: 8px;
      background: #172126;
      color: #ffffff;
      box-shadow: 0 24px 70px rgba(23, 33, 38, 0.22);
    }
    .validation-card small {
      display: block;
      color: rgba(255,255,255,0.55);
      font-size: 18px;
      font-weight: 800;
      text-transform: uppercase;
    }
    .validation-card strong {
      display: block;
      margin-top: 8px;
      font-size: 30px;
      line-height: 1.25;
      color: #ffffff;
    }
    .validation-card p {
      margin: 8px 0 0;
      font-size: 25px;
      line-height: 1.38;
      color: rgba(255,255,255,0.82);
      font-weight: 650;
    }
    .progress {
      position: absolute;
      left: 88px;
      right: 88px;
      bottom: 36px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      color: rgba(23, 33, 38, 0.54);
      font-size: 18px;
      font-weight: 800;
    }
    .bar {
      width: 520px;
      height: 6px;
      border-radius: 999px;
      background: rgba(23, 33, 38, 0.12);
      overflow: hidden;
    }
    .bar span {
      display: block;
      width: ${(index / total) * 100}%;
      height: 100%;
      background: #ed5f48;
    }
  </style>
</head>
<body>
  <main class="slide">
    <div class="kicker">${escapeHtml(slide.eyebrow)}</div>
    <section class="layout">
      <div>
        <h1>${escapeHtml(slide.title)}</h1>
        <p class="subtitle">${escapeHtml(slide.subtitle)}</p>
        <ul>${bullets}</ul>
        <div class="chips">${chips}</div>
        ${validationCard}
      </div>
      ${imageMarkup}
    </section>
    <div class="progress">
      <span>Correction-Level Agent Demo</span>
      <div class="bar"><span></span></div>
      <span>${String(index).padStart(2, "0")} / ${String(total).padStart(2, "0")}</span>
    </div>
  </main>
</body>
</html>`;
}

async function renderSlides(playwright, slides) {
  const launchOptions = {
    headless: true,
    args: ["--disable-dev-shm-usage", "--font-render-hinting=none"],
  };
  if (fs.existsSync(chromePath)) {
    launchOptions.executablePath = chromePath;
  }

  const browser = await playwright.chromium.launch(launchOptions);
  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
  });

  try {
    for (const [index, slide] of slides.entries()) {
      await page.setContent(slideHtml(slide, index + 1, slides.length), {
        waitUntil: "networkidle",
      });
      await page.screenshot({
        path: path.join(slideRoot, `${slide.id}.png`),
        fullPage: false,
      });
    }
  } finally {
    await browser.close();
  }
}

function audioDuration(file) {
  const output = capture("ffprobe", [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "default=noprint_wrappers=1:nokey=1",
    file,
  ]);
  return Number.parseFloat(output);
}

async function makeAudio(slides) {
  for (const slide of slides) {
    const textPath = path.join(narrationRoot, `${slide.id}.txt`);
    const wavPath = path.join(audioRoot, `${slide.id}.wav`);
    await writeFile(textPath, slide.narration, "utf8");
    run("node", [
      path.join(root, "scripts", "synthesize-speech.mjs"),
      "--input",
      textPath,
      "--output",
      wavPath,
    ]);
    slide.audio = wavPath;
    slide.duration = audioDuration(wavPath) + 0.55;
  }
}

async function makeClips(slides) {
  const concatLines = [];

  for (const slide of slides) {
    const imagePath = path.join(slideRoot, `${slide.id}.png`);
    const clipPath = path.join(clipRoot, `${slide.id}.mp4`);
    slide.video = clipPath;

    run("ffmpeg", [
      "-y",
      "-loop",
      "1",
      "-framerate",
      "30",
      "-i",
      imagePath,
      "-i",
      slide.audio,
      "-filter_complex",
      "[1:a]apad=pad_dur=0.55[a]",
      "-map",
      "0:v",
      "-map",
      "[a]",
      "-t",
      slide.duration.toFixed(3),
      "-vf",
      "format=yuv420p",
      "-c:v",
      "libx264",
      "-preset",
      "medium",
      "-crf",
      "18",
      "-tune",
      "stillimage",
      "-c:a",
      "aac",
      "-b:a",
      "192k",
      "-movflags",
      "+faststart",
      clipPath,
    ]);

    concatLines.push(`file '${ffmpegPath(clipPath)}'`);
  }

  await writeFile(concatPath, `${concatLines.join("\n")}\n`, "utf8");
  run("ffmpeg", [
    "-y",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    concatPath,
    "-c:v",
    "libx264",
    "-preset",
    "medium",
    "-crf",
    "18",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-b:a",
    "160k",
    "-ar",
    "24000",
    "-movflags",
    "+faststart",
    finalPath,
  ]);
}

function probeVideo(file) {
  return JSON.parse(capture("ffprobe", [
    "-v",
    "error",
    "-select_streams",
    "v:0",
    "-show_entries",
    "stream=width,height:format=duration,size",
    "-of",
    "json",
    file,
  ]));
}

async function writeRenderReport(slides, validationDemo) {
  const finalStats = await stat(finalPath);
  const probe = probeVideo(finalPath);
  run("ffmpeg", [
    "-y",
    "-ss",
    "00:00:06",
    "-i",
    finalPath,
    "-frames:v",
    "1",
    "-update",
    "1",
    sampleFramePath,
  ]);

  await writeFile(reportPath, JSON.stringify({
    generated_at: new Date().toISOString(),
    output: finalPath,
    sample_frame: sampleFramePath,
    size_bytes: finalStats.size,
    probe,
    apps: {
      text_analysis: textAppUrl,
      pr_studio: prStudioUrl,
      insight_validation: validationUrl,
    },
    validation_demo: validationDemo,
    slides: slides.map((slide) => ({
      id: slide.id,
      duration: slide.duration,
      narration: path.join(narrationRoot, `${slide.id}.txt`),
      image: path.join(slideRoot, `${slide.id}.png`),
    })),
  }, null, 2), "utf8");

  return { probe, sizeBytes: finalStats.size };
}

await ensureDirs();
const playwright = resolvePlaywright();

console.log("Capturing app screens...");
await captureApps(playwright);

console.log("Running validation demo...");
const validationDemo = await runValidationDemo();
const slides = buildSlides(validationDemo);

console.log("Rendering slides...");
await renderSlides(playwright, slides);

console.log("Synthesizing narration...");
await makeAudio(slides);

console.log("Building video clips...");
await makeClips(slides);

const report = await writeRenderReport(slides, validationDemo);
console.log(`Wrote ${finalPath}`);
console.log(JSON.stringify(report, null, 2));
