import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolveBinary, tesseractAvailable } from "./video-runtime.mjs";
import {
  CAPTURE_VIEWPORT,
  cropObservationBox,
  finalReviewExitCode,
  mapObservationBox,
  observationMatches,
  verificationSampleOffsets,
} from "./video-frame-contract.mjs";

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

function buildReviewRecord(manifest, marks, timeline, probeResult, ocrEvidence, extractedFrames, ocrStatus, videoSha256, frameExtractionErrors) {
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
    .filter((beat) => !(extractedFrames[beat.id] ?? []).some((frame) => existsSync(frame)))
    .map((beat) => beat.id);
  const ocrMissingBeatIds = ocrStatus === "checked"
    ? manifest.beats
        .filter((beat) => beat.medium !== "insert")
        .filter((beat) => !ocrEvidence[beat.id]?.passed)
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
    ocrStatus !== "error" &&
    frameExtractionErrors.length === 0 &&
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
    frameExtractionErrors,
    ocrStatus,
    ocrMissingBeatIds,
    videoSha256,
    timelineLengthOk,
    timelineDurationOk,
    frames: (timeline.beats ?? []).map((item) => ({
      beatId: item.beatId,
      atMs: Math.round((ocrEvidence[item.beatId]?.samples?.[0]?.atSec ?? ((item.startSec + item.endSec) / 2)) * 1000),
      screenshot: extractedFrames[item.beatId]?.[0] ?? "",
      observedText: marks.find((mark) => mark.beatId === item.beatId)?.observedText ?? "",
      ocrSamples: ocrEvidence[item.beatId]?.samples ?? [],
      ocrPassed: ocrEvidence[item.beatId]?.passed ?? null,
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
const cropDir = path.join(assetDir, "review-crops");
await mkdir(frameDir, { recursive: true });
await mkdir(cropDir, { recursive: true });
const ffmpeg = resolveBinary("ffmpeg");
const ocrEvidence = {};
const extractedFrames = {};
const frameExtractionErrors = [];
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

function ocrRuntime() {
  if (!tesseractAvailable()) return { ready: false, error: "tesseract 명령이 없습니다." };
  const languages = runText("tesseract", ["--list-langs"]);
  if (languages.status !== 0) return { ready: false, error: languages.stderr || "OCR 언어 목록을 읽지 못했습니다." };
  const available = new Set(languages.stdout.split(/\r?\n/u).map((value) => value.trim()));
  if (!available.has("kor") || !available.has("eng")) {
    return { ready: false, error: "Tesseract kor+eng 언어 데이터가 없습니다." };
  }
  return { ready: true, error: "" };
}

const allowOcrSkip = process.argv.includes("--allow-ocr-skip");
const runtime = ocrRuntime();
let ocrStatus = runtime.ready ? "checked" : allowOcrSkip ? "skipped" : "error";
let ocrInfrastructureError = runtime.error;

for (const item of timeline.beats ?? []) {
  const beat = manifest.beats.find((candidate) => candidate.id === item.beatId);
  if (!beat) continue;
  const offsets = beat.medium === "insert"
    ? [Math.max(0.05, Number(item.durationSec) / 2)]
    : verificationSampleOffsets(item, beat);
  const frames = [];
  const samples = [];
  const mark = (log.marks ?? []).find((candidate) => candidate.beatId === beat.id);
  for (const [index, offset] of offsets.entries()) {
    const at = Math.max(0, Number(item.startSec) + offset);
    const frame = path.join(frameDir, `${item.beatId}-${index}.png`);
    const extracted = runText(ffmpeg, ["-y", "-ss", at.toFixed(3), "-i", videoPath, "-frames:v", "1", frame]);
    if (extracted.status !== 0 || !existsSync(frame)) {
      frameExtractionErrors.push({
        beatId: item.beatId,
        sampleIndex: index,
        atSec: at,
        status: extracted.status,
        error: (extracted.stderr || "FFmpeg frame extraction produced no frame").slice(-2000),
      });
      continue;
    }
    frames.push(frame);
    if (beat.medium === "insert" || ocrStatus !== "checked") {
      samples.push({ atSec: at, frame, crop: "", box: null, text: "", matched: null, error: ocrStatus === "skipped" ? "개발 모드 OCR 생략" : "" });
      continue;
    }
    const sourceBox = item.verification?.observationBox ?? mark?.observationBox;
    const viewport = item.verification?.captureViewport ?? mark?.captureViewport;
    const mapped = sourceBox && viewport?.width === CAPTURE_VIEWPORT.width && viewport?.height === CAPTURE_VIEWPORT.height
      ? mapObservationBox(sourceBox, beat)
      : null;
    const cropBox = mapped ? cropObservationBox(mapped) : null;
    if (!cropBox) {
      samples.push({ atSec: at, frame, crop: "", box: mapped, text: "", matched: false, error: "관찰 영역이 최종 프레임 밖입니다." });
      continue;
    }
    const crop = path.join(cropDir, `${item.beatId}-${index}.png`);
    const cropped = runText(ffmpeg, [
      "-y", "-i", frame,
      "-vf", `crop=${cropBox.width}:${cropBox.height}:${cropBox.x}:${cropBox.y},scale=iw*3:ih*3:flags=lanczos`,
      "-frames:v", "1", crop,
    ]);
    if (cropped.status !== 0 || !existsSync(crop)) {
      samples.push({ atSec: at, frame, crop, box: cropBox, text: "", matched: false, error: cropped.stderr || "관찰 영역 crop 실패" });
      ocrStatus = "error";
      ocrInfrastructureError = cropped.stderr || "관찰 영역 crop 실패";
      continue;
    }
    const result = runText("tesseract", [crop, "stdout", "-l", "kor+eng", "--psm", "6"]);
    const text = result.status === 0 ? result.stdout.trim() : "";
    const matched = result.status === 0 && normalizedText(text).includes(normalizedText(beat.observe));
    samples.push({ atSec: at, frame, crop, box: cropBox, text, matched, error: result.status === 0 ? "" : result.stderr });
    if (result.status !== 0) {
      ocrStatus = "error";
      ocrInfrastructureError = result.stderr || `Tesseract 실행 실패: ${beat.id}`;
    }
    if (observationMatches(samples.map((sample) => sample.matched), beat)) break;
  }
  extractedFrames[item.beatId] = frames;
  if (beat.medium !== "insert") {
    ocrEvidence[item.beatId] = {
      passed: ocrStatus === "checked" && observationMatches(samples.map((sample) => sample.matched), beat),
      samples,
    };
  }
}

const probeResult = probe(videoPath);
probeResult.ocrAvailable = runtime.ready;
const videoSha256 = createHash("sha256").update(await readFile(videoPath)).digest("hex");
const review = buildReviewRecord(
  manifest,
  log.marks ?? [],
  timeline,
  probeResult,
  ocrEvidence,
  extractedFrames,
  ocrStatus,
  videoSha256,
  frameExtractionErrors,
);
review.ocrInfrastructureError = ocrInfrastructureError;
await writeFile(reviewPath, JSON.stringify(review, null, 2));
console.log(JSON.stringify({
  ready: review.ready,
  technicalReady: review.technicalReady,
  contentReady: review.contentReady,
  missingBeatIds: review.missingBeatIds,
  timelineIssueBeatIds: review.timelineIssueBeatIds,
  ocrStatus: review.ocrStatus,
  ocrMissingBeatIds: review.ocrMissingBeatIds,
  frameExtractionErrors: review.frameExtractionErrors,
  videoSha256: review.videoSha256,
  ocrInfrastructureError: review.ocrInfrastructureError,
  probe: review.probe,
}));
process.exitCode = finalReviewExitCode({
  ready: review.ready,
  ocrStatus: review.ocrStatus,
  frameExtractionErrorCount: review.frameExtractionErrors.length,
});
