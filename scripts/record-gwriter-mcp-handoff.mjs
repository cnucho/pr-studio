import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";
import { chromeLaunchArgs, resolveChrome } from "./video-runtime.mjs";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const ffmpeg = require("ffmpeg-static");
const ffprobe = require("ffprobe-static").path;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "out", "live-usage-demos", "gwriter-mcp-live-usage");
const rawDir = path.join(outDir, "raw");
const rawVideo = path.join(rawDir, "capture.webm");
const finalVideo = path.join(outDir, "gwriter-mcp-live-usage-ko.mp4");
const input = createInterface({ input: process.stdin, output: process.stdout, terminal: false });
const url = (await input.question("")).trim();
input.close();
if (!url.startsWith("https://")) throw new Error("A gWriter MCP handoff URL is required on stdin");

function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, stdio: "inherit", shell: false });
  if (result.status !== 0) throw new Error(`${command} failed with exit code ${result.status}`);
}
function capture(command, args) {
  const result = spawnSync(command, args, { cwd: root, encoding: "utf8", shell: false });
  if (result.status !== 0) throw new Error(result.stderr || `${command} failed`);
  return result.stdout.trim();
}

await mkdir(rawDir, { recursive: true });
const executablePath = resolveChrome();
const browser = await chromium.launch({ headless: true, args: chromeLaunchArgs(process.env), ...(executablePath ? { executablePath } : {}) });
const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, recordVideo: { dir: rawDir, size: { width: 1920, height: 1080 } } });
const page = await context.newPage();
await page.goto(url, { waitUntil: "networkidle", timeout: 45_000 });
await page.waitForTimeout(3500);
await page.getByRole("button", { name: "원본 고정", exact: true }).click();
await page.waitForTimeout(1800);
const editor = page.locator('[contenteditable="true"]').filter({ hasText: "분기별 고객 만족도 요약" }).first();
await editor.scrollIntoViewIfNeeded();
await editor.click();
await page.waitForTimeout(900);
await editor.fill("분기별 고객 만족도 요약\n\n합성 예시에서 고객 만족도는 1분기 62점에서 4분기 79점으로 높아졌다.\n\n이는 입력된 네 개 분기 수치의 기술적 요약이며, 표본 추론이나 인과관계로 해석하지 않는다.");
await page.waitForTimeout(3500);
await page.getByRole("button", { name: "편집 완료 · AI로 보내기", exact: true }).click();
await page.waitForTimeout(4200);
const video = page.video();
await context.close();
if (video) await video.saveAs(rawVideo);
await browser.close();

run(ffmpeg, ["-y", "-loglevel", "error", "-i", rawVideo, "-f", "lavfi", "-i", "anullsrc=r=48000:cl=mono", "-map", "0:v:0", "-map", "1:a:0", "-r", "30", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "19", "-c:a", "aac", "-b:a", "96k", "-shortest", "-movflags", "+faststart", finalVideo]);
run(ffmpeg, ["-v", "error", "-i", finalVideo, "-f", "null", "-"]);
const probe = JSON.parse(capture(ffprobe, ["-v", "error", "-show_entries", "format=duration,size:stream=codec_name,codec_type,width,height", "-of", "json", finalVideo]));
const durationSeconds = Number(probe.format.duration);
const samples = [];
for (const percent of [20, 55, 85]) {
  const sample = path.join(outDir, `sample-${percent}.png`);
  run(ffmpeg, ["-y", "-loglevel", "error", "-ss", String(durationSeconds * percent / 100), "-i", finalVideo, "-frames:v", "1", sample]);
  samples.push(path.relative(root, sample).replaceAll("\\", "/"));
}
const verification = {
  generatedAt: new Date().toISOString(),
  source: "MethodIQ Tools gwriter_start_gwriter_edit handoff",
  output: path.relative(root, finalVideo).replaceAll("\\", "/"),
  durationSeconds,
  sha256: createHash("sha256").update(await readFile(finalVideo)).digest("hex"),
  probe,
  samples,
  fullDecode: "passed",
};
await writeFile(path.join(outDir, "verification.json"), `${JSON.stringify(verification, null, 2)}\n`, "utf8");
console.log(JSON.stringify(verification, null, 2));
