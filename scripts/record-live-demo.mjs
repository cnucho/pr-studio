// Live app-demo recorder for the AI Company lecture.
// Drives a real running app with Playwright, records the screen as video,
// then muxes Google TTS narration. Produces an "app actually running" clip,
// not a slideshow of screenshots.
//
// Usage: node scripts/record-live-demo.mjs <demoId>
//   demoId: text-analysis | press-release | pr-studio | validation

import fs from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");
const require = createRequire(import.meta.url);

const demoId = process.argv[2] ?? "text-analysis";

const outRoot = path.join(root, "out", "ai-company-lecture-demos");
const rawDir = path.join(outRoot, "raw");
const audioDir = path.join(outRoot, "audio");
const narrationDir = path.join(outRoot, "narration");

const chromePath = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const playwrightCandidates = [
  path.join(root, "node_modules", "playwright"),
  "C:/git-app/CI Plan Builder/node_modules/playwright",
  "C:/git-app/AcademicResearchCopilot/node_modules/playwright",
];

function resolvePlaywright() {
  for (const candidate of playwrightCandidates) {
    try {
      return require(candidate);
    } catch {
      // try next
    }
  }
  throw new Error("Playwright not found in workspace candidates.");
}

function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, stdio: "inherit", shell: false });
  if (result.status !== 0) throw new Error(`${command} failed (${result.status})`);
}

function probeDuration(file) {
  const r = spawnSync(
    "ffprobe",
    ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", file],
    { encoding: "utf8", shell: false },
  );
  return Number((r.stdout || "0").trim()) || 0;
}

// A visible cursor + click ripple, injected into the page so the recording
// looks like a real person operating the app.
const cursorInit = `
(() => {
  const dot = document.createElement('div');
  dot.id = '__demo_cursor';
  Object.assign(dot.style, {
    position: 'fixed', width: '22px', height: '22px', borderRadius: '50%',
    border: '2px solid rgba(37,99,235,0.9)', background: 'rgba(37,99,235,0.25)',
    left: '0px', top: '0px', transform: 'translate(-50%,-50%)',
    pointerEvents: 'none', zIndex: '2147483647', transition: 'left .04s linear, top .04s linear',
    boxShadow: '0 0 0 4px rgba(37,99,235,0.12)'
  });
  const add = () => { if (document.body && !document.getElementById('__demo_cursor')) document.body.appendChild(dot); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', add); else add();
  window.addEventListener('mousemove', (e) => { dot.style.left = e.clientX + 'px'; dot.style.top = e.clientY + 'px'; });
  window.__demoRipple = (x, y) => {
    const r = document.createElement('div');
    Object.assign(r.style, {
      position: 'fixed', left: x + 'px', top: y + 'px', width: '12px', height: '12px',
      borderRadius: '50%', border: '2px solid rgba(37,99,235,0.8)', transform: 'translate(-50%,-50%)',
      pointerEvents: 'none', zIndex: '2147483646'
    });
    document.body.appendChild(r);
    r.animate([{ width: '12px', height: '12px', opacity: 1 }, { width: '64px', height: '64px', opacity: 0 }],
      { duration: 450, easing: 'ease-out' }).onfinish = () => r.remove();
  };
})();
`;

async function moveTo(page, x, y, steps = 24) {
  await page.mouse.move(x, y, { steps });
  await page.waitForTimeout(180);
}

async function clickAt(page, locator) {
  const box = await locator.boundingBox();
  if (!box) {
    await locator.click({ timeout: 4000 }).catch(() => {});
    return;
  }
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await moveTo(page, x, y);
  await page.evaluate(([px, py]) => window.__demoRipple?.(px, py), [x, y]);
  await page.waitForTimeout(120);
  await locator.click({ timeout: 5000 }).catch(() => {});
}

