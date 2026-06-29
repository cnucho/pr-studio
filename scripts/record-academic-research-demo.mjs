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

const appUrl =
  process.env.ACADEMIC_RESEARCH_DEMO_URL ??
  "http://127.0.0.1:3025/?conferenceDemo=public-portal-ko&assetVersion=v0_4_candidate";
const outRoot = path.join(root, "out", "ai-company-lecture-demos", "academic-research");
const rawDir = path.join(outRoot, "raw");
const audioDir = path.join(outRoot, "audio");
const narrationDir = path.join(outRoot, "narration");
const finalMp4 = path.join(outRoot, "academic-research-demo.mp4");
const samplePng = path.join(outRoot, "academic-research-demo-sample.png");

const chromePath = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const playwrightCandidates = [
  path.join(root, "node_modules", "playwright"),
  "C:/git-app/CI Plan Builder/node_modules/playwright",
  "C:/git-app/AcademicResearchCopilot/node_modules/playwright",
];

const researchRequest =
  "통계정보 포털 만족도가 국가통계 신뢰도와 관련이 있는지 보고, 통계 이해도에 따라 그 관계가 달라지는지도 확인해 주세요. 발표용으로 조심스러운 해석 문장까지 필요합니다.";

const narration = [
  "이 데모는 Research Pilot Academy에 해당하는 연구 에이전트 장면입니다.",
  "사용자는 분석 방법을 먼저 고르지 않습니다.",
  "연구 질문을 자연어로 넣습니다.",
  "앱 안에는 이미 데이터, 변수 후보, 분석 근거, 검증 기록이 들어 있습니다.",
  "에이전트는 바로 그럴듯한 결론을 쓰지 않습니다.",
  "먼저 연구 질문이 데이터 변수와 어떻게 연결되는지 확인합니다.",
  "그 다음 어떤 분석을 이미 실행했는지, 어떤 해석은 가능한지, 아직 무엇이 부족한지를 판단합니다.",
  "화면 아래 답변을 보면, 상관분석이나 회귀 결과가 있어도 공식 해석용 증거로 바로 쓰지 않습니다.",
  "개념과 변수 매핑이 확정되지 않았으면 연구 질문 수준의 결론을 내릴 수 없다고 제한합니다.",
  "이것이 대화창 답변과 다른 점입니다.",
  "답을 생성하는 것이 아니라, 연구 과정의 다음 단계와 위험을 함께 관리합니다.",
  "과거에는 연구자가 문헌, 데이터, 분석 결과, 해석, 보고 문장을 오가며 몇 주씩 하던 일을 앱이 하나의 흐름으로 묶습니다.",
  "오늘 강의에서 이 앱은 AI 에이전트가 단순 답변보다 훨씬 강력한 업무 흐름이 될 수 있음을 보여주는 첫 사례입니다.",
].join(" ");

const subtitleBeats = [
  { start: 0, end: 9, text: "연구 질문을 자연어로 넣는다" },
  { start: 9, end: 20, text: "방법 선택보다 먼저 근거 경로를 확인한다" },
  { start: 20, end: 32, text: "데이터, 변수, 분석 결과, 해석 가능성을 함께 본다" },
  { start: 32, end: 44, text: "바로 결론을 쓰지 않고 부족한 근거를 제한한다" },
  { start: 44, end: 57, text: "변수 매핑이 불확실하면 연구 결론도 보류한다" },
  { start: 57, end: 70, text: "대화창 답변이 아니라 연구 과정의 일부를 수행한다" },
  { start: 70, end: 86, text: "에이전트는 다음 분석과 보고 문장까지 연결한다" },
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
      ...subtitleBeats.map((beat, index) => {
        const end = Math.min(duration + 0.3, subtitleBeats[index + 1]?.start ?? beat.end);
        return `Dialogue: 0,${subtitleTime(beat.start)},${subtitleTime(end)},Caption,,0,0,0,,${assEscape(beat.text)}`;
      }),
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
  await page.waitForTimeout(120);
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

  const narrationTxt = path.join(narrationDir, "academic-research-ko.txt");
  const narrationWav = path.join(audioDir, "academic-research-ko.wav");
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
  await page.waitForTimeout(1800);
  await hoverText(page, "데이터", 900);
  await hoverText(page, "근거", 900);
  const textarea = page.locator("textarea").first();
  await clickAt(page, textarea);
  await textarea.fill(researchRequest);
  await page.waitForTimeout(1600);
  await clickAt(page, page.getByRole("button", { name: /보내기/ }).first());
  await page.waitForTimeout(4200);
  await hoverText(page, "요청", 1000);
  await hoverText(page, "최근 답변", 1000);
  await page.waitForTimeout(17000);
  await page.getByText("현재 앱 근거를 보면", { exact: false }).waitFor({ timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(1600);
  await hoverText(page, "최근 답변", 1200);
  await gentleScroll(page, 520, 5);
  await page.waitForTimeout(1200);
  await gentleScroll(page, 520, 5);
  await page.waitForTimeout(1000);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  await page.waitForTimeout(1200);

  const started = Date.now();
  while ((Date.now() - started) / 1000 < Math.max(0, audioDur - 66)) {
    await page.mouse.wheel(0, 170);
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

  const assFile = path.join(outRoot, "academic-research-demo.ass");
  await makeAssSubtitles(assFile, Math.max(audioDur, videoDur));
  const noSubs = path.join(outRoot, "academic-research-demo-nosubs.mp4");
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
  run("ffmpeg", ["-y", "-loglevel", "error", "-ss", "52", "-i", finalMp4, "-frames:v", "1", samplePng]);
  console.log(`DONE: ${finalMp4}`);
  console.log(`SAMPLE: ${samplePng}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
