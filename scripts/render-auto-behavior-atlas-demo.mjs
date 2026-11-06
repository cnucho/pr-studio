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
const atlasUrl = process.env.AUTO_BEHAVIOR_ATLAS_URL ?? "https://auto-behavior-atlas-production.up.railway.app";
const outRoot = path.join(root, "out", "auto-behavior-atlas-demo");
const rawRoot = path.join(outRoot, "screens", "raw");
const slideRoot = path.join(outRoot, "screens", "slides");
const narrationRoot = path.join(outRoot, "narration");
const audioRoot = path.join(outRoot, "audio");
const clipRoot = path.join(outRoot, "clips");
const draftPath = path.join(outRoot, "auto-behavior-atlas-demo-draft.mp4");
const finalPath = path.join(outRoot, "auto-behavior-atlas-demo-current.mp4");
const concatPath = path.join(outRoot, "concat.txt");
const srtPath = path.join(outRoot, "auto-behavior-atlas-demo.ko.srt");
const assPath = path.join(outRoot, "auto-behavior-atlas-demo.ko.ass");
const reportPath = path.join(outRoot, "render-report.json");
const sampleFramePath = path.join(outRoot, "sample-frame.png");
const chromePath = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const reuseCaptures = process.env.PR_STUDIO_REUSE_ATLAS_CAPTURES === "true";
const reuseAudio = process.env.PR_STUDIO_REUSE_ATLAS_AUDIO === "true";

const questions = {
  first: "2025년 구매희망 모델에서 쏘렌토와 싼타페를 비교해줘.",
  female: "이번에는 여성만 비교해줘.",
  overlap: "두 모델을 함께 고려한 사람의 비중도 보여줘.",
  profile: "쏘렌토와 싼타페를 고려하는 여성 고객은 현재 어떤 브랜드 차량을 보유하고 있으며, 현재 주사용차를 최근 12개월 내 취득한 비중은 어떻게 다른가?",
};

function resolvePlaywright() {
  for (const candidate of [path.join(root, "node_modules", "playwright"), "playwright"]) {
    try { return require(candidate); } catch { /* continue */ }
  }
  throw new Error("Playwright is unavailable.");
}

function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, stdio: "inherit", shell: false });
  if (result.status !== 0) throw new Error(`${command} failed with exit code ${result.status}`);
}

function capture(command, args) {
  const result = spawnSync(command, args, { cwd: root, encoding: "utf8", shell: false });
  if (result.status !== 0) throw new Error(result.stderr || `${command} failed`);
  return result.stdout.trim();
}

function escapeHtml(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function imageDataUrl(file) {
  return `data:image/png;base64,${fs.readFileSync(file).toString("base64")}`;
}

function audioDuration(file) {
  return Number.parseFloat(capture("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", file]));
}

function ffmpegPath(value) { return value.replaceAll("\\", "/"); }
function ffmpegFilterPath(value) { return ffmpegPath(value).replaceAll(":", "\\:"); }

