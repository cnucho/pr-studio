import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { chromeLaunchArgs, resolveChrome } from "./video-runtime.mjs";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const ffmpeg = require("ffmpeg-static");
const ffprobe = require("ffprobe-static").path;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const chartRoot = process.env.METHODIQ_CHART_STUDIO_ROOT || path.resolve(root, "..", "mcp-chart-tools");
const workbook = path.join(root, "docs", "demo-scripts", "live-usage-demos", "assets", "methodiq-chart-demo-synthetic-data.xlsx");
const id = "chart-studio-office-live-usage";
const outDir = path.join(root, "out", "live-usage-demos", id);
const rawDir = path.join(outDir, "raw");
const evidenceDir = path.join(outDir, "evidence");
const rawVideo = path.join(rawDir, "capture.webm");
const finalVideo = path.join(outDir, `${id}-ko.mp4`);
const port = Number(process.env.CHART_DEMO_PORT || 18898);
const editorUrl = `http://127.0.0.1:${port}/editor`;

function run(command, args, cwd = root) {
  const result = spawnSync(command, args, { cwd, stdio: "inherit", shell: false });
  if (result.status !== 0) throw new Error(`${command} failed with exit code ${result.status}`);
}

function capture(command, args) {
  const result = spawnSync(command, args, { cwd: root, encoding: "utf8", shell: false });
  if (result.status !== 0) throw new Error(result.stderr || `${command} failed`);
  return result.stdout.trim();
}

async function sha256(file) {
  return createHash("sha256").update(await readFile(file)).digest("hex");
}

async function waitForServer(url, timeoutMs = 60000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 350));
  }
  throw new Error(`Chart Studio did not start at ${url}`);
}

async function setCaption(page, text) {
  await page.evaluate(value => { document.querySelector("#demo-caption").textContent = value; }, text);
}

async function clickWithCursor(page, locator) {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  if (!box) throw new Error("Target is not visible");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 18 });
  await page.waitForTimeout(300);
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}

async function importSheet(page, sheetName) {
  await page.locator("#sheet").fill(sheetName);
  const chooserPromise = page.waitForEvent("filechooser");
  await clickWithCursor(page, page.locator("#xlsxBtn"));
  const chooser = await chooserPromise;
  await chooser.setFiles(workbook);
  await page.waitForFunction(name => document.querySelector("#source")?.value.includes(name) && document.querySelector("#status")?.textContent.includes("완성"), sheetName, { timeout: 30000 });
}

await mkdir(rawDir, { recursive: true });
await mkdir(evidenceDir, { recursive: true });
run(process.execPath, ["scripts/build.mjs"], chartRoot);

const server = spawn(process.execPath, ["src/http-server.mjs"], {
  cwd: chartRoot,
  env: { ...process.env, PORT: String(port), HOST: "127.0.0.1" },
  stdio: ["ignore", "pipe", "pipe"],
  windowsHide: true,
});
let serverLog = "";
server.stdout.on("data", chunk => { serverLog += chunk.toString(); });
server.stderr.on("data", chunk => { serverLog += chunk.toString(); });

