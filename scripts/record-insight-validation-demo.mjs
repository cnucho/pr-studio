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

const appUrl = process.env.INSIGHT_VALIDATION_URL ?? "http://127.0.0.1:4020/demo";
const outRoot = path.join(root, "out", "ai-company-lecture-demos", "insight-validation");
const rawDir = path.join(outRoot, "raw");
const audioDir = path.join(outRoot, "audio");
const narrationDir = path.join(outRoot, "narration");
const finalMp4 = path.join(outRoot, "insight-validation-demo.mp4");
const samplePng = path.join(outRoot, "insight-validation-demo-sample.png");

const chromePath = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const playwrightCandidates = [
  path.join(root, "node_modules", "playwright"),
  "C:/git-app/CI Plan Builder/node_modules/playwright",
  "C:/git-app/AcademicResearchCopilot/node_modules/playwright",
];

const narration = [
  "이 데모는 InsightValidationServer입니다.",
  "여기서 중요한 것은 검증 기능이라는 이름이 아닙니다.",
  "AI가 만든 분석 결과를 바로 믿을 수 있는지, 어디까지 공개해도 되는지 판단하는 구조입니다.",
  "화면의 입력은 분석 결과, 연구 질문, 방법, 계수, 해석 주장, 그리고 사용 목적을 함께 담은 구조화된 산출물입니다.",
  "검증 서버는 이 산출물을 받아 수치의 정합성, 분석 설계, 표본 정보, 프로토콜 기록, 해석의 강도를 따로 점검합니다.",
  "결과는 단순히 맞다 틀리다가 아닙니다.",
  "출시 판정이 보류인지, 조건부 승인인지, 어떤 근거가 부족한지, 무엇을 다시 확인해야 하는지가 함께 나옵니다.",
  "예를 들어 외부 보고서로 쓰려면 방법 자료나 표본 근거가 더 필요할 수 있습니다.",
  "계수표가 그럴듯해도, 해석이 권고 수준으로 뛰어넘으면 공개 범위는 달라집니다.",
  "오른쪽 검증 대화는 이 결과를 사람이 이해할 수 있는 말로 다시 설명합니다.",
  "이 장면에서 보여주려는 것은 신뢰가 점수 하나에서 생기지 않는다는 점입니다.",
  "신뢰는 데이터, 분석, 해석, 사용 목적이 서로 맞을 때 생깁니다.",
  "그래서 좋은 AI 앱은 생성만 하지 않습니다.",
  "자기가 만든 결과를 어떤 조건에서 사용할 수 있는지까지 말해야 합니다.",
].join(" ");

const subtitleBeats = [
  { start: 0, end: 9, text: "검증은 맞다/틀리다 판정이 아니다" },
  { start: 9, end: 19, text: "분석 결과가 어디까지 공개 가능한지 본다" },
  { start: 19, end: 30, text: "데이터, 방법, 계수, 해석, 사용 목적을 함께 점검한다" },
  { start: 30, end: 41, text: "출시 판정은 근거 부족과 수정 과제를 함께 낸다" },
  { start: 41, end: 53, text: "계수표가 있어도 해석 강도는 따로 검증해야 한다" },
  { start: 53, end: 65, text: "검증 대화는 결과를 업무 언어로 바꾼다" },
  { start: 65, end: 77, text: "신뢰는 점수 하나가 아니라 정합성에서 생긴다" },
  { start: 77, end: 92, text: "좋은 에이전트는 사용 가능한 범위까지 말한다" },
];

const cursorInit = `
(() => {
  const dot = document.createElement('div');
  dot.id = '__demo_cursor';
  Object.assign(dot.style, {
    position: 'fixed', width: '22px', height: '22px', borderRadius: '50%',
    border: '2px solid rgba(37,99,235,0.95)', background: 'rgba(37,99,235,0.22)',
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
      borderRadius: '50%', border: '2px solid rgba(37,99,235,0.9)', transform: 'translate(-50%,-50%)',
      pointerEvents: 'none', zIndex: '2147483646'
    });
    document.body.appendChild(r);
    r.animate([{ width: '12px', height: '12px', opacity: 1 }, { width: '64px', height: '64px', opacity: 0 }],
      { duration: 450, easing: 'ease-out' }).onfinish = () => r.remove();
  };
})();
`;

