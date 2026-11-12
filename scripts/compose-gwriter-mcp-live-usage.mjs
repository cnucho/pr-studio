import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ffmpeg = require("ffmpeg-static");
const ffprobe = require("ffprobe-static").path;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : "";
}

const scenarioPath = path.resolve(root, argument("--scenario"));
const editorVideo = path.resolve(root, argument("--editor-video"));
if (!argument("--scenario") || !argument("--editor-video")) {
  throw new Error("--scenario and --editor-video are required");
}

const scenario = JSON.parse(await readFile(scenarioPath, "utf8"));
const outDir = path.join(root, "out", "live-usage-demos", scenario.id);
const workDir = path.join(outDir, "segments");
const finalVideo = path.join(outDir, `${scenario.id}-ko.mp4`);
await mkdir(workDir, { recursive: true });

function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, stdio: "inherit", shell: false });
  if (result.status !== 0) throw new Error(`${command} failed with exit code ${result.status}`);
}

function capture(command, args) {
  const result = spawnSync(command, args, { cwd: root, encoding: "utf8", shell: false });
  if (result.status !== 0) throw new Error(result.stderr || `${command} failed`);
  return result.stdout.trim();
}

async function renderChatSegment(segment) {
  const id = `${scenario.id}-${segment}`;
  const segmentScenario = {
    ...scenario,
    id,
    events: scenario.events
      .filter((event) => event.segment === segment)
      .map((event) => Object.fromEntries(Object.entries(event).filter(([key]) => key !== "segment"))),
  };
  const file = path.join(workDir, `${segment}.json`);
  await writeFile(file, `${JSON.stringify(segmentScenario, null, 2)}\n`, "utf8");
  run(process.execPath, [
    "scripts/render-mcp-live-usage-demo.mjs",
    "--scenario",
    path.relative(root, file),
  ]);
  return path.join(root, "out", "live-usage-demos", id, `${id}-ko.mp4`);
}

const introVideo = await renderChatSegment("intro");
const outroVideo = await renderChatSegment("outro");
run(ffmpeg, [
  "-y", "-loglevel", "error",
  "-i", introVideo,
  "-i", editorVideo,
  "-i", outroVideo,
  "-filter_complex",
  "[0:v]setpts=PTS-STARTPTS[v0];[1:v]setpts=PTS-STARTPTS[v1];[2:v]setpts=PTS-STARTPTS[v2];[0:a]asetpts=PTS-STARTPTS[a0];[1:a]asetpts=PTS-STARTPTS[a1];[2:a]asetpts=PTS-STARTPTS[a2];[v0][a0][v1][a1][v2][a2]concat=n=3:v=1:a=1[v][a]",
  "-map", "[v]", "-map", "[a]",
  "-r", "30", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "19",
  "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart",
  finalVideo,
]);
run(ffmpeg, ["-v", "error", "-i", finalVideo, "-f", "null", "-"]);

const probe = JSON.parse(capture(ffprobe, [
  "-v", "error",
  "-show_entries", "format=duration,size:stream=codec_name,codec_type,width,height",
  "-of", "json",
  finalVideo,
]));
const durationSeconds = Number(probe.format.duration);
const samples = [];
for (const percent of [15, 50, 88]) {
  const sample = path.join(outDir, `sample-${percent}.png`);
  run(ffmpeg, ["-y", "-loglevel", "error", "-ss", String(durationSeconds * percent / 100), "-i", finalVideo, "-frames:v", "1", sample]);
  samples.push(path.relative(root, sample).replaceAll("\\", "/"));
}

const verification = {
  generatedAt: new Date().toISOString(),
  scenario: path.relative(root, scenarioPath).replaceAll("\\", "/"),
  editorVideo: path.relative(root, editorVideo).replaceAll("\\", "/"),
  output: path.relative(root, finalVideo).replaceAll("\\", "/"),
  durationSeconds,
  sha256: createHash("sha256").update(await readFile(finalVideo)).digest("hex"),
  probe,
  samples,
  fullDecode: "passed",
};
await writeFile(path.join(outDir, "verification.json"), `${JSON.stringify(verification, null, 2)}\n`, "utf8");
console.log(JSON.stringify(verification, null, 2));