let browser;
try {
  await waitForServer(`http://127.0.0.1:${port}/api/health`);
  const executablePath = resolveChrome();
  browser = await chromium.launch({ headless: true, args: chromeLaunchArgs(process.env), ...(executablePath ? { executablePath } : {}) });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    permissions: ["clipboard-read", "clipboard-write"],
    recordVideo: { dir: rawDir, size: { width: 1920, height: 1080 } },
  });
  const page = await context.newPage();
  await page.goto(editorUrl, { waitUntil: "networkidle" });
  await page.waitForFunction(() => document.querySelector("#status")?.textContent.includes("완성"), null, { timeout: 30000 });
  await page.addStyleTag({ content: `
    #demo-caption{position:fixed;z-index:9999;left:50%;top:18px;transform:translateX(-50%);padding:11px 20px;border-radius:999px;background:#102e34e8;color:white;font:700 18px/1.3 "Malgun Gothic",sans-serif;box-shadow:0 8px 28px #102e3440;pointer-events:none}
    #demo-cursor{position:fixed;z-index:10000;width:25px;height:25px;border:3px solid #e45b2b;border-radius:50%;background:#fff3;transform:translate(-50%,-50%);pointer-events:none;box-shadow:0 0 0 5px #e45b2b22}
  ` });
  await page.evaluate(() => {
    const caption = document.createElement("div"); caption.id = "demo-caption"; document.body.append(caption);
    const cursor = document.createElement("div"); cursor.id = "demo-cursor"; document.body.append(cursor);
    document.addEventListener("mousemove", event => { cursor.style.left = `${event.clientX}px`; cursor.style.top = `${event.clientY}px`; });
  });

  await setCaption(page, "실제 사용 기록 · 가상데이터를 불러와 차트를 만든다");
  await page.waitForTimeout(2500);
  await clickWithCursor(page, page.locator("details summary"));
  await page.locator("#stylePreset").selectOption("presentation");
  await page.waitForFunction(() => document.querySelector("#status")?.textContent.includes("프레젠테이션"));
  await page.locator("#title").fill("지역별 브랜드 고려율");
  await page.locator("#unit").fill("%");
  await setCaption(page, "1. 그룹 비교 시트를 선택한다");
  await importSheet(page, "01_그룹비교");
  await page.locator("#chart").scrollIntoViewIfNeeded();
  await setCaption(page, "2. 기본 비교 차트가 자동 완성된다");
  await page.screenshot({ path: path.join(evidenceDir, "01-group-comparison.png") });
  await page.waitForTimeout(5200);

  await page.locator("#sheet").scrollIntoViewIfNeeded();
  await page.locator("#title").fill("인지에서 구매까지의 선택 흐름");
  await page.locator("#unit").fill("명");
  await setCaption(page, "3. source · target · value 시트를 불러온다");
  await importSheet(page, "03_선택흐름");
  await page.waitForFunction(() => document.querySelector("#status")?.textContent.includes("샌키 완성"), null, { timeout: 30000 });
  await page.locator("#chart").scrollIntoViewIfNeeded();
  await setCaption(page, "4. 단계별 이탈을 분리한 Sankey가 완성된다");
  await page.screenshot({ path: path.join(evidenceDir, "02-sankey.png") });
  await page.waitForTimeout(7200);

  await page.locator("#interpretation").scrollIntoViewIfNeeded();
  await setCaption(page, "5. 입력값만 요약하고 원인이나 유의성은 추측하지 않는다");
  await page.screenshot({ path: path.join(evidenceDir, "03-interpretation.png") });
  await page.waitForTimeout(4200);
  await setCaption(page, "6. 같은 차트를 PPTX 작업으로 넘긴다");
  await clickWithCursor(page, page.locator("#sendPptx"));
  await page.waitForFunction(() => document.querySelector("#status")?.textContent.includes("PPTX"));
  await page.waitForTimeout(3800);
  await page.locator("#chart").scrollIntoViewIfNeeded();
  await setCaption(page, "Excel 입력 → 차트 → 해석 → PPTX 전달");
  await page.waitForTimeout(4200);

  const video = page.video();
  await context.close();
  if (!video) throw new Error("Playwright recording was not created");
  await video.saveAs(rawVideo);
  await browser.close();
  browser = null;
} finally {
  if (browser) await browser.close().catch(() => {});
  if (!server.killed) server.kill();
}

if (!(await readFile(rawVideo).catch(() => null))) throw new Error(`No raw video. Server log: ${serverLog}`);
run(ffmpeg, ["-y", "-loglevel", "error", "-i", rawVideo, "-f", "lavfi", "-i", "anullsrc=r=48000:cl=mono", "-map", "0:v:0", "-map", "1:a:0", "-r", "30", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-c:a", "aac", "-b:a", "96k", "-shortest", "-movflags", "+faststart", finalVideo]);
run(ffmpeg, ["-v", "error", "-i", finalVideo, "-f", "null", "-"]);
const probe = JSON.parse(capture(ffprobe, ["-v", "error", "-show_entries", "format=duration,size:stream=codec_name,codec_type,width,height,r_frame_rate,sample_rate,channels", "-of", "json", finalVideo]));
const durationSeconds = Number(probe.format.duration);
const samples = [];
for (const percent of [20, 55, 85]) {
  const sample = path.join(outDir, `sample-${percent}.png`);
  run(ffmpeg, ["-y", "-loglevel", "error", "-ss", String(durationSeconds * percent / 100), "-i", finalVideo, "-frames:v", "1", sample]);
  samples.push(path.relative(root, sample).replaceAll("\\", "/"));
}
const verification = {
  generatedAt: new Date().toISOString(),
  sourceApp: "MethodIQ Chart Studio",
  dataset: path.relative(root, workbook).replaceAll("\\", "/"),
  output: path.relative(root, finalVideo).replaceAll("\\", "/"),
  durationSeconds,
  sha256: await sha256(finalVideo),
  probe,
  samples,
  fullDecode: "passed",
  narration: false,
  actualAppRecording: true,
};
await writeFile(path.join(outDir, "verification.json"), `${JSON.stringify(verification, null, 2)}\n`, "utf8");
console.log(JSON.stringify(verification, null, 2));
