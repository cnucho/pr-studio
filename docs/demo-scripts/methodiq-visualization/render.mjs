import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../../..");
const out = path.join(root, "out", "methodiq-visualization");
const frames = path.join(out, "frames");
const audio = path.join(out, "audio");
const segments = path.join(out, "segments");
const finalVideo = path.join(out, "good-visualization-lecture-ko.mp4");
const storyboard = JSON.parse(await readFile(path.join(here, "storyboard-lecture.json"), "utf8"));
const python = process.env.PR_STUDIO_PYTHON_PATH ?? "python";
const ffmpeg = process.env.PR_STUDIO_FFMPEG_PATH ?? "ffmpeg";
const ffprobe = process.env.PR_STUDIO_FFPROBE_PATH ?? "ffprobe";

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: root, encoding: "utf8", shell: false, ...options });
  if (result.status !== 0) throw new Error(`${command} ${args.join(" ")}\n${result.stdout}\n${result.stderr}`);
  return String(result.stdout ?? "").trim();
}

function duration(file) {
  return Number(run(ffprobe, ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", file]));
}

await Promise.all([mkdir(frames, { recursive: true }), mkdir(audio, { recursive: true }), mkdir(segments, { recursive: true })]);
const concat = [];

for (let index = 0; index < storyboard.scenes.length; index += 1) {
    const scene = storyboard.scenes[index];
    const order = String(index + 1).padStart(2, "0");
    const png = path.join(frames, `${order}-${scene.id}.png`);
    const txt = path.join(audio, `${order}-${scene.id}.txt`);
    const wav = path.join(audio, `${order}-${scene.id}.wav`);
    const narrationHashFile = path.join(audio, `${order}-${scene.id}.sha256`);
    const mp4 = path.join(segments, `${order}-${scene.id}.mp4`);
    run(python, [path.join(here, "render_scene.py"), "--storyboard", path.join(here, "storyboard-lecture.json"), "--scene", scene.id, "--output", png]);
    await writeFile(txt, scene.narration, "utf8");
    const narrationHash = createHash("sha256").update(scene.narration).digest("hex");
    if (existsSync(wav) && !existsSync(narrationHashFile)) {
      await writeFile(narrationHashFile, `${narrationHash}\n`, "utf8");
    }
    const previousHash = existsSync(narrationHashFile) ? (await readFile(narrationHashFile, "utf8")).trim() : "";
    if (!existsSync(wav) || narrationHash !== previousHash) {
      run("node", [path.join(root, "scripts", "synthesize-speech.mjs"), "--input", txt, "--output", wav], { env: { ...process.env, PR_STUDIO_TTS_PROVIDER: process.env.PR_STUDIO_TTS_PROVIDER ?? "auto", GOOGLE_TTS_VOICE_KO: process.env.GOOGLE_TTS_VOICE_KO ?? "ko-KR-Chirp3-HD-Kore", GOOGLE_TTS_SPEAKING_RATE: process.env.GOOGLE_TTS_SPEAKING_RATE ?? "0.94" } });
      await writeFile(narrationHashFile, `${narrationHash}\n`, "utf8");
    }
    const readingPause = scene.kind === "three-forms" || scene.kind === "table-case" || scene.kind === "checklist" ? 3.4 : 1.8;
    const total = duration(wav) + readingPause;
    const fadeOut = Math.max(0.5, total - 0.45).toFixed(2);
    run(ffmpeg, ["-y", "-loglevel", "error", "-loop", "1", "-framerate", "30", "-i", png, "-i", wav, "-vf", `scale=1920:1080,format=yuv420p,fade=t=in:st=0:d=0.35,fade=t=out:st=${fadeOut}:d=0.4`, "-af", `apad=pad_dur=${readingPause}`, "-t", total.toFixed(3), "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", mp4]);
    concat.push(`file '${mp4.replaceAll("\\", "/").replaceAll("'", "'\\''")}'`);
}

const concatFile = path.join(out, "concat.txt");
await writeFile(concatFile, `${concat.join("\n")}\n`, "utf8");
run(ffmpeg, ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", concatFile, "-c", "copy", finalVideo]);
const probe = JSON.parse(run(ffprobe, ["-v", "error", "-show_entries", "stream=codec_name,width,height,sample_rate,channels:format=duration,size", "-of", "json", finalVideo]));
const sample = path.join(out, "good-visualization-lecture-sample.png");
run(ffmpeg, ["-y", "-loglevel", "error", "-ss", String(Math.max(1, Number(probe.format?.duration ?? 2) * 0.62)), "-i", finalVideo, "-frames:v", "1", sample]);
await writeFile(path.join(out, "verification.json"), JSON.stringify({ generatedAt: new Date().toISOString(), video: finalVideo, sample, probe }, null, 2), "utf8");
process.stdout.write(`${JSON.stringify({ ok: true, video: finalVideo, sample, probe }, null, 2)}\n`);
