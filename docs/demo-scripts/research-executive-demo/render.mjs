import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../../..");
const out = path.join(root, "out", "research-executive-demo");
const frames = path.join(out, "frames");
const audio = path.join(out, "audio");
const segments = path.join(out, "segments");
const finalVideo = path.join(out, "methodiq-research-executive-demo-ko.mp4");
const storyboardPath = path.join(here, "storyboard.json");
const storyboard = JSON.parse(await readFile(storyboardPath, "utf8"));
const python = process.env.PR_STUDIO_PYTHON_PATH ?? "python";
const ffmpeg = process.env.PR_STUDIO_FFMPEG_PATH ?? "ffmpeg";
const ffprobe = process.env.PR_STUDIO_FFPROBE_PATH ?? "ffprobe";
const hasGoogle = Boolean(
  process.env.GOOGLE_CLOUD_ACCESS_TOKEN ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON ||
    existsSync("C:\\secure\\pr-studio-google-tts.json"),
);
const ttsProvider = process.env.RESEARCH_EXECUTIVE_TTS_PROVIDER ?? (hasGoogle ? "google" : "openai");
const ttsVoice = process.env.GOOGLE_TTS_VOICE_KO ?? "ko-KR-Chirp3-HD-Kore";
const ttsSpeakingRate = process.env.GOOGLE_TTS_SPEAKING_RATE ?? "0.94";
const ttsFingerprint = JSON.stringify({ provider: ttsProvider, voice: ttsVoice, speakingRate: ttsSpeakingRate });

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: root, encoding: "utf8", shell: false, ...options });
  if (result.status !== 0) throw new Error(`${command} ${args.join(" ")}\n${result.stdout}\n${result.stderr}`);
  return String(result.stdout ?? "").trim();
}

function duration(file) {
  return Number(run(ffprobe, ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", file]));
}

function srtTime(seconds) {
  const total = Math.round(seconds * 1000);
  const ms = total % 1000;
  const allSeconds = Math.floor(total / 1000);
  const s = allSeconds % 60;
  const allMinutes = Math.floor(allSeconds / 60);
  const m = allMinutes % 60;
  const h = Math.floor(allMinutes / 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(ms).padStart(3, "0")}`;
}

await Promise.all([mkdir(frames, { recursive: true }), mkdir(audio, { recursive: true }), mkdir(segments, { recursive: true })]);
const concat = [];
const subtitles = [];
const transcript = [];
let cursor = 0;

for (let index = 0; index < storyboard.scenes.length; index += 1) {
  const scene = storyboard.scenes[index];
  const order = String(index + 1).padStart(2, "0");
  const stem = `${order}-${scene.id}`;
  const png = path.join(frames, `${stem}.png`);
  const txt = path.join(audio, `${stem}.txt`);
  const wav = path.join(audio, `${stem}.wav`);
  const narrationHashFile = path.join(audio, `${stem}.sha256`);
  const mp4 = path.join(segments, `${stem}.mp4`);
  run(python, [path.join(here, "..", "methodiq-visualization", "render_scene.py"), "--storyboard", storyboardPath, "--scene", scene.id, "--output", png]);
  await writeFile(txt, scene.narration, "utf8");
  const narrationHash = createHash("sha256").update(`${ttsFingerprint}\n${scene.narration}`).digest("hex");
  const previousHash = existsSync(narrationHashFile) ? (await readFile(narrationHashFile, "utf8")).trim() : "";
  if (!existsSync(wav) || previousHash !== narrationHash) {
    run("node", [path.join(root, "scripts", "synthesize-speech.mjs"), "--input", txt, "--output", wav], {
      env: {
        ...process.env,
        PR_STUDIO_TTS_PROVIDER_KO: ttsProvider,
        GOOGLE_TTS_VOICE_KO: ttsVoice,
        GOOGLE_TTS_SPEAKING_RATE: ttsSpeakingRate,
      },
    });
    await writeFile(narrationHashFile, `${narrationHash}\n`, "utf8");
  }
  const pause = scene.kind === "checklist" ? 2.8 : 1.5;
  const total = duration(wav) + pause;
  const fadeOut = Math.max(0.5, total - 0.4).toFixed(2);
  run(ffmpeg, ["-y", "-loglevel", "error", "-loop", "1", "-framerate", "30", "-i", png, "-i", wav, "-vf", `scale=1920:1080,format=yuv420p,fade=t=in:st=0:d=0.3,fade=t=out:st=${fadeOut}:d=0.35`, "-af", `apad=pad_dur=${pause}`, "-t", total.toFixed(3), "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", mp4]);
  concat.push(`file '${mp4.replaceAll("\\", "/").replaceAll("'", "'\\''")}'`);
  subtitles.push(`${index + 1}\n${srtTime(cursor)} --> ${srtTime(cursor + total)}\n${scene.caption}\n`);
  transcript.push(`[${order}] ${scene.narration}`);
  cursor += total;
}

const concatFile = path.join(out, "concat.txt");
await writeFile(concatFile, `${concat.join("\n")}\n`, "utf8");
await writeFile(path.join(out, "methodiq-research-executive-demo-ko.srt"), subtitles.join("\n"), "utf8");
await writeFile(path.join(out, "methodiq-research-executive-demo-ko-transcript.txt"), transcript.join("\n\n"), "utf8");
run(ffmpeg, ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", concatFile, "-c", "copy", "-movflags", "+faststart", finalVideo]);
run(ffmpeg, ["-v", "error", "-i", finalVideo, "-f", "null", "-"]);
const probe = JSON.parse(run(ffprobe, ["-v", "error", "-show_entries", "stream=codec_name,width,height,sample_rate,channels:format=duration,size", "-of", "json", finalVideo]));
const sampleFrames = [];
for (const ratio of [0.25, 0.6, 0.85]) {
  const sample = path.join(out, `sample-${Math.round(ratio * 100)}.png`);
  run(ffmpeg, ["-y", "-loglevel", "error", "-ss", String(Number(probe.format?.duration ?? 1) * ratio), "-i", finalVideo, "-frames:v", "1", sample]);
  sampleFrames.push(sample);
}
const videoSha256 = createHash("sha256").update(await readFile(finalVideo)).digest("hex");
const storyboardSha256 = createHash("sha256").update(await readFile(storyboardPath)).digest("hex");
const verification = {
  generatedAt: new Date().toISOString(),
  video: finalVideo,
  videoSha256,
  storyboardSha256,
  samples: sampleFrames,
  tts: {
    provider: ttsProvider,
    voice: ttsProvider === "google" ? ttsVoice : process.env.PR_STUDIO_TTS_VOICE_KO ?? "marin",
    speakingRate: ttsProvider === "google" ? Number(ttsSpeakingRate) : null,
    googlePreferredButUnavailable: !hasGoogle,
  },
  probe,
  fullDecode: "passed",
};
await writeFile(path.join(out, "verification.json"), JSON.stringify(verification, null, 2), "utf8");
process.stdout.write(`${JSON.stringify({ ok: true, video: finalVideo, verification }, null, 2)}\n`);
