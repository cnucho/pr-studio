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
const outRoot = path.join(root, "out", "survey-quality-persona-pilot-demo");
const rawRoot = path.join(outRoot, "screens", "raw");
const slideRoot = path.join(outRoot, "screens", "slides");
const narrationRoot = path.join(outRoot, "narration");
const audioRoot = path.join(outRoot, "audio");
const clipRoot = path.join(outRoot, "clips");
const draftPath = path.join(outRoot, "survey-quality-persona-pilot-demo-draft.mp4");
const finalPath = path.join(outRoot, "survey-quality-persona-pilot-demo-current.mp4");
const concatPath = path.join(outRoot, "concat.txt");
const srtPath = path.join(outRoot, "survey-quality-persona-pilot-demo.ko.srt");
const assPath = path.join(outRoot, "survey-quality-persona-pilot-demo.ko.ass");
const reportPath = path.join(outRoot, "render-report.json");
const sampleFramePath = path.join(outRoot, "sample-frame.png");
const chromePath = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const reuseAudio = process.env.PR_STUDIO_REUSE_SURVEY_DEMO_AUDIO === "true";

const images = {
  qualityHome: path.join(rawRoot, "01-survey-quality-home.png"),
  personaHome: path.join(rawRoot, "02-persona-pilot-home.png"),
  personaResult: path.join(rawRoot, "03-persona-pilot-result-default.png"),
  qualityResult: path.join(rawRoot, "04-survey-quality-result.png"),
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
  for (const [name, file] of Object.entries(images)) {
    if (!fs.existsSync(file)) throw new Error(`Required captured screen is missing: ${name} (${file})`);
  }
}

