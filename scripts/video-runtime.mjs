import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";

const require = createRequire(import.meta.url);

export function runsInContainer(env, platform = process.platform) {
  return (
    platform === "linux" ||
    Boolean(env.RAILWAY_ENVIRONMENT || env.RAILWAY_PROJECT_ID || env.RAILWAY_SERVICE_ID)
  );
}

export function chromeLaunchArgs(env, platform = process.platform) {
  const shared = ["--disable-dev-shm-usage", "--font-render-hinting=none"];
  if (!runsInContainer(env, platform)) return shared;
  return ["--no-sandbox", "--disable-gpu", ...shared];
}

export function subtitleFont(env, platform = process.platform) {
  if (env.PR_STUDIO_SUBTITLE_FONT) return env.PR_STUDIO_SUBTITLE_FONT;
  return platform === "win32" ? "Malgun Gothic" : "Noto Sans CJK KR";
}

function commandExists(command) {
  const probe = process.platform === "win32" ? "where" : "which";
  const result = spawnSync(probe, [command], { encoding: "utf8", shell: false, windowsHide: true });
  return result.status === 0;
}

function staticBinary(name) {
  if (name === "ffmpeg") {
    const ffmpeg = require("ffmpeg-static");
    return typeof ffmpeg === "string" && existsSync(ffmpeg) ? ffmpeg : "";
  }
  if (name === "ffprobe") {
    const ffprobe = require("ffprobe-static");
    return ffprobe?.path && existsSync(ffprobe.path) ? ffprobe.path : "";
  }
  return "";
}

export function resolveBinary(name, env = process.env) {
  const overrideName = name === "ffmpeg" ? "FFMPEG_PATH" : "FFPROBE_PATH";
  const override = env[overrideName];
  if (override && (override.includes("/") || override.includes("\\")) && existsSync(override)) return override;
  if (override && !override.includes("/") && !override.includes("\\")) return override;
  if (process.platform === "linux" && commandExists(name)) return name;
  return staticBinary(name) || name;
}

export function resolveChrome(env = process.env) {
  const candidates = [
    env.CHROME_PATH,
    env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ].filter(Boolean);
  return candidates.find((candidate) => existsSync(candidate)) ?? "";
}

export function tesseractAvailable() {
  return commandExists("tesseract");
}
