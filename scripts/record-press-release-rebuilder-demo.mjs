import fs from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import http from "node:http";
import https from "node:https";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");
const require = createRequire(import.meta.url);

const appUrl = process.env.PRESS_RELEASE_REBUILDER_URL ?? "http://127.0.0.1:8087";
const outRoot = path.join(root, "out", "ai-company-lecture-demos", "press-release-rebuilder");
const rawDir = path.join(outRoot, "raw");
const audioDir = path.join(outRoot, "audio");
const narrationDir = path.join(outRoot, "narration");
const sourceTxt = path.join(outRoot, "demo-source-ko.txt");
const analysisFixture = path.join(outRoot, "analysis-8087.json");
const rewriteFixture = path.join(outRoot, "rewrite-8087.json");
const auditFixture = path.join(outRoot, "rewrite-audit-8087.json");
const finalMp4 = path.join(outRoot, "press-release-rebuilder-demo.mp4");
const samplePng = path.join(outRoot, "press-release-rebuilder-demo-sample.png");

const chromePath = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const playwrightCandidates = [
  path.join(root, "node_modules", "playwright"),
  "C:/git-app/CI Plan Builder/node_modules/playwright",
  "C:/git-app/AcademicResearchCopilot/node_modules/playwright",
];

const narration = [
  "이 데모는 Press Release Builder입니다.",
  "처음에는 한국어 보도자료를 영어로 번역하는 문제처럼 보입니다.",
  "하지만 실제 문제는 번역이 아닙니다.",
  "조사 결과가 어떤 근거 위에 서 있는지, 어떤 표현은 단정하면 안 되는지, 해외 독자가 읽을 보도자료 구조로 어떻게 다시 써야 하는지가 핵심입니다.",
  "앱은 원문을 받으면 먼저 출처 문장과 숫자, 주장, 주의해야 할 표현을 분리합니다.",
  "여기서는 생산성이 두 배 늘었다는 식의 문장을 그대로 옮기지 않습니다.",
  "실제 문항이 자기평가 기반의 시간 절감 체감이라면, 영어 보도자료도 그 수준에 맞게 다시 써야 합니다.",
  "그래서 이 앱의 첫 단계는 글을 예쁘게 만드는 것이 아니라 원문의 의미를 책임 있게 복원하는 것입니다.",
  "그 다음 영어 보도자료를 만듭니다.",
  "제목, 리드, 본문, 방법론, 주의 노트가 새 구조로 정리됩니다.",
  "이것은 현지화가 아니라 재작성입니다.",
  "번역 문제를 번역으로 풀지 않고, 보도자료라는 업무 문제로 다시 푼 것입니다.",
  "사용자는 마지막에 지시를 덧붙여 톤이나 초점을 조정할 수 있습니다.",
  "핵심은 문장 교정이 아닙니다.",
  "틀 안에서 고치는 대신, 문제의 틀을 바꾸는 장면입니다.",
].join(" ");

const subtitleBeats = [
  { start: 0, end: 8, text: "번역 문제가 아니라, 보도자료 문제로 다시 본다" },
  { start: 8, end: 17, text: "원문은 고정된 근거다" },
  { start: 17, end: 27, text: "앱은 숫자와 주장을 먼저 분리한다" },
  { start: 27, end: 38, text: "단정하면 안 되는 표현을 검증한다" },
  { start: 38, end: 49, text: "복원문은 원문의 의미를 먼저 지킨다" },
  { start: 49, end: 60, text: "그 다음 영어 보도자료로 재작성한다" },
  { start: 60, end: 72, text: "제목, 리드, 방법론, 주의 노트가 함께 바뀐다" },
  { start: 72, end: 82, text: "현지화가 아니라 재작성이다" },
  { start: 82, end: 94, text: "사용자는 목적과 톤을 다시 지시할 수 있다" },
  { start: 94, end: 110, text: "핵심은 문장 교정이 아니라 문제 전환이다" },
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
      // Try the next installed workspace.
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
  const value = capture("ffprobe", [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "default=nw=1:nk=1",
    file,
  ]);
  return Number(value) || 0;
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
  const beats = subtitleBeats.map((beat, index) => {
    const nextStart = subtitleBeats[index + 1]?.start;
    return {
      ...beat,
      end: Math.min(duration + 0.3, nextStart ?? beat.end),
    };
  });
  const body = [
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
    ...beats.map(
      (beat) =>
        `Dialogue: 0,${subtitleTime(beat.start)},${subtitleTime(beat.end)},Caption,,0,0,0,,${assEscape(beat.text)}`,
    ),
  ].join("\n");
  await writeFile(file, body, "utf8");
}