function buildScenes() {
  return [
    {
      id: "01-after-web", part: "1부 · 연구원의 문제", title: "웹 설문이 완성된 뒤에도 검수는 끝나지 않습니다",
      subtitle: "초안이 맞아도, 실제 응답 화면에서는 문구·보기·분기가 달라질 수 있습니다.",
      compare: ["설문 초안", "문항과 보기 확정", "실제 웹 설문", "구현 뒤 다시 바뀐 문구와 분기"],
      narration: "설문 초안이 확정되어도, 실제 웹 설문이 그대로 구현되었다고 장담하기는 어렵습니다. 문구가 바뀌고, 보기가 빠지고, 분기 조건이 달라질 수 있습니다.",
      caption: "초안이 맞아도 실제 웹 설문은 달라질 수 있습니다", holdPad: 0.9,
    },
    {
      id: "02-researcher-check", part: "1부 · 연구원의 문제", title: "원본과 같은지만 확인해서는 부족합니다",
      subtitle: "연구원에게 필요한 것은 설문 자체의 품질과 실제 응답 경로입니다.",
      cards: ["문항과 보기의 완결성", "참조와 분기의 정확성", "막다른 경로와 누락", "응답자가 이해할 수 있는 표현"],
      narration: "연구원은 원본과 같은지만 보는 것이 아닙니다. 문항 자체에 오류가 없는지, 보기가 충분한지, 참조와 분기가 맞는지, 응답자가 끝까지 자연스럽게 진행할 수 있는지를 확인해야 합니다.",
      caption: "설문 자체의 품질과 실제 응답 경로를 함께 확인", holdPad: 0.9,
    },
    {
      id: "03-web-first", part: "1부 · 해결", title: "초안보다 실제 웹 설문을 먼저 봅니다",
      subtitle: "원본 대조는 선택 기능입니다. 웹에 구현된 설문 자체의 오류를 먼저 찾습니다.",
      flow: ["question.js", "문항·보기·참조", "분기·구성", "선택: 원본 대조"],
      narration: "이 도구는 원본 설문지보다, 응답자가 실제로 만나게 될 웹 설문을 먼저 검토합니다. 원본 대조는 필요할 때 추가할 수 있지만, 원본에 오류가 있어도 그대로 통과시키지는 않습니다.",
      caption: "응답자가 만나는 웹 설문 자체를 먼저 검토", holdPad: 1.0,
    },
    {
      id: "04-critical-branch", part: "1부 · 중요 분기", title: "작동하는 분기와 좋은 분기는 다릅니다",
      subtitle: "한 번의 선택이 이후 설문을 크게 바꾸는 중요 분기는 별도로 봐야 합니다.",
      branch: ["종사상 지위", "임금근로자 경로", "자영업자 경로", "비취업자 경로", "되돌릴 기회가 있는가?"],
      narration: "분기 코드가 실행된다고 해서 설계가 안전한 것은 아닙니다. 한 문항의 응답이 이후 설문을 크게 바꾸는 중요 분기라면, 잘못 선택했을 때 되돌릴 기회가 있는지도 함께 살펴야 합니다.",
      caption: "한 응답이 설문을 크게 바꾸는 중요 분기 경고", holdPad: 1.0,
    },
    {
      id: "05-persona-value", part: "1부 · 합성 파일럿", title: "코드가 정상이어도, 응답자는 다르게 이해합니다",
      subtitle: "합성 응답으로 애매한 표현, 보기의 빈틈, 분포와 피로 가능성을 조사 전에 봅니다.",
      cards: ["모호하거나 오인하는 문항", "빠진 응답 범주", "비정상적인 응답분포", "감정 반응과 피로 신호"],
      narration: "코드가 정상이어도 응답자는 용어를 다르게 이해할 수 있습니다. 합성 파일럿은 모집단 설정에 맞춘 가상 응답으로, 애매한 표현과 보기의 빈틈, 비정상적인 분포와 피로 가능성을 조사 전에 찾습니다.",
      caption: "실제 조사 전, 응답자의 이해 위험을 미리 확인", holdPad: 1.0,
    },
    {
      id: "06-one-workflow", part: "1부 · 전체 흐름", title: "세 가지 검증을 한 흐름으로 이어갑니다",
      subtitle: "발견한 문제를 고치고, 같은 순서로 다시 확인합니다.",
      flow: ["웹 설문 자체검토", "중요 분기 확인", "합성 파일럿", "수정 후 재검증"],
      narration: "웹 설문 자체를 검토하고, 중요 분기를 확인한 뒤, 합성 파일럿으로 응답자의 이해 위험을 봅니다. 발견한 문제를 고치고 다시 실행하면 됩니다.",
      caption: "웹 설문 → 중요 분기 → 합성 파일럿 → 재검증", holdPad: 0.9,
    },
    {
      id: "07-upload", part: "2부 · 사용법", title: "1. 실제 운영 파일을 올립니다",
      subtitle: "question.js 또는 questions.json은 필수, 원본 설문지는 선택입니다.", image: images.qualityHome,
      focus: "웹 설문 파일을 먼저 입력", url: "survey-validation-harness-production.up.railway.app",
      narration: "사용법은 간단합니다. 실제 운영할 퀘스천 제이에스, 또는 퀘스천스 제이슨 파일을 올립니다. 원본 설문지는 선택 사항입니다.",
      caption: "1. 실제 운영할 웹 설문 파일을 입력", holdPad: 1.0,
    },
    {
      id: "08-code-result", part: "2부 · 실제 결과", title: "2. 먼저 코드와 구조를 확인합니다",
      subtitle: "문항 5개 복원 · 결정적 정의 오류 0건 · 복원 일관성 확인", image: images.qualityResult,
      focus: "코드·구조 검토 통과", url: "survey-validation-harness-production.up.railway.app/results",
      narration: "이 예시는 문항 다섯 개가 모두 복원되었고, 결정적인 정의 오류는 발견되지 않았습니다. 즉, 코드와 구조만 보면 설문은 실행 가능한 상태입니다.",
      caption: "2. 문항 정의와 복원 일관성을 확인", holdPad: 1.1,
    },
    {
      id: "09-persona-run", part: "2부 · 사용법", title: "3. 같은 설문으로 합성 파일럿을 실행합니다",
      subtitle: "공식 통계 기반 구조와 표본 크기를 정하고 합성 응답을 생성합니다.", image: images.personaHome,
      focus: "설문 + 모집단 설정", url: "persona-pilot-production.up.railway.app",
      narration: "이제 같은 설문을 퍼소나 파일럿으로 보냅니다. 공식 통계 기반의 모집단 구조와 필요한 표본 크기를 정하고, 합성 응답을 생성합니다.",
      caption: "3. 모집단 설정과 표본 크기를 정해 합성 파일럿 실행", holdPad: 1.0,
    },
    {
      id: "10-persona-result", part: "2부 · 실제 결과", title: "4. 코드가 찾지 못한 이해 위험을 확인합니다",
      subtitle: "시험 표본 12명 · 문항 5개 · 응답 행 60개 · 검토 신호 4건", image: images.personaResult,
      focus: "애매한 용어와 응답 불확실성", url: "persona-pilot-production.up.railway.app/results",
      narration: "열두 명의 시험 표본에서, 종사상 지위와 전반적인 근무 여건이 애매한 표현으로 나타났습니다. 서비스의 범위가 불분명한 문항은 이해 난이도도 가장 높았습니다.",
      caption: "4. 애매한 용어와 응답 불확실성을 확인", holdPad: 1.2,
    },
    {
      id: "11-action", part: "2부 · 수정", title: "5. 위험 신호가 나온 문항만 고칩니다",
      subtitle: "모호한 용어를 풀고, 질문 범위를 분명히 하고, 필요한 보기를 보완합니다.",
      beforeAfter: ["평소 자주 이용하는 서비스를 적어 주십시오.", "최근 1개월 동안 주 1회 이상 이용한 온라인 생활 서비스를 모두 적어 주십시오."],
      narration: "연구원은 위험 신호가 나온 문항만 고치면 됩니다. 용어를 풀어 쓰고, 질문의 범위를 분명히 하고, 필요한 보기를 보완한 뒤 다시 검증합니다.",
      caption: "5. 문제가 있는 문항만 수정하고 재검증", holdPad: 1.0,
    },
    {
      id: "12-closing", part: "설문 품질관리", title: "조사 시작 전에, 세 가지 위험을 줄입니다",
      subtitle: "웹 구현 오류 · 중요 분기 위험 · 응답자의 이해 문제", flow: ["찾기", "고치기", "다시 검증", "안전하게 조사 시작"],
      narration: "이제 연구원은 웹 구현 오류, 중요 분기 위험, 응답자의 이해 문제를 조사 시작 전에 확인할 수 있습니다. 설문 검수는 경험에만 의존하는 마지막 확인이 아니라, 반복할 수 있는 품질관리 과정이 됩니다.",
      caption: "설문 검수를 반복 가능한 품질관리 과정으로", holdPad: 1.4,
    },
  ];
}

