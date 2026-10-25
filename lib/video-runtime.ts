import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";

export type RuntimeEnv = Record<string, string | undefined>;

const require = createRequire(import.meta.url);

export function runsInContainer(env: RuntimeEnv, platform: NodeJS.Platform) {
  return (
    platform === "linux" ||
    Boolean(env.RAILWAY_ENVIRONMENT || env.RAILWAY_PROJECT_ID || env.RAILWAY_SERVICE_ID)
  );
}

export function chromeLaunchArgs(env: RuntimeEnv, platform: NodeJS.Platform) {
  const shared = ["--disable-dev-shm-usage", "--font-render-hinting=none"];
  if (!runsInContainer(env, platform)) return shared;
  return ["--no-sandbox", "--disable-gpu", ...shared];
}

export function subtitleFont(env: RuntimeEnv, platform: NodeJS.Platform) {
  if (env.PR_STUDIO_SUBTITLE_FONT) return env.PR_STUDIO_SUBTITLE_FONT;
  return platform === "win32" ? "Malgun Gothic" : "Noto Sans CJK KR";
}

export function preferSystemFfmpeg(platform: NodeJS.Platform) {
  return platform === "linux";
}

function commandExists(command: string, platform: NodeJS.Platform = process.platform) {
  const probe = platform === "win32" ? "where" : "which";
  const result = spawnSync(probe, [command], { encoding: "utf8", shell: false, windowsHide: true });
  return result.status === 0;
}

export function tesseractAvailable(platform: NodeJS.Platform = process.platform) {
  return commandExists("tesseract", platform);
}

function staticBinary(name: "ffmpeg" | "ffprobe") {
  if (name === "ffmpeg") {
    const ffmpeg = require("ffmpeg-static") as unknown;
    return typeof ffmpeg === "string" && existsSync(ffmpeg) ? ffmpeg : "";
  }
  const ffprobe = require("ffprobe-static") as { path?: string } | undefined;
  return ffprobe?.path && existsSync(ffprobe.path) ? ffprobe.path : "";
}

export function resolveBinary(
  name: "ffmpeg" | "ffprobe",
  env: RuntimeEnv = process.env,
  platform: NodeJS.Platform = process.platform,
) {
  const overrideName = name === "ffmpeg" ? "FFMPEG_PATH" : "FFPROBE_PATH";
  const override = env[overrideName];
  if (override && (override.includes("/") || override.includes("\\")) && existsSync(override)) return override;
  if (override && !override.includes("/") && !override.includes("\\")) return override;
  if (platform === "linux" && commandExists(name, platform)) return name;
  return staticBinary(name) || name;
}

export function resolveChrome(env: RuntimeEnv = process.env) {
  const candidates = [
    env.CHROME_PATH,
    env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ].filter((candidate): candidate is string => Boolean(candidate));
  return candidates.find((candidate) => existsSync(candidate)) ?? "";
}
