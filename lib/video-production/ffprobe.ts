import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { validateOutputMetadata, type ValidationResult } from "./validation";

export const VALIDATOR_VERSION = "pr-studio-ffprobe-v1";

export type ProbeEvidence = {
  fileSize: number;
  containerFormat: string;
  videoCodec: string | null;
  audioCodec: string | null;
  videoStreamCount: number;
  audioStreamCount: number;
  width: number;
  height: number;
  frameRate: number;
  duration: number;
  decodable: boolean;
  checksum: string;
  validatedAt: string;
  validatorVersion: string;
  validation: ValidationResult;
};

type FfprobePayload = {
  format?: { duration?: string; format_name?: string; size?: string };
  streams?: Array<{
    codec_type?: string;
    codec_name?: string;
    width?: number;
    height?: number;
    avg_frame_rate?: string;
  }>;
};

function parseRate(value = "0/1") {
  const [numerator, denominator] = value.split("/").map(Number);
  return denominator ? numerator / denominator : 0;
}

export function normalizeProbeEvidence(
  payload: FfprobePayload,
  checksum: string,
  expected: {
    width: number;
    height: number;
    duration: number;
    frameRate: number;
    narrationRequired: boolean;
    durationTolerance?: number;
    frameRateTolerance?: number;
    videoCodec?: string;
    audioCodec?: string;
    allowedContainers?: string[];
  },
): ProbeEvidence {
  const streams = payload.streams ?? [];
  const videos = streams.filter((stream) => stream.codec_type === "video");
  const audios = streams.filter((stream) => stream.codec_type === "audio");
  const video = videos[0];
  const actual = {
    size: Number(payload.format?.size ?? 0),
    width: video?.width ?? 0,
    height: video?.height ?? 0,
    duration: Number(payload.format?.duration ?? 0),
    frameRate: parseRate(video?.avg_frame_rate),
    hasAudio: audios.length > 0,
    decodable: videos.length > 0,
    containerFormat: payload.format?.format_name ?? "unknown",
    videoCodec: video?.codec_name ?? null,
    audioCodec: audios[0]?.codec_name ?? null,
    videoStreamCount: videos.length,
    audioStreamCount: audios.length,
  };
  return {
    fileSize: actual.size,
    containerFormat: payload.format?.format_name ?? "unknown",
    videoCodec: video?.codec_name ?? null,
    audioCodec: audios[0]?.codec_name ?? null,
    videoStreamCount: videos.length,
    audioStreamCount: audios.length,
    width: actual.width,
    height: actual.height,
    frameRate: actual.frameRate,
    duration: actual.duration,
    decodable: actual.decodable,
    checksum,
    validatedAt: new Date().toISOString(),
    validatorVersion: VALIDATOR_VERSION,
    validation: validateOutputMetadata(actual, expected),
  };
}

export async function probeVideoFile(
  filePath: string,
  expected: Parameters<typeof normalizeProbeEvidence>[2],
  timeoutMs = 30_000,
) {
  const bytes = await readFile(filePath);
  const checksum = createHash("sha256").update(bytes).digest("hex");
  const payload = await new Promise<FfprobePayload>((resolve, reject) => {
    const child = spawn(
      "ffprobe",
      ["-v", "error", "-show_streams", "-show_format", "-of", "json", filePath],
      { windowsHide: true, shell: false },
    );
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error("FFprobe timed out"));
    }, timeoutMs);
    child.stdout.on("data", (chunk: Buffer) => (stdout += chunk.toString("utf8")));
    child.stderr.on("data", (chunk: Buffer) => (stderr += chunk.toString("utf8")));
    child.once("error", reject);
    child.once("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) reject(new Error(`FFprobe failed: ${stderr.trim() || `exit ${code}`}`));
      else {
        try {
          resolve(JSON.parse(stdout) as FfprobePayload);
        } catch {
          reject(new Error("FFprobe returned malformed JSON"));
        }
      }
    });
  });
  return normalizeProbeEvidence(payload, checksum, expected);
}
