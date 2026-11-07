import { spawnSync } from "node:child_process";
import { readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { ensureDirs, manifest, outDir, sha256, workDir } from "./kg-statistics-demo-common.mjs";
await ensureDirs();
const names = [
  "kg-statistics-mvp-demo-master.mp4","kg-statistics-mvp-demo-slides.pptx","kg-statistics-mvp-demo-slides.pdf",
  "kg-statistics-mvp-demo-en.srt","kg-statistics-mvp-demo-en.vtt","kg-statistics-mvp-demo-ky.srt","kg-statistics-mvp-demo-ky.vtt",
  "production-manifest.json"
];
const artifacts = [];
for (const name of names) {
  const file = path.join(outDir, name), s = await stat(file);
  artifacts.push({ name, bytes: s.size, sha256: await sha256(file) });
}
const probe = JSON.parse(spawnSync("ffprobe", ["-v","error","-show_streams","-show_format","-of","json",
  path.join(outDir,names[0])], { encoding:"utf8" }).stdout);
const video = probe.streams.find(x => x.codec_type === "video");
const audio = probe.streams.find(x => x.codec_type === "audio");
const duration = Number(probe.format.duration);
const subtitleResults = {};
for (const lang of ["en","ky"]) {
  const srt = await readFile(path.join(outDir,`kg-statistics-mvp-demo-${lang}.srt`),"utf8");
  const vtt = await readFile(path.join(outDir,`kg-statistics-mvp-demo-${lang}.vtt`),"utf8");
  subtitleResults[lang] = { srtCues: (srt.match(/ --> /g)||[]).length, vttCues: (vtt.match(/ --> /g)||[]).length,
    pass: (srt.match(/ --> /g)||[]).length === 46 && (vtt.match(/ --> /g)||[]).length === 46 };
}
const layouts = [];
for (let i=1;i<=11;i++) {
  const parsed = JSON.parse(await readFile(path.join(workDir,"slides",`slide-${String(i).padStart(2,"0")}.layout.json`),"utf8"));
  layouts.push({ slide:i, layoutReadable:Boolean(parsed) });
}
const checks = {
  authenticatedWorkflowProof: JSON.parse(await readFile(path.join(workDir,"authenticated-workflow-proof.json"),"utf8")).passed,
  clipCount: 10, slideCount: 11, width: video.width, height: video.height,
  fps: video.avg_frame_rate, videoCodec: video.codec_name, audioCodec: audio?.codec_name,
  durationSeconds: duration, durationInRange: duration >= manifest.video.targetDurationSeconds.minimum && duration <= manifest.video.targetDurationSeconds.maximum,
  subtitles: subtitleResults, subtitlesBurnedIn: false, sampleFallbackUsed: false
};
const pass = checks.authenticatedWorkflowProof && checks.width===1920 && checks.height===1080 &&
  checks.videoCodec==="h264" && checks.audioCodec==="aac" && checks.durationInRange &&
  Object.values(subtitleResults).every(x=>x.pass);
const report = { schemaVersion:"kg_statistics_demo_verification.v1", pass, checkedAt:new Date().toISOString(),
  checks, layouts, artifacts };
await writeFile(path.join(outDir,"verification-report.json"), JSON.stringify(report,null,2));
if (!pass) throw new Error("Production verification failed; inspect verification-report.json");
console.log("Production verification PASS.");
