import { createServer } from "node:http";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../../..");
const out = path.join(root, "out", "methodiq-visualization");
const frames = path.join(out, "frames");
const audio = path.join(out, "audio");
const segments = path.join(out, "segments");
const finalVideo = path.join(out, "good-visualization-guide-ko.mp4");
const storyboard = JSON.parse(await readFile(path.join(here, "storyboard.json"), "utf8"));
const chrome = process.env.PR_STUDIO_CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: root, encoding: "utf8", shell: false, ...options });
  if (result.status !== 0) throw new Error(`${command} ${args.join(" ")}\n${result.stdout}\n${result.stderr}`);
  return String(result.stdout ?? "").trim();
}

function duration(file) {
  return Number(run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", file]));
}

function serve() {
  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    const name = url.pathname === "/" ? "visual-guide.html" : url.pathname.replace(/^\/+/, "");
    const file = path.resolve(here, name);
    if (!file.startsWith(here) || !existsSync(file)) { res.statusCode = 404; res.end(); return; }
    const type = file.endsWith(".json") ? "application/json" : "text/html; charset=utf-8";
    res.setHeader("content-type", type);
    res.end(await readFile(file));
  });
  return new Promise(resolve => server.listen(0, "127.0.0.1", () => resolve(server)));
}

if (!existsSync(chrome)) throw new Error(`Chrome not found. Set PR_STUDIO_CHROME_PATH: ${chrome}`);
await Promise.all([mkdir(frames, { recursive: true }), mkdir(audio, { recursive: true }), mkdir(segments, { recursive: true })]);
const server = await serve();
const port = server.address().port;
const concat = [];

try {
  for (let index = 0; index < storyboard.scenes.length; index += 1) {
    const scene = storyboard.scenes[index];
    const order = String(index + 1).padStart(2, "0");
    const png = path.join(frames, `${order}-${scene.id}.png`);
    const txt = path.join(audio, `${order}-${scene.id}.txt`);
    const wav = path.join(audio, `${order}-${scene.id}.wav`);
    const mp4 = path.join(segments, `${order}-${scene.id}.mp4`);
    const url = `http://127.0.0.1:${port}/visual-guide.html?scene=${encodeURIComponent(scene.id)}`;

    run(chrome, ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--window-size=1920,1080", "--force-device-scale-factor=1", "--virtual-time-budget=1800", `--screenshot=${png}`, url]);
    await writeFile(txt, scene.narration, "utf8");
    run("node", [path.join(root, "scripts", "synthesize-speech.mjs"), "--input", txt, "--output", wav], { env: { ...process.env, PR_STUDIO_TTS_PROVIDER: process.env.PR_STUDIO_TTS_PROVIDER ?? "google", GOOGLE_APPLICATION_CREDENTIALS: process.env.GOOGLE_APPLICATION_CREDENTIALS ?? "C:/secure/pr-studio-google-tts.json", GOOGLE_TTS_VOICE_KO: process.env.GOOGLE_TTS_VOICE_KO ?? "ko-KR-Chirp3-HD-Kore", GOOGLE_TTS_SPEAKING_RATE: process.env.GOOGLE_TTS_SPEAKING_RATE ?? "0.94" } });
    const total = duration(wav) + 0.9;
    const fadeOut = Math.max(0.5, total - 0.45).toFixed(2);
    run("ffmpeg", ["-y", "-loglevel", "error", "-loop", "1", "-framerate", "30", "-i", png, "-i", wav, "-vf", `scale=1920:1080,format=yuv420p,fade=t=in:st=0:d=0.35,fade=t=out:st=${fadeOut}:d=0.4`, "-af", "apad=pad_dur=0.9", "-t", total.toFixed(3), "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", mp4]);
    concat.push(`file '${mp4.replaceAll("'", "'\\''")}'`);
  }
} finally {
  await new Promise(resolve => server.close(resolve));
}

const concatFile = path.join(out, "concat.txt");
await writeFile(concatFile, `${concat.join("\n")}\n`, "utf8");
run("ffmpeg", ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", concatFile, "-c", "copy", finalVideo]);
const probe = JSON.parse(run("ffprobe", ["-v", "error", "-show_entries", "stream=codec_name,width,height,sample_rate,channels:format=duration,size", "-of", "json", finalVideo]));
const sample = path.join(out, "good-visualization-guide-sample.png");
run("ffmpeg", ["-y", "-loglevel", "error", "-ss", String(Math.max(1, Number(probe.format?.duration ?? 2) * 0.62)), "-i", finalVideo, "-frames:v", "1", sample]);
await writeFile(path.join(out, "verification.json"), JSON.stringify({ generatedAt: new Date().toISOString(), video: finalVideo, sample, probe }, null, 2), "utf8");
process.stdout.write(`${JSON.stringify({ ok: true, video: finalVideo, sample, probe }, null, 2)}\n`);
