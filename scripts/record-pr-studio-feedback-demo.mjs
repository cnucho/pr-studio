import { mkdir, readdir, rm, writeFile, copyFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");
const require = createRequire(import.meta.url);

const appUrl = process.env.PR_STUDIO_FEEDBACK_URL ?? "http://127.0.0.1:3026/?tab=performance";
const outRoot = path.join(root, "out", "ai-company-lecture-demos", "pr-studio-feedback");
const rawDir = path.join(outRoot, "raw");
const narrationDir = path.join(outRoot, "narration");
const finalMp4 = path.join(outRoot, "pr-studio-feedback-demo.mp4");
const finalNoSubsMp4 = path.join(outRoot, "pr-studio-feedback-demo-nosubs.mp4");
const samplePng = path.join(outRoot, "pr-studio-feedback-demo-sample.png");
const dropboxMp4 = "C:/Users/ciadmin/Dropbox/gitwork_data/AI Company_lecture/demos/demo-08-pr-studio-feedback-loop.mp4";

const chromePath = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const playwrightCandidates = [
  "C:/git-app/kwcs-qc/frontend/control-center/node_modules/playwright",
  "C:/git-app/CI Plan Builder/node_modules/playwright",
  "C:/git-app/AcademicResearchCopilot/node_modules/playwright",
];

const narration = [
  "마지막 장면은 PR Studio의 성과 수집과 피드백 판단입니다.",
  "홍보 영상을 만들고 나면 흔히 조회수나 반응률만 봅니다.",
  "그러면 다음 행동이 단순해집니다. 다시 만들자, 제목을 바꾸자, 더 자극적으로 하자.",
  "하지만 실제로 중요한 것은 무엇을 고칠지의 수준입니다.",
  "이 화면은 YouTube 공개 지표를 먼저 모읍니다.",
  "어떤 제목 구조가 더 반응을 얻었는지, 댓글과 좋아요가 어디에 몰렸는지 확인합니다.",
  "그 다음 피드백을 읽고 수정 수준을 판단합니다.",
  "문장만 고칠 문제인지, 대본 구조를 다시 짜야 하는지, 메시지 프레임이나 대상 자체를 바꿔야 하는지 구분합니다.",
  "여기서는 대본 구조 재작성이 1순위로 나옵니다.",
  "시청자가 내용은 필요로 하지만 이해 경로를 놓친다는 뜻입니다.",
  "그래서 자동화는 결과물을 다시 뽑는 기능만이 아닙니다.",
  "다음 실험의 단위를 정하는 판단 구조가 포함되어야 합니다.",
  "이것이 문제 중심 상상력입니다.",
  "AI 에이전트는 많은 일을 자동으로 할 수 있습니다.",
  "그러나 실제로 쓰이는 앱은, 무엇을 자동화할지와 무엇을 사람의 판단으로 남길지를 설계한 앱입니다.",
].join(" ");

const subtitleBeats = [
  { start: 0, end: 9, text: "자동화의 핵심은 다시 만들기가 아니다" },
  { start: 9, end: 19, text: "성과 지표는 다음 실험의 출발점이다" },
  { start: 19, end: 31, text: "중요한 것은 무엇을 고칠지의 수준이다" },
  { start: 31, end: 43, text: "문장, 대본, 프레임, 대상은 서로 다른 수정이다" },
  { start: 43, end: 55, text: "피드백은 수정 수준 판단으로 바뀐다" },
  { start: 55, end: 67, text: "여기서는 대본 구조 재작성이 1순위다" },
  { start: 67, end: 79, text: "에이전트는 다음 실험의 단위를 정해야 한다" },
  { start: 79, end: 94, text: "사용되는 앱은 자동화와 사람 판단의 경계를 설계한다" },
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
      position: 'fixed', left: x + 'px', top: y + 'px', width: '20px', height: '20px',
      borderRadius: '50%', transform: 'translate(-50%,-50%)',
      border: '3px solid rgba(37,99,235,0.7)', pointerEvents: 'none',
      zIndex: '2147483646', animation: '__demoRipple .55s ease-out forwards'
    });
    document.body.appendChild(r);
    setTimeout(() => r.remove(), 650);
  };
  const style = document.createElement('style');
  style.textContent = '@keyframes __demoRipple { to { opacity: 0; width: 76px; height: 76px; } }';
  document.head.appendChild(style);
})();
`;

function resolvePlaywright() {
  for (const candidate of playwrightCandidates) {
    try {
      return createRequire(path.join(candidate, "package.json"))("playwright");
    } catch {}
  }
  return require("playwright");
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    shell: false,
    ...options,
  });
  if (result.status !== 0) throw new Error(`${command} ${args.join(" ")}\n${result.stdout}\n${result.stderr}`);
  return result.stdout;
}

function capture(command, args) {
  const result = spawnSync(command, args, { cwd: root, encoding: "utf8", shell: false });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout);
  return result.stdout.trim();
}

function probeDuration(file) {
  return Number.parseFloat(
    capture("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", file]),
  );
}

function subtitleTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const cs = Math.floor((seconds - Math.floor(seconds)) * 100);
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}

function assEscape(text) {
  return text.replaceAll("\\", "\\\\").replaceAll("{", "\\{").replaceAll("}", "\\}");
}

function ffmpegFilterPath(file) {
  return path.relative(root, file).replaceAll("\\", "/");
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
      "",
      "[V4+ Styles]",
      "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
      "Style: Caption,Noto Sans CJK KR,48,&H00FFFFFF,&H00FFFFFF,&H7A000000,&H9A000000,-1,0,0,0,100,100,0,0,1,2,0,2,120,120,72,1",
      "",
      "[Events]",
      "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
      ...events,
      "",
    ].join("\n"),
    "utf8",
  );
}

async function moveTo(page, x, y, steps = 26) {
  await page.mouse.move(x, y, { steps });
  await page.waitForTimeout(160);
}

async function clickAt(page, locator) {
  const box = await locator.boundingBox();
  if (!box) return;
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await moveTo(page, x, y);
  await page.evaluate(([rx, ry]) => window.__demoRipple?.(rx, ry), [x, y]);
  await locator.click();
}

async function hoverText(page, label, pause = 900) {
  const locator = page.getByText(label, { exact: true });
  if (!(await locator.count())) return;
  const box = await locator.first().boundingBox();
  if (!box) return;
  await moveTo(page, box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(pause);
}

async function gentleScroll(page, amount, steps = 6) {
  for (let i = 0; i < steps; i += 1) {
    await page.mouse.wheel(0, amount / steps);
    await page.waitForTimeout(150);
  }
}

async function main() {
  await mkdir(rawDir, { recursive: true });
  await mkdir(narrationDir, { recursive: true });
  await mkdir(path.dirname(dropboxMp4), { recursive: true });
  for (const name of await readdir(rawDir)) {
    if (name.endsWith(".webm")) await rm(path.join(rawDir, name), { force: true });
  }

  const narrationTxt = path.join(narrationDir, "pr-studio-feedback-ko.txt");
  const narrationWav = path.join(narrationDir, "pr-studio-feedback-ko.wav");
  await writeFile(narrationTxt, narration, "utf8");
  run("node", [path.join(root, "scripts", "synthesize-speech.mjs"), "--input", narrationTxt, "--output", narrationWav], {
    env: {
      ...process.env,
      PR_STUDIO_TTS_PROVIDER: "google",
      GOOGLE_APPLICATION_CREDENTIALS: process.env.GOOGLE_APPLICATION_CREDENTIALS ?? "C:/secure/pr-studio-google-tts.json",
      GOOGLE_TTS_VOICE_KO: process.env.GOOGLE_TTS_VOICE_KO ?? "ko-KR-Chirp3-HD-Kore",
      GOOGLE_TTS_SPEAKING_RATE: process.env.GOOGLE_TTS_SPEAKING_RATE ?? "0.94",
    },
  });

  const playwright = resolvePlaywright();
  const launchOptions = { headless: true, args: ["--window-size=1920,1080"] };
  if (chromePath) launchOptions.executablePath = chromePath;
  const browser = await playwright.chromium.launch(launchOptions);
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    recordVideo: { dir: rawDir, size: { width: 1920, height: 1080 } },
  });
  await context.addInitScript(cursorInit);
  const page = await context.newPage();
  await page.goto(appUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(1800);

  await hoverText(page, "YouTube 성과 수집기", 900);
  await hoverText(page, "총 조회수", 800);
  await hoverText(page, "평균 반응률", 800);
  await hoverText(page, "다음 메시지 실험", 1300);
  await gentleScroll(page, 610, 7);
  await page.waitForTimeout(800);
  await hoverText(page, "댓글/피드백 기반 수정 수준 판단", 1000);
  await clickAt(page, page.getByText("샘플 피드백", { exact: true }));
  await page.waitForTimeout(700);
  await clickAt(page, page.getByText("수정 수준 판단", { exact: true }));
  await page.waitForTimeout(1700);
  await hoverText(page, "대본 구조 재작성", 1200);
  await hoverText(page, "94% 확신", 900);
  await gentleScroll(page, 520, 6);
  await page.waitForTimeout(900);
  await hoverText(page, "피드백 신호", 900);
  await hoverText(page, "이해 실패", 900);
  await hoverText(page, "수정 수준 후보", 900);
  await gentleScroll(page, 640, 7);
  await page.waitForTimeout(1000);
  await hoverText(page, "개선 가드레일", 1000);
  await hoverText(page, "성과지표 단독 최적화 금지", 1100);
  await gentleScroll(page, 620, 7);
  await page.waitForTimeout(1000);
  await hoverText(page, "다음 제작 지시서", 1100);
  await hoverText(page, "대본 수리", 1000);
  await gentleScroll(page, -600, 6);
  await page.waitForTimeout(1200);

  await context.close();
  await browser.close();

  const rawFiles = (await readdir(rawDir))
    .filter((name) => name.endsWith(".webm"))
    .map((name) => path.join(rawDir, name));
  if (!rawFiles.length) throw new Error("No raw recording was produced.");
  const rawVideo = rawFiles.sort().at(-1);
  const audioDur = probeDuration(narrationWav);
  const videoDur = probeDuration(rawVideo);
  const padSeconds = Math.max(0, audioDur + 1.2 - videoDur);
  const extendedVideo = path.join(outRoot, "pr-studio-feedback-demo-extended.mp4");
  if (padSeconds > 0.2) {
    run("ffmpeg", [
      "-y",
      "-loglevel",
      "error",
      "-i",
      rawVideo,
      "-vf",
      `tpad=stop_mode=clone:stop_duration=${padSeconds.toFixed(2)}`,
      "-an",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      extendedVideo,
    ]);
  } else {
    run("ffmpeg", ["-y", "-loglevel", "error", "-i", rawVideo, "-an", "-c:v", "libx264", "-pix_fmt", "yuv420p", extendedVideo]);
  }

  const duration = Math.max(audioDur, probeDuration(extendedVideo));
  const assFile = path.join(outRoot, "pr-studio-feedback-demo.ass");
  await makeAssSubtitles(assFile, duration);
  run("ffmpeg", [
    "-y",
    "-loglevel",
    "error",
    "-i",
    extendedVideo,
    "-i",
    narrationWav,
    "-map",
    "0:v:0",
    "-map",
    "1:a:0",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-shortest",
    finalNoSubsMp4,
  ]);
  run("ffmpeg", [
    "-y",
    "-loglevel",
    "error",
    "-i",
    finalNoSubsMp4,
    "-vf",
    `subtitles=${ffmpegFilterPath(assFile)}`,
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "copy",
    finalMp4,
  ]);
  run("ffmpeg", ["-y", "-loglevel", "error", "-ss", "57", "-i", finalMp4, "-frames:v", "1", samplePng]);
  await copyFile(finalMp4, dropboxMp4);
  const finalInfo = JSON.parse(
    capture("ffprobe", ["-v", "error", "-show_entries", "stream=codec_name,width,height,sample_rate,channels:format=duration,size", "-of", "json", finalMp4]),
  );
  console.log(JSON.stringify({ appUrl, finalMp4, dropboxMp4, samplePng, finalInfo }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
