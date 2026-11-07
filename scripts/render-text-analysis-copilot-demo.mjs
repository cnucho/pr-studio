import fs from "node:fs";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const ffmpeg = require("ffmpeg-static");
const ffprobe = require("ffprobe-static").path;
const outRoot = path.join(root, "out", "text-analysis-copilot-demo");
const rawDir = path.join(outRoot, "screens", "raw");
const appUrl = (process.env.TEXT_ANALYSIS_COPILOT_DEMO_URL ?? "https://text-analysis-copilot-production.up.railway.app").replace(/\/$/, "");
const reuseAudio = process.env.PR_STUDIO_REUSE_TEXT_ANALYSIS_AUDIO === "true";

function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, stdio: "inherit", shell: false });
  if (result.status !== 0) throw new Error(`${command} failed with exit code ${result.status}`);
}
function capture(command, args) {
  const result = spawnSync(command, args, { cwd: root, encoding: "utf8", shell: false });
  if (result.status !== 0) throw new Error(result.stderr || `${command} failed`);
  return result.stdout.trim();
}
function duration(file) { return Number.parseFloat(capture(ffprobe, ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", file])); }
function escapeHtml(value) { return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;"); }
function imageDataUrl(file) { return `data:image/png;base64,${fs.readFileSync(file).toString("base64")}`; }
function srtTime(seconds) {
  const n = Math.round(seconds * 1000);
  return `${String(Math.floor(n / 3600000)).padStart(2, "0")}:${String(Math.floor(n / 60000) % 60).padStart(2, "0")}:${String(Math.floor(n / 1000) % 60).padStart(2, "0")},${String(n % 1000).padStart(3, "0")}`;
}

await mkdir(rawDir, { recursive: true });
const captureBrowser = await chromium.launch({ headless: true, args: ["--font-render-hinting=none"] });
try {
  const page = await captureBrowser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
  await page.goto(appUrl, { waitUntil: "networkidle", timeout: 120000 });
  await page.getByRole("heading", { name: "Text Analysis Copilot", exact: true }).waitFor();
  await page.screenshot({ path: path.join(rawDir, "01-plan-intake.png") });
  await page.getByRole("button", { name: "Collect Sources", exact: true }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(rawDir, "02-collect-sources.png") });
  await page.getByRole("button", { name: "Extract Messages", exact: true }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(rawDir, "03-extract-messages.png") });
  await page.getByRole("button", { name: "Content Analysis", exact: true }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(rawDir, "04-content-analysis.png") });
} finally { await captureBrowser.close(); }

const screens = {
  plan: path.join(rawDir, "01-plan-intake.png"),
  collect: path.join(rawDir, "02-collect-sources.png"),
  extract: path.join(rawDir, "03-extract-messages.png"),
  analysis: path.join(rawDir, "04-content-analysis.png"),
};

const videos = [
  {
    id: "text-analysis-copilot-part-1",
    title: "Text Analysis Copilot 1부",
    youtubeTitle: "AI가 코딩해도 텍스트 분석은 왜 어려운가 | Text Analysis Copilot 1부",
    description: "AI 덕분에 텍스트 분석 도구는 많아졌지만, 연구문제·표집·코퍼스 경계·분석단위·코드북·신뢰도·근거와 한계를 연결하는 과학적 원칙은 자동으로 생기지 않습니다. 다양한 분석방법을 올바르게 선택하고 워크플로를 기록해야 하는 이유를 Text Analysis Copilot과 함께 설명합니다.\n\n앱: https://text-analysis-copilot-production.up.railway.app/\nMCP: https://text-analysis-copilot-production.up.railway.app/mcp/research",
    scenes: [
      { id: "01-ai-tools", kicker: "AI 시대의 역설", title: "코딩 도구가 많아질수록, 방법 선택은 더 중요해집니다", subtitle: "AI는 코드와 요약을 빠르게 만들지만 연구문제에 맞는 방법과 타당한 절차를 대신 결정하지 않습니다.", points: ["도구 선택 증가", "속도 향상", "타당성은 별도"], narration: "AI 덕분에 코드를 잘 몰라도 다양한 텍스트 분석 도구를 사용할 수 있게 됐습니다. 하지만 도구가 많아졌다는 사실이 연구의 타당성을 자동으로 보장하지는 않습니다. 오히려 연구문제에 맞는 방법을 고르고 절차를 설명할 책임은 더 커졌습니다.", caption: "도구의 접근성과 연구의 타당성은 같은 말이 아닙니다." },
      { id: "02-diversity", kicker: "통계보다 넓은 선택지", title: "텍스트 분석은 무엇을 의미로 볼지부터 달라집니다", subtitle: "같은 자료도 내용·주제·프레임·담론·내러티브·정책근거 분석에 따라 질문과 단위가 달라집니다.", points: ["내용·주제", "프레임·담론", "내러티브·정책근거"], narration: "텍스트 분석은 통계 분석보다 방법의 갈래가 훨씬 다양합니다. 같은 자료라도 내용의 빈도를 볼지, 반복되는 주제를 볼지, 프레임과 담론을 볼지, 이야기 구조와 정책 근거를 볼지에 따라 질문과 분석 단위가 달라집니다.", caption: "텍스트의 의미는 분석방법과 단위를 떠나 존재하지 않습니다." },
      { id: "03-science", kicker: "과학적 원칙", title: "연구문제에서 해석까지 한 줄로 연결해야 합니다", subtitle: "코퍼스 경계와 표집, 분석단위, 코드북, 신뢰도, 대표 근거와 한계를 함께 설계합니다.", flow: ["연구문제", "코퍼스·표집", "분석단위", "코딩·신뢰도", "근거·해석"], narration: "그래서 과학적 원칙이 필요합니다. 연구문제에서 출발해 코퍼스의 경계와 표집 이유, 분석 단위, 코드북과 코더 간 신뢰도, 대표 근거와 해석의 한계를 한 줄로 연결해야 합니다.", caption: "질문·자료·방법·해석의 정합성이 분석의 뼈대입니다." },
      { id: "04-workflow", kicker: "워크플로 기록", title: "무엇을 했는지보다, 왜 그 순서로 했는지를 남깁니다", subtitle: "도구, 설정, 포함·제외 기준, 사람이 수정한 판단과 미완료 항목을 프로젝트 기록으로 보존합니다.", points: ["도구와 설정", "판단과 수정", "미완료와 한계"], narration: "텍스트 분석은 여러 도구를 오가므로 워크플로 기록이 중요합니다. 어떤 도구를 왜 선택했고, 어떤 설정을 썼으며, 무엇을 포함하거나 제외했고, 사람이 어떤 판단을 수정했는지 남겨야 결과를 다시 검토할 수 있습니다.", caption: "재현 가능성은 클릭 기록이 아니라 판단 근거의 기록입니다." },
      { id: "05-boundary", kicker: "실제 앱의 방법 경계", title: "수집 범위와 권리, 근거와 사람의 검토를 먼저 표시합니다", subtitle: "공개 어댑터 결과를 전체 모집단이나 완전한 검색 결과라고 주장하지 않습니다.", image: screens.plan, badge: "Method Boundary", narration: "Text Analysis Copilot은 이 경계를 화면에 먼저 보여 줍니다. 준비된 코퍼스를 가져오거나 범위를 정한 공개 자료를 사용할 수 있지만, 출처와 권리 근거, 표집 기록과 연구자 검토를 보존해야 합니다. 어댑터 결과를 전체 모집단으로 간주하지 않습니다.", caption: "자동 수집은 범위를 정한 입력일 뿐, 망라성을 증명하지 않습니다." },
      { id: "06-skill", kicker: "숙련과 경험", title: "AI는 후보를 만들고, 연구자는 의미와 반례를 판단합니다", subtitle: "경계 사례, 맥락 손실, 중복 의미, 반례와 과도한 일반화는 사람의 검토가 필요합니다.", points: ["경계 사례", "맥락과 반례", "일반화의 한계"], narration: "분석 경험도 여전히 필요합니다. AI는 코드와 주제 후보를 빠르게 만들 수 있지만 경계 사례와 맥락 손실, 반례와 과도한 일반화를 판단하는 일은 연구자의 숙련에 달려 있습니다.", caption: "AI 보조 결과는 연구자 검토 전까지 잠정 결과입니다." },
      { id: "07-close", kicker: "Text Analysis Copilot", title: "정답을 대신 선언하지 않고, 검토 가능한 연구 과정을 만듭니다", subtitle: "2부에서는 여러 분석방법을 사전 구성 워크플로로 실행하는 방법을 보여드립니다.", flow: ["방법 선택", "절차 기록", "사람 검토", "근거 있는 해석"], narration: "Text Analysis Copilot의 목적은 정답을 대신 선언하는 것이 아닙니다. 방법 선택과 절차, 불확실성과 근거를 함께 남겨 검토 가능한 연구 과정을 만드는 것입니다. 다음 2부에서는 여러 분석방법을 사전 구성 워크플로로 실행하는 방법을 살펴보겠습니다.", caption: "과학적 원칙을 지키는 텍스트 분석 워크스페이스" },
    ],
  },
  {
    id: "text-analysis-copilot-part-2",
    title: "Text Analysis Copilot 2부",
    youtubeTitle: "여러 텍스트 분석방법을 워크플로로 실행하는 법 | Text Analysis Copilot 2부",
    description: "Text Analysis Copilot에서 준비된 코퍼스 또는 범위를 정한 공개 자료로 시작해 연구문제·분석단위를 정하고, 사전 구성 워크플로를 선택해 메시지 추출·코딩·신뢰도·타당도·근거 검토·내보내기까지 진행하는 방법을 소개합니다.\n\n앱: https://text-analysis-copilot-production.up.railway.app/\nMCP: https://text-analysis-copilot-production.up.railway.app/mcp/research",
    scenes: [
      { id: "01-input", kicker: "1 · 자료 준비", title: "준비된 코퍼스 또는 범위를 정한 공개 자료로 시작합니다", subtitle: "공개 URL, RSS/Atom, 설정된 YouTube 소스는 출처·권리·표집 영수증과 함께 저장합니다.", image: screens.collect, badge: "Collect Sources", narration: "먼저 자료를 준비합니다. 이미 정리된 코퍼스를 가져오거나, 공개 URL과 RSS 또는 Atom, 설정된 유튜브 소스를 범위를 정해 수집할 수 있습니다. 이때 출처와 권리 근거, 표집 영수증을 함께 남깁니다.", caption: "1. 자료의 출처와 범위를 먼저 고정합니다." },
      { id: "02-plan", kicker: "2 · 연구 설계", title: "연구문제, 코퍼스 경계와 분석단위를 먼저 정합니다", subtitle: "문장, 문단, 의미단위, 발화 차례, 문서 중 무엇을 한 건으로 셀지 명시합니다.", image: screens.plan, badge: "Plan Intake", narration: "다음은 연구 설계입니다. 연구문제와 코퍼스 경계를 적고, 문장과 문단, 의미 단위, 발화 차례, 문서 가운데 무엇을 한 건으로 셀지 정합니다. 비교 집단과 원하는 산출물도 함께 기록합니다.", caption: "2. 무엇을 한 건으로 셀지 정해야 분모가 흔들리지 않습니다." },
      { id: "03-methods", kicker: "3 · 분석방법", title: "질문에 맞는 분석방법을 선택합니다", subtitle: "내용·주제·인터뷰·FGI·프레임·담론·내러티브·비판·정책근거·자유응답·맞춤 분류를 지원합니다.", points: ["내용·주제·코딩", "인터뷰·FGI·프레임", "담론·내러티브·정책근거"], narration: "이제 질문에 맞는 분석방법을 고릅니다. 내용분석과 주제분석, 인터뷰와 FGI, 프레임과 담론, 내러티브와 비판 분석, 정책 근거와 자유응답 코딩, 맞춤 분류까지 다양한 워크플로를 사용할 수 있습니다.", caption: "3. 방법은 기능 목록이 아니라 연구문제에 맞춰 선택합니다." },
      { id: "04-workflow", kicker: "4 · 사전 구성 워크플로", title: "처음부터 만들지 말고, 워크플로 팩을 프로젝트 프로토콜로 고정합니다", subtitle: "권장 단계와 검토 기준을 불러온 뒤 연구 맥락에 맞게 수정하고 변경 이유를 남깁니다.", flow: ["워크플로 선택", "프로토콜 검토", "연구 맥락에 맞게 수정", "변경 이유 기록"], narration: "매번 처음부터 절차를 만들 필요는 없습니다. 사전 구성 워크플로 팩을 선택하면 권장 단계와 검토 기준을 불러올 수 있습니다. 연구 맥락에 맞게 수정한 뒤 프로젝트 프로토콜로 고정하고 변경 이유를 남깁니다.", caption: "4. 사전 구성 워크플로로 빠르게 시작하고 연구자가 확정합니다." },
      { id: "05-extract", kicker: "5 · 메시지 추출", title: "텍스트를 의미단위로 나누고, 근거가 연결된 메시지를 추출합니다", subtitle: "혼합 메시지와 경계가 불확실한 단위를 먼저 표시해 사람이 검토합니다.", image: screens.extract, badge: "Extract Messages", narration: "그다음 텍스트를 선택한 분석 단위로 나누고 메시지를 추출합니다. 하나의 단위에 여러 의미가 섞였거나 경계가 불확실하면 먼저 검토 대상으로 표시합니다. 원문 근거는 메시지와 계속 연결됩니다.", caption: "5. 메시지 추출은 자동 확정이 아니라 검토 가능한 후보 생성입니다." },
      { id: "06-code", kicker: "6 · 코딩과 비교", title: "코드북을 적용하고 빈도와 집단 차이를 분모와 함께 봅니다", subtitle: "코더 불일치, 미분류, 중복 코드와 대표 근거를 같은 화면에서 확인합니다.", image: screens.analysis, badge: "Content Analysis", narration: "코드북을 적용한 뒤 빈도와 집단 차이를 확인합니다. 퍼센트만 보지 않고 분모와 미분류, 중복 코드, 코더 불일치와 대표 근거를 함께 봅니다. 그래야 숫자와 해석이 같은 자료를 가리키는지 확인할 수 있습니다.", caption: "6. 빈도·비율·불일치·근거를 한 묶음으로 검토합니다." },
      { id: "07-quality", kicker: "7 · 품질 검토", title: "신뢰도와 타당도, 불확실 사례와 반례를 확인합니다", subtitle: "경고를 숨기지 않고 연구자 판단, 수정 이유와 남은 한계를 기록합니다.", points: ["코더 간 신뢰도", "타당도와 반례", "불확실 사례·한계"], narration: "마지막 해석 전에 품질을 점검합니다. 코더 간 신뢰도와 타당도 경고, 불확실 사례와 반례를 확인하고, 연구자가 어떤 판단을 했는지 기록합니다. 경고를 숨기지 않는 것이 이 워크플로의 중요한 원칙입니다.", caption: "7. 품질 경고는 삭제할 문제가 아니라 설명할 연구 근거입니다." },
      { id: "08-export", kicker: "8 · 내보내기와 MCP", title: "결과와 함께 연구 과정을 내보내고, MCP에서도 같은 절차를 사용합니다", subtitle: "코드북, 분모, 근거, 한계와 실행 영수증을 보고서·후속 검증에 전달합니다.", flow: ["결과 검토", "근거·한계 포함", "연구 영수증", "보고서·MCP 후속작업"], narration: "검토가 끝나면 결과만이 아니라 코드북과 분모, 대표 근거와 한계, 실행 영수증을 함께 내보냅니다. 웹 앱에서 직접 사용할 수도 있고 MCP를 통해 대화창에서 같은 절차를 실행할 수도 있습니다. 워크플로를 미리 만들고 기록하면 다양한 분석도 훨씬 안정적으로 진행할 수 있습니다.", caption: "8. 결과와 그 결과에 이른 경로를 함께 전달합니다." },
    ],
  },
];

function sceneHtml(video, scene, index) {
  const points = scene.points ? `<div class="points">${scene.points.map((x) => `<div>${escapeHtml(x)}</div>`).join("")}</div>` : "";
  const flow = scene.flow ? `<div class="flow">${scene.flow.map((x, i) => `<div><small>${String(i + 1).padStart(2, "0")}</small><strong>${escapeHtml(x)}</strong></div>${i < scene.flow.length - 1 ? "<span>→</span>" : ""}`).join("")}</div>` : "";
  const image = scene.image ? `<div class="browser"><div class="bar"><i></i><i></i><i></i><span>Text Analysis Copilot</span></div><img src="${imageDataUrl(scene.image)}"><b>${escapeHtml(scene.badge)}</b></div>` : "";
  return `<!doctype html><html lang="ko"><meta charset="utf-8"><style>
  *{box-sizing:border-box}body{margin:0;color:#11253d;font-family:"Malgun Gothic","Noto Sans KR",sans-serif}.slide{width:1920px;height:1080px;padding:58px 76px 86px;position:relative;overflow:hidden;background:radial-gradient(circle at 92% 8%,rgba(70,104,225,.16),transparent 32%),linear-gradient(135deg,#fbfcff,#eef2fb)}.top{display:flex;justify-content:space-between;align-items:center}.brand{font-size:21px;font-weight:900;letter-spacing:.09em;color:#3f58c7}.kicker{padding:10px 18px;border:1px solid #c5cdf0;border-radius:99px;background:#fff;font-size:19px;font-weight:850;color:#3f58c7}h1{margin:28px 0 12px;max-width:1720px;font-size:60px;line-height:1.16;letter-spacing:-.045em}.sub{margin:0;max-width:1660px;color:#58697b;font-size:27px;line-height:1.45;font-weight:650}.points{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;margin-top:68px}.points div{min-height:190px;padding:30px;display:flex;align-items:center;justify-content:center;text-align:center;border-radius:23px;background:#fff;box-shadow:0 16px 48px rgba(20,38,63,.09);font-size:30px;font-weight:900;color:#3f58c7}.flow{display:flex;align-items:stretch;gap:14px;margin-top:66px}.flow div{flex:1;min-height:180px;padding:28px;border-radius:23px;background:#fff;box-shadow:0 16px 48px rgba(20,38,63,.09);display:flex;flex-direction:column;justify-content:center;gap:15px}.flow small{font-size:20px;font-weight:900;color:#e05a38}.flow strong{font-size:27px;line-height:1.35}.flow span{display:flex;align-items:center;font-size:42px;color:#e05a38}.browser{position:absolute;left:76px;right:76px;top:270px;height:700px;overflow:hidden;border-radius:24px;background:#fff;border:1px solid #cbd6e4;box-shadow:0 28px 80px rgba(20,38,63,.16)}.bar{height:48px;display:flex;align-items:center;gap:10px;padding:0 18px;background:#edf1f7}.bar i{width:12px;height:12px;border-radius:50%;background:#d66d62}.bar i:nth-child(2){background:#d4ad4d}.bar i:nth-child(3){background:#58a67b}.bar span{margin-left:12px;color:#64777a}.browser img{width:100%;height:652px;object-fit:cover;object-position:top}.browser b{position:absolute;right:28px;top:72px;padding:13px 20px;border-radius:99px;background:#e05a38;color:#fff;font-size:20px}.caption{position:absolute;left:0;right:0;bottom:0;height:70px;display:flex;align-items:center;justify-content:center;background:#11253d;color:#fff;font-size:27px;font-weight:850}.caption small{position:absolute;right:30px;color:#c6d0dc;font-size:16px}.progress{position:absolute;left:0;top:0;height:6px;background:#e05a38;width:${((index + 1) / video.scenes.length) * 100}%}
  </style><main class="slide"><div class="progress"></div><div class="top"><div class="brand">CONSUMER INSIGHT · METHODIQ</div><div class="kicker">${escapeHtml(scene.kicker)}</div></div><h1>${escapeHtml(scene.title)}</h1><p class="sub">${escapeHtml(scene.subtitle)}</p>${points}${flow}${image}<div class="caption">${escapeHtml(scene.caption)}<small>${String(index + 1).padStart(2, "0")} / ${String(video.scenes.length).padStart(2, "0")}</small></div></main></html>`;
}

if (process.env.PR_STUDIO_TTS_PROVIDER_KO !== "google") throw new Error("Set PR_STUDIO_TTS_PROVIDER_KO=google.");
if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON && !process.env.GOOGLE_APPLICATION_CREDENTIALS && !process.env.GOOGLE_CLOUD_ACCESS_TOKEN) throw new Error("Google TTS credentials are unavailable.");
const renderBrowser = await chromium.launch({ headless: true, args: ["--font-render-hinting=none"] });
const rendered = [];
try {
  for (const video of videos) {
    const videoRoot = path.join(outRoot, video.id);
    const slidesDir = path.join(videoRoot, "slides");
    const narrationDir = path.join(videoRoot, "narration");
    const audioDir = path.join(videoRoot, "audio");
    const clipsDir = path.join(videoRoot, "clips");
    await Promise.all([slidesDir, narrationDir, audioDir, clipsDir].map((dir) => mkdir(dir, { recursive: true })));
    const page = await renderBrowser.newPage({ viewport: { width: 1920, height: 1080 } });
    for (const [index, scene] of video.scenes.entries()) {
      await page.setContent(sceneHtml(video, scene, index), { waitUntil: "networkidle" });
      await page.screenshot({ path: path.join(slidesDir, `${scene.id}.png`) });
      const textFile = path.join(narrationDir, `${scene.id}.txt`);
      const audioFile = path.join(audioDir, `${scene.id}.wav`);
      await writeFile(textFile, `${scene.narration}\n`, "utf8");
      if (!reuseAudio || !fs.existsSync(audioFile)) run("node", [path.join(root, "scripts", "synthesize-speech.mjs"), "--input", textFile, "--output", audioFile]);
      scene.audio = audioFile;
      scene.duration = duration(audioFile) + 0.9;
    }
    await page.close();
    let cursor = 0;
    const concat = [];
    const srt = [];
    for (const [index, scene] of video.scenes.entries()) {
      const clip = path.join(clipsDir, `${scene.id}.mp4`);
      run(ffmpeg, ["-y", "-loglevel", "error", "-loop", "1", "-framerate", "30", "-i", path.join(slidesDir, `${scene.id}.png`), "-i", scene.audio, "-filter_complex", "[1:a]apad=pad_dur=0.9[a]", "-map", "0:v", "-map", "[a]", "-t", scene.duration.toFixed(3), "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-tune", "stillimage", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "160k", "-ar", "24000", clip]);
      concat.push(`file '${clip.replaceAll("\\", "/")}'`);
      srt.push(String(index + 1), `${srtTime(cursor)} --> ${srtTime(cursor + scene.duration)}`, scene.caption, "");
      cursor += scene.duration;
    }
    const concatFile = path.join(videoRoot, "concat.txt");
    const subtitleFile = path.join(videoRoot, `${video.id}.ko.srt`);
    const finalFile = path.join(outRoot, `${video.id}-current.mp4`);
    await writeFile(concatFile, `${concat.join("\n")}\n`, "utf8");
    await writeFile(subtitleFile, `${srt.join("\n")}\n`, "utf8");
    run(ffmpeg, ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", concatFile, "-c", "copy", "-movflags", "+faststart", finalFile]);
    const sampleFrame = path.join(videoRoot, "sample-frame.png");
    run(ffmpeg, ["-y", "-loglevel", "error", "-ss", Math.max(1, cursor * 0.55).toFixed(2), "-i", finalFile, "-frames:v", "1", sampleFrame]);
    rendered.push({ id: video.id, title: video.title, youtubeTitle: video.youtubeTitle, description: video.description, file: finalFile, subtitle: subtitleFile, sampleFrame, durationSeconds: duration(finalFile), bytes: fs.statSync(finalFile).size, sha256: createHash("sha256").update(await readFile(finalFile)).digest("hex") });
  }
} finally { await renderBrowser.close(); }

const report = { renderedAt: new Date().toISOString(), narrationProvider: "google", voice: process.env.GOOGLE_TTS_VOICE_KO ?? "ko-KR-Chirp3-HD-Kore", speakingRate: Number(process.env.GOOGLE_TTS_SPEAKING_RATE ?? 0.94), resolution: "1920x1080", fps: 30, appUrl, sourceScreens: screens, videos: rendered };
await writeFile(path.join(outRoot, "render-report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
await writeFile(path.join(outRoot, "youtube-metadata.json"), `${JSON.stringify(videos.map(({ id, youtubeTitle, description }) => ({ id, youtubeTitle, description })), null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));
