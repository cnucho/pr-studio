import { spawnSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { ensureDirs, exists, manifest, outDir, sourceDir, workDir } from "./kg-statistics-demo-common.mjs";

await ensureDirs();
const ffmpeg = "ffmpeg";
const ffprobe = "ffprobe";
function run(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: "inherit", timeout: 600000, ...options });
  if (result.status !== 0) throw new Error(`${command} failed (${result.status})`);
}
function duration(file) {
  const r = spawnSync(ffprobe, ["-v","error","-show_entries","format=duration","-of","default=nw=1:nk=1",file], { encoding:"utf8" });
  return Number(r.stdout.trim());
}
const narration = await readFile(path.join(sourceDir, "narration-en.md"), "utf8");
const sections = [...narration.matchAll(/^# (Slide|Video) (\d+)[^\n]*\r?\n([\s\S]*?)(?=^# (?:Slide|Video) \d+|(?![\s\S]))/gm)]
  .map(m => m[3].replace(/^##.*$/gm, "").replace(/^---$/gm, "").replace(/\r?\n+/g, " ").trim());
if (sections.length !== 21) throw new Error(`Expected 21 narration sections, found ${sections.length}`);
const audioDir = path.join(workDir, "audio");
for (let i = 0; i < sections.length; i++) {
  const textFile = path.join(audioDir, `${String(i+1).padStart(2,"0")}.txt`);
  const wavFile = path.join(audioDir, `${String(i+1).padStart(2,"0")}.wav`);
  await writeFile(textFile, sections[i]);
  if (await exists(wavFile)) continue;
  run(process.execPath, [path.join("scripts","synthesize-speech.mjs"),"--input",textFile,"--output",wavFile], {
    cwd: path.resolve("."), env: { ...process.env, PR_STUDIO_TTS_PROVIDER: "openai", PR_STUDIO_TTS_VOICE_EN: "cedar" }
  });
}

const segments = [];
let slideNo = 0, videoNo = 0;
for (const item of manifest.sequence) {
  const index = segments.length;
  const audio = path.join(audioDir, `${String(index+1).padStart(2,"0")}.wav`);
  const target = Math.max(item.targetSeconds, duration(audio) + 1);
  const output = path.join(workDir, "segments", `${String(index+1).padStart(2,"0")}.mp4`);
  if (await exists(output)) { segments.push(output); if (item.type === "slide") slideNo++; else videoNo++; continue; }
  let input;
  if (item.type === "slide") {
    slideNo++;
    input = path.join(workDir, "slides", `slide-${String(slideNo).padStart(2,"0")}.png`);
    run(ffmpeg, ["-y","-loop","1","-i",input,"-i",audio,"-t",String(target),"-vf",
      "scale=1920:1080,format=yuv420p","-r","30","-c:v","libx264","-preset","veryfast","-crf","21",
      "-c:a","aac","-b:a","160k","-af","apad","-shortest",output]);
  } else {
    videoNo++;
    input = path.join(workDir, "clips", `video-${String(videoNo).padStart(2,"0")}.webm`);
    run(ffmpeg, ["-y","-stream_loop","-1","-i",input,"-i",audio,"-t",String(target),"-vf",
      "scale=1920:1080,format=yuv420p","-r","30","-c:v","libx264","-preset","veryfast","-crf","21",
      "-c:a","aac","-b:a","160k","-af","apad","-shortest",output]);
  }
  segments.push(output);
}
const concat = path.join(workDir, "concat.txt");
await writeFile(concat, segments.map(x => `file '${x.replaceAll("'","'\\''")}'`).join("\n"));
const master = path.join(outDir, "kg-statistics-mvp-demo-master.mp4");
if (!(await exists(master))) run(ffmpeg, ["-y","-f","concat","-safe","0","-i",concat,"-c","copy","-movflags","+faststart",master]);

const python = process.env.CODEX_PYTHON ?? path.join(process.env.USERPROFILE ?? "", ".cache", "codex-runtimes",
  "codex-primary-runtime", "dependencies", "python", "python.exe");
const pdfScript = path.join(workDir, "slides-to-pdf.py");
await writeFile(pdfScript, `from reportlab.pdfgen import canvas\nfrom reportlab.lib.utils import ImageReader\nfrom pathlib import Path\np=Path(r"${path.join(workDir,"slides")}")\nout=r"${path.join(outDir,"kg-statistics-mvp-demo-slides.pdf")}"\nc=canvas.Canvas(out,pagesize=(1920,1080))\nfor image in sorted(p.glob("slide-*.png")):\n c.drawImage(ImageReader(str(image)),0,0,width=1920,height=1080)\n c.showPage()\nc.save()\n`);
run(python, [pdfScript]);
await writeFile(path.join(outDir, "production-manifest.json"), JSON.stringify({
  ...manifest, renderedFromCommit: spawnSync("git",["rev-parse","HEAD"],{encoding:"utf8"}).stdout.trim(),
  sourceApplication: { ...manifest.sourceApplication, verifiedCommit:
    spawnSync("git",["rev-parse","HEAD"],{cwd:process.env.KG_SYSTEM_ROOT ?? "C:\\github_app\\_worktrees\\survey-workflow-kg-mvp",encoding:"utf8"}).stdout.trim() },
  renderedAt: new Date().toISOString()
}, null, 2));
console.log(`Master rendered: ${master}`);
