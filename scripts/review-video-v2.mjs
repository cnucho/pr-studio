import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolveBinary, tesseractAvailable } from "./video-runtime.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const assetDir = path.join(root, "video-assets", "v2");
const forbidden = /(?:AI|인공지능|GPT|모델)(?:이|가|은|는)?\s*(?:직접\s*)?(?:작성|생성|분석|만들)/u;

function argument(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? path.resolve(process.argv[index + 1]) : fallback;
}

function runText(command, args) {
  const result = spawnSync(command, args, { encoding: "utf8", shell: false });
  return { status: result.status, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

function probe(file) {
  const result = runText(resolveBinary("ffprobe"), ["-v", "error", "-show_entries", "stream=codec_type,width,height", "-of", "json", file]);
  if (result.status !== 0) throw new Error(result.stderr || "ffprobe failed");
  const data = JSON.parse(result.stdout);
  const streams = data.streams ?? [];
  const video = streams.find((stream) => stream.codec_type === "video");
  return {
    hasAudio: streams.some((stream) => stream.codec_type === "audio"),
    width: video?.width ?? 0,
    height: video?.height ?? 0,
    ocrAvailable: tesseractAvailable(),
  };
}

function buildReviewRecord(manifest, marks, probeResult, ocr) {
  const missingBeatIds = manifest.beats
    .filter((beat) => beat.medium !== "insert")
    .filter((beat) => {
      const mark = marks.find((item) => item.beatId === beat.id);
      return !mark?.observedText?.includes(beat.observe);
    })
    .map((beat) => beat.id);
  const forbiddenBeatIds = manifest.beats
    .filter((beat) => forbidden.test(`${beat.narration}\n${beat.subtitle}`))
    .map((beat) => beat.id);
  const geometryOk = probeResult.hasAudio && probeResult.width === 1920 && probeResult.height === 1080;
  return {
    version: "2.0",
    runtime: manifest.runtime,
    ready: missingBeatIds.length === 0 && forbiddenBeatIds.length === 0 && geometryOk,
    missingBeatIds,
    forbiddenBeatIds,
    frames: marks.map((mark) => ({
      beatId: mark.beatId,
      atMs: Math.round((mark.startedAtMs + mark.endedAtMs) / 2),
      screenshot: mark.screenshot,
      observedText: mark.observedText,
      ocrText: ocr[mark.beatId] ?? "",
    })),
    probe: probeResult,
  };
}

const manifest = JSON.parse(await readFile(argument("--manifest", path.join(assetDir, "manifest.json")), "utf8"));
const videoPath = argument("--video", path.join(root, "out", "pr-studio-final.mp4"));
const log = JSON.parse(await readFile(path.join(assetDir, "capture-log.json"), "utf8"));
const frameDir = path.join(assetDir, "review-frames");
await mkdir(frameDir, { recursive: true });
const webm = path.join(assetDir, "capture.webm");
const ffmpeg = resolveBinary("ffmpeg");
const ocr = {};

for (const mark of log.marks ?? []) {
  const at = Math.max(0, ((mark.startedAtMs + mark.endedAtMs) / 2 - 200) / 1000);
  const frame = path.join(frameDir, `${mark.beatId}.png`);
  if (existsSync(webm)) {
    runText(ffmpeg, ["-y", "-ss", at.toFixed(3), "-i", webm, "-frames:v", "1", frame]);
  }
  const source = existsSync(frame) ? frame : mark.screenshot;
  if (tesseractAvailable() && existsSync(source)) {
    const result = runText("tesseract", [source, "stdout", "-l", "kor+eng", "--psm", "6"]);
    ocr[mark.beatId] = result.status === 0 ? result.stdout.trim() : "";
  }
}

const review = buildReviewRecord(manifest, log.marks ?? [], probe(videoPath), ocr);
const reviewPath = path.join(assetDir, "review.json");
await writeFile(reviewPath, JSON.stringify(review, null, 2));
console.log(JSON.stringify({ ready: review.ready, missingBeatIds: review.missingBeatIds, probe: review.probe }));
if (!review.ready) process.exit(1);