function srtTime(seconds) {
  const total = Math.round(seconds * 1000);
  const ms = total % 1000;
  const allSeconds = Math.floor(total / 1000);
  const s = allSeconds % 60;
  const allMinutes = Math.floor(allSeconds / 60);
  const m = allMinutes % 60;
  const h = Math.floor(allMinutes / 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(ms).padStart(3, "0")}`;
}

function assTime(seconds) {
  const total = Math.round(seconds * 100);
  const cs = total % 100;
  const allSeconds = Math.floor(total / 100);
  const s = allSeconds % 60;
  const allMinutes = Math.floor(allSeconds / 60);
  const m = allMinutes % 60;
  const h = Math.floor(allMinutes / 60);
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}

function assText(value) {
  return String(value).replaceAll("\\", "\\\\").replaceAll("{", "\\{").replaceAll("}", "\\}").replaceAll("\n", "\\N");
}

async function ensureDirs() {
  await Promise.all([rawRoot, slideRoot, narrationRoot, audioRoot, clipRoot].map((dir) => mkdir(dir, { recursive: true })));
}

async function captureAtlasScreens(playwright) {
  const launchOptions = { headless: true, args: ["--disable-dev-shm-usage", "--font-render-hinting=none"] };
  if (fs.existsSync(chromePath)) launchOptions.executablePath = chromePath;
  const browser = await playwright.chromium.launch(launchOptions);
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  page.setDefaultTimeout(180_000);

  const shot = async (name) => page.screenshot({ path: path.join(rawRoot, name), fullPage: false });
  const submit = async (question, expectedText, output) => {
    const input = page.getByPlaceholder("차명, 브랜드, 사람 조건 입력");
    const completedAnswers = page.locator(".ai-chat-message.assistant:not(.thinking)");
    const previousAnswerCount = await completedAnswers.count();
    await input.fill(question);
    if (output.includes("typed")) await shot(output);
    await page.getByRole("button", { name: "질문하기" }).click();
    await page.waitForFunction((count) => document.querySelectorAll(".ai-chat-message.assistant:not(.thinking)").length > count, previousAnswerCount, { timeout: 180_000 });
    const answer = page.locator(".ai-chat-message.assistant:not(.thinking)").last();
    await answer.waitFor({ state: "visible", timeout: 180_000 });
    if (expectedText) await answer.getByText(expectedText, { exact: false }).first().waitFor({ state: "visible", timeout: 30_000 });
    await answer.scrollIntoViewIfNeeded();
    await page.waitForTimeout(900);
    if (!output.includes("typed")) await shot(output);
  };

  try {
    await page.goto(atlasUrl, { waitUntil: "networkidle", timeout: 120_000 });
    await page.getByPlaceholder("차명, 브랜드, 사람 조건 입력").waitFor({ state: "visible" });
    await page.waitForTimeout(900);
    await shot("01-atlas-opening.png");

    const input = page.getByPlaceholder("차명, 브랜드, 사람 조건 입력");
    await input.fill(questions.first);
    await shot("02-first-question-typed.png");
    await page.getByRole("button", { name: "질문하기" }).click();
    await page.waitForFunction(() => document.querySelectorAll(".ai-chat-message.assistant:not(.thinking)").length > 0, null, { timeout: 180_000 });
    const firstAnswer = page.locator(".ai-chat-message.assistant:not(.thinking)").last();
    await firstAnswer.waitFor({ state: "visible", timeout: 180_000 });
    await firstAnswer.getByText("쏘렌토", { exact: false }).first().waitFor({ state: "visible", timeout: 30_000 });
    await firstAnswer.scrollIntoViewIfNeeded();
    await page.waitForTimeout(900);
    await shot("03-first-result.png");

    await submit(questions.female, "여성", "04-female-result.png");
    await submit(questions.overlap, "1.42", "05-overlap-result.png");
    await submit(questions.profile, null, "06-profile-result.png");
  } finally {
    await browser.close();
  }
}

function buildScenes() {
  return [
    {
      id: "01-unmet-question", part: "1부 · AutoBehavior Atlas", title: "보고서에 없던 질문이 시작점입니다",
      subtitle: "조사 내용이 부족해서가 아니라, 보고서의 질문과 내 업무의 질문이 만나지 않았을 수 있습니다.",
      quote: "“이 자료가 내 브랜드의 지금 문제에 어떤 도움이 되지?”",
      bullets: ["자동차 기획조사 비구독자", "브랜드·상품·마케팅·CX 담당자", "분석표보다 자기 업무의 답이 필요한 사람"],
      narration: "자동차 시장에 관심은 있지만, 정기 기획조사를 구독하지 않는 분들이 있습니다. 조사 내용이 부족해서가 아니라, 보고서의 질문과 자신의 업무 질문이 정확히 만나지 않았기 때문입니다.",
      caption: "보고서의 질문과 내 업무의 질문이 다를 때", holdPad: 1.0,
    },
    {
      id: "02-report-limit", part: "1부 · 문제", title: "보고서는 모든 고객의 질문을 미리 담을 수 없습니다",
      subtitle: "정해진 목차는 전체 시장을 설명하지만, 각 담당자의 구체적인 상황까지 모두 담기는 어렵습니다.",
      compare: ["보고서의 결과", "SUV 구매희망자의 특성", "현업의 질문", "우리 경쟁 모델을 함께 고려하는 고객은 누구인가?"],
      narration: "보고서는 모든 고객의 질문을 미리 담을 수 없습니다. 예를 들어 에스 유 브이 구매희망자의 특성이 실려 있어도, 특정 브랜드 담당자에게는 너무 일반적일 수 있습니다.",
      caption: "보고서는 모든 고객의 질문을 미리 담을 수 없습니다", holdPad: 1.0,
    },
    {
      id: "03-specific-question", part: "1부 · 새로운 가치", title: "일반적인 결과를, 내 업무의 질문으로",
      subtitle: "같은 조사자료도 질문이 구체적일수록 새로운 활용가치를 만듭니다.",
      quote: "“쏘렌토와 싼타페를 함께 고려하는 여성은 현재 어떤 브랜드를 보유하고 있으며, 한 모델만 고려하는 사람과 무엇이 다른가?”",
      narration: "하지만 쏘렌토와 싼타페를 함께 고려하는 여성은 현재 어떤 브랜드를 보유하는지, 한 모델만 고려하는 사람과 무엇이 다른지 물을 수 있다면 같은 조사자료의 가치가 달라집니다.",
      caption: "일반적인 결과를 내 업무의 질문으로", holdPad: 1.2,
    },
    {
      id: "04-atlas-promise", part: "1부 · 해결", title: "한 번 조사한 데이터를, 여러 고객의 질문에 다시 사용합니다",
      subtitle: "AutoBehavior Atlas는 보고서가 아니라 질문에서 출발합니다.",
      flow: ["업무 언어로 질문", "실제 관측 집계 조회", "수치·표·해석", "후속 질문으로 심화"],
      narration: "오토 비헤이비어 아틀라스는 보고서를 다시 보여주는 도구가 아닙니다. 사용자의 질문에서 출발해 실제 조사 집계를 찾고, 수치와 해석을 함께 보여주며, 다음 질문까지 이어가게 합니다.",
      caption: "질문에서 근거까지 이어지는 자동차 인사이트 탐색", holdPad: 1.0,
    },
    {
      id: "05-open-app", part: "2부 · 사용법", title: "1. 평소 업무의 말로 질문합니다",
      subtitle: "통계 변수명이나 분석 명령을 외울 필요가 없습니다.", image: path.join(rawRoot, "01-atlas-opening.png"), imagePosition: "bottom", focus: "질문 입력창",
      narration: "사용법은 간단합니다. 통계 변수나 분석 명령 대신, 평소 업무에서 사용하는 말로 질문합니다.",
      caption: "1. 평소 업무의 말로 질문합니다", holdPad: 1.0,
    },
    {
      id: "06-first-question", part: "2부 · 사용법", title: "2. 비교하고 싶은 모델을 직접 말합니다",
      subtitle: questions.first, image: path.join(rawRoot, "02-first-question-typed.png"), imagePosition: "bottom", focus: "입력된 첫 질문",
      narration: "먼저 이천이십오 년 구매희망 모델에서 쏘렌토와 싼타페를 비교해 달라고 입력합니다.",
      caption: "쏘렌토와 싼타페 구매희망 비교", holdPad: 1.0,
    },
    {
      id: "07-first-result", part: "2부 · 실제 결과", title: "3. 같은 모집단과 기준으로 비교합니다",
      subtitle: "두 모델의 관측 비중과 근거 범위를 한 화면에서 확인합니다.", image: path.join(rawRoot, "03-first-result.png"), focus: "2025년 전체 적격 응답 비교",
      narration: "아틀라스는 두 모델의 관측 비중을 같은 모집단과 같은 기준으로 비교합니다. 답변에는 결론만이 아니라 표본과 근거 범위도 함께 표시됩니다.",
      caption: "같은 모집단과 기준으로 비교", holdPad: 1.4,
    },
    {
      id: "08-overlap", part: "2부 · 후속 질문", title: "4. 결과를 보고 더 구체적으로 묻습니다",
      subtitle: "여성 유효 응답에서 두 모델을 모두 고려한 비중 1.42%", image: path.join(rawRoot, "05-overlap-result.png"), focus: "여성 공동고려 결과",
      narration: "결과를 본 뒤, 두 모델을 함께 고려한 여성의 비중을 이어서 묻습니다. 유효 응답에서 두 모델을 모두 고려한 비중은 일 점 사 이 퍼센트로 확인됩니다.",
      caption: "후속 질문 — 여성 공동고려 1.42%", holdPad: 1.5,
    },
    {
      id: "09-profile", part: "2부 · 실무 인사이트", title: "5. 보유 브랜드와 최근 취득까지 연결합니다",
      subtitle: "KIA 47.75% · Hyundai 48.88% · 최근 12개월 취득 비중 비교", image: path.join(rawRoot, "06-profile-result.png"), focus: "여성 고려집합별 보유 브랜드",
      narration: "이제 현재 보유 브랜드와 최근 취득 비중을 묻습니다. 쏘렌토만 고려한 여성은 기아 보유 비중이 사십칠 점 칠오 퍼센트, 싼타페만 고려한 여성은 현대 보유 비중이 사십팔 점 팔팔 퍼센트로 가장 높았습니다. 최근 열두 달 안에 주사용차를 취득한 비중도 함께 비교됩니다.",
      caption: "보유 브랜드와 최근 취득까지 연결", holdPad: 1.8,
    },
    {
      id: "10-closing", part: "AutoBehavior Atlas", title: "보고서를 넘어, 계속 사용하는 조사 서비스로",
      subtitle: "보고서에서 가치를 찾지 못했던 사람도 자기 질문으로 조사자료의 가치를 발견합니다.",
      flow: ["한 번 읽는 보고서", "자기 질문으로 탐색", "반복되는 실무 활용"],
      narration: "이렇게 기획조사는 한 번 읽고 끝나는 보고서에서, 고객이 자신의 질문으로 계속 사용하는 조사 서비스가 됩니다. 보고서에서 가치를 찾지 못했던 사람에게도, 필요한 답을 직접 발견할 새로운 이유가 생깁니다.",
      caption: "보고서를 넘어, 계속 사용하는 조사 서비스로", holdPad: 1.5,
    },
  ];
}

function sceneHtml(scene, index, total) {
  const bullets = scene.bullets?.map((item) => `<li>${escapeHtml(item)}</li>`).join("") ?? "";
  const flow = scene.flow ? `<div class="flow">${scene.flow.map((item, i) => `<div><strong>${escapeHtml(item)}</strong></div>${i < scene.flow.length - 1 ? '<span>→</span>' : ''}`).join("")}</div>` : "";
  const compare = scene.compare ? `<div class="compare"><article><small>${escapeHtml(scene.compare[0])}</small><strong>${escapeHtml(scene.compare[1])}</strong></article><span>→</span><article class="accent"><small>${escapeHtml(scene.compare[2])}</small><strong>${escapeHtml(scene.compare[3])}</strong></article></div>` : "";
  const image = scene.image ? `<div class="browser"><div class="chrome"><i></i><i></i><i></i><span>${escapeHtml(atlasUrl.replace('https://', ''))}</span></div><img style="object-position:${escapeHtml(scene.imagePosition ?? 'top')}" src="${imageDataUrl(scene.image)}"><b>${escapeHtml(scene.focus)}</b></div>` : "";
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>
    *{box-sizing:border-box}body{margin:0;background:#f4f1ea;color:#17252d;font-family:"Malgun Gothic","Noto Sans KR",sans-serif}.slide{width:1920px;height:1080px;padding:74px 84px 58px;position:relative;overflow:hidden;background:radial-gradient(circle at 88% 5%,rgba(43,112,105,.18),transparent 31%),linear-gradient(135deg,#fbfaf6,#edf3ef)}
    .brand{display:flex;align-items:center;justify-content:space-between;color:#1f6d67;font-size:20px;font-weight:900;letter-spacing:.08em;text-transform:uppercase}.part{padding:10px 18px;border:1px solid rgba(31,109,103,.28);border-radius:999px;background:rgba(255,255,255,.62)}
    h1{max-width:1460px;margin:42px 0 18px;font-size:64px;line-height:1.14;letter-spacing:-.045em}.subtitle{max-width:1480px;margin:0;color:#506169;font-size:29px;line-height:1.5;font-weight:650}.quote{margin-top:54px;max-width:1500px;padding:36px 42px;border-left:9px solid #dc7b4f;border-radius:14px;background:#fff;font-size:38px;line-height:1.5;font-weight:850;box-shadow:0 20px 60px rgba(32,57,63,.12)}
    ul{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;list-style:none;padding:0;margin:55px 0 0}li{padding:28px;border-radius:18px;background:rgba(255,255,255,.82);font-size:27px;font-weight:800;box-shadow:0 12px 35px rgba(32,57,63,.08)}
    .compare{display:grid;grid-template-columns:1fr 70px 1fr;align-items:center;gap:20px;margin-top:58px}.compare article{min-height:230px;padding:35px;border-radius:22px;background:#fff;box-shadow:0 20px 55px rgba(32,57,63,.1)}.compare article.accent{background:#1f6d67;color:#fff}.compare small{display:block;margin-bottom:26px;font-size:22px;font-weight:850;opacity:.72}.compare strong{font-size:34px;line-height:1.45}.compare>span,.flow>span{font-size:46px;color:#dc7b4f;font-weight:900;text-align:center}
    .flow{display:flex;align-items:stretch;gap:18px;margin-top:62px}.flow div{flex:1;display:flex;align-items:center;justify-content:center;min-height:150px;padding:25px;border-radius:20px;background:#fff;border:1px solid rgba(31,109,103,.18);box-shadow:0 16px 40px rgba(32,57,63,.09);text-align:center}.flow strong{font-size:29px;line-height:1.35}
    .browser{position:absolute;left:84px;right:84px;top:290px;height:685px;border-radius:22px;overflow:hidden;background:#fff;border:1px solid rgba(24,45,53,.18);box-shadow:0 28px 80px rgba(24,45,53,.18)}.chrome{height:48px;display:flex;align-items:center;gap:10px;padding:0 18px;background:#edf0f1;border-bottom:1px solid #d7dddf}.chrome i{width:12px;height:12px;border-radius:50%;background:#d67964}.chrome i:nth-child(2){background:#d5ad56}.chrome i:nth-child(3){background:#5ca67f}.chrome span{margin-left:16px;color:#65757b;font-size:16px}.browser img{width:100%;height:637px;object-fit:cover;object-position:top}.browser b{position:absolute;right:24px;top:70px;padding:12px 18px;border-radius:999px;background:#dc7b4f;color:#fff;font-size:19px;box-shadow:0 8px 25px rgba(0,0,0,.16)}
    .footer{position:absolute;left:84px;right:84px;bottom:24px;display:flex;align-items:center;justify-content:space-between;color:#66767b;font-size:17px;font-weight:800}.bar{width:480px;height:6px;border-radius:999px;background:rgba(31,109,103,.15);overflow:hidden}.bar i{display:block;width:${(index/total)*100}%;height:100%;background:#1f6d67}
  </style></head><body><main class="slide"><div class="brand"><span>CONSUMER INSIGHT · AutoBehavior Atlas</span><span class="part">${escapeHtml(scene.part)}</span></div><h1>${escapeHtml(scene.title)}</h1><p class="subtitle">${escapeHtml(scene.subtitle)}</p>${scene.quote ? `<div class="quote">${escapeHtml(scene.quote)}</div>` : ""}${bullets ? `<ul>${bullets}</ul>` : ""}${compare}${flow}${image}<div class="footer"><span>Interactive automotive research</span><div class="bar"><i></i></div><span>${String(index).padStart(2,"0")} / ${String(total).padStart(2,"0")}</span></div></main></body></html>`;
}

