import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { chromeLaunchArgs, resolveBinary, resolveChrome, subtitleFont } from "./video-runtime.mjs";

const require = createRequire(import.meta.url);
const playwright = require("playwright");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function argument(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? path.resolve(process.argv[index + 1]) : fallback;
}

const workDir = argument("--work-dir", path.join(root, "video-assets", "v2"));
const assetDir = workDir;
const finalPath = argument("--output", path.join(root, "out", "pr-studio-final.mp4"));
const outDir = path.dirname(finalPath);
const draftPath = path.join(workDir, "draft.mp4");

function run(command, args, env = process.env) {
  const result = spawnSync(command, args, { stdio: "inherit", shell: false, env });
  if (result.status !== 0) throw new Error(`${command} failed with exit code ${result.status}`);
}

function capture(command, args) {
  const result = spawnSync(command, args, { encoding: "utf8", shell: false });
  if (result.status !== 0) throw new Error(result.stderr || `${command} failed`);
  return result.stdout.trim();
}

function filterPath(file) {
  return path.relative(root, file).replaceAll("\\", "/").replaceAll(":", "\\:");
}

function escapeHtml(value) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function cardHtml(insert) {
  const rows = insert.rows
    .map((row) => {
      const width = insert.kind === "chart" ? "100%" : "";
      return `<div class="row${row.emphasis ? " emphasis" : ""}">
        <strong>${escapeHtml(row.label)}</strong>
        ${insert.kind === "chart" ? `<span class="bar" style="width:${width}"></span>` : ""}
        <em>${escapeHtml(row.value)}</em>
      </div>`;
    })
    .join("");
  return `<!doctype html><meta charset="utf-8"><style>
    html,body{margin:0;width:1920px;height:1080px;background:#f7f6f2;color:#241c18;font-family:"Noto Sans CJK KR","Malgun Gothic",sans-serif}
    main{box-sizing:border-box;height:100%;padding:96px 120px}
    h1{margin:0 0 18px;font-size:64px}
    p{margin:0 0 42px;font-size:30px;line-height:1.45}
    .row{display:flex;gap:28px;align-items:center;margin:0 0 22px;padding:22px 28px;background:white;border:1px solid #e4ddd4;border-radius:16px;font-size:32px}
    .emphasis{border-color:#2457d6;box-shadow:inset 8px 0 0 #2457d6}
    strong{min-width:280px}
    em{font-style:normal;color:#5c534c}
    .bar{height:18px;background:#2457d6;border-radius:99px}
  </style><main><h1>${escapeHtml(insert.title)}</h1><p>${escapeHtml(insert.caption)}</p>${rows}</main>`;
}

