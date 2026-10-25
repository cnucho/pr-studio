// Records the six-part Survey Workflow Orchestrator tutorial from live production.
// Usage:
//   node scripts/record-survey-platform-tutorial.mjs all
//   node scripts/record-survey-platform-tutorial.mjs 01-question-authoring

import fs from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const { chromium } = require(path.join(root, "node_modules", "playwright"));
const manifestPath = process.env.TUTORIAL_MANIFEST
  ? path.resolve(root, process.env.TUTORIAL_MANIFEST)
  : path.join(root, "docs", "demo-scripts", "survey-platform-tutorial", "tutorial-manifest.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const requested = process.argv[2] ?? "all";
const chapters = requested === "all" ? manifest.chapters : manifest.chapters.filter((item) => item.id === requested);
const outRoot = path.resolve(root, process.env.TUTORIAL_OUT_DIR || "out/survey-platform-tutorial");
const rawDir = path.join(outRoot, "raw");
const audioDir = path.join(outRoot, "audio");
const narrationDir = path.join(outRoot, "narration");
const subtitleDir = path.join(outRoot, "subtitles");
const sampleDir = path.join(outRoot, "samples");
const evidenceDir = path.join(outRoot, "evidence");
const chromePath = "C:/Program Files/Google/Chrome/Application/chrome.exe";

if (!chapters.length) {
  throw new Error(`Unknown chapter: ${requested}. Available: ${manifest.chapters.map((item) => item.id).join(", ")}`);
}

for (const dir of [outRoot, rawDir, audioDir, narrationDir, subtitleDir, sampleDir, evidenceDir]) {
  await mkdir(dir, { recursive: true });
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: root, stdio: "inherit", shell: false, ...options });
  if (result.status !== 0) throw new Error(`${command} failed (${result.status})`);
}

function probe(file) {
  const result = spawnSync(
    "ffprobe",
    ["-v", "error", "-show_entries", "format=duration:stream=width,height,codec_name", "-of", "json", file],
    { cwd: root, encoding: "utf8", shell: false },
  );
  if (result.status !== 0) throw new Error(`ffprobe failed for ${file}`);
  return JSON.parse(result.stdout);
}

function durationOf(file) {
  return Number(probe(file).format?.duration ?? 0);
}

