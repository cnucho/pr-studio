import { createHash } from "node:crypto";
import { readFile, rename, rm, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ffmpeg = require("ffmpeg-static");
const ffprobe = require("ffprobe-static").path;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = path.join(root, "out", "office-ai-workflow-demo");
const outputRoot = path.join(root, "out", "office-suite-executive-demo");
const output = path.join(outputRoot, "methodiq-office-suite-full-demo-ko.mp4");
const temporaryOutput = path.join(outputRoot, "methodiq-office-suite-full-demo-ko.rendering.mp4");
const transitionSeconds = 0.6;

const chapters = [
  { id: "overview", title: "Office Workflow 개요", file: "methodiq-office-workflow-overview-current.mp4" },
  { id: "gwriter", title: "gWriter / GPT Editor", file: "gpt-editor-tutorial-current.mp4" },
  { id: "chart", title: "Chart Studio에서 PPTX까지", file: "chart-to-pptx-tutorial-current.mp4" },
  { id: "diagram", title: "Diagram Studio에서 PPTX까지", file: "diagram-to-pptx-tutorial-current.mp4" },
  { id: "pptx", title: "PPTX Studio 부분 편집", file: "pptx-partial-edit-tutorial-current.mp4" },
].map((chapter) => ({ ...chapter, path: path.join(sourceRoot, chapter.file) }));

function capture(command, args) {
  const result = spawnSync(command, args, { cwd: root, encoding: "utf8", shell: false });
  if (result.status !== 0) throw new Error(result.stderr || `${command} failed`);
  return result.stdout.trim();
}

function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, stdio: "inherit", shell: false });
  if (result.status !== 0) throw new Error(`${command} failed with exit code ${result.status}`);
}

async function sha256(file) {
  return createHash("sha256").update(await readFile(file)).digest("hex");
}

function probe(file) {
  return JSON.parse(capture(ffprobe, [
    "-v", "error",
    "-show_entries", "format=duration,size:stream=codec_name,codec_type,width,height,r_frame_rate,sample_rate,channels,duration",
    "-of", "json",
    file,
  ]));
}

await mkdir(outputRoot, { recursive: true });

let startSeconds = 0;
for (const [index, chapter] of chapters.entries()) {
  chapter.probe = probe(chapter.path);
  chapter.durationSeconds = Number(chapter.probe.format.duration);
  chapter.startSeconds = startSeconds;
  chapter.sha256 = await sha256(chapter.path);
  startSeconds += chapter.durationSeconds - (index < chapters.length - 1 ? transitionSeconds : 0);
}

const filters = [];
for (const [index, chapter] of chapters.entries()) {
  const duration = chapter.durationSeconds.toFixed(6);
  filters.push(
    `[${index}:v]fps=30,scale=1920:1080:force_original_aspect_ratio=decrease,` +
      `pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p,setpts=PTS-STARTPTS[v${index}]`,
  );
  filters.push(
    `[${index}:a]aresample=48000,aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=mono,` +
      `apad,atrim=duration=${duration},asetpts=PTS-STARTPTS[a${index}]`,
  );
}

let videoLabel = "v0";
let audioLabel = "a0";
let composedDuration = chapters[0].durationSeconds;
for (let index = 1; index < chapters.length; index += 1) {
  const nextVideo = `vx${index}`;
  const nextAudio = `ax${index}`;
  const offset = composedDuration - transitionSeconds;
  filters.push(
    `[${videoLabel}][v${index}]xfade=transition=fade:duration=${transitionSeconds}:offset=${offset.toFixed(6)}[${nextVideo}]`,
  );
  filters.push(
    `[${audioLabel}][a${index}]acrossfade=d=${transitionSeconds}:c1=tri:c2=tri[${nextAudio}]`,
  );
  videoLabel = nextVideo;
  audioLabel = nextAudio;
  composedDuration += chapters[index].durationSeconds - transitionSeconds;
}

const finalVideoLabel = "video-out";
const finalAudioLabel = "audio-out";
filters.push(
  `[${videoLabel}]trim=duration=${composedDuration.toFixed(6)},setpts=PTS-STARTPTS,format=yuv420p[${finalVideoLabel}]`,
);
filters.push(
  `[${audioLabel}]atrim=duration=${composedDuration.toFixed(6)},asetpts=PTS-STARTPTS[${finalAudioLabel}]`,
);

await rm(temporaryOutput, { force: true });
run(ffmpeg, [
  "-y",
  ...chapters.flatMap((chapter) => ["-i", chapter.path]),
  "-filter_complex", filters.join(";"),
  "-map", `[${finalVideoLabel}]`,
  "-map", `[${finalAudioLabel}]`,
  "-c:v", "libx264",
  "-pix_fmt", "yuv420p",
  "-preset", "slow",
  "-crf", "19",
  "-c:a", "aac",
  "-b:a", "192k",
  "-movflags", "+faststart",
  temporaryOutput,
]);

run(ffmpeg, ["-v", "error", "-i", temporaryOutput, "-f", "null", "-"]);
await rm(output, { force: true });
await rename(temporaryOutput, output);

const outputProbe = probe(output);
const manifest = {
  generatedAt: new Date().toISOString(),
  title: "MethodIQ Office Suite 전체 시연",
  output: path.relative(root, output).replaceAll("\\", "/"),
  transitionSeconds,
  durationSeconds: Number(outputProbe.format.duration),
  sha256: await sha256(output),
  probe: outputProbe,
  chapters: chapters.map(({ id, title, file, startSeconds: start, durationSeconds, sha256: hash }) => ({
    id,
    title,
    file,
    startSeconds: Number(start.toFixed(3)),
    durationSeconds: Number(durationSeconds.toFixed(3)),
    sha256: hash,
  })),
};

await writeFile(path.join(outputRoot, "verification.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(JSON.stringify(manifest, null, 2));