function sceneHtml(scene, index, total) {
  const cards = scene.cards ? `<div class="cards">${scene.cards.map((item) => `<article>${escapeHtml(item)}</article>`).join("")}</div>` : "";
  const flow = scene.flow ? `<div class="flow">${scene.flow.map((item, i) => `<div>${escapeHtml(item)}</div>${i < scene.flow.length - 1 ? "<span>→</span>" : ""}`).join("")}</div>` : "";
  const compare = scene.compare ? `<div class="compare"><article><small>${escapeHtml(scene.compare[0])}</small><strong>${escapeHtml(scene.compare[1])}</strong></article><span>→</span><article class="accent"><small>${escapeHtml(scene.compare[2])}</small><strong>${escapeHtml(scene.compare[3])}</strong></article></div>` : "";
  const branch = scene.branch ? `<div class="branch"><div class="root">${escapeHtml(scene.branch[0])}</div><div class="routes"><div>${escapeHtml(scene.branch[1])}</div><div>${escapeHtml(scene.branch[2])}</div><div>${escapeHtml(scene.branch[3])}</div></div><div class="warning">${escapeHtml(scene.branch[4])}</div></div>` : "";
  const beforeAfter = scene.beforeAfter ? `<div class="rewrite"><article><small>수정 전</small><strong>${escapeHtml(scene.beforeAfter[0])}</strong></article><span>→</span><article class="after"><small>수정 후</small><strong>${escapeHtml(scene.beforeAfter[1])}</strong></article></div>` : "";
  const image = scene.image ? `<div class="browser"><div class="chrome"><i></i><i></i><i></i><span>${escapeHtml(scene.url)}</span></div><div class="screen"><img src="${imageDataUrl(scene.image)}"></div><b>${escapeHtml(scene.focus)}</b></div>` : "";
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>
  *{box-sizing:border-box}body{margin:0;background:#f5f3ee;color:#17242b;font-family:"Malgun Gothic","Noto Sans KR",sans-serif}.slide{width:1920px;height:1080px;position:relative;overflow:hidden;padding:70px 86px 55px;background:radial-gradient(circle at 91% 4%,rgba(44,104,126,.17),transparent 30%),linear-gradient(135deg,#fbfaf7,#edf3f2)}
  .top{display:flex;justify-content:space-between;align-items:center;color:#216478;font-size:20px;font-weight:900;letter-spacing:.06em}.part{padding:10px 18px;border:1px solid rgba(33,100,120,.28);border-radius:999px;background:rgba(255,255,255,.7)}h1{max-width:1540px;margin:40px 0 15px;font-size:62px;line-height:1.15;letter-spacing:-.045em}.subtitle{max-width:1550px;margin:0;color:#52646c;font-size:29px;line-height:1.48;font-weight:650}
  .cards{display:grid;grid-template-columns:repeat(2,1fr);gap:22px;margin-top:55px}.cards article{display:flex;align-items:center;min-height:145px;padding:32px;border-radius:20px;background:#fff;border-left:8px solid #27809a;font-size:30px;font-weight:850;box-shadow:0 17px 50px rgba(23,50,60,.1)}
  .flow{display:flex;align-items:stretch;gap:16px;margin-top:62px}.flow div{flex:1;display:flex;align-items:center;justify-content:center;min-height:145px;padding:24px;border-radius:20px;background:#fff;border:1px solid rgba(33,100,120,.2);font-size:28px;font-weight:850;text-align:center;box-shadow:0 15px 44px rgba(23,50,60,.09)}.flow span,.compare>span,.rewrite>span{align-self:center;color:#dd7c4f;font-size:48px;font-weight:900}
  .compare,.rewrite{display:grid;grid-template-columns:1fr 80px 1fr;gap:18px;align-items:stretch;margin-top:60px}.compare article,.rewrite article{min-height:225px;padding:38px;border-radius:22px;background:#fff;box-shadow:0 20px 55px rgba(23,50,60,.11)}.compare article.accent,.rewrite article.after{background:#216478;color:#fff}.compare small,.rewrite small{display:block;margin-bottom:25px;font-size:23px;font-weight:850;opacity:.72}.compare strong,.rewrite strong{font-size:34px;line-height:1.48}
  .branch{margin-top:48px;text-align:center}.branch .root{display:inline-block;padding:18px 42px;border-radius:16px;background:#216478;color:#fff;font-size:30px;font-weight:900}.routes{display:grid;grid-template-columns:repeat(3,1fr);gap:28px;margin:35px auto 24px;max-width:1260px}.routes div{padding:28px;border-radius:18px;background:#fff;border-top:7px solid #27809a;font-size:27px;font-weight:850;box-shadow:0 16px 42px rgba(23,50,60,.1)}.warning{display:inline-block;padding:17px 30px;border-radius:999px;background:#f7dfd4;color:#9d4725;font-size:25px;font-weight:900}
  .browser{position:absolute;left:86px;right:86px;top:286px;height:690px;border-radius:22px;overflow:hidden;background:#fff;border:1px solid rgba(23,50,60,.18);box-shadow:0 28px 80px rgba(23,50,60,.18)}.chrome{height:48px;display:flex;align-items:center;gap:10px;padding:0 18px;background:#edf0f1;border-bottom:1px solid #d7dddf}.chrome i{width:12px;height:12px;border-radius:50%;background:#d67964}.chrome i:nth-child(2){background:#d5ad56}.chrome i:nth-child(3){background:#5ca67f}.chrome span{margin-left:16px;color:#65757b;font-size:16px}.screen{height:642px;display:flex;align-items:flex-start;justify-content:center;background:#fff;overflow:hidden}.screen img{width:100%;height:100%;object-fit:contain;object-position:top center}.browser b{position:absolute;right:24px;top:70px;padding:12px 19px;border-radius:999px;background:#dd7c4f;color:#fff;font-size:19px;box-shadow:0 8px 25px rgba(0,0,0,.16)}
  .footer{position:absolute;left:86px;right:86px;bottom:22px;display:flex;align-items:center;justify-content:space-between;color:#66777d;font-size:17px;font-weight:850}.bar{width:470px;height:6px;border-radius:999px;background:rgba(33,100,120,.15);overflow:hidden}.bar i{display:block;width:${(index / total) * 100}%;height:100%;background:#216478}
  </style></head><body><main class="slide"><div class="top"><span>CONSUMER INSIGHT · SURVEY QUALITY</span><span class="part">${escapeHtml(scene.part)}</span></div><h1>${escapeHtml(scene.title)}</h1><p class="subtitle">${escapeHtml(scene.subtitle)}</p>${cards}${flow}${compare}${branch}${beforeAfter}${image}<div class="footer"><span>Survey Quality Review + Persona Pilot</span><div class="bar"><i></i></div><span>${String(index).padStart(2, "0")} / ${String(total).padStart(2, "0")}</span></div></main></body></html>`;
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
  await writeFile(assPath, `[Script Info]\nScriptType: v4.00+\nWrapStyle: 2\nScaledBorderAndShadow: yes\nPlayResX: 1920\nPlayResY: 1080\n\n[V4+ Styles]\nFormat: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding\nStyle: Default,Malgun Gothic,48,&H00FFFFFF,&H000000FF,&H99000000,&HCC000000,1,0,0,0,100,100,0,0,1,4,1,2,110,110,58,1\n\n[Events]\nFormat: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text\n${events.join("\n")}\n`, "utf8");
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
  run("ffmpeg", ["-y", "-ss", "00:01:05", "-i", finalPath, "-frames:v", "1", "-update", "1", sampleFramePath]);
  const report = {
    generatedAt: new Date().toISOString(),
    targetApps: ["survey-quality-review", "persona-pilot"],
    narrationProvider: process.env.PR_STUDIO_TTS_PROVIDER_KO ?? process.env.PR_STUDIO_TTS_PROVIDER ?? "auto",
    googleVoice: process.env.GOOGLE_TTS_VOICE_KO ?? "ko-KR-Chirp3-HD-Charon",
    googleSpeakingRate: process.env.GOOGLE_TTS_SPEAKING_RATE ?? "0.94",
    output: finalPath,
    subtitles: { srt: srtPath, ass: assPath },
    sampleFrame: sampleFramePath,
    sizeBytes: finalStat.size,
    probe: details,
    evidence: { questionCount: 5, personaCount: 12, validatedResponseRows: 60, findingCount: 4 },
    scenes: scenes.map((scene) => ({ id: scene.id, duration: scene.duration, caption: scene.caption })),
  };
  await writeFile(reportPath, JSON.stringify(report, null, 2), "utf8");
  return report;
}

await ensureDirs();
if ((process.env.PR_STUDIO_TTS_PROVIDER_KO ?? process.env.PR_STUDIO_TTS_PROVIDER) !== "google") throw new Error("This production requires PR_STUDIO_TTS_PROVIDER_KO=google.");
if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON && !process.env.GOOGLE_APPLICATION_CREDENTIALS && !process.env.GOOGLE_CLOUD_ACCESS_TOKEN) throw new Error("Google TTS credentials are unavailable.");
if ((process.env.GOOGLE_TTS_VOICE_KO ?? "ko-KR-Chirp3-HD-Charon") !== "ko-KR-Chirp3-HD-Charon") throw new Error("This production requires the approved Korean male voice ko-KR-Chirp3-HD-Charon.");
const playwright = resolvePlaywright();
const scenes = buildScenes();
console.log("Rendering survey quality demo slides...");
await renderSlides(playwright, scenes);
console.log("Synthesizing Google male narration...");
await synthesize(scenes);
console.log("Rendering video...");
await makeVideo(scenes);
await writeSubtitles(scenes);
burnSubtitles();
const report = await verifyAndReport(scenes);
console.log(JSON.stringify(report, null, 2));