async function renderSlides(playwright, scenes) {
  const launchOptions = { headless: true, args: ["--disable-dev-shm-usage", "--font-render-hinting=none"] };
  if (fs.existsSync(chromePath)) launchOptions.executablePath = chromePath;
  const browser = await playwright.chromium.launch(launchOptions);
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  try {
    for (const [i, scene] of scenes.entries()) {
      await page.setContent(sceneHtml(scene, i + 1, scenes.length), { waitUntil: "networkidle" });
      await page.screenshot({ path: path.join(slideRoot, `${scene.id}.png`), fullPage: false });
    }
  } finally { await browser.close(); }
}

async function synthesize(scenes) {
  for (const scene of scenes) {
    const textPath = path.join(narrationRoot, `${scene.id}.txt`);
    const audioPath = path.join(audioRoot, `${scene.id}.wav`);
    await writeFile(textPath, scene.narration, "utf8");
    if (!reuseAudio || !fs.existsSync(audioPath)) run("node", [path.join(root, "scripts", "synthesize-speech.mjs"), "--input", textPath, "--output", audioPath]);
    scene.audio = audioPath;
    scene.duration = audioDuration(audioPath) + scene.holdPad;
  }
}

async function makeVideo(scenes) {
  const concat = [];
  for (const scene of scenes) {
    const image = path.join(slideRoot, `${scene.id}.png`);
    const clip = path.join(clipRoot, `${scene.id}.mp4`);
    run("ffmpeg", ["-y", "-loop", "1", "-framerate", "30", "-i", image, "-i", scene.audio, "-filter_complex", `[1:a]apad=pad_dur=${scene.holdPad}[a]`, "-map", "0:v", "-map", "[a]", "-t", scene.duration.toFixed(3), "-vf", "format=yuv420p", "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-tune", "stillimage", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", clip]);
    concat.push(`file '${ffmpegPath(clip)}'`);
  }
  await writeFile(concatPath, `${concat.join("\n")}\n`, "utf8");
  run("ffmpeg", ["-y", "-f", "concat", "-safe", "0", "-i", concatPath, "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "160k", "-ar", "24000", "-movflags", "+faststart", draftPath]);
}

async function writeSubtitles(scenes) {
  let cursor = 0;
  const srt = [];
  const events = [];
  for (const [i, scene] of scenes.entries()) {
    const start = cursor + 0.2;
    const end = cursor + scene.duration - 0.2;
    srt.push(`${i + 1}\n${srtTime(start)} --> ${srtTime(end)}\n${scene.caption}\n`);
    events.push(`Dialogue: 0,${assTime(start)},${assTime(end)},Default,,0,0,0,,${assText(scene.caption)}`);
    cursor += scene.duration;
  }
  await writeFile(srtPath, `${srt.join("\n")}\n`, "utf8");
  await writeFile(assPath, `[Script Info]\nScriptType: v4.00+\nWrapStyle: 2\nScaledBorderAndShadow: yes\nPlayResX: 1920\nPlayResY: 1080\n\n[V4+ Styles]\nFormat: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding\nStyle: Default,Malgun Gothic,50,&H00FFFFFF,&H000000FF,&H99000000,&HCC000000,1,0,0,0,100,100,0,0,1,4,1,2,110,110,58,1\n\n[Events]\nFormat: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text\n${events.join("\n")}\n`, "utf8");
}

function burnSubtitles() {
  run("ffmpeg", ["-y", "-i", draftPath, "-vf", `subtitles=${ffmpegFilterPath(path.relative(root, assPath))}`, "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", "-c:a", "copy", "-movflags", "+faststart", finalPath]);
}

function probe(file) {
  return JSON.parse(capture("ffprobe", ["-v", "error", "-show_entries", "stream=codec_name,width,height,sample_rate,channels:format=duration,size", "-of", "json", file]));
}

async function verifyAndReport(scenes) {
  const finalStat = await stat(finalPath);
  const details = probe(finalPath);
  run("ffmpeg", ["-y", "-ss", "00:00:35", "-i", finalPath, "-frames:v", "1", "-update", "1", sampleFramePath]);
  const report = {
    generatedAt: new Date().toISOString(),
    targetUrl: atlasUrl,
    narrationProvider: process.env.PR_STUDIO_TTS_PROVIDER_KO ?? process.env.PR_STUDIO_TTS_PROVIDER ?? "auto",
    googleVoice: process.env.GOOGLE_TTS_VOICE_KO ?? "ko-KR-Chirp3-HD-Kore",
    googleSpeakingRate: process.env.GOOGLE_TTS_SPEAKING_RATE ?? "0.94",
    output: finalPath,
    subtitles: { srt: srtPath, ass: assPath },
    sampleFrame: sampleFramePath,
    sizeBytes: finalStat.size,
    probe: details,
    scenes: scenes.map((scene) => ({ id: scene.id, duration: scene.duration, caption: scene.caption })),
  };
  await writeFile(reportPath, JSON.stringify(report, null, 2), "utf8");
  return report;
}

await ensureDirs();
if ((process.env.PR_STUDIO_TTS_PROVIDER_KO ?? process.env.PR_STUDIO_TTS_PROVIDER) !== "google") throw new Error("This production requires PR_STUDIO_TTS_PROVIDER_KO=google.");
if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON && !process.env.GOOGLE_APPLICATION_CREDENTIALS && !process.env.GOOGLE_CLOUD_ACCESS_TOKEN) throw new Error("Google TTS credentials are unavailable.");
const playwright = resolvePlaywright();
console.log("Capturing live AutoBehavior Atlas screens...");
const requiredCaptures = ["01-atlas-opening.png", "02-first-question-typed.png", "03-first-result.png", "04-female-result.png", "05-overlap-result.png", "06-profile-result.png"];
if (!reuseCaptures || requiredCaptures.some((file) => !fs.existsSync(path.join(rawRoot, file)))) await captureAtlasScreens(playwright);
const scenes = buildScenes();
console.log("Rendering slides...");
await renderSlides(playwright, scenes);
console.log("Synthesizing Google narration...");
await synthesize(scenes);
console.log("Rendering video...");
await makeVideo(scenes);
await writeSubtitles(scenes);
burnSubtitles();
const report = await verifyAndReport(scenes);
console.log(JSON.stringify(report, null, 2));
