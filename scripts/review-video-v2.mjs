import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolveBinary, tesseractAvailable } from "./video-runtime.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const forbidden = /(?:AI|인공지능|GPT|모델)(?:이|가|은|는)?\s*(?:직접\s*)?(?:작성|생성|분석|만들)/u;

function argument(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? path.resolve(process.argv[index + 1]) : fallback;
}

const workDir = argument("--work-dir", path.join(root, "video-assets", "v2"));
const assetDir = workDir;

function runText(command, args) {
  const result = spawnSync(command, args, { encoding: "utf8", shell: false });
  return { status: result.status, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

function probe(file) {
  const result = runText(resolveBinary("ffprobe"), ["-v", "error", "-show_entries", "stream=codec_type,width,height:format=duration,size", "-of", "json", file]);
  if (result.status !== 0) throw new Error(result.stderr || "ffprobe failed");
  const data = JSON.parse(result.stdout);
  const streams = data.streams ?? [];
  const video = streams.find((stream) => stream.codec_type === "video");
  return {
    hasAudio: streams.some((stream) => stream.codec_type === "audio"),
    width: video?.width ?? 0,
    height: video?.height ?? 0,
    durationSec: Number(data.format?.duration ?? 0),
    size: Number(data.format?.size ?? 0),
    ocrAvailable: tesseractAvailable(),
  };
}

function mediaDuration(file) {
  const result = runText(resolveBinary("ffprobe"), ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", file]);
  if (result.status !== 0) throw new Error(result.stderr || `ffprobe failed: ${file}`);
  return Number(result.stdout.trim());
}

function normalizedText(value) {
  return String(value ?? "").normalize("NFC").replace(/\s+/gu, "").replace(/[^\p{L}\p{N}]/gu, "");
}

function buildReviewRecord(manifest, marks, timeline, probeResult, ocr, extractedFrames) {
  const missingBeatIds = manifest.beats
    .filter((beat) => beat.medium !== "insert")
    .filter((beat) => {
      const mark = marks.find((item) => item.beatId === beat.id);
      return !mark?.observedText?.includes(beat.observe);
    })
    .map((beat) => beat.id);
  const forbiddenBeatIds = manifest.beats
    .filter((beat) => forbidden.test(`${beat.purpose}\n${beat.viewerTakeaway}\n${beat.narration}\n${beat.subtitle}\n${beat.transitionReason}`))
    .map((beat) => beat.id);
  const timelineIssueBeatIds = manifest.beats
    .filter((beat, index) => {
      const item = timeline.beats?.[index];
      return !item ||
        item.beatId !== beat.id ||
        item.purpose !== beat.purpose ||
        item.viewerTakeaway !== beat.viewerTakeaway ||
        item.evidence !== beat.evidence ||
        item.narration !== beat.narration ||
        item.subtitle !== beat.subtitle ||
        Number(item.durationSec) + 0.01 < Number(item.audioDurationSec) ||
        Number(item.durationSec) + 0.01 < Number(beat.minScreenTimeMs ?? beat.minHoldMs) / 1000;
    })
    .map((beat) => beat.id);
  const frameMissingBeatIds = manifest.beats
    .filter((beat) => !extractedFrames[beat.id] || !existsSync(extractedFrames[beat.id]))
    .map((beat) => beat.id);
  const ocrMissingBeatIds = probeResult.ocrAvailable
    ? manifest.beats
        .filter((beat) => beat.medium !== "insert")
        .filter((beat) => !normalizedText(ocr[beat.id]).includes(normalizedText(beat.observe)))
        .map((beat) => beat.id)
    : [];
  const geometryOk = probeResult.hasAudio && probeResult.width === 1920 && probeResult.height === 1080;
  const timelineLengthOk = (timeline.beats?.length ?? 0) === manifest.beats.length;
  const timelineDurationOk = Math.abs(Number(timeline.durationSec ?? 0) - probeResult.durationSec) <= 0.75;
  const durationOk =
    probeResult.durationSec >= Number(manifest.timing?.minSec ?? 0) &&
    probeResult.durationSec <= Number(manifest.timing?.maxSec ?? Number.POSITIVE_INFINITY);
  const technicalReady = geometryOk && durationOk && timelineDurationOk && frameMissingBeatIds.length === 0;
  const contentReady =
    missingBeatIds.length === 0 &&
    forbiddenBeatIds.length === 0 &&
    timelineLengthOk &&
    timelineIssueBeatIds.length === 0 &&
    ocrMissingBeatIds.length === 0;
  return {
    version: "2.0",
    runtime: manifest.runtime,
    ready: technicalReady && contentReady,
    technicalReady,
    contentReady,
    missingBeatIds,
    forbiddenBeatIds,
    timelineIssueBeatIds,
    frameMissingBeatIds,
    ocrStatus: probeResult.ocrAvailable ? "checked" : "skipped",
    ocrMissingBeatIds,
    timelineLengthOk,
    timelineDurationOk,
    frames: (timeline.beats ?? []).map((item) => ({
      beatId: item.beatId,
      atMs: Math.round(((item.startSec + item.endSec) / 2) * 1000),
      screenshot: extractedFrames[item.beatId],
      observedText: marks.find((mark) => mark.beatId === item.beatId)?.observedText ?? "",
      ocrText: ocr[item.beatId] ?? "",
    })),
    timeline,
    probe: probeResult,
  };
}

const manifest = JSON.parse(await readFile(argument("--manifest", path.join(assetDir, "manifest.json")), "utf8"));
const videoPath = argument("--video", path.join(root, "out", "pr-studio-final.mp4"));
const reviewPath = argument("--review", path.join(assetDir, "review.json"));
const log = JSON.parse(await readFile(path.join(assetDir, "capture-log.json"), "utf8"));
const frameDir = path.join(assetDir, "review-frames");
await mkdir(frameDir, { recursive: true });
const ffmpeg = resolveBinary("ffmpeg");
const ocr = {};
const extractedFrames = {};
const timelinePath = path.join(assetDir, "timeline.json");
let timeline;

if (existsSync(timelinePath)) {
  timeline = JSON.parse(await readFile(timelinePath, "utf8"));
} else {
  let cursor = 0;
  const beats = manifest.beats.map((beat) => {
    const audioPath = path.join(assetDir, "audio", `${beat.id}.wav`);
    const audioDurationSec = mediaDuration(audioPath);
    const durationSec = Math.max(
      audioDurationSec + beat.postPauseMs / 1000,
      Number(beat.minScreenTimeMs ?? beat.minHoldMs) / 1000,
    );
    const item = {
      beatId: beat.id,
      screenId: beat.screenId,
      startSec: cursor,
      endSec: cursor + durationSec,
      durationSec,
      audioDurationSec,
      purpose: beat.purpose,
      viewerTakeaway: beat.viewerTakeaway,
      evidence: beat.evidence,
      narration: beat.narration,
      subtitle: beat.subtitle,
    };
    cursor += durationSec;
    return item;
  });
  timeline = { version: "2.0", durationSec: cursor, beats };
  await writeFile(timelinePath, JSON.stringify(timeline, null, 2), "utf8");
}

for (const item of timeline.beats ?? []) {
  const at = Math.max(0, (Number(item.startSec) + Number(item.endSec)) / 2);
  const frame = path.join(frameDir, `${item.beatId}.png`);
  const extracted = runText(ffmpeg, ["-y", "-ss", at.toFixed(3), "-i", videoPath, "-frames:v", "1", frame]);
  if (extracted.status === 0 && existsSync(frame)) extractedFrames[item.beatId] = frame;
  if (tesseractAvailable() && existsSync(frame)) {
    const result = runText("tesseract", [frame, "stdout", "-l", "kor+eng", "--psm", "6"]);
    ocr[item.beatId] = result.status === 0 ? result.stdout.trim() : "";
  }
}

const review = buildReviewRecord(manifest, log.marks ?? [], timeline, probe(videoPath), ocr, extractedFrames);
await writeFile(reviewPath, JSON.stringify(review, null, 2));
console.log(JSON.stringify({
  ready: review.ready,
  technicalReady: review.technicalReady,
  contentReady: review.contentReady,
  missingBeatIds: review.missingBeatIds,
  timelineIssueBeatIds: review.timelineIssueBeatIds,
  ocrStatus: review.ocrStatus,
  ocrMissingBeatIds: review.ocrMissingBeatIds,
  probe: review.probe,
}));
if (!review.ready) process.exit(1);