function assTime(seconds) {
  const safe = Math.max(0, seconds);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const secs = Math.floor(safe % 60);
  const centis = Math.floor((safe - Math.floor(safe)) * 100);
  return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}.${String(centis).padStart(2, "0")}`;
}

function escapeAss(text) {
  return String(text).replaceAll("\\", "\\\\").replaceAll("{", "\\{").replaceAll("}", "\\}").replaceAll("\n", "\\N");
}

async function writeAss(chapter, audioDuration, target) {
  const beats = chapter.beats.length ? chapter.beats : [{ label: chapter.title }];
  const beatDuration = audioDuration / beats.length;
  const lines = [
    "[Script Info]",
    "ScriptType: v4.00+",
    "PlayResX: 1920",
    "PlayResY: 1080",
    "WrapStyle: 2",
    "ScaledBorderAndShadow: yes",
    "",
    "[V4+ Styles]",
    "Format: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding",
    "Style: Tutorial,Malgun Gothic,42,&H00FFFFFF,&H000000FF,&H00131F35,&H99000000,1,0,0,0,100,100,0,0,3,2,0,2,90,90,54,1",
    "",
    "[Events]",
    "Format: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text",
  ];
  beats.forEach((beat, index) => {
    const start = beat.startSec ?? index * beatDuration;
    const end = Math.min(audioDuration, beat.endSec ?? (beat.startSec != null ? start + (beat.durationSec ?? 24) : (index + 1) * beatDuration));
    const subtitle = beat.subtitleKo || beat.label;
    lines.push(`Dialogue: 0,${assTime(start)},${assTime(end)},Tutorial,,0,0,0,,${escapeAss(chapter.title)}  ·  ${escapeAss(subtitle)}`);
  });
  await writeFile(target, lines.join("\n"), "utf8");
}

const cursorInit = `
(() => {
  const cursor = document.createElement('div');
  cursor.id = '__tutorial_cursor';
  Object.assign(cursor.style, {
    position: 'fixed', width: '24px', height: '24px', borderRadius: '50%',
    border: '3px solid rgba(37,99,235,.95)', background: 'rgba(255,255,255,.8)',
    left: '40px', top: '40px', transform: 'translate(-50%,-50%)', pointerEvents: 'none',
    zIndex: '2147483647', boxShadow: '0 0 0 6px rgba(37,99,235,.18)'
  });
  const add = () => document.body && !document.getElementById(cursor.id) && document.body.appendChild(cursor);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', add); else add();
  window.addEventListener('mousemove', event => { cursor.style.left = event.clientX + 'px'; cursor.style.top = event.clientY + 'px'; });
  window.__tutorialClick = (x, y) => {
    const ring = document.createElement('div');
    Object.assign(ring.style, { position:'fixed', left:x+'px', top:y+'px', width:'12px', height:'12px', borderRadius:'50%', border:'3px solid #2563eb', transform:'translate(-50%,-50%)', pointerEvents:'none', zIndex:'2147483646' });
    document.body.appendChild(ring);
    ring.animate([{width:'12px',height:'12px',opacity:1},{width:'72px',height:'72px',opacity:0}],{duration:600,easing:'ease-out'}).onfinish=()=>ring.remove();
  };
})();`;

async function clickText(page, label) {
  const locator = page.getByText(label, { exact: false }).first();
  if (!(await locator.count())) return false;
  const box = await locator.boundingBox();
  if (!box) return false;
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y, { steps: 24 });
  await page.evaluate(([px, py]) => window.__tutorialClick?.(px, py), [x, y]);
  await page.waitForTimeout(180);
  await locator.click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(1300);
  return true;
}

async function focusBeat(page, beat) {
  let locator = page.getByText(beat.label, { exact: false }).first();
  if (!(await locator.count())) locator = page.locator(`text=${JSON.stringify(beat.label)}`).first();
  if (await locator.count()) {
    await locator.scrollIntoViewIfNeeded().catch(() => {});
    const box = await locator.boundingBox();
    if (box) {
      await page.mouse.move(box.x + Math.min(box.width / 2, 140), box.y + box.height / 2, { steps: 28 });
    }
  }
  await page.waitForTimeout(beat.holdMs ?? 1800);
}

async function performAction(page, action) {
  const locator = action.selector
    ? page.locator(action.selector).first()
    : page.getByText(action.label, { exact: action.exact ?? false }).first();
  if (action.type === "pause") {
    await page.waitForTimeout(action.holdMs ?? 2500);
    return;
  }
  if (!(await locator.count())) throw new Error(`Action target not found: ${action.selector || action.label}`);
  await locator.scrollIntoViewIfNeeded().catch(() => {});
  const box = await locator.boundingBox();
  if (box) await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 24 });
  if (action.type === "fill") await locator.fill(action.value);
  else if (action.type === "select") await locator.selectOption(action.value);
  else if (action.type === "check") await locator.setChecked(action.checked !== false);
  else if (action.type === "focus") await locator.click({ timeout: 8000 });
  else if (action.type === "download") {
    const [download] = await Promise.all([page.waitForEvent("download"), locator.click({ timeout: 8000 })]);
    action.downloadName = download.suggestedFilename();
  }
  else {
    if (box) await page.evaluate(([x, y]) => window.__tutorialClick?.(x, y), [box.x + box.width / 2, box.y + box.height / 2]);
    await locator.click({ timeout: 8000 });
  }
  if (action.expectSelector) {
    await page.locator(action.expectSelector).first().waitFor({ state: "visible", timeout: 10000 });
  }
  if (action.expectValue != null) {
    const actual = await locator.inputValue();
    if (actual !== action.expectValue) throw new Error(`Expected value ${action.expectValue}, received ${actual}`);
  }
  if (action.expectText) {
    const actual = await page.locator(action.expectText.selector).first().textContent();
    if (!String(actual).includes(action.expectText.includes)) throw new Error(`Expected ${action.expectText.selector} to include ${action.expectText.includes}`);
  }
  if (action.expectUrl) await page.waitForURL(action.expectUrl, { timeout: 10000 });
  await page.waitForTimeout(action.holdMs ?? 2200);
}

async function recordChapter(chapter) {
  const narrationPath = path.join(narrationDir, `${chapter.id}.txt`);
  let audioPath = path.join(audioDir, `${chapter.id}.wav`);
  const subtitlePath = path.join(subtitleDir, `${chapter.id}.ass`);
  const finalPath = path.join(outRoot, `${chapter.id}.mp4`);
  const samplePath = path.join(sampleDir, `${chapter.id}.png`);
  await writeFile(narrationPath, chapter.narration, "utf8");

  console.log(`\n[${chapter.id}] Synthesizing Korean narration...`);
  run("node", [path.join(root, "scripts", "synthesize-speech.mjs"), "--input", narrationPath, "--output", audioPath]);
  if (chapter.targetDurationSec) {
    const sourceDuration = durationOf(audioPath);
    const speed = sourceDuration / chapter.targetDurationSec;
    if (speed < 0.5 || speed > 2) throw new Error(`Narration duration ${sourceDuration}s cannot be safely normalized to ${chapter.targetDurationSec}s`);
    const normalizedPath = path.join(audioDir, `${chapter.id}-normalized.wav`);
    run("ffmpeg", ["-y", "-loglevel", "error", "-i", audioPath, "-filter:a", `atempo=${speed.toFixed(6)}`, normalizedPath]);
    audioPath = normalizedPath;
  }
  const audioDuration = durationOf(audioPath);
  await writeAss(chapter, audioDuration, subtitlePath);

  const launchOptions = { headless: true, args: ["--disable-dev-shm-usage", "--font-render-hinting=none", "--force-color-profile=srgb"] };
  if (fs.existsSync(chromePath)) launchOptions.executablePath = chromePath;
  const browser = await chromium.launch(launchOptions);
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    recordVideo: { dir: rawDir, size: { width: 1920, height: 1080 } },
  });
  await context.addInitScript(cursorInit);
  const page = await context.newPage();
  const rawRecordingStartedAt = Date.now();
  const url = new URL(chapter.path, manifest.baseUrl).toString();
  console.log(`[${chapter.id}] Recording ${url}`);
  await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForTimeout(2200);
  if (chapter.actions?.length) {
    await page.evaluate(() => document.querySelector("#kg-tutorial-overlay")?.remove());
    await page.waitForTimeout(900);
  }
  for (const label of chapter.setupClicks ?? []) await clickText(page, label);

  const trimSeconds = (Date.now() - rawRecordingStartedAt) / 1000;
  const start = Date.now();
  let beatIndex = 0;
  let actionIndex = 0;
  const timedActions = [...(chapter.actions ?? [])].sort((a, b) => (a.atSec ?? 0) - (b.atSec ?? 0));
  await page.screenshot({ path: path.join(evidenceDir, `${chapter.id}-00-start.png`) });
  while ((Date.now() - start) / 1000 < audioDuration) {
    const elapsed = (Date.now() - start) / 1000;
    const action = timedActions[actionIndex];
    if (action && elapsed >= (action.atSec ?? 0)) {
      await performAction(page, action);
      actionIndex += 1;
      await page.screenshot({ path: path.join(evidenceDir, `${chapter.id}-${String(actionIndex).padStart(2, "0")}-${action.id || action.type}.png`) });
      continue;
    }
    await focusBeat(page, chapter.beats[beatIndex % chapter.beats.length]);
    beatIndex += 1;
    if (beatIndex % chapter.beats.length === 0) {
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" })).catch(() => {});
      await page.waitForTimeout(900);
    }
  }
  if (actionIndex !== timedActions.length) throw new Error(`Only ${actionIndex}/${timedActions.length} timed actions were executed.`);
  await page.screenshot({ path: path.join(evidenceDir, `${chapter.id}-99-final.png`) });

  const video = page.video();
  await context.close();
  await browser.close();
  const rawPath = await video.path();
  const videoDuration = Math.max(0, durationOf(rawPath) - trimSeconds);
  const pad = Math.max(0, audioDuration - videoDuration + 0.5);
  const assFilterPath = subtitlePath.replaceAll("\\", "/").replace(":", "\\:").replaceAll("'", "\\'");
  run("ffmpeg", [
    "-y", "-loglevel", "error", "-ss", trimSeconds.toFixed(3), "-i", rawPath, "-i", audioPath,
    "-filter_complex", `[0:v]tpad=stop_mode=clone:stop_duration=${pad.toFixed(2)},ass='${assFilterPath}',fps=30,format=yuv420p[v]`,
    "-map", "[v]", "-map", "1:a", "-c:v", "libx264", "-preset", "medium", "-crf", "20",
    "-c:a", "aac", "-b:a", "192k", "-shortest", finalPath,
  ]);
  run("ffmpeg", ["-y", "-loglevel", "error", "-ss", String(Math.min(8, audioDuration / 3)), "-i", finalPath, "-frames:v", "1", samplePath]);
  console.log(`[${chapter.id}] DONE ${finalPath}`);
  return { id: chapter.id, title: chapter.title, file: finalPath, sample: samplePath, ...probe(finalPath) };
}

const results = [];
for (const chapter of chapters) results.push(await recordChapter(chapter));
const renderManifestPath = path.join(outRoot, "render-manifest.json");
let previousResults = [];
try {
  const previousManifest = JSON.parse(await readFile(renderManifestPath, "utf8"));
  previousResults = Array.isArray(previousManifest.results) ? previousManifest.results : [];
} catch {
  // First render, or a malformed generated manifest that can be safely replaced.
}
const mergedResults = new Map(previousResults.map((result) => [result.id, result]));
for (const result of results) mergedResults.set(result.id, result);
await writeFile(
  renderManifestPath,
  JSON.stringify({ renderedAt: new Date().toISOString(), results: [...mergedResults.values()].sort((a, b) => a.id.localeCompare(b.id)) }, null, 2),
  "utf8",
);
console.log(`\nRendered ${results.length} tutorial chapter(s). Manifest: ${renderManifestPath}`);