function durationOf(file) {
  return Number.parseFloat(capture(resolveBinary("ffprobe"), ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", file]));
}

async function renderCards(beats) {
  const inserts = beats.filter((beat) => beat.medium === "insert");
  if (inserts.length === 0) return;
  const executablePath = resolveChrome();
  const browser = await playwright.chromium.launch({
    headless: true,
    args: chromeLaunchArgs(process.env),
    ...(executablePath ? { executablePath } : {}),
  });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  try {
    for (const beat of inserts) {
      await page.setContent(cardHtml(beat.insert), { waitUntil: "load" });
      await page.screenshot({ path: path.join(assetDir, "cards", `${beat.id}.png`) });
    }
  } finally {
    await browser.close();
  }
}

function visualFilter(beat) {
  const base = "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0xf7f6f2,format=yuv420p";
  if (beat.medium === "still" && beat.screenId.endsWith("-output")) {
    return "scale=2048:1152:force_original_aspect_ratio=increase,crop=1920:1080,format=yuv420p";
  }
  return base;
}

function makeClip(beat, image, audio, duration, dest) {
  const ffmpeg = resolveBinary("ffmpeg");
  const mark = beat.mark;
  const webm = path.join(assetDir, "capture.webm");
  if (beat.medium === "motion" && mark && existsSync(webm)) {
    const start = Math.max(0, mark.startedAtMs / 1000 - 0.2).toFixed(3);
    run(ffmpeg, [
      "-y", "-ss", start, "-i", webm, "-i", audio,
      "-filter_complex",
      `[0:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0xf7f6f2,tpad=stop_mode=clone:stop_duration=30,fps=30,format=yuv420p[v];[1:a]apad=pad_dur=30[a]`,
      "-map", "[v]", "-map", "[a]", "-t", duration.toFixed(3),
      "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-c:a", "aac", "-b:a", "160k",
      "-movflags", "+faststart", dest,
    ]);
    return;
  }
  if (!existsSync(image)) throw new Error(`Missing visual for ${beat.id}: ${image}`);
  run(ffmpeg, [
    "-y", "-loop", "1", "-framerate", "30", "-i", image, "-i", audio,
    "-filter_complex", `[0:v]${visualFilter(beat)}[v];[1:a]apad=pad_dur=30[a]`,
    "-map", "[v]", "-map", "[a]", "-t", duration.toFixed(3),
    "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-tune", "stillimage",
    "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", dest,
  ]);
}

function assTime(seconds) {
  const centiseconds = Math.max(0, Math.round(seconds * 100));
  const cs = centiseconds % 100;
  const totalSeconds = Math.floor(centiseconds / 100);
  const s = totalSeconds % 60;
  const m = Math.floor(totalSeconds / 60) % 60;
  const h = Math.floor(totalSeconds / 3600);
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}

function escapeAss(value) {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll("{", "\\{")
    .replaceAll("}", "\\}")
    .replace(/\r?\n/gu, "\\N");
}

const manifest = JSON.parse(await readFile(argument("--manifest", path.join(workDir, "manifest.json")), "utf8"));
const logPath = path.join(assetDir, "capture-log.json");
const marks = existsSync(logPath) ? JSON.parse(await readFile(logPath, "utf8")).marks : [];
for (const beat of manifest.beats) beat.mark = marks.find((mark) => mark.beatId === beat.id);
await mkdir(path.join(assetDir, "audio"), { recursive: true });
await mkdir(path.join(assetDir, "cards"), { recursive: true });
await mkdir(path.join(assetDir, "clips"), { recursive: true });
await mkdir(outDir, { recursive: true });
await renderCards(manifest.beats);

const events = [];
const timeline = [];
let cursor = 0;
const concat = [];
for (const beat of manifest.beats) {
  const textPath = path.join(assetDir, "audio", `${beat.id}.txt`);
  const wavPath = path.join(assetDir, "audio", `${beat.id}.wav`);
  await writeFile(textPath, beat.narration, "utf8");
  const preset = manifest.preset ?? {};
  const voiceEnv = {
    ...process.env,
    PR_STUDIO_TTS_PROVIDER_KO: preset.voice?.provider ?? process.env.PR_STUDIO_TTS_PROVIDER_KO,
    PR_STUDIO_TTS_VOICE_KO: preset.voice?.voice ?? process.env.PR_STUDIO_TTS_VOICE_KO,
    GOOGLE_TTS_VOICE_KO: preset.voice?.voice ?? process.env.GOOGLE_TTS_VOICE_KO,
    GOOGLE_TTS_SPEAKING_RATE: String(preset.voice?.speakingRate ?? process.env.GOOGLE_TTS_SPEAKING_RATE ?? 0.94),
  };
  run(process.execPath, [path.join(root, "scripts", "synthesize-speech.mjs"), "--input", textPath, "--output", wavPath], voiceEnv);
  const audioDurationSec = durationOf(wavPath);
  const duration = Math.max(audioDurationSec + beat.postPauseMs / 1000, (beat.minScreenTimeMs ?? beat.minHoldMs) / 1000);
  const image = beat.medium === "insert"
    ? path.join(assetDir, "cards", `${beat.id}.png`)
    : beat.mark?.screenshot ?? path.join(assetDir, "screens", `${beat.id}.png`);
  const clip = path.join(assetDir, "clips", `${beat.id}.mp4`);
  makeClip(beat, image, wavPath, duration, clip);
  concat.push(`file '${clip.replaceAll("\\", "/").replaceAll("'", "'\\''")}'`);
  events.push(`Dialogue: 0,${assTime(cursor + 0.25)},${assTime(cursor + duration - 0.15)},Caption,,0,0,0,,${escapeAss(beat.subtitle)}`);
  timeline.push({
    beatId: beat.id,
    screenId: beat.screenId,
    startSec: cursor,
    endSec: cursor + duration,
    durationSec: duration,
    audioDurationSec,
    purpose: beat.purpose,
    viewerTakeaway: beat.viewerTakeaway,
    evidence: beat.evidence,
    narration: beat.narration,
    subtitle: beat.subtitle,
  });
  cursor += duration;
}

await writeFile(path.join(workDir, "timeline.json"), JSON.stringify({ version: "2.0", durationSec: cursor, beats: timeline }, null, 2), "utf8");

const concatPath = path.join(assetDir, "concat.txt");
const subtitlePath = path.join(assetDir, "subtitles.ass");
await writeFile(concatPath, `${concat.join("\n")}\n`, "utf8");
const subtitle = manifest.preset?.subtitle ?? { fontSize: 46, alignment: 2, marginV: 64, outline: 14 };
await writeFile(subtitlePath, `[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Caption,${subtitleFont(process.env)},${subtitle.fontSize},&H00FFFFFF,&H00FFFFFF,&H55221A14,&HD0221A14,-1,0,0,0,100,100,0,0,3,${subtitle.outline},0,${subtitle.alignment},110,110,${subtitle.marginV},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
${events.join("\n")}
`, "utf8");

const ffmpeg = resolveBinary("ffmpeg");
run(ffmpeg, ["-y", "-f", "concat", "-safe", "0", "-i", concatPath, "-c", "copy", draftPath]);
run(ffmpeg, ["-y", "-i", draftPath, "-vf", `ass=${filterPath(subtitlePath)}`, "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", finalPath]);
console.log(finalPath);
