import fs from "node:fs";
import { createHash, createHmac } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const outRoot = path.join(root, "out", "questionnaire-recovery-demo");
const rawDir = path.join(outRoot, "screens", "raw");
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const ffmpeg = require("ffmpeg-static");
const ffprobe = require("ffprobe-static").path;
const reuseAudio = process.env.PR_STUDIO_REUSE_QUESTIONNAIRE_AUDIO === "true";

function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, stdio: "inherit", shell: false });
  if (result.status !== 0) throw new Error(`${command} failed with exit code ${result.status}`);
}

function capture(command, args) {
  const result = spawnSync(command, args, { cwd: root, encoding: "utf8", shell: false });
  if (result.status !== 0) throw new Error(result.stderr || `${command} failed`);
  return result.stdout.trim();
}

function duration(file) {
  return Number.parseFloat(capture(ffprobe, ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", file]));
}

function escapeHtml(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function dataUrl(file) {
  return `data:image/png;base64,${fs.readFileSync(file).toString("base64")}`;
}

function base64url(value) {
  return Buffer.from(value).toString("base64url");
}

function launchToken(secret) {
  const body = base64url(JSON.stringify({ e: "demo@consumerinsight.kr", x: Math.floor(Date.now() / 1000) + 3600, p: "questionnaire-recovery", iss: "ci-portal", aud: "questionnaire-recovery", typ: "app-launch" }));
  return `${body}.${createHmac("sha256", secret).update(body).digest("base64url")}`;
}

async function captureAppScreens(browser) {
  const source = process.env.RECOVERY_DEMO_SOURCE;
  const secret = process.env.RECOVERY_DEMO_SECRET;
  const base = (process.env.RECOVERY_DEMO_URL ?? "http://127.0.0.1:18799").replace(/\/$/, "");
  if (!source || !fs.existsSync(source)) throw new Error("RECOVERY_DEMO_SOURCE must point to a real DOCX or HWPX file.");
  if (!secret) throw new Error("RECOVERY_DEMO_SECRET is required for local demo capture.");
  await mkdir(rawDir, { recursive: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
  try {
    await page.goto(`${base}/?cik=${encodeURIComponent(launchToken(secret))}`, { waitUntil: "networkidle" });
    await page.screenshot({ path: path.join(rawDir, "01-upload.png") });
    await page.locator("input[type=file]").setInputFiles(source);
    await Promise.all([page.waitForLoadState("networkidle"), page.getByRole("button", { name: "문서 복원하기" }).click()]);
    await page.screenshot({ path: path.join(rawDir, "02-recovered-top.png") });
    const q6 = page.locator("article").filter({ hasText: "귀하가 일하시는 직장(사업체)의 종사자 중 여성의 비중은 대략 어느 정도입니까" }).first();
    await q6.scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(rawDir, "03-branch-q6.png") });
    const q8 = page.locator("article").filter({ hasText: "사업(일)을 운영하기 위한 별도의 사업장" }).first();
    await q8.scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(rawDir, "04-q8.png") });
    const codebookHref = await page.getByRole("link", { name: /기본 메타 코드북/ }).first().getAttribute("href");
    const metadataHref = await page.getByRole("link", { name: /기본 메타 JSON/ }).first().getAttribute("href");
    await page.goto(new URL(codebookHref, base).href, { waitUntil: "networkidle" });
    await page.screenshot({ path: path.join(rawDir, "05-codebook.png") });
    await page.locator("#search").fill("Q6-1");
    await page.screenshot({ path: path.join(rawDir, "06-codebook-q6-1.png") });
    await page.goto(new URL(metadataHref, base).href, { waitUntil: "networkidle" });
    await page.screenshot({ path: path.join(rawDir, "07-metadata.png") });
  } finally {
    await page.close();
  }
}

const images = {
  upload: path.join(rawDir, "01-upload.png"), recovered: path.join(rawDir, "02-recovered-top.png"),
  branch: path.join(rawDir, "03-branch-q6.png"), q8: path.join(rawDir, "04-q8.png"),
  codebook: path.join(rawDir, "05-codebook.png"), codebookQ6: path.join(rawDir, "06-codebook-q6-1.png"), metadata: path.join(rawDir, "07-metadata.png"),
};

const videos = [
  {
    id: "questionnaire-recovery-story", title: "설문지가 없어서 AI도 헤맨다",
    youtubeTitle: "AI가 설문지를 못 찾는 이유 | 설문 복원 및 코드북 1편",
    description: "분석을 부탁하기 전에 왜 확실한 설문지와 코드북이 필요한지, 조사 실무의 흔한 혼란과 설문 복원 앱의 해결 방식을 짧고 코믹하게 소개합니다.",
    scenes: [
      { id: "01-request", kicker: "월요일 오전 9시", title: "“에이아이야, 이 조사 분석해 줘.”", subtitle: "연구자는 자신 있게 말했습니다. 대답도 금방 나올 줄 알았습니다.", chat: [["나", "이 조사에서 이직 의향이 높은 사람의 특성을 찾아줘."], ["AI", "좋습니다. 설문지와 변수 정의를 보내 주세요."]], narration: "월요일 아침, 연구자는 에이아이에게 분석을 부탁합니다. 그런데 첫 대답부터 막힙니다. 설문지와 변수 정의를 보내 달라는 겁니다.", caption: "AI 분석의 첫 조건은 ‘확실한 설문지’입니다." },
      { id: "02-final-files", kicker: "문제의 폴더", title: "그런데 ‘최종’이 네 개입니다", subtitle: "문항은 비슷하지만 보기와 분기는 조금씩 다릅니다.", files: ["설문지_최종.docx", "설문지_최종_진짜.hwpx", "설문지_최종_진짜_v7.docx", "question.js"], narration: "폴더를 열어 보니 최종 파일이 네 개입니다. 설문지 최종, 진짜 최종, 진짜 최종 브이 세븐, 그리고 실제 응답 시스템의 퀘스천 점 제이에스. 내용도 조금씩 다릅니다.", caption: "‘최종’이 여러 개면 AI도 무엇이 기준인지 알 수 없습니다." },
      { id: "03-copy", kicker: "흔한 임시 해결", title: "보이는 문항만 복사해 보냈더니", subtitle: "보기와 분기 조건이 빠진 채, 문장만 AI에게 전달됐습니다.", chat: [["나", "문6. 현재 일의 형태는 무엇입니까? 문8. 별도 사업장이 있습니까?"], ["AI", "문8은 모든 응답자에게 질문된 것으로 보입니다."]], narration: "급한 마음에 보이는 문항만 복사합니다. 하지만 보기와 분기 조건은 빠졌습니다. 에이아이는 받은 정보 안에서 그럴듯하게 답하지만, 그 답은 설문 구조와 다를 수 있습니다.", caption: "문항 문장만으로는 보기·분기·변수 관계를 복원할 수 없습니다." },
      { id: "04-cost", kicker: "결국 사람이 다시", title: "화면, 문서, 코드를 하나씩 대조합니다", subtitle: "분석을 시작하기도 전에 기준 설문지를 만드는 데 시간이 듭니다.", flow: ["웹 화면 확인", "문서와 대조", "분기 추적", "코드북 수작업"], narration: "결국 사람은 웹 화면과 문서를 대조하고, 분기를 따라가고, 변수 정의를 다시 만듭니다. 분석을 시작하기도 전에 시간이 사라집니다. 그래도 무엇이 기준인지 확신하기 어렵습니다.", caption: "분석보다 ‘설문지 찾기’에 시간이 더 드는 역설입니다." },
      { id: "05-recovery", kicker: "설문 복원 및 코드북", title: "원본을 실행하지 않고, 구조를 복원합니다", subtitle: "디 오 씨 엑스, 에이치 더블유 피 엑스, 퀘스천 점 제이에스를 읽습니다.", image: images.recovered, badge: "실제 근로환경조사 128문항", narration: "설문 복원 앱은 디 오 씨 엑스, 에이치 더블유 피 엑스, 퀘스천 점 제이에스를 실행하지 않고 읽습니다. 문항, 보기, 응답 방식과 분기를 복원하고, 불확실한 부분은 숨기지 않습니다.", caption: "확실한 것은 복원하고, 불확실한 것은 검토 대상으로 남깁니다." },
      { id: "06-codebook", kicker: "AI가 읽을 수 있는 기준", title: "설문지와 코드북이 하나의 근거가 됩니다", subtitle: "변수명·값 라벨·응답조건을 검색하고 AI에 정확히 전달합니다.", image: images.codebookQ6, badge: "Q6-1 응답조건 검색", narration: "검색형 코드북에는 변수명, 문항, 값 라벨과 응답 조건이 함께 있습니다. 이제 에이아이는 추측하는 대신, 검토된 설문 구조를 근거로 분석하고 보고서를 작성할 수 있습니다.", caption: "AI에게 더 긴 지시가 아니라, 더 정확한 근거를 줍니다." },
      { id: "07-close", kicker: "핵심", title: "AI 일을 시키기 전에, 설문지부터 확실하게", subtitle: "설문 복원 및 코드북이 분석의 출발점을 정리합니다.", flow: ["원본 입력", "문항·보기·분기 복원", "불확실한 곳만 확인", "AI 분석 시작"], narration: "에이아이에게 일을 잘 시키는 첫 단계는 프롬프트가 아니라 확실한 설문지입니다. 설문 복원 및 코드북은 혼란스러운 원본을 검토 가능한 기준으로 바꾸고, 에이아이 분석의 출발점을 만듭니다.", caption: "설문 복원 및 코드북 — AI 분석 전에 기준부터 세웁니다." },
    ],
  },
  {
    id: "questionnaire-recovery-tutorial", title: "설문 복원 및 코드북 사용법",
    youtubeTitle: "설문 복원 및 코드북 사용법 | question.js·DOCX·HWPX",
    description: "실제 근로환경조사 HWPX를 이용해 업로드, 문항·보기·분기 확인, 검토 항목 이해, 코드북 검색, AI 전달용 메타데이터 확인까지 보여드립니다.",
    scenes: [
      { id: "01-open", kicker: "1. 앱 열기", title: "CI Portal에서 설문 복원 앱을 엽니다", subtitle: "문서 설문지와 응답 시스템 소스를 같은 도구에서 복원합니다.", image: images.upload, badge: "DOCX · HWPX · question.js", narration: "씨아이 포털에서 설문 복원 및 코드북을 엽니다. 문서 설문지는 디 오 씨 엑스와 에이치 더블유 피 엑스를, 응답 시스템은 퀘스천 점 제이에스를 입력할 수 있습니다.", caption: "1. 문서 또는 응답 시스템 소스를 선택합니다." },
      { id: "02-upload", kicker: "2. 원본 입력", title: "실제 설문 파일을 그대로 올립니다", subtitle: "이번 데모는 제8차 근로환경조사 HWPX를 사용했습니다.", image: images.upload, badge: "실제 HWPX", narration: "이번 데모에서는 실제 제 팔 차 근로환경조사 에이치 더블유 피 엑스를 올립니다. 문서 복원하기를 누르면 원본을 실행하지 않고 정적인 구조만 읽습니다.", caption: "2. 원본을 실행하지 않고 정적으로 읽습니다." },
      { id: "03-result", kicker: "3. 복원 결과", title: "128개 문항과 37개 조건을 복원했습니다", subtitle: "제목, 문항, 보기, 응답 형식과 원문 검토 항목을 한 화면에서 봅니다.", image: images.recovered, badge: "약 1초", narration: "복원 결과에는 설문 제목과 문항, 보기, 응답 형식이 나타납니다. 이 실제 문서는 백 스물여덟 개 문항과 서른일곱 개 조건을 약 일 초에 복원했습니다.", caption: "3. 문항·보기·응답 형식을 먼저 확인합니다." },
      { id: "04-branch", kicker: "4. 분기 확인", title: "문6과 문6-1의 관계를 바로 확인합니다", subtitle: "‘문6의 보기 조건’처럼 응답 대상과 분기 근거가 문항 옆에 표시됩니다.", image: images.branch, badge: "상위 문항 Q6", narration: "분기 문항은 응답 조건과 함께 표시됩니다. 문 육 다시 일은 문 육의 응답에 따라 나타납니다. 범위 표현을 기계적으로 확정하기 어려운 곳은 원문 확인 필요로 남깁니다.", caption: "4. 분기를 추측하지 않고, 근거와 검토 사유를 함께 봅니다." },
      { id: "05-fidelity", kicker: "5. 원문 충실도", title: "수정 이력의 낡은 문장 대신 최종 문장을 복원합니다", subtitle: "문8의 최종 질문과 주석이 중복 없이 표시됩니다.", image: images.q8, badge: "문8 최종 문장", narration: "한글 문서의 수정 이력에는 낡은 문장과 최종 문장이 함께 남을 수 있습니다. 앱은 반복된 낡은 문장을 제거하고, 문 팔의 최종 질문과 주석을 복원합니다.", caption: "5. 문서 내부 수정 이력이 만든 중복도 점검합니다." },
      { id: "06-review", kicker: "6. 검토 항목", title: "‘검토 필요’는 실패 문항 수가 아닙니다", subtitle: "원문 표 확인과 열린 범위 조건처럼 사람이 확인해야 할 근거를 보수적으로 남긴 수입니다.", points: ["확실한 구조는 즉시 사용", "불확실성은 숨기지 않음", "사람은 표시된 곳만 확인"], narration: "검토 필요 숫자는 복원에 실패한 문항 수가 아닙니다. 원문 표 확인과 열린 범위 조건처럼, 사람이 한 번 확인해야 할 근거를 보수적으로 포함합니다. 불확실성을 감추지 않는 것이 핵심입니다.", caption: "6. 검토 표시는 오류가 아니라 확인이 필요한 근거입니다." },
      { id: "07-codebook", kicker: "7. 코드북", title: "128개 변수를 검색형 코드북으로 봅니다", subtitle: "변수 라벨, 응답 방식, 값 라벨, 응답조건과 결측 정의를 함께 확인합니다.", image: images.codebook, badge: "전체 128개", narration: "기본 메타 코드북을 열면 백 스물여덟 개 변수를 검색할 수 있습니다. 변수 라벨, 응답 방식, 값 라벨, 응답 조건을 한 줄에서 확인합니다. 결측과 측정 수준은 클리닝 이후 확정한다는 경계도 명시합니다.", caption: "7. 코드북에서 변수와 응답조건을 검색합니다." },
      { id: "08-search", kicker: "8. 필요한 변수만", title: "Q6-1을 검색하면 분기 근거까지 좁혀집니다", subtitle: "긴 설문 전체를 다시 읽지 않고 원하는 변수의 구조를 찾습니다.", image: images.codebookQ6, badge: "검색: Q6-1", narration: "검색창에 큐 육 다시 일을 입력하면 해당 변수와 분기 근거만 남습니다. 긴 설문 전체를 다시 읽지 않고, 분석에 필요한 변수의 정의를 바로 확인할 수 있습니다.", caption: "8. 필요한 변수와 분기만 빠르게 찾습니다." },
      { id: "09-ai", kicker: "9. AI 전달", title: "메타데이터 또는 MCP로 정확한 구조를 전달합니다", subtitle: "AI는 문항·보기·분기를 추측하지 않고, 이 근거를 읽어 분석합니다.", image: images.metadata, badge: "AI용 기본 메타", narration: "기본 메타 제이슨이나 엠시피를 이용하면 에이아이에게 정확한 문항, 보기, 분기 구조를 전달할 수 있습니다. 앱 자체가 임의로 문항을 완성하지 않으며, 에이아이 수정 제안은 사람이 확인한 뒤에만 반영합니다.", caption: "9. AI에는 원문 전체가 아니라 정확한 설문 구조를 전달합니다." },
      { id: "10-close", kicker: "사용 흐름", title: "복원하고, 확인하고, 그다음 AI에게 맡깁니다", subtitle: "확실한 설문지가 분석과 보고서 작성의 공통 기준이 됩니다.", flow: ["원본 입력", "구조 복원", "표시된 곳 검토", "코드북·AI 활용"], narration: "사용 순서는 간단합니다. 원본을 입력하고, 복원된 구조를 보고, 표시된 곳만 확인합니다. 그다음 코드북과 메타데이터를 분석과 보고서 작성에 사용합니다. 확실한 설문지가 사람과 에이아이의 공통 기준이 됩니다.", caption: "복원 → 검토 → 코드북 → AI 분석" },
    ],
  },
];

function sceneHtml(video, scene, index) {
  const image = scene.image ? `<div class="browser"><div class="bar"><i></i><i></i><i></i><span>설문 복원 및 코드북</span></div><img src="${dataUrl(scene.image)}"><b>${escapeHtml(scene.badge)}</b></div>` : "";
  const files = scene.files ? `<div class="files">${scene.files.map((f, i) => `<div><span>${i === 3 ? "{}" : "▤"}</span><strong>${escapeHtml(f)}</strong>${i < 3 ? '<em>최종</em>' : '<em>실제 시스템</em>'}</div>`).join("")}</div>` : "";
  const chat = scene.chat ? `<div class="chat">${scene.chat.map(([who, text]) => `<div class="${who === "AI" ? "ai" : "me"}"><b>${who}</b><p>${escapeHtml(text)}</p></div>`).join("")}</div>` : "";
  const flow = scene.flow ? `<div class="flow">${scene.flow.map((x, i) => `<div><small>${String(i + 1).padStart(2, "0")}</small><strong>${escapeHtml(x)}</strong></div>${i < scene.flow.length - 1 ? "<span>→</span>" : ""}`).join("")}</div>` : "";
  const points = scene.points ? `<div class="points">${scene.points.map((x) => `<div>${escapeHtml(x)}</div>`).join("")}</div>` : "";
  return `<!doctype html><html lang="ko"><meta charset="utf-8"><style>
  *{box-sizing:border-box}body{margin:0;background:#f6f4ed;color:#132f35;font-family:"Malgun Gothic","Noto Sans KR",sans-serif}.slide{width:1920px;height:1080px;padding:58px 76px 86px;position:relative;overflow:hidden;background:radial-gradient(circle at 92% 7%,rgba(29,111,108,.18),transparent 34%),linear-gradient(135deg,#fcfbf7,#eef4ef)}.top{display:flex;justify-content:space-between;align-items:center}.brand{font-size:21px;font-weight:900;letter-spacing:.08em;color:#1c6966}.kicker{padding:10px 18px;border:1px solid #b8d0ca;border-radius:99px;background:#fff;font-size:19px;font-weight:850;color:#1c6966}h1{margin:28px 0 12px;max-width:1660px;font-size:60px;line-height:1.16;letter-spacing:-.045em}.sub{margin:0;max-width:1600px;color:#556a6d;font-size:27px;line-height:1.45;font-weight:650}.browser{position:absolute;left:76px;right:76px;top:270px;height:700px;overflow:hidden;border-radius:24px;background:#fff;border:1px solid #cad5d3;box-shadow:0 28px 80px rgba(21,55,59,.16)}.bar{height:48px;display:flex;align-items:center;gap:10px;padding:0 18px;background:#edf1f1}.bar i{width:12px;height:12px;border-radius:50%;background:#d66d62}.bar i:nth-child(2){background:#d4ad4d}.bar i:nth-child(3){background:#58a67b}.bar span{margin-left:12px;color:#64777a}.browser img{width:100%;height:652px;object-fit:cover;object-position:top}.browser b{position:absolute;right:28px;top:72px;padding:13px 20px;border-radius:99px;background:#db7045;color:#fff;font-size:20px}.files{display:grid;grid-template-columns:1fr 1fr;gap:22px;margin-top:52px}.files div{display:grid;grid-template-columns:64px 1fr auto;align-items:center;gap:20px;padding:26px 32px;background:#fff;border:1px solid #dfe5e1;border-radius:20px;box-shadow:0 15px 45px rgba(21,55,59,.09)}.files span{font-size:40px;color:#1c6966}.files strong{font-size:28px}.files em{font-style:normal;padding:7px 12px;border-radius:99px;background:#fff0e9;color:#b24d26;font-weight:850}.chat{margin-top:42px;display:flex;flex-direction:column;gap:22px}.chat div{width:70%;padding:24px 30px;border-radius:24px;background:#fff;box-shadow:0 15px 45px rgba(21,55,59,.1)}.chat .ai{align-self:flex-start}.chat .me{align-self:flex-end;background:#1c6966;color:#fff}.chat b{font-size:19px}.chat p{margin:10px 0 0;font-size:31px;font-weight:800;line-height:1.4}.flow{display:flex;align-items:stretch;gap:14px;margin-top:70px}.flow div{flex:1;min-height:180px;padding:28px;border-radius:23px;background:#fff;box-shadow:0 16px 48px rgba(21,55,59,.09);display:flex;flex-direction:column;justify-content:center;gap:15px}.flow small{font-size:20px;font-weight:900;color:#db7045}.flow strong{font-size:28px;line-height:1.35}.flow span{display:flex;align-items:center;font-size:43px;color:#db7045}.points{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;margin-top:68px}.points div{min-height:190px;padding:30px;display:flex;align-items:center;justify-content:center;text-align:center;border-radius:23px;background:#fff;box-shadow:0 16px 48px rgba(21,55,59,.09);font-size:31px;font-weight:900;color:#1c6966}.caption{position:absolute;left:0;right:0;bottom:0;height:70px;display:flex;align-items:center;justify-content:center;background:#102e33;color:#fff;font-size:27px;font-weight:850}.caption small{position:absolute;right:30px;color:#bdc9ca;font-size:16px}.progress{position:absolute;left:0;top:0;height:6px;background:#db7045;width:${((index + 1) / video.scenes.length) * 100}%}
  </style><main class="slide"><div class="progress"></div><div class="top"><div class="brand">CONSUMER INSIGHT · METHODIQ</div><div class="kicker">${escapeHtml(scene.kicker)}</div></div><h1>${escapeHtml(scene.title)}</h1><p class="sub">${escapeHtml(scene.subtitle)}</p>${files}${chat}${flow}${points}${image}<div class="caption">${escapeHtml(scene.caption)}<small>${String(index + 1).padStart(2, "0")} / ${String(video.scenes.length).padStart(2, "0")}</small></div></main></html>`;
}

function srtTime(seconds) {
  const n = Math.round(seconds * 1000); return `${String(Math.floor(n / 3600000)).padStart(2, "0")}:${String(Math.floor(n / 60000) % 60).padStart(2, "0")}:${String(Math.floor(n / 1000) % 60).padStart(2, "0")},${String(n % 1000).padStart(3, "0")}`;
}

async function renderVideo(browser, video) {
  const dir = path.join(outRoot, video.id); const slides = path.join(dir, "slides"); const narration = path.join(dir, "narration"); const audio = path.join(dir, "audio"); const clips = path.join(dir, "clips");
  await Promise.all([slides, narration, audio, clips].map((x) => mkdir(x, { recursive: true })));
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  for (const [i, scene] of video.scenes.entries()) {
    await page.setContent(sceneHtml(video, scene, i), { waitUntil: "networkidle" }); await page.screenshot({ path: path.join(slides, `${scene.id}.png`) });
    const txt = path.join(narration, `${scene.id}.txt`); const wav = path.join(audio, `${scene.id}.wav`); await writeFile(txt, `${scene.narration}\n`, "utf8");
    if (!reuseAudio || !fs.existsSync(wav)) run("node", [path.join(root, "scripts", "synthesize-speech.mjs"), "--input", txt, "--output", wav]);
    scene.audio = wav; scene.duration = duration(wav) + 0.85;
  }
  await page.close(); let cursor = 0; const concat = []; const srt = [];
  for (const [i, scene] of video.scenes.entries()) {
    const clip = path.join(clips, `${scene.id}.mp4`); run(ffmpeg, ["-y", "-loglevel", "error", "-loop", "1", "-framerate", "30", "-i", path.join(slides, `${scene.id}.png`), "-i", scene.audio, "-filter_complex", "[1:a]apad=pad_dur=0.85[a]", "-map", "0:v", "-map", "[a]", "-t", scene.duration.toFixed(3), "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-tune", "stillimage", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "160k", "-ar", "24000", clip]);
    concat.push(`file '${clip.replaceAll("\\", "/")}'`); srt.push(String(i + 1), `${srtTime(cursor)} --> ${srtTime(cursor + scene.duration)}`, scene.caption, ""); cursor += scene.duration;
  }
  const concatFile = path.join(dir, "concat.txt"); const srtFile = path.join(dir, `${video.id}.ko.srt`); const final = path.join(outRoot, `${video.id}-current.mp4`);
  await writeFile(concatFile, `${concat.join("\n")}\n`, "utf8"); await writeFile(srtFile, `${srt.join("\n")}\n`, "utf8");
  run(ffmpeg, ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", concatFile, "-c", "copy", "-movflags", "+faststart", final]);
  const sample = path.join(dir, "sample-frame.png"); run(ffmpeg, ["-y", "-loglevel", "error", "-ss", Math.max(1, cursor * 0.55).toFixed(2), "-i", final, "-frames:v", "1", sample]);
  return { id: video.id, title: video.title, youtubeTitle: video.youtubeTitle, description: video.description, file: final, subtitle: srtFile, sampleFrame: sample, durationSeconds: duration(final), bytes: fs.statSync(final).size, sha256: createHash("sha256").update(await readFile(final)).digest("hex") };
}

if (process.env.PR_STUDIO_TTS_PROVIDER_KO !== "google") throw new Error("Set PR_STUDIO_TTS_PROVIDER_KO=google.");
await mkdir(outRoot, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ["--font-render-hinting=none"] });
try { await captureAppScreens(browser); } finally { await browser.close(); }
for (const file of Object.values(images)) if (!fs.existsSync(file)) throw new Error(`Missing screenshot: ${file}`);
const renderBrowser = await chromium.launch({ headless: true, args: ["--font-render-hinting=none"] }); const rendered = [];
try { for (const video of videos) rendered.push(await renderVideo(renderBrowser, video)); } finally { await renderBrowser.close(); }
const report = { renderedAt: new Date().toISOString(), narrationProvider: "google", voice: process.env.GOOGLE_TTS_VOICE_KO ?? "ko-KR-Chirp3-HD-Kore", speakingRate: Number(process.env.GOOGLE_TTS_SPEAKING_RATE ?? 0.94), resolution: "1920x1080", fps: 30, source: "제8차 근로환경조사 설문지_260415.hwpx", videos: rendered };
await writeFile(path.join(outRoot, "render-report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
await writeFile(path.join(outRoot, "youtube-metadata.json"), `${JSON.stringify(videos.map(({ id, youtubeTitle, description }) => ({ id, youtubeTitle, description })), null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));
