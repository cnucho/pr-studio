import { mkdir, readdir, rm, writeFile, copyFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");
const require = createRequire(import.meta.url);

const appUrl = process.env.KWCS_QC_URL ?? "http://127.0.0.1:8061/";
const outRoot = path.join(root, "out", "ai-company-lecture-demos", "kwcs-qc");
const rawDir = path.join(outRoot, "raw");
const narrationDir = path.join(outRoot, "narration");
const finalMp4 = path.join(outRoot, "kwcs-qc-demo.mp4");
const finalNoSubsMp4 = path.join(outRoot, "kwcs-qc-demo-nosubs.mp4");
const samplePng = path.join(outRoot, "kwcs-qc-demo-sample.png");
const dropboxMp4 = "C:/Users/ciadmin/Dropbox/gitwork_data/AI Company_lecture/demos/demo-03-kwcs-qc-daily-monitoring.mp4";

const chromePath = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const playwrightCandidates = [
  "C:/git-app/kwcs-qc/frontend/control-center/node_modules/playwright",
  "C:/git-app/CI Plan Builder/node_modules/playwright",
  "C:/git-app/AcademicResearchCopilot/node_modules/playwright",
];

const narration = [
  "이번 장면은 KWCS 품질검토 앱입니다.",
  "앞의 앱들과 달리, 이 앱은 사람들이 왜 쓰는지가 비교적 분명합니다.",
  "매일 현장 데이터가 들어오고, 완료율과 대표성, 이상 응답, 면접원 패턴을 계속 확인해야 하기 때문입니다.",
  "진행상황 화면은 완료 가구만 보는 곳이 아닙니다.",
  "어느 지역과 세포가 뒤처지는지, 대표성 위험이 커지는지 함께 봅니다.",
  "현장 데이터 화면은 오늘 들어온 응답자료와 과거 스냅샷의 차이를 보여 줍니다.",
  "삭제 후보나 누락 후보가 생기면, 그것은 단순한 파일 문제가 아니라 운영 판단의 대상이 됩니다.",
  "검증기준 화면에서는 GPS, 조사시간, 전화검증, 응답 일관성 같은 규칙이 실제 데이터에 적용됩니다.",
  "중요한 점은 이 검증을 완전히 신뢰해서가 아닙니다.",
  "검증 결과가 회의와 재접촉, 조사회사 공유의 출발점이 되기 때문에 씁니다.",
  "품질공유 화면은 그 차이를 잘 보여 줍니다.",
  "A그룹은 즉시 수정하거나 재접촉해야 할 항목이고, B그룹은 추가 검토와 전화검증 후보입니다.",
  "여기서 에이전트는 사람을 대신해 결론을 내리는 것이 아니라, 매일 반복되는 점검을 구조화합니다.",
  "그래서 사용 조건이 분명한 문제에서는 에이전트가 실제 업무 속으로 들어올 수 있습니다.",
].join(" ");

const subtitleBeats = [
  { start: 0, end: 8, text: "문제가 매일 생기면 에이전트를 쓴다" },
  { start: 8, end: 18, text: "완료율, 대표성, 이상 응답을 계속 확인해야 한다" },
  { start: 18, end: 28, text: "진행상황은 단순 집계가 아니라 위험 신호다" },
  { start: 28, end: 39, text: "오늘 들어온 데이터와 이전 스냅샷의 차이를 본다" },
  { start: 39, end: 50, text: "검증기준은 실제 데이터에 반복 적용된다" },
  { start: 50, end: 62, text: "완전한 신뢰가 아니라 운영 판단의 출발점이다" },
  { start: 62, end: 74, text: "A그룹은 즉시 수정, B그룹은 추가 검토 대상이다" },
  { start: 74, end: 88, text: "에이전트는 매일 반복되는 점검을 구조화한다" },
];

const cursorInit = `
(() => {
  const dot = document.createElement('div');
  dot.id = '__demo_cursor';
  Object.assign(dot.style, {
    position: 'fixed', width: '22px', height: '22px', borderRadius: '50%',
    border: '2px solid rgba(14,165,233,0.95)', background: 'rgba(14,165,233,0.22)',
    left: '0px', top: '0px', transform: 'translate(-50%,-50%)',
    pointerEvents: 'none', zIndex: '2147483647', transition: 'left .04s linear, top .04s linear',
    boxShadow: '0 0 0 4px rgba(14,165,233,0.12)'
  });
  const add = () => { if (document.body && !document.getElementById('__demo_cursor')) document.body.appendChild(dot); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', add); else add();
  window.addEventListener('mousemove', (e) => { dot.style.left = e.clientX + 'px'; dot.style.top = e.clientY + 'px'; });
  window.__demoRipple = (x, y) => {
    const r = document.createElement('div');
    Object.assign(r.style, {
      position: 'fixed', left: x + 'px', top: y + 'px', width: '20px', height: '20px',
      borderRadius: '50%', transform: 'translate(-50%,-50%)',
      border: '3px solid rgba(14,165,233,0.7)', pointerEvents: 'none',
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

  const narrationTxt = path.join(narrationDir, "kwcs-qc-ko.txt");
  const narrationWav = path.join(narrationDir, "kwcs-qc-ko.wav");
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
  await page.waitForTimeout(4500);

  await hoverText(page, "QC Control Center", 900);
  await hoverText(page, "기준자료 로드됨", 900);
  await clickAt(page, page.getByText("진행상황", { exact: true }));
  await page.waitForTimeout(2500);
  await hoverText(page, "완료 가구", 700);
  await hoverText(page, "대표성 위험 점검: 광역시도 연령 x 성별", 1200);
  await hoverText(page, "High lag", 900);
  await hoverText(page, "Watch cells", 900);

  await clickAt(page, page.getByText("현장 데이터", { exact: true }));
  await page.waitForTimeout(2500);
  await hoverText(page, "데이터 파일", 700);
  await hoverText(page, "응답자료 rows", 900);
  await hoverText(page, "오늘 데이터 다운로드", 900);
  await gentleScroll(page, 470, 6);
  await page.waitForTimeout(1400);
  await hoverText(page, "삭제 후보", 1200);

  await clickAt(page, page.getByText("검증기준-1차점검", { exact: true }));
  await page.waitForTimeout(3500);
  await hoverText(page, "실제 데이터 적용 결과", 900);
  await hoverText(page, "GPS 기록 유무", 700);
  await hoverText(page, "조사 소요시간 부족", 700);
  await gentleScroll(page, 520, 7);
  await page.waitForTimeout(1200);

  await clickAt(page, page.getByText("품질공유", { exact: true }));
  await page.waitForTimeout(3000);
  await hoverText(page, "전체 검출", 900);
  await hoverText(page, "A그룹 즉시수정", 900);
  await hoverText(page, "B그룹 추가검토", 900);
  await hoverText(page, "운영 권고", 1200);
  await gentleScroll(page, 360, 5);
  await page.waitForTimeout(1900);
  await gentleScroll(page, -240, 4);
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
  const extendedVideo = path.join(outRoot, "kwcs-qc-demo-extended.mp4");
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
  const assFile = path.join(outRoot, "kwcs-qc-demo.ass");
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
  run("ffmpeg", ["-y", "-loglevel", "error", "-ss", "63", "-i", finalMp4, "-frames:v", "1", samplePng]);
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