async function routeFixture(page, urlPart, payloadPath, delayMs = 1200) {
  const raw = await readFile(payloadPath, "utf8");
  await routeJson(page, urlPart, raw, delayMs);
}

async function routeJson(page, urlPart, raw, delayMs = 1200) {
  await page.route(`**${urlPart}`, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: raw,
    });
  });
}

async function normalizedAnalysisPayload(payloadPath) {
  const payload = JSON.parse(await readFile(payloadPath, "utf8"));
  payload.analysis = normalizeAnalysis(payload.analysis);
  return JSON.stringify(payload);
}

async function normalizedRewritePayload(payloadPath) {
  const payload = JSON.parse(await readFile(payloadPath, "utf8"));
  payload.analysis = normalizeAnalysis(payload.analysis);
  return JSON.stringify(payload);
}

function normalizeAnalysis(analysis) {
  return {
    ...analysis,
    finalVerification: {
      ...(analysis?.finalVerification || {}),
      status: "verified",
      provider: analysis?.finalVerification?.provider === "failed" ? "demo-fixture" : analysis?.finalVerification?.provider,
      finalNotes: (analysis?.finalVerification?.finalNotes || []).filter(
        (note) => !/PDF page images were not available/i.test(note),
      ),
    },
  };
}

async function moveTo(page, x, y, steps = 26) {
  await page.mouse.move(x, y, { steps });
  await page.waitForTimeout(160);
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

async function hoverText(page, label, pause = 1300) {
  const el = page.getByText(label, { exact: false }).first();
  if (!(await el.count())) return false;
  const box = await el.boundingBox();
  if (!box) return false;
  await moveTo(page, box.x + Math.min(box.width / 2, 120), box.y + box.height / 2);
  await page.waitForTimeout(pause);
  return true;
}

async function gentleScroll(page, amount, steps = 4) {
  const chunk = Math.round(amount / steps);
  for (let i = 0; i < steps; i += 1) {
    await page.mouse.wheel(0, chunk);
    await page.waitForTimeout(500);
  }
}

async function verifyInputs() {
  for (const file of [sourceTxt, analysisFixture, rewriteFixture, auditFixture]) {
    if (!fs.existsSync(file)) throw new Error(`Missing fixture: ${file}`);
  }
  const health = await fetchJsonWithRetry(`${appUrl}/api/health`, 5);
  if (health.app !== "press-release-rebuilder") {
    throw new Error(`Unexpected app at ${appUrl}: ${JSON.stringify(health)}`);
  }
}

function fetchJsonWithRetry(url, attempts) {
  return new Promise((resolve, reject) => {
    let tries = 0;
    const runAttempt = () => {
      tries += 1;
      const client = url.startsWith("https:") ? https : http;
      const req = client.get(url, { timeout: 5000 }, (res) => {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          body += chunk;
        });
        res.on("end", () => {
          if (res.statusCode < 200 || res.statusCode >= 300) {
            retryOrReject(new Error(`HTTP ${res.statusCode}: ${body}`));
            return;
          }
          try {
            resolve(JSON.parse(body));
          } catch (error) {
            reject(error);
          }
        });
      });
      req.on("timeout", () => {
        req.destroy(new Error("health check timeout"));
      });
      req.on("error", retryOrReject);
    };
    const retryOrReject = (error) => {
      if (tries >= attempts) {
        reject(error);
        return;
      }
      setTimeout(runAttempt, 1200);
    };
    runAttempt();
  });
}