function resolvePlaywright() {
  for (const candidate of playwrightCandidates) {
    try {
      return require(candidate);
    } catch {
      // Try next.
    }
  }
  throw new Error("Playwright not found in workspace candidates.");
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    shell: false,
    env: { ...process.env, ...options.env },
  });
  if (result.status !== 0) throw new Error(`${command} failed with exit code ${result.status}`);
}

function capture(command, args) {
  const result = spawnSync(command, args, { cwd: root, encoding: "utf8", shell: false });
  if (result.status !== 0) throw new Error(`${command} failed with exit code ${result.status}`);
  return result.stdout.trim();
}

function probeDuration(file) {
  return Number(
    capture("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", file]),
  ) || 0;
}

function subtitleTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const cs = Math.floor((seconds % 1) * 100);
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}

function assEscape(text) {
  return String(text).replace(/\\/g, "\\\\").replace(/\{/g, "\\{").replace(/\}/g, "\\}");
}

function ffmpegFilterPath(file) {
  const relative = path.relative(root, file);
  if (relative && !relative.startsWith("..") && !path.isAbsolute(relative)) {
    return relative.replace(/\\/g, "/");
  }
  return file.replace(/\\/g, "/").replace(/^([A-Za-z]):/, "$1\\:");
}

async function makeAssSubtitles(file, duration) {
  const events = subtitleBeats.map((beat, index) => {
    const end = Math.min(duration + 0.3, subtitleBeats[index + 1]?.start ?? beat.end);
    return `Dialogue: 0,${subtitleTime(beat.start)},${subtitleTime(end)},Caption,,0,0,0,,${assEscape(beat.text)}`;
  });
  await writeFile(
    file,
    [
      "[Script Info]",
      "ScriptType: v4.00+",
      "PlayResX: 1920",
      "PlayResY: 1080",
      "ScaledBorderAndShadow: yes",
      "",
      "[V4+ Styles]",
      "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
      "Style: Caption,Malgun Gothic,52,&H00FFFFFF,&H000000FF,&H9A111827,&H9A111827,-1,0,0,0,100,100,0,0,3,2,0,2,160,160,72,1",
      "",
      "[Events]",
      "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
      ...events,
    ].join("\n"),
    "utf8",
  );
}

async function moveTo(page, x, y, steps = 26) {
  await page.mouse.move(x, y, { steps });
  await page.waitForTimeout(170);
}

async function clickAt(page, locator) {
  const box = await locator.boundingBox();
  if (!box) {
    await locator.click({ timeout: 5000 });
    return;
  }
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await moveTo(page, x, y);
  await page.evaluate(([px, py]) => window.__demoRipple?.(px, py), [x, y]);
  await page.waitForTimeout(130);
  await locator.click({ timeout: 5000 });
}

async function hoverText(page, label, pause = 1400) {
  const el = page.getByText(label, { exact: false }).first();
  if (!(await el.count())) return false;
  const box = await el.boundingBox();
  if (!box) return false;
  await moveTo(page, box.x + Math.min(box.width / 2, 130), box.y + box.height / 2);
  await page.waitForTimeout(pause);
  return true;
}

async function gentleScroll(page, amount, steps = 5) {
  const chunk = Math.round(amount / steps);
  for (let i = 0; i < steps; i += 1) {
    await page.mouse.wheel(0, chunk);
    await page.waitForTimeout(520);
  }
}