// Move the cursor to a labelled element and dwell, so a first-time viewer can
// follow what part of the app is being introduced.
async function hoverText(page, label, pause = 1600) {
  try {
    const el = page.getByText(label, { exact: false }).first();
    if (!(await el.count())) return false;
    const box = await el.boundingBox();
    if (!box) return false;
    await moveTo(page, box.x + Math.min(box.width / 2, 90), box.y + box.height / 2, 30);
    await page.waitForTimeout(pause);
    return true;
  } catch {
    return false;
  }
}

async function smoothScroll(page, totalPx, chunks = 8, pause = 320) {
  const step = Math.round(totalPx / chunks);
  for (let i = 0; i < chunks; i++) {
    await page.mouse.wheel(0, step);
    await page.waitForTimeout(pause);
  }
}

// Keep the app on screen and gently in motion until `ms` has elapsed, so the
// footage length matches the narration without freezing on a static frame.
async function exploreFor(page, ms) {
  const start = Date.now();
  let steps = 0;
  while (Date.now() - start < ms) {
    await page.mouse.wheel(0, 240);
    await page.waitForTimeout(850);
    steps += 1;
    if (steps % 8 === 0) {
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" })).catch(() => {});
      await page.waitForTimeout(1200);
    }
  }
}

// ---- Per-demo interaction scripts ----
const demos = {
  "text-analysis": {
    url:
      process.env.TEXT_ANALYSIS_DEMO_URL ??
      "http://127.0.0.1:5173/?view=reflection&demo=repair-hard",
    narration:
      "이 데모는 텍스트 분석 코파일럿입니다. 인터뷰나 댓글처럼 수집된 의사소통 텍스트를, 정해진 코드북 기준에 따라 분석하는 도구입니다. " +
      "화면 왼쪽을 보면 작업의 흐름이 있습니다. 자료를 모으고, 분석을 계획하고, 메시지를 추출하고, 내용을 분석한 뒤, 보고서로 내보냅니다. 이 버전은 이미 모아 둔 인터뷰와 댓글 자료를 분석하는 데 집중합니다. " +
      "지금 보시는 화면은 자율 수정, 오토노머스 리페어입니다. 이번 사례는 인공지능 복지 심사를 다룬 어려운 분류 문제입니다. 행정 부담, 인간 존엄, 절차적 책임 같은 개념이 섞여 있어서 한 번에 깔끔하게 분류되지 않습니다. " +
      "분석 결과가 약하게 나왔습니다. 보통은 버튼을 다시 눌러 그냥 한 번 더 돌립니다. 그런데 이 앱은 다시 돌리기 전에, 무엇을 고쳐야 하는지를 먼저 판단합니다. " +
      "먼저 가장 낮은 수준인 코딩 규칙을 점검하고 고칩니다. 그래도 결과가 약하면, 한 단계 위인 코드북과 분류 기준을 다시 봅니다. 여기서도 멈추지 않습니다. 필요하면 이론과 모형, 그리고 연구 질문 자체가 맞는지까지 거슬러 올라가 판단합니다. " +
      "오른쪽 작업 영역에는 에이전트가 무엇을 하는지가 단계별로 보입니다. 감사 로그에는 어느 수준에서, 무엇을, 왜 고쳤는지가 남습니다. 사용자는 모든 단계를 직접 고르지 않아도, 이 판단의 흐름을 그대로 확인할 수 있습니다. " +
      "핵심은 단순히 다시 생성한다가 아닙니다. 어느 수준을 고쳐야 하는지를 앱이 스스로 판단하고, 그 근거를 사람에게 보여 준다는 점입니다. 이것이 다음 세대 에이전트가 일하는 방식입니다.",
    async interact(page, targetSec) {
      const start = Date.now();
      await page.waitForTimeout(3500); // let viewers take in the whole screen
      // introduce the left workflow, one step at a time
      for (const label of [
        "Collect Sources",
        "Plan Intake",
        "Extract Messages",
        "Content Analysis",
        "Export the Report",
      ]) {
        await hoverText(page, label, 1500);
      }
      await hoverText(page, "Automated Welfare", 2200); // the project / case
      await hoverText(page, "Autonomous repair", 1600); // the repair area
      await page.waitForTimeout(1000);

      const runBtn = page.getByRole("button", { name: /Run|redo|judging|repair|실행|판단/i }).first();
      if (await runBtn.count()) {
        await clickAt(page, runBtn);
        await page
          .waitForFunction(
            () =>
              ![...document.querySelectorAll("button")].some((b) =>
                /judging|판단 중|running/i.test(b.textContent || ""),
              ),
            { timeout: 20000 },
          )
          .catch(() => {});
      }
      await page.waitForTimeout(1500);
      const review = page.getByText(/Review process|process/i).first();
      if (await review.count()) {
        await clickAt(page, review).catch(() => {});
        await page.waitForTimeout(1200);
      }
      // fill the remaining narration time with gentle, real on-screen motion
      const elapsed = (Date.now() - start) / 1000;
      await exploreFor(page, Math.max(0, (targetSec - elapsed) * 1000));
    },
  },
  "press-release": {
    url:
      process.env.PR_STUDIO_PRESS_DEMO_URL ??
      process.env.PR_STUDIO_DEMO_URL ??
      "http://127.0.0.1:3026/?tab=press",
    narration:
      "이 데모는 보도자료 작성 장면입니다. 처음에는 이 문제를 번역이나 문장 품질의 문제로 보기 쉽습니다. " +
      "문장을 더 매끄럽게 만들고, 환각을 줄이고, 어색한 영어를 고치면 될 것처럼 보입니다. 하지만 보도자료는 좋은 문장만으로 충분하지 않습니다. " +
      "왼쪽 입력을 보면 정책명, 사업내용, 예산, 대상, 기대효과가 정리되어 있습니다. 이것은 단순한 글감이 아니라, 보도자료가 책임져야 할 판단 기준입니다. " +
      "이제 생성 버튼을 누릅니다. 앱은 같은 정보를 문장으로만 바꾸지 않습니다. 제목, 부제, 리드문, 본문, 인용문으로 보도자료 구조를 만듭니다. " +
      "아래에는 SNS 요약과 언론 대응 포인트도 함께 나옵니다. 여기서 중요한 것은 번역을 더 잘했다는 점이 아닙니다. 대상, 목적, 메시지 구조, 배포 가능성을 함께 본다는 점입니다. " +
      "그래서 이 사례는 현지화가 아닙니다. 번역 문제를 보도자료 문제로 다시 푼 것입니다. 틀 안에서 문장을 고친 것이 아니라, 틀 밖에서 업무 문제를 다시 정의한 장면입니다.",
    async interact(page, targetSec) {
      const start = Date.now();
      await page.getByText("보도자료 작성기", { exact: true }).waitFor({ timeout: 12000 });
      await page.waitForTimeout(2200);

      for (const label of ["정책명", "사업내용", "예산", "대상", "기대효과"]) {
        await hoverText(page, label, 1100);
      }

      const generateBtn = page.getByRole("button", { name: "생성", exact: true }).first();
      if (await generateBtn.count()) {
        await clickAt(page, generateBtn);
      }
      await page.getByText("SNS 요약", { exact: true }).waitFor({ timeout: 12000 }).catch(() => {});
      await page.waitForTimeout(1200);

      for (const label of ["보도자료", "SNS 요약", "언론 대응 포인트"]) {
        await hoverText(page, label, 1600);
      }
      await smoothScroll(page, 360, 3, 500).catch(() => {});
      await page.waitForTimeout(1200);
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" })).catch(() => {});
      await page.waitForTimeout(1200);

      const elapsed = (Date.now() - start) / 1000;
      await exploreFor(page, Math.max(0, (targetSec - elapsed) * 1000));
    },
  },
  "gwriter": {
    url:
      process.env.GWRITER_VERIFY_DEMO_URL ??
      "http://127.0.0.1:5180/?app=gwriter-verify&mode=business&pack=business-proposal&audit=1",
    narration:
      "이 데모는 gWriter 베리파이입니다. AI와 함께 글을 쓰되, 그 결과를 검증하는 데 초점을 둔 편집기입니다. " +
      "화면 위쪽에는 AI 리뷰, 미리보기, 근거 탭이 있고, 가운데에는 글을 쓰는 편집기가, 오른쪽에는 검증 명령 패널이 있습니다. " +
      "이런 문장을 써 보겠습니다. 우리 서비스는 2024년 기준 국내 시장 점유율 1위이고, 재구매율은 95퍼센트이며, 경쟁사 대비 매출이 세 배 높다는 내용입니다. 문장만 보면 매끄럽고 그럴듯합니다. " +
      "이제 검증을 누릅니다. 먼저 문서를 스캔합니다. 앱은 문장에서 검증이 필요한 주장을 찾아냅니다. 시장 점유율 1위, 재구매율 95퍼센트, 매출 세 배 같은 수치와 순위 주장입니다. " +
      "그다음 실제 확인을 누릅니다. 앱은 이 주장들을 근거와 공식 데이터에 맞춰 봅니다. 결과를 보면, 시장 점유율 1위 주장은 미확인, 근거가 필요한 상태로 표시됩니다. 그럴듯한 문장이지만, 뒷받침하는 근거가 없다는 뜻입니다. " +
      "핵심은 이것입니다. 검증은 문장이 매끄러운지를 보지 않습니다. 주장이 데이터와 근거에 맞물리는지를 봅니다. 확인 가능성만으로는 부족하고, 근거와의 정합성이 중요합니다. gWriter 베리파이는 바로 그 지점을 사용자에게 보여 줍니다.",
    async interact(page, targetSec) {
      const start = Date.now();
      await page.waitForTimeout(8000); // let the backend bootstrap settle
      // brief intro of the workspace (no header-tab hovers — they can switch mode)
      await hoverText(page, "gWriter Verify Command", 1500);
      await hoverText(page, "output workspace", 1200);

      // write a confident but unverified draft (visible typing)
      await page.getByRole("button", { name: /Markdown edit/i }).first().click().catch(() => {});
      await page.waitForTimeout(800);
      const SAMPLE =
        "우리 서비스는 2024년 기준 국내 시장 점유율 1위입니다. 재구매율은 95퍼센트이며, 거의 모든 고객이 만족했습니다. 경쟁사 대비 매출이 세 배 높습니다. 근거 자료는 내부 추정치입니다.";
      await page.mouse.move(620, 520, { steps: 20 });
      await page.mouse.click(620, 520);
      await page.waitForTimeout(400);
      await page.keyboard.type(SAMPLE, { delay: 22 });
      await page.waitForTimeout(1200);

      // open verification; if the Verify control is not in the current toolbar,
      // switch to Document edit mode (where it lives) and retry.
      let verify = page.getByRole("button", { name: /^Verify$/i }).first();
      if (!(await verify.count())) {
        await page.getByRole("button", { name: /Document edit/i }).first().click().catch(() => {});
        await page.waitForTimeout(900);
        verify = page.getByRole("button", { name: /^Verify$/i }).first();
      }
      if (await verify.count()) await clickAt(page, verify);
      await page.waitForTimeout(1800);

      // Scan document -> Real check (real GPT-backed verification)
      const scan = page.getByRole("button", { name: /Scan document/i }).first();
      if (await scan.count()) await clickAt(page, scan);
      await page.waitForTimeout(12000);
      const real = page.getByRole("button", { name: /Real check/i }).first();
      if (await real.count()) await clickAt(page, real);
      await page.waitForTimeout(14000);

      // dwell on the flagged verification results until narration ends
      await page.mouse.move(1560, 560, { steps: 10 });
      while ((Date.now() - start) / 1000 < targetSec) {
        await page.mouse.wheel(0, 170);
        await page.waitForTimeout(950);
        await page.mouse.wheel(0, -110);
        await page.waitForTimeout(750);
      }
    },
  },
  "academic": {
    fitSpeed: true, // real GPT analysis waits are long; speed the footage to fit narration
    url:
      process.env.ACADEMIC_DEMO_URL ??
      "http://127.0.0.1:3025/?conferenceDemo=public-portal-ko&assetVersion=v0_4_candidate",
    narration:
      "이 데모는 리서치 파일럿 아카데미, 학술 연구용 분석 에이전트입니다. 합성 설문 데이터 180명, 일곱 개 변수가 이미 올라가 있습니다. " +
      "연구 질문을 한 줄로 넣습니다. 공공포털 만족도가 공공정보 신뢰도와 관련이 있는지, 그리고 그 관계가 통계 이해도에 따라 달라지는지입니다. " +
      "보내면, 앱은 답을 지어내지 않습니다. 먼저 질문의 개념을 데이터의 설문 변수에 매핑하고, 분석 경로를 스스로 정합니다. " +
      "여기서 중요한 장면이 나옵니다. 앱은 첫 회귀, 즉 통합 모형의 결과만으로 끝내지 않습니다. 연구 질문이 관계가 집단에 따라 달라지는지를 묻고 있으므로, 조절, 즉 상호작용 모형을 먼저 권합니다. 통합 계수는 평균적인 관계일 뿐이기 때문입니다. " +
      "분석 결과에는 계수와 표준오차, 유의확률, 신뢰구간이 함께 나옵니다. 그리고 해석 제한과 검증이 필요한 항목이 분리되어 표시됩니다. " +
      "마지막으로 논문 문장 작성을 누르면, 결과를 APA 형식의 해석과 보고서로 정리합니다. " +
      "핵심은 매끄러운 정책 문장을 쓰는 것이 아닙니다. 연구 질문에 조건부 효과 검증이 필요할 때, 첫 회귀를 최종 답으로 취급하길 거부한다는 점입니다.",
    async interact(page) {
      await page.waitForTimeout(4000);
      // intro: the session panel (data 180x7, evidence 8)
      await hoverText(page, "데이터", 1600);
      await hoverText(page, "근거", 1300);

      // type the research question (visible)
      const RQ =
        "공공포털 만족도는 공공정보 신뢰도와 관련이 있으며, 이 관계는 통계 이해도에 따라 달라지는가?";
      const ta = page.locator("textarea").first();
      await ta.click().catch(() => {});
      await page.keyboard.type(RQ, { delay: 35 });
      await page.waitForTimeout(1000);
      const send = page.getByRole("button", { name: /보내기/ }).first();
      if (await send.count()) await clickAt(page, send);

      // wait for the analysis plan / concept mapping to render (real GPT)
      await page.waitForTimeout(22000);
      // scroll slowly through mapping -> model recommendation -> result -> limits
      for (let i = 0; i < 11; i++) {
        await page.mouse.wheel(0, 230);
        await page.waitForTimeout(1500);
      }
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" })).catch(() => {});
      await page.waitForTimeout(1500);

      // draft the APA report
      const report = page.getByRole("button", { name: /논문 문장 작성/ }).first();
      if (await report.count()) await clickAt(page, report);
      await page.waitForTimeout(20000);
      for (let i = 0; i < 11; i++) {
        await page.mouse.wheel(0, 230);
        await page.waitForTimeout(1500);
      }
    },
  },
  "kwcs": {
    manualLogin: true,
    loginReadyText: "QC Control Center",
    fitSpeed: true,
    url: process.env.KWCS_DEMO_URL ?? "https://kwcs-qc-production.up.railway.app/",
    narration:
      "이 데모는 KWCS 품질검토, 큐씨 컨트롤 센터입니다. 근로환경조사 자료의 품질을 매일 자동으로 검증하는 에이전트 기반 앱입니다. " +
      "지금도 들어온 자료를 다시 검증하고 있습니다. 잠시 뒤, 오늘 자료에서 에러 2천7백여 건, 그중 크리티컬 8백여 건이 스무 개의 검증 규칙으로 검출됩니다. " +
      "규칙별 에러 목록을 보면, 조사 간격과 이동시간의 비현실적 조합, 매트릭스 문항 줄응답, 후반부 피로에 따른 대충응답, 면접원별 응답패턴 복제, 부분 응답 후 후속 배터리 임의 기입 의심처럼, 사람이 눈으로 일일이 잡기 어려운 다양한 에러 유형이 자동으로 분류됩니다. " +
      "하나를 열면, 검증결과 상세에서 그 에러를 다각도로 확인할 수 있습니다. 방문 간격과 이동거리, 표본지점 거리, 설문 응답 근거, 전화 확인 근거, 그리고 어떤 규칙이 왜 걸렸는지가 함께 제시됩니다. " +
      "핵심은 신속성입니다. 품질관리는 시간이 지나면 응답자를 다시 접촉할 수 없습니다. 그래서 하루 단위로 점검해야 하는데, 이런 검증을 사람이 매일 손으로 하는 것은 사실상 불가능합니다. 이 앱이 없으면 1일 단위 점검 자체가 안 됩니다. " +
      "그래서 이것은 선택이 아니라 필요입니다. 매일 풀어야 하는 실제 문제가 있기 때문에 씁니다. " +
      "그리고 에러가 나왔을 때, 그것을 어떻게 해석하고 무엇을 먼저 확인할지 검토하는 것을 돕도록, 품질관리 질문 GPT가 함께 제공됩니다.",
    async interact(page, targetSec) {
      const start = Date.now();
      await page.waitForTimeout(4000); // board settle
      // navigate to the rich rule-error board first
      const boardNav = page.getByText("검증기준-1차점검본", { exact: false }).first();
      if (await boardNav.count()) {
        await clickAt(page, boardNav);
        // entering the board re-runs validation; wait until the error count populates
        await page
          .waitForFunction(() => /2,?772/.test(document.body.innerText), undefined, { timeout: 50000 })
          .catch(() => {});
        await page.waitForTimeout(1500);
      }
      await hoverText(page, "규칙별 에러", 1500);

      // tour several error types in the rule list
      for (const r of ["VC-004", "VC-051", "VC-052", "VC-055"]) {
        const row = page.getByText(r, { exact: false }).first();
        if (await row.count()) {
          await clickAt(page, row);
          await page.waitForTimeout(2600);
        }
      }
      // scroll the multi-angle evidence in the detail panel
      await page.mouse.move(1000, 600, { steps: 8 });
      for (let i = 0; i < 6; i++) {
        await page.mouse.wheel(0, 220);
        await page.waitForTimeout(1200);
      }
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" })).catch(() => {});
      await page.waitForTimeout(1200);

      // the AI assistant for interpreting errors (feature)
      const gpt = page.getByText("열기", { exact: false }).first();
      if (await gpt.count()) {
        await clickAt(page, gpt);
        await page.waitForTimeout(2500);
      }
      // show another QC surface
      const tab = page.getByText("진행상황", { exact: false }).first();
      if (await tab.count()) {
        await clickAt(page, tab);
        await page.waitForTimeout(4000);
      }
      const elapsed = (Date.now() - start) / 1000;
      await exploreFor(page, Math.max(0, (targetSec - elapsed) * 1000));
    },
  },
};

