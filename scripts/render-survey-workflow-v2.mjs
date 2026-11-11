import fs from "node:fs";
import { createHash } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appsRoot = path.resolve(root, "..");
const newLoginRepo = process.env.PR_STUDIO_NEW_LOGIN_REPO || path.join(appsRoot, "new-login-center");
const siblingStudio = path.join(appsRoot, "pr-studio");
const archivedRecoveryRoot = path.join(siblingStudio, "out", "questionnaire-recovery-demo", "screens", "raw");
const outputRoot = path.join(root, "out", "survey-workflow-v2");
const captureRoot = path.join(outputRoot, "captures");
const slideRoot = path.join(outputRoot, "slides");
const narrationRoot = path.join(outputRoot, "narration");
const audioRoot = path.join(outputRoot, "audio");
const clipRoot = path.join(outputRoot, "clips");
const finalPath = path.join(outputRoot, "survey-workflow-v2.mp4");
const reportPath = path.join(outputRoot, "render-report.json");
const captureReportPath = path.join(outputRoot, "capture-report.json");
const identityFile = process.env.RAILWAY_IDENTITY_FILE || "C:\\Users\\user\\.ssh\\id_ed25519_railway_els";
const railwayCommand = process.platform === "win32" ? process.execPath : "railway";
const railwayPrefix = process.platform === "win32"
  ? ["C:\\Users\\user\\AppData\\Roaming\\npm\\node_modules\\@railway\\cli\\bin\\railway.js"]
  : [];

function playwrightModule() {
  const require = createRequire(import.meta.url);
  for (const candidate of [
    path.join(root, "node_modules", "playwright"),
    path.join(siblingStudio, "node_modules", "playwright"),
    "playwright",
  ]) {
    try {
      return require(candidate);
    } catch {
      // Try the next installed PR Studio runtime.
    }
  }
  throw new Error("Playwright is unavailable.");
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd || root,
    encoding: "utf8",
    shell: false,
    windowsHide: true,
    stdio: options.capture === false ? "inherit" : "pipe",
    timeout: options.timeout || 300_000,
  });
  if (result.status !== 0) {
    throw new Error(result.error?.message || result.stderr || result.stdout || `${command} failed (${result.status})`);
  }
  return String(result.stdout || "").trim();
}

function railwaySshArgs(command) {
  const args = [
    "ssh",
    "--project", "2cec8bc5-c2e3-4d8f-853c-67fc2bee1c10",
    "--environment", "production",
    "--service", "new-login-center",
  ];
  if (fs.existsSync(identityFile)) args.push("--identity-file", identityFile);
  return [...args, ...command];
}

function remoteNodeCommand(code) {
  const encoded = Buffer.from(code, "utf8").toString("base64");
  return `node -e "eval(Buffer.from('${encoded}','base64').toString())"`;
}

function createPersonaSession() {
  const code = `
    const {createServer}=require("./src/server");
    (async()=>{const server=createServer();const s=await server.service.createSession("codex-demo@consumerinsight.kr");process.stdout.write(s.sessionId);})().catch(e=>{console.error(e);process.exit(1)});
  `;
  const output = run(railwayCommand, [...railwayPrefix, ...railwaySshArgs([remoteNodeCommand(code)])], {
    cwd: newLoginRepo,
  });
  const sessions = output.match(/session_[A-Za-z0-9_-]+/g) || [];
  if (!sessions.length) throw new Error("Persona demo session was not returned.");
  return sessions.at(-1);
}

function deletePersonaSession(sessionId) {
  const code = `
    const {createServer}=require("./src/server");
    (async()=>{const server=createServer();const sid=${JSON.stringify(sessionId)};await server.service.store.update("sessions",{sessions:{}},data=>{delete data.sessions[sid];return data;});})().catch(e=>{console.error(e);process.exit(1)});
  `;
  run(railwayCommand, [...railwayPrefix, ...railwaySshArgs([remoteNodeCommand(code)])], { cwd: newLoginRepo });
}

const qualitySource = Buffer.from(JSON.stringify({
  DATA: [{
    NAME: "Q1",
    TYPE: "RADIO",
    QUESTION: "하나를 선택해 주세요.",
    ANSWERS: [{ K: "1", V: "예" }, { K: "2", V: "아니요" }],
    HIDE: [{ CONDITION: "[Q1=1]", TARGET: "9" }],
  }],
}));

