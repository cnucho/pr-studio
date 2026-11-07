import { createHash } from "node:crypto";
import { access, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const sourceDir = path.join(root, "docs", "demo-scripts", "kg-statistics-mvp");
export const outDir = path.join(root, "out", "kg-statistics-mvp-demo");
export const workDir = path.join(outDir, "work");
export const manifestPath = path.join(sourceDir, "production-manifest.json");
export const manifest = JSON.parse(await readFile(manifestPath, "utf8"));

export async function ensureDirs() {
  for (const name of [outDir, workDir, "slides", "audio", "clips", "segments"]) {
    await mkdir(name === outDir || name === workDir ? name : path.join(workDir, name), { recursive: true });
  }
}

export async function exists(file) {
  try { await access(file); return true; } catch { return false; }
}

export async function sha256(file) {
  return createHash("sha256").update(await readFile(file)).digest("hex");
}

export function runId() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

export function executable(name) {
  return process.platform === "win32" ? `${name}.exe` : name;
}

export const correctedClosing =
  "The evidence-backed production MVP is complete. National deployment, external identity federation, and operating-policy rollout remain separate work.";