async function main() {
  await mkdir(rawDir, { recursive: true });
  await mkdir(audioDir, { recursive: true });
  await mkdir(narrationDir, { recursive: true });

  const narrationTxt = path.join(narrationDir, "insight-validation-ko.txt");
  const narrationWav = path.join(audioDir, "insight-validation-ko.wav");
  await writeFile(narrationTxt, narration, "utf8");
  console.log("Synthesizing Korean narration...");
  run("node", [path.join(root, "scripts", "synthesize-speech.mjs"), "--input", narrationTxt, "--output", narrationWav], {
    env: {
      PR_STUDIO_TTS_PROVIDER: "google",
      GOOGLE_TTS_SPEAKING_RATE: "0.94",
    },
  });
  const audioDur = probeDuration(narrationWav);
  console.log(`Narration duration: ${audioDur.toFixed(1)}s`);

  const playwright = resolvePlaywright();
  const launchOptions = {
    headless: true,
    args: ["--disable-dev-shm-usage", "--font-render-hinting=none", "--force-color-profile=srgb"],
  };
  if (fs.existsSync(chromePath)) launchOptions.executablePath = chromePath;

  const browser = await playwright.chromium.launch(launchOptions);
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    recordVideo: { dir: rawDir, size: { width: 1920, height: 1080 } },
  });
  await context.addInitScript(cursorInit);
  const page = await context.newPage();

  console.log(`Recording app at ${appUrl} ...`);
  await page.goto(appUrl, { waitUntil: "networkidle" });
  await page.getByText("검증완료", { exact: false }).waitFor({ timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1600);

  await hoverText(page, "출시판정", 1200);
  await hoverText(page, "보류", 1600);
  await hoverText(page, "플래그", 1200);
  await hoverText(page, "분석", 1200);
  await hoverText(page, "계수", 1400);
  await gentleScroll(page, 560, 5);
  await page.waitForTimeout(900);
  await hoverText(page, "검증", 1300);
  await hoverText(page, "주요 플래그 없음", 1200);
  await gentleScroll(page, 380, 4);
  await page.waitForTimeout(900);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  await page.waitForTimeout(1200);

  const chatBox = page.locator(".chat-compose textarea").first();
  if (await chatBox.count()) {
    await clickAt(page, chatBox);
    await page.waitForTimeout(700);
    await clickAt(page, page.getByRole("button", { name: "전송", exact: true }).first());
    await page.waitForTimeout(9000);
    await hoverText(page, "현재 작업", 1100);
  }

  const started = Date.now();
  while ((Date.now() - started) / 1000 < Math.max(0, audioDur - 48)) {
    await page.mouse.wheel(0, 180);
    await page.waitForTimeout(850);
    await page.mouse.wheel(0, -120);
    await page.waitForTimeout(850);
  }

  const video = page.video();
  await context.close();
  await browser.close();
  const rawWebm = await video.path();
  const videoDur = probeDuration(rawWebm);
  console.log(`Raw video duration: ${videoDur.toFixed(1)}s`);

  const assFile = path.join(outRoot, "insight-validation-demo.ass");
  await makeAssSubtitles(assFile, Math.max(audioDur, videoDur));
  const noSubs = path.join(outRoot, "insight-validation-demo-nosubs.mp4");
  const pad = Math.max(0, audioDur - videoDur + 0.6);
  run("ffmpeg", [
    "-y",
    "-loglevel",
    "error",
    "-i",
    rawWebm,
    "-i",
    narrationWav,
    "-filter_complex",
    `[0:v]tpad=stop_mode=clone:stop_duration=${pad.toFixed(2)},fps=30,format=yuv420p[v]`,
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
    noSubs,
  ]);

  run("ffmpeg", [
    "-y",
    "-loglevel",
    "error",
    "-i",
    noSubs,
    "-vf",
    `subtitles=${ffmpegFilterPath(assFile)}`,
    "-c:v",
    "libx264",
    "-preset",
    "medium",
    "-crf",
    "20",
    "-c:a",
    "copy",
    finalMp4,
  ]);
  run("ffmpeg", ["-y", "-loglevel", "error", "-ss", "45", "-i", finalMp4, "-frames:v", "1", samplePng]);
  console.log(`DONE: ${finalMp4}`);
  console.log(`SAMPLE: ${samplePng}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