const personaSurvey = Buffer.from(JSON.stringify({
  DATA: [
    {
      NAME: "Q1",
      TYPE: "RADIO",
      QUESTION: "향후 자동차 구매 의향이 있습니까?",
      ANSWERS: [{ VALUE: "1", LABEL: "있다" }, { VALUE: "2", LABEL: "없다" }],
    },
    {
      NAME: "Q2",
      TYPE: "TEXT",
      QUESTION: "그렇게 응답한 가장 큰 이유는 무엇입니까?",
      NOTSKIP: [{ CONDITION: "[Q1]==1" }],
    },
  ],
}));

const personaPopulation = Buffer.from(JSON.stringify({
  name: "간부 소개용 인구학 파일럿",
  sample_size: 6,
  seed: 17,
  execution_mode: "test",
  attributes: ["gender", "age_group"],
  source_references: [{ name: "합성 데모용 인구학 분포", year: "2026" }],
  marginals: {
    gender: { 여성: 0.5, 남성: 0.5 },
    age_group: { "30대": 0.5, "40대": 0.5 },
  },
}));

async function captureLiveScreens(chromium) {
  await mkdir(captureRoot, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const report = { capturedAt: new Date().toISOString() };
  let personaSession = "";
  try {
    for (const [source, target] of [
      ["01-upload.png", "01-recovery-home.png"],
      ["02-recovered-top.png", "02-recovery-result.png"],
      ["05-codebook.png", "03-codebook.png"],
    ]) {
      const sourcePath = path.join(archivedRecoveryRoot, source);
      if (!fs.existsSync(sourcePath)) throw new Error(`Verified recovery capture is missing: ${sourcePath}`);
      fs.copyFileSync(sourcePath, path.join(captureRoot, target));
    }
    report.recovery = {
      captureSource: "verified 2026-11-07 HWPX production capture",
      liveRevalidatedAt: "2026-11-12T00:57:00+09:00",
      appSha: "149f893c875f36bd1b5c1e2d7a9506662b77c175",
      questionCount: 128,
      conditionCount: 37,
    };

    const qualityContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const qualityPage = await qualityContext.newPage();
    await qualityPage.goto("https://survey-validation-harness-production.up.railway.app/", { waitUntil: "networkidle" });
    const qualityResponse = await qualityContext.request.post(
      "https://survey-validation-harness-production.up.railway.app/api/v1/reviews",
      {
        multipart: {
          question_js: { name: "seeded-error.json", mimeType: "application/json", buffer: qualitySource },
        },
        timeout: 60_000,
      },
    );
    if (qualityResponse.status() !== 201) throw new Error(`Quality run failed: ${qualityResponse.status()}`);
    const qualityCreated = await qualityResponse.json();
    await qualityPage.goto(`https://survey-validation-harness-production.up.railway.app${qualityCreated.review_url}`, { waitUntil: "networkidle" });
    await qualityPage.screenshot({ path: path.join(captureRoot, "04-quality-error.png"), fullPage: true });
    const qualityResult = await (await qualityContext.request.get(
      `https://survey-validation-harness-production.up.railway.app${qualityCreated.result_url}`,
    )).json();
    report.quality = {
      runId: qualityCreated.receipt.run_id,
      appSha: qualityCreated.receipt.app_sha,
      verdict: qualityCreated.receipt.verdict,
      findingCodes: qualityResult.quality_review.definition_integrity.findings.map((row) => row.code),
    };
    await qualityContext.close();

    personaSession = createPersonaSession();
    const personaContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const personaPage = await personaContext.newPage();
    const callbackResponse = await personaPage.goto(
      `https://persona-pilot-production.up.railway.app/?centralSessionToken=${encodeURIComponent(personaSession)}`,
      { waitUntil: "networkidle" },
    );
    if (!callbackResponse || personaPage.url().includes("centralSessionToken")) {
      throw new Error("Persona login handoff did not clear the session token.");
    }
    await personaPage.screenshot({ path: path.join(captureRoot, "05-persona-home.png"), fullPage: true });
    const personaResponse = await personaContext.request.post(
      "https://persona-pilot-production.up.railway.app/api/v1/pilots",
      {
        multipart: {
          question_js: { name: "question.json", mimeType: "application/json", buffer: personaSurvey },
          population_spec: { name: "population.json", mimeType: "application/json", buffer: personaPopulation },
        },
        timeout: 180_000,
      },
    );
    const personaCreated = await personaResponse.json();
    if (personaResponse.status() !== 201) {
      throw new Error(`Persona run failed: ${personaResponse.status()} ${JSON.stringify(personaCreated)}`);
    }
    await personaPage.goto(`https://persona-pilot-production.up.railway.app${personaCreated.review_url}`, { waitUntil: "networkidle" });
    await personaPage.screenshot({ path: path.join(captureRoot, "06-persona-result.png"), fullPage: true });
    const personaResult = await (await personaContext.request.get(
      `https://persona-pilot-production.up.railway.app${personaCreated.result_url}`,
    )).json();
    report.persona = {
      runId: personaCreated.receipt.run_id,
      appSha: personaCreated.receipt.app_sha,
      personaCount: personaResult.pilot_result.summary.persona_count,
      apiCallUnits: personaCreated.receipt.billing.api_call_units,
      capturedCredits: personaCreated.receipt.billing.captured_credits,
      keySource: personaCreated.receipt.billing.key_source,
    };
    await personaContext.close();
    await writeFile(captureReportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    return report;
  } finally {
    await browser.close();
    if (personaSession) deletePersonaSession(personaSession);
  }
}

function scenes() {
  return [
    {
      id: "01-flow",
      kicker: "CI 조사 품질관리",
      title: "설문 하나를, 세 번 확인합니다",
      subtitle: "구조를 복원하고 · 결정적 오류를 찾고 · 응답자의 이해 위험을 봅니다",
      steps: ["설문 복원", "오류 검증", "인구학적 합성 파일럿"],
      narration: "설문 하나를 세 번 확인합니다. 먼저 구조를 복원하고, 다음으로 결정적 오류를 찾고, 마지막으로 인구학적 합성 응답에서 이해 위험을 봅니다.",
      caption: "복원 → 오류 검증 → 합성 파일럿",
    },
    {
      id: "02-recovery",
      kicker: "1 · 설문 복원",
      title: "문항·보기·분기를 먼저 복원합니다",
      subtitle: "question.js를 실행하지 않고 읽고, 불확실한 부분은 검토 대상으로 남깁니다",
      image: "02-recovery-result.png",
      narration: "설문 복원기는 퀘스천 점 제이에스를 실행하지 않고 문항과 보기를 복원합니다. 불확실한 부분은 임의로 채우지 않고 검토 대상으로 남깁니다.",
      caption: "설문 구조를 먼저 확정",
    },
    {
      id: "03-codebook",
      kicker: "1 · 설문 복원",
      title: "검색 가능한 코드북이 공통 기준이 됩니다",
      subtitle: "변수명·문항·값 라벨·응답조건을 사람과 AI가 같은 구조로 확인합니다",
      image: "03-codebook.png",
      narration: "복원 결과는 검색 가능한 코드북과 기본 메타데이터가 됩니다. 사람과 에이아이가 같은 문항 정의를 보게 만드는 단계입니다.",
      caption: "사람과 AI가 같은 기준을 사용",
    },
    {
      id: "04-quality-error",
      kicker: "2 · Survey Quality Review",
      title: "코드로 확정할 수 있는 오류를 찾습니다",
      subtitle: "운영 양성 테스트: 존재하지 않는 보기 참조 → missing_option_reference",
      image: "04-quality-error.png",
      narration: "같은 설문을 서베이 퀄리티 리뷰에 넣으면, 존재하지 않는 보기 참조처럼 코드로 확정할 수 있는 오류를 구체적인 판정 코드와 함께 찾습니다.",
      caption: "누락 보기 참조를 결정적 오류로 판정",
    },
    {
      id: "05-contract",
      kicker: "2 · 판정 계약",
      title: "결정적 오류와 검토 후보를 구분합니다",
      subtitle: "고부담 종료 분기는 자동 오류가 아니라 연구자가 확인할 REVIEW_REQUIRED 후보입니다",
      compare: ["ISSUES_FOUND\n결정적 정의 오류", "REVIEW_REQUIRED\n연구자 검토 후보"],
      narration: "반면 응답을 곧바로 종료하는 고부담 분기는 무조건 오류가 아닙니다. 앱은 결정적 오류와 연구자가 판단할 검토 후보를 구분합니다.",
      caption: "오류와 검토 후보를 같은 것으로 세지 않습니다",
    },
    {
      id: "06-persona-input",
      kicker: "3 · Persona Pilot",
      title: "현재는 인구학적 속성만 사용합니다",
      subtitle: "성별·연령대·지역 분포와 작은 시험 표본 · 자동차 응답유형은 사용하지 않음",
      image: "05-persona-home.png",
      narration: "퍼소나 파일럿에는 같은 설문과 성별, 연령대 같은 인구학적 분포, 작은 시험 표본만 입력합니다. 자동차 응답 유형이나 별도 도메인 데이터는 현재 사용하지 않습니다.",
      caption: "현재 범위: 인구학적 속성만",
    },
    {
      id: "07-persona-result",
      kicker: "3 · 운영 실행",
      title: "합성 표본 6명 · 중앙 AI 1배치 완료",
      subtitle: "CI 계정 0크레딧 · 직접 API 키 없음 · 실제 모집단 추정치가 아닌 사전점검 신호",
      image: "06-persona-result.png",
      narration: "운영 검증에서는 합성 표본 여섯 명과 중앙 에이아이 한 배치가 정상 완료되었습니다. 이 결과는 모집단 추정치가 아니라 문항과 보기의 사전점검 신호입니다.",
      caption: "실제 조사 결과가 아닌 사전점검 신호",
    },
    {
      id: "08-close",
      kicker: "반복 가능한 품질관리",
      title: "복원된 기준으로 고치고, 다시 검증합니다",
      subtitle: "세 앱의 기능 소개가 아니라 조사 시작 전 품질관리 흐름입니다",
      steps: ["복원", "검증", "파일럿", "수정 후 재검증"],
      narration: "핵심은 세 도구를 따로 보여주는 것이 아닙니다. 복원된 기준으로 오류를 고치고, 이해 위험을 확인한 뒤 다시 검증하는 반복 가능한 조사 품질관리 흐름입니다.",
      caption: "복원 · 검증 · 파일럿 · 수정 후 재검증",
    },
  ];
}

function escapeHtml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function dataUrl(file) {
  return `data:image/png;base64,${fs.readFileSync(file).toString("base64")}`;
}

function redactCapture(fileName, filter) {
  const source = path.join(captureRoot, fileName);
  const temporary = `${source}.redacted.png`;
  if (!fs.existsSync(source)) throw new Error(`Capture for redaction is missing: ${source}`);
  run("ffmpeg", ["-y", "-loglevel", "error", "-i", source, "-vf", filter, "-frames:v", "1", temporary]);
  fs.renameSync(temporary, source);
}

function sanitizePublicCaptures() {
  for (const fileName of ["01-recovery-home.png", "02-recovery-result.png", "03-codebook.png"]) {
    redactCapture(fileName, "drawbox=x=0:y=0:w=iw:h=48:color=0xEEF2FB:t=fill");
  }
  redactCapture("04-quality-error.png", "drawbox=x=515:y=195:w=275:h=40:color=white:t=fill");
  redactCapture("06-persona-result.png", "drawbox=x=150:y=165:w=315:h=45:color=white:t=fill");
}

function sceneHtml(scene, index, total) {
  const image = scene.image
    ? `<div class="browser"><div class="browserbar"><i></i><i></i><i></i><span>운영 화면 캡처 · 민감정보 없음</span></div><img src="${dataUrl(path.join(captureRoot, scene.image))}"></div>`
    : "";
  const steps = scene.steps
    ? `<div class="steps">${scene.steps.map((item, i) => `<div><b>${String(i + 1).padStart(2, "0")}</b><strong>${escapeHtml(item)}</strong></div>${i < scene.steps.length - 1 ? "<span>→</span>" : ""}`).join("")}</div>`
    : "";
  const compare = scene.compare
    ? `<div class="compare">${scene.compare.map((item, i) => `<div class="${i ? "review" : "error"}">${escapeHtml(item).replace("\n", "<br>")}</div>`).join("<span>≠</span>")}</div>`
    : "";
  return `<!doctype html><html lang="ko"><meta charset="utf-8"><style>
  *{box-sizing:border-box}body{margin:0;background:#f4f7f8;color:#102b32;font-family:"Malgun Gothic","Noto Sans KR",sans-serif}.slide{width:1920px;height:1080px;padding:55px 76px 92px;position:relative;overflow:hidden;background:radial-gradient(circle at 92% 6%,rgba(34,109,116,.20),transparent 34%),linear-gradient(135deg,#fcfcf8,#edf4f5)}.top{display:flex;justify-content:space-between;align-items:center}.brand{font-size:20px;font-weight:900;letter-spacing:.09em;color:#17666e}.kicker{padding:10px 18px;border:1px solid #bdd4d7;border-radius:99px;background:#fff;font-size:19px;font-weight:850;color:#17666e}h1{margin:28px 0 10px;font-size:61px;line-height:1.15;letter-spacing:-.045em}p{margin:0;color:#526a70;font-size:27px;font-weight:650}.browser{position:absolute;left:76px;right:76px;top:260px;height:690px;border-radius:24px;overflow:hidden;background:#fff;border:1px solid #cbd9dc;box-shadow:0 28px 72px rgba(18,54,60,.18)}.browserbar{height:48px;display:flex;align-items:center;gap:10px;padding:0 18px;background:#e9eff0}.browserbar i{width:12px;height:12px;border-radius:50%;background:#d96d61}.browserbar i:nth-child(2){background:#d6ad4b}.browserbar i:nth-child(3){background:#58a77d}.browserbar span{margin-left:12px;color:#64777c}.browser img{width:100%;height:642px;object-fit:cover;object-position:top}.steps{display:flex;align-items:stretch;gap:18px;margin-top:125px}.steps div{flex:1;min-height:200px;padding:30px;border-radius:24px;background:#fff;border:1px solid #d7e1e3;box-shadow:0 18px 50px rgba(18,54,60,.10);display:flex;flex-direction:column;justify-content:center;gap:15px}.steps b{color:#e27445;font-size:22px}.steps strong{font-size:34px}.steps span{display:flex;align-items:center;color:#e27445;font-size:48px}.compare{display:flex;align-items:center;justify-content:center;gap:35px;margin-top:120px}.compare div{width:600px;min-height:230px;border-radius:26px;padding:48px;display:flex;align-items:center;justify-content:center;text-align:center;font-size:38px;font-weight:900;white-space:pre-line}.compare .error{background:#fff0ec;color:#a73c29;border:2px solid #e9a396}.compare .review{background:#fff8e4;color:#8a6100;border:2px solid #e5c56e}.compare span{font-size:60px;color:#7e9094}.caption{position:absolute;left:0;right:0;bottom:0;height:72px;background:#10363c;color:#fff;display:flex;align-items:center;justify-content:center;font-size:27px;font-weight:850}.caption small{position:absolute;right:34px;color:#c7d3d5;font-size:17px}.progress{position:absolute;left:0;top:0;height:7px;background:#e27445;width:${((index + 1) / total) * 100}%}
  </style><main class="slide"><div class="progress"></div><div class="top"><div class="brand">CONSUMER INSIGHT · METHODIQ</div><div class="kicker">${escapeHtml(scene.kicker)}</div></div><h1>${escapeHtml(scene.title)}</h1><p>${escapeHtml(scene.subtitle)}</p>${steps}${compare}${image}<div class="caption">${escapeHtml(scene.caption)}<small>${String(index + 1).padStart(2, "0")} / ${String(total).padStart(2, "0")}</small></div></main></html>`;
}

function duration(file) {
  return Number(run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", file]));
}

function srtTime(seconds) {
  const ms = Math.round(seconds * 1000);
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor(ms / 60_000) % 60;
  const s = Math.floor(ms / 1000) % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(ms % 1000).padStart(3, "0")}`;
}

async function renderVideo(chromium, captureReport) {
  await Promise.all([slideRoot, narrationRoot, audioRoot, clipRoot].map((dir) => mkdir(dir, { recursive: true })));
  sanitizePublicCaptures();
  const sceneList = scenes();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  try {
    for (const [index, scene] of sceneList.entries()) {
      await page.setContent(sceneHtml(scene, index, sceneList.length), { waitUntil: "networkidle" });
      await page.screenshot({ path: path.join(slideRoot, `${scene.id}.png`) });
    }
  } finally {
    await browser.close();
  }

  for (const scene of sceneList) {
    const textPath = path.join(narrationRoot, `${scene.id}.txt`);
    const audioPath = path.join(audioRoot, `${scene.id}.mp3`);
    await writeFile(textPath, `${scene.narration}\n`, "utf8");
    run("edge-tts", ["--voice", "ko-KR-HyunsuMultilingualNeural", "--rate=-5%", "--file", textPath, "--write-media", audioPath, "--no-progress"]);
    scene.audio = audioPath;
    scene.duration = duration(audioPath) + 0.9;
  }

  let cursor = 0;
  const concat = [];
  const subtitles = [];
  for (const [index, scene] of sceneList.entries()) {
    const clip = path.join(clipRoot, `${scene.id}.mp4`);
    run("ffmpeg", [
      "-y", "-loglevel", "error", "-loop", "1", "-framerate", "30",
      "-i", path.join(slideRoot, `${scene.id}.png`), "-i", scene.audio,
      "-filter_complex", "[1:a]apad=pad_dur=0.9[a]", "-map", "0:v", "-map", "[a]",
      "-t", scene.duration.toFixed(3), "-c:v", "libx264", "-preset", "medium", "-crf", "19",
      "-tune", "stillimage", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "160k", "-ar", "24000", clip,
    ]);
    concat.push(`file '${clip.replaceAll("\\", "/")}'`);
    subtitles.push(`${index + 1}\n${srtTime(cursor)} --> ${srtTime(cursor + scene.duration)}\n${scene.caption}\n`);
    cursor += scene.duration;
  }
  const concatPath = path.join(outputRoot, "concat.txt");
  const subtitlePath = path.join(outputRoot, "survey-workflow-v2.ko.srt");
  await writeFile(concatPath, `${concat.join("\n")}\n`, "utf8");
  await writeFile(subtitlePath, `${subtitles.join("\n")}\n`, "utf8");
  run("ffmpeg", ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", concatPath, "-c", "copy", "-movflags", "+faststart", finalPath]);

  const probe = JSON.parse(run("ffprobe", ["-v", "error", "-show_entries", "stream=codec_name,width,height,sample_rate,channels:format=duration,size", "-of", "json", finalPath]));
  for (const [name, ratio] of [["start", 0.12], ["middle", 0.52], ["end", 0.88]]) {
    run("ffmpeg", ["-y", "-loglevel", "error", "-ss", (cursor * ratio).toFixed(2), "-i", finalPath, "-frames:v", "1", path.join(outputRoot, `sample-${name}.png`)]);
  }
  const buffer = await readFile(finalPath);
  const fileStat = await stat(finalPath);
  const report = {
    renderedAt: new Date().toISOString(),
    title: "설문 품질관리 3단계 V2",
    targetApps: ["questionnaire-recovery", "survey-validation-harness", "persona-pilot"],
    narrationProvider: "edge-tts",
    voice: "ko-KR-HyunsuMultilingualNeural",
    resolution: "1920x1080",
    fps: 30,
    output: finalPath,
    subtitle: subtitlePath,
    durationSeconds: duration(finalPath),
    sizeBytes: fileStat.size,
    sha256: createHash("sha256").update(buffer).digest("hex"),
    probe,
    liveEvidence: captureReport,
    scenes: sceneList.map((scene) => ({ id: scene.id, duration: scene.duration, caption: scene.caption })),
  };
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return report;
}

await mkdir(outputRoot, { recursive: true });
const { chromium } = playwrightModule();
const captureReport = process.env.PR_STUDIO_REUSE_SURVEY_V2_CAPTURE === "true" && fs.existsSync(captureReportPath)
  ? JSON.parse(await readFile(captureReportPath, "utf8"))
  : await captureLiveScreens(chromium);
const report = await renderVideo(chromium, captureReport);
console.log(JSON.stringify(report, null, 2));