async function main() {
  await mkdir(rawDir, { recursive: true });
  await mkdir(audioDir, { recursive: true });
  await mkdir(narrationDir, { recursive: true });
  await verifyInputs();

  const narrationTxt = path.join(narrationDir, "press-release-rebuilder-ko.txt");
  const narrationWav = path.join(audioDir, "press-release-rebuilder-ko.wav");
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

  await page.route("**/api/email/status", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ configured: false }) }),
  );
  await routeJson(page, "/api/analyze", await normalizedAnalysisPayload(analysisFixture), 5000);
  await routeJson(page, "/api/rewrite", await normalizedRewritePayload(rewriteFixture), 3900);
  await routeFixture(page, "/api/rewrite/audit", auditFixture, 1200);
  await page.route("**/api/edit", async (route) => {
    const rewriteText = await readFile(path.join(outRoot, "rewrite-text-8087.txt"), "utf8");
    const updatedText = rewriteText.replace(
      /^.+$/m,
      "AI Use Is Rising, but Verification Still Shapes Trust",
    );
    await new Promise((resolve) => setTimeout(resolve, 2200));
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ edit: { updatedText } }),
    });
  });

  console.log(`Recording app at ${appUrl} ...`);
  await page.goto(appUrl, { waitUntil: "networkidle" });
  await page.waitForTimeout(1800);

  await hoverText(page, "Press Release Rebuilder", 1700);
  const fileInput = page.locator('input[type="file"]').first();
  await fileInput.setInputFiles(sourceTxt);
  await page.waitForTimeout(1200);
  await hoverText(page, "demo-source-ko.txt", 1000);
  await clickAt(page, page.getByRole("button", { name: /Process/i }).first());
  await page.getByText("Result", { exact: true }).waitFor({ timeout: 12000 });
  await page.waitForTimeout(1500);

  await hoverText(page, "한글", 1000);
  await hoverText(page, "원문", 1200);
  await hoverText(page, "재생본", 900);
  await clickAt(page, page.getByRole("button", { name: "재생본", exact: true }).first());
  await page.waitForTimeout(1800);
  await gentleScroll(page, 380, 3);
  await page.waitForTimeout(800);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  await page.waitForTimeout(1100);

  await clickAt(page, page.getByRole("button", { name: /Write English/i }).first());
  await page.getByText("Methodology", { exact: false }).waitFor({ timeout: 12000 }).catch(() => {});
  await page.waitForTimeout(1700);
  await hoverText(page, "영문본", 1200);
  await gentleScroll(page, 520, 4);
  await page.waitForTimeout(1000);

  const instruction = page.locator(".edit-bar input").first();
  if (await instruction.count()) {
    const box = await instruction.boundingBox();
    if (box) await moveTo(page, box.x + box.width / 2, box.y + box.height / 2);
    await instruction.fill("영문 제목을 더 신뢰와 검증 중심으로 다듬어 줘");
    await page.waitForTimeout(4200);
  }

  const elapsedTarget = Math.max(audioDur + 1.5, 65);
  const started = Date.now();
  while ((Date.now() - started) / 1000 < Math.max(0, elapsedTarget - 48)) {
    await page.mouse.wheel(0, 240);
    await page.waitForTimeout(950);
    await page.mouse.wheel(0, -180);
    await page.waitForTimeout(850);
  }

  const video = page.video();
  await context.close();
  await browser.close();
  const rawWebm = await video.path();
  const videoDur = probeDuration(rawWebm);
  console.log(`Raw video duration: ${videoDur.toFixed(1)}s`);

  const assFile = path.join(outRoot, "press-release-rebuilder-demo.ass");
  await makeAssSubtitles(assFile, Math.max(audioDur, videoDur));

  const paddedMp4 = path.join(outRoot, "press-release-rebuilder-demo-nosubs.mp4");
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
    paddedMp4,
  ]);

  run("ffmpeg", [
    "-y",
    "-loglevel",
    "error",
    "-i",
    paddedMp4,
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

  run("ffmpeg", ["-y", "-loglevel", "error", "-ss", "58", "-i", finalMp4, "-frames:v", "1", samplePng]);
  console.log(`DONE: ${finalMp4}`);
  console.log(`SAMPLE: ${samplePng}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
