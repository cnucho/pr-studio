import { mkdir, readdir, rm, writeFile, copyFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");
const require = createRequire(import.meta.url);

const appUrl = process.env.PROPOSAL_STUDIO_URL ?? "http://127.0.0.1:8088/app";
const outRoot = path.join(root, "out", "ai-company-lecture-demos", "proposal-studio");
const rawDir = path.join(outRoot, "raw");
const narrationDir = path.join(outRoot, "narration");
const finalMp4 = path.join(outRoot, "proposal-studio-demo.mp4");
const finalNoSubsMp4 = path.join(outRoot, "proposal-studio-demo-nosubs.mp4");
const samplePng = path.join(outRoot, "proposal-studio-demo-sample.png");
const dropboxMp4 = "C:/Users/ciadmin/Dropbox/gitwork_data/AI Company_lecture/demos/demo-02-proposal-studio-choice-burden.mp4";

const chromePath = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const playwrightCandidates = [
  path.join(root, "node_modules", "playwright"),
  "C:/git-app/CI Plan Builder/node_modules/playwright",
  "C:/git-app/AcademicResearchCopilot/node_modules/playwright",
];

const narration = [
  "이번 장면은 제안서 작성기입니다.",
  "처음에는 사용자의 판단을 단계별로 반영하는 구조가 더 안전하다고 생각했습니다.",
  "프로젝트명, 발주기관, 원문, 요구사항, 검토, 패키지, 렌더링까지 나누어 두었습니다.",
  "논리적으로는 맞습니다. 제안서는 그냥 한 번에 써 버리면 위험하기 때문입니다.",
  "하지만 실제 사용 장면에서는 다른 문제가 생깁니다.",
  "사용자는 매 단계마다 무엇을 넣을지, 어떤 지시를 할지, 어떤 결과를 믿을지 선택해야 합니다.",
  "좋은 기능이 많다는 것과, 사람들이 바로 쓰고 싶어한다는 것은 같은 말이 아닙니다.",
  "그래서 이 앱은 선택의 비용을 보여 줍니다.",
  "자동화가 충분하지 않으면 사용자는 복잡하다고 느낍니다.",
  "그렇다고 전자동으로만 가면 또 불안해합니다.",
  "중요한 질문은 기능 목록이 아닙니다.",
  "사람이 판단해야 할 지점과, 에이전트가 대신 선택해도 되는 지점을 어떻게 나눌 것인가입니다.",
  "이 경험이 뒤의 결론으로 이어집니다.",
  "사용되는 에이전트는 많은 기능보다, 사용 조건과 신뢰 구조를 먼저 설계해야 합니다.",
].join(" ");

const subtitleBeats = [
  { start: 0, end: 7, text: "제안서 작성기는 선택의 비용을 보여 준다" },
  { start: 7, end: 15, text: "처음 설계는 단계별 판단을 넣는 구조였다" },
  { start: 15, end: 24, text: "RFP 입력, 검토, 패키지, 렌더링이 분리된다" },
  { start: 24, end: 33, text: "구조는 맞지만 사용자는 매번 선택해야 한다" },
  { start: 33, end: 43, text: "좋은 기능이 많아도 바로 쓰고 싶어지는 것은 아니다" },
  { start: 43, end: 53, text: "선택이 많으면 사용자는 복잡하다고 느낀다" },
  { start: 53, end: 63, text: "자동화가 선택을 대신하면 다시 불안이 생긴다" },
  { start: 63, end: 74, text: "핵심은 사람 판단과 에이전트 판단의 배분이다" },
  { start: 74, end: 88, text: "기능보다 사용 조건과 신뢰 구조가 먼저다" },
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
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")}\n${result.stdout}\n${result.stderr}`);
  }
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
  await page.waitForTimeout(180);
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

async function hoverLocator(page, locator, pause = 1200) {
  const box = await locator.boundingBox();
  if (!box) return;
  await moveTo(page, box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(pause);
}

async function gentleScroll(page, amount, steps = 6) {
  for (let i = 0; i < steps; i += 1) {
    await page.mouse.wheel(0, amount / steps);
    await page.waitForTimeout(160);
  }
}

async function main() {
  await mkdir(rawDir, { recursive: true });
  await mkdir(narrationDir, { recursive: true });
  await mkdir(path.dirname(dropboxMp4), { recursive: true });
  for (const name of await readdir(rawDir)) {
    if (name.endsWith(".webm")) await rm(path.join(rawDir, name), { force: true });
  }

  const narrationTxt = path.join(narrationDir, "proposal-studio-ko.txt");
  const narrationWav = path.join(narrationDir, "proposal-studio-ko.wav");
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
  await page.goto(appUrl, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(1600);

  const loginVisible = await page.getByText("이메일 인증 로그인").count().catch(() => 0);
  if (loginVisible) {
    throw new Error(`Login is required at ${appUrl}. Log in first or use a local authenticated URL.`);
  }

  await hoverLocator(page, page.getByRole("heading", { name: "CI Plan Builder" }), 1200);
  await hoverLocator(page, page.getByText("Backend v10.0.0-codex-ready"), 1000);
  await hoverLocator(page, page.getByText("API key configured"), 1000);

  await clickAt(page, page.getByPlaceholder("예: 지역 통합돌봄 제안"));
  await page.keyboard.type("지역 통합돌봄 조사 제안", { delay: 26 });
  await page.waitForTimeout(500);
  await clickAt(page, page.getByPlaceholder("예: OO시"));
  await page.keyboard.type("OO시", { delay: 26 });
  await page.waitForTimeout(500);
  await clickAt(page, page.getByRole("button", { name: "새 세션" }));
  await page.waitForTimeout(1200);

  const rfp = [
    "OO시는 고령자 지역 통합돌봄 서비스 만족도와 이용 장벽을 조사하려 한다.",
    "조사 대상은 서비스 이용자, 가족 보호자, 현장 담당자다.",
    "제안서는 조사 목적, 표본 설계, 조사 방법, 일정, 산출물, 리스크 관리, 활용 방안을 포함해야 한다.",
    "결과는 정책 개선과 다음 연도 사업계획 수립에 사용할 예정이다.",
  ].join("\n");

  await clickAt(page, page.getByPlaceholder("RFP, 과업지시서, 평가항목, 요구사항 원문을 붙여 넣으세요."));
  await page.keyboard.type(rfp, { delay: 3 });
  await page.waitForTimeout(1400);
  await gentleScroll(page, 420, 5);
  await page.waitForTimeout(700);

  const quickButtons = [
    "현재 상태 요약해줘",
    "품질 검토해줘",
    "요구사항 검증해줘",
    "제안서 패키지 만들어줘",
    "Markdown으로 렌더링해줘",
  ];
  for (const label of quickButtons) {
    const locator = page.getByText(label, { exact: true });
    if (await locator.count()) {
      await hoverLocator(page, locator, 650);
    }
  }

  const chatInput = page.getByPlaceholder("예: 품질 검토해줘 / 패키지 만들어줘 / 4장 추진전략을 보완하려면?");
  if (await chatInput.count()) {
    await clickAt(page, chatInput);
    await page.keyboard.type("현재 입력을 바탕으로 제안서 작성 전에 확인해야 할 선택지를 정리해줘.", { delay: 15 });
    await page.waitForTimeout(700);
    await clickAt(page, page.getByText("전송", { exact: true }));
    await page.waitForTimeout(3500);
  }

  await gentleScroll(page, 620, 8);
  await page.waitForTimeout(1700);
  await gentleScroll(page, -500, 6);
  await page.waitForTimeout(1600);

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
  const extendedVideo = path.join(outRoot, "proposal-studio-demo-extended.mp4");
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
  const assFile = path.join(outRoot, "proposal-studio-demo.ass");
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
  run("ffmpeg", ["-y", "-loglevel", "error", "-ss", "42", "-i", finalMp4, "-frames:v", "1", samplePng]);
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
