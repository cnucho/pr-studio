export type RuntimeEnv = Record<string, string | undefined>;

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