async function main() {
  const demo = demos[demoId];
  if (!demo) throw new Error(`Unknown demoId: ${demoId}. Available: ${Object.keys(demos).join(", ")}`);

  await mkdir(rawDir, { recursive: true });
  await mkdir(audioDir, { recursive: true });
  await mkdir(narrationDir, { recursive: true });

  // 1) Narration audio first (Google TTS), so we can length-match the video.
  const narrationTxt = path.join(narrationDir, `${demoId}.txt`);
  const narrationWav = path.join(audioDir, `${demoId}.wav`);
  await writeFile(narrationTxt, demo.narration, "utf8");
  console.log("Synthesizing narration (Google TTS)...");
  run("node", [
    path.join(root, "scripts", "synthesize-speech.mjs"),
    "--input",
    narrationTxt,
    "--output",
    narrationWav,
  ]);
  const audioDur = probeDuration(narrationWav);
  console.log(`Narration duration: ${audioDur.toFixed(1)}s`);

  // 2) Record the live app interaction.
  const playwright = resolvePlaywright();
  const launchOptions = {
    // manualLogin demos need a visible window so the user can sign in
    headless: !demo.manualLogin,
    args: ["--disable-dev-shm-usage", "--font-render-hinting=none", "--force-color-profile=srgb"],
  };
  if (fs.existsSync(chromePath)) launchOptions.executablePath = chromePath;

  const browser = await playwright.chromium.launch(launchOptions);

  // For gated apps: open a visible window, let the USER log in, capture the
  // authenticated session (cookies incl. httpOnly), then record with it.
  let storageState;
  if (demo.manualLogin) {
    const stateFile = path.join(outRoot, `.${demoId}-state.json`);
    if (fs.existsSync(stateFile)) {
      storageState = stateFile; // reuse saved session — no re-login
      console.log(`Reusing saved session: ${stateFile}`);
    } else {
      const loginCtx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
      const loginPage = await loginCtx.newPage();
      console.log("\n>>> A browser window opened. PLEASE LOG IN to the app. Waiting up to 5 minutes...\n");
      await loginPage.goto(demo.url, { waitUntil: "domcontentloaded" }).catch(() => {});
      await loginPage.waitForFunction(
        (t) => document.body && document.body.innerText.includes(t),
        demo.loginReadyText || "",
        { timeout: 300000 },
      );
      console.log("Login detected. Capturing authenticated session...");
      await loginPage.waitForTimeout(1500);
      storageState = await loginCtx.storageState({ path: stateFile });
      await loginCtx.close();
    }
  }

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    recordVideo: { dir: rawDir, size: { width: 1920, height: 1080 } },
    ...(storageState ? { storageState } : {}),
  });
  await context.addInitScript(cursorInit);
  const page = await context.newPage();

  console.log(`Recording ${demoId} at ${demo.url} ...`);
  await page.goto(demo.url, { waitUntil: "networkidle" }).catch(() => {});
  try {
    await demo.interact(page, audioDur);
  } catch (error) {
    console.warn("Interaction warning:", error instanceof Error ? error.message : String(error));
  }

  const video = page.video();
  await context.close(); // flush video to disk
  await browser.close();

  const rawWebm = await video.path();
  console.log(`Raw video: ${rawWebm}`);
  const videoDur = probeDuration(rawWebm);
  console.log(`Video duration: ${videoDur.toFixed(1)}s`);

  // 3) Compose: match the video to the narration length, then mux audio.
  // For demos with long real "thinking" waits (GPT-driven), set demo.fitSpeed
  // to speed the footage up so it fits the narration instead of trimming it.
  const finalMp4 = path.join(outRoot, `${demoId}.mp4`);
  let vfilter;
  if (demo.fitSpeed && videoDur > audioDur + 0.5) {
    const speed = videoDur / audioDur; // >1 -> compress (speed up) to narration length
    console.log(`Fitting video to narration via ${speed.toFixed(2)}x speed-up`);
    vfilter = `[0:v]setpts=PTS/${speed.toFixed(4)},tpad=stop_mode=clone:stop_duration=0.5,fps=30,format=yuv420p[v]`;
  } else {
    const pad = Math.max(0, audioDur - videoDur + 0.4);
    vfilter = `[0:v]tpad=stop_mode=clone:stop_duration=${pad.toFixed(2)},fps=30,format=yuv420p[v]`;
  }
  run("ffmpeg", [
    "-y",
    "-loglevel",
    "error",
    "-i",
    rawWebm,
    "-i",
    narrationWav,
    "-filter_complex",
    vfilter,
    "-map",
    "[v]",
    "-map",
    "1:a",
    "-c:v",
    "libx264",
    "-preset",
    "medium",
    "-crf",
    "20",
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    "-shortest",
    finalMp4,
  ]);

  // sample frame
  const sample = path.join(outRoot, `${demoId}-sample.png`);
  run("ffmpeg", ["-y", "-loglevel", "error", "-ss", "2", "-i", finalMp4, "-frames:v", "1", sample]);

  console.log(`DONE: ${finalMp4}`);
  console.log(`SAMPLE: ${sample}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
