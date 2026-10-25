import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { resolveBinary, tesseractAvailable } from "./video-runtime";

export const VIDEO_ANALYSIS_LIMITS = {
  maxBytes: 25 * 1024 * 1024,
  maxDurationSec: 600,
  maxTranscriptChars: 20_000,
  commandTimeoutMs: 120_000,
  transcriptionTimeoutMs: 180_000,
} as const;

export type VideoAnalysis = {
  version: "2.0";
  cacheKey: string;
  durationSec: number;
  width: number;
  height: number;
  hasAudio: boolean;
  size: number;
  transcript: string;
  transcriptTruncated: boolean;
  framePaths: string[];
  frames: Array<{ path: string; atSec: number; ocrText: string }>;
};

function run(command: string, args: string[], timeoutMs = VIDEO_ANALYSIS_LIMITS.commandTimeoutMs) {
  return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(command, args, { shell: false, windowsHide: true });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => child.kill(), timeoutMs);
    child.stdout.on("data", (chunk: Buffer) => { stdout += chunk.toString("utf8"); });
    child.stderr.on("data", (chunk: Buffer) => { stderr += chunk.toString("utf8"); });
    child.on("error", reject);
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(stderr.trim() || `${command} failed with exit code ${code}`));
    });
  });
}

export function sourcePathAllowed(sourceVideoPath: string, allowedRoot: string) {
  const source = path.resolve(sourceVideoPath);
  const root = path.resolve(allowedRoot);
  const relative = path.relative(root, source);
  return path.extname(source).toLowerCase() === ".mp4" && relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
}

async function transcribe(audioPath: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY가 없어 기존 영상 음성을 전사할 수 없습니다.");
  const audio = await readFile(audioPath);
  const body = new FormData();
  body.append("file", new Blob([audio], { type: "audio/mpeg" }), "source-audio.mp3");
  body.append("model", process.env.PR_STUDIO_TRANSCRIPTION_MODEL ?? "gpt-transcribe");
  body.append("response_format", "json");
  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body,
    signal: AbortSignal.timeout(VIDEO_ANALYSIS_LIMITS.transcriptionTimeoutMs),
  });
  if (!response.ok) throw new Error(`영상 음성 전사 실패: ${await response.text().catch(() => response.statusText)}`);
  const data = await response.json() as { text?: unknown };
  if (typeof data.text !== "string") throw new Error("영상 음성 전사 응답에 text가 없습니다.");
  return data.text.trim();
}

export async function analyzeVideoFile({
  sourceVideoPath,
  workDir,
  allowedRoot,
}: {
  sourceVideoPath: string;
  workDir: string;
  allowedRoot: string;
}): Promise<VideoAnalysis> {
  if (!sourcePathAllowed(sourceVideoPath, allowedRoot)) throw new Error("허용된 작업 디렉터리의 MP4만 분석할 수 있습니다.");
  const sourceStat = await stat(sourceVideoPath);
  if (!sourceStat.isFile() || sourceStat.size <= 0 || sourceStat.size > VIDEO_ANALYSIS_LIMITS.maxBytes) {
    throw new Error(`MP4 크기는 1~${VIDEO_ANALYSIS_LIMITS.maxBytes}바이트여야 합니다.`);
  }
  const source = await readFile(sourceVideoPath);
  if (source.subarray(4, 8).toString("ascii") !== "ftyp") throw new Error("유효한 MP4 서명이 없습니다.");
  const cacheKey = createHash("sha256").update(source).digest("hex");
  const analysisDir = path.join(workDir, "analysis");
  const cachePath = path.join(analysisDir, "analysis.json");
  if (existsSync(cachePath)) {
    const cached = JSON.parse(await readFile(cachePath, "utf8")) as VideoAnalysis;
    if (cached.cacheKey === cacheKey) {
      if (!Array.isArray(cached.frames)) {
        cached.frames = cached.framePaths.map((framePath, index) => ({
          path: framePath,
          atSec: cached.durationSec * ([0.1, 0.5, 0.9][index] ?? 0.5),
          ocrText: "",
        }));
        await writeFile(cachePath, JSON.stringify(cached, null, 2), "utf8");
      }
      return cached;
    }
  }

  await mkdir(path.join(analysisDir, "frames"), { recursive: true });
  const probeResult = await run(resolveBinary("ffprobe"), [
    "-v", "error", "-show_entries", "stream=codec_type,width,height:format=duration,size", "-of", "json", sourceVideoPath,
  ]);
  const probe = JSON.parse(probeResult.stdout) as {
    streams?: Array<{ codec_type?: string; width?: number; height?: number }>;
    format?: { duration?: string; size?: string };
  };
  const video = probe.streams?.find((stream) => stream.codec_type === "video");
  const hasAudio = probe.streams?.some((stream) => stream.codec_type === "audio") ?? false;
  const durationSec = Number(probe.format?.duration ?? 0);
  if (!video || durationSec <= 0 || durationSec > VIDEO_ANALYSIS_LIMITS.maxDurationSec) {
    throw new Error(`MP4 길이는 0~${VIDEO_ANALYSIS_LIMITS.maxDurationSec}초여야 합니다.`);
  }

  const framePaths: string[] = [];
  const frames: VideoAnalysis["frames"] = [];
  for (const [index, ratio] of [0.1, 0.5, 0.9].entries()) {
    const atSec = durationSec * ratio;
    const framePath = path.join(analysisDir, "frames", `${index + 1}.png`);
    await run(resolveBinary("ffmpeg"), ["-y", "-ss", atSec.toFixed(3), "-i", sourceVideoPath, "-frames:v", "1", framePath]);
    framePaths.push(framePath);
    let ocrText = "";
    if (tesseractAvailable()) {
      const ocr = await run("tesseract", [framePath, "stdout", "-l", "kor+eng", "--psm", "6"]);
      ocrText = ocr.stdout.trim().slice(0, 4_000);
    }
    frames.push({ path: framePath, atSec, ocrText });
  }

  let transcript = "";
  if (hasAudio) {
    const audioPath = path.join(analysisDir, "source-audio.mp3");
    await run(resolveBinary("ffmpeg"), ["-y", "-i", sourceVideoPath, "-vn", "-ac", "1", "-ar", "16000", "-b:a", "64k", audioPath]);
    transcript = await transcribe(audioPath);
  }
  const transcriptTruncated = transcript.length > VIDEO_ANALYSIS_LIMITS.maxTranscriptChars;
  const analysis: VideoAnalysis = {
    version: "2.0",
    cacheKey,
    durationSec,
    width: video.width ?? 0,
    height: video.height ?? 0,
    hasAudio,
    size: sourceStat.size,
    transcript: transcript.slice(0, VIDEO_ANALYSIS_LIMITS.maxTranscriptChars),
    transcriptTruncated,
    framePaths,
    frames,
  };
  await writeFile(cachePath, JSON.stringify(analysis, null, 2), "utf8");
  return analysis;
}
