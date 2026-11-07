import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { ensureDirs, manifest, outDir, sourceDir } from "./kg-statistics-demo-common.mjs";
await ensureDirs();

function cues(markdown) {
  return [...markdown.matchAll(/^\|\s*(?:EN|KY)-\d+\s*\|\s*(.*?)\s*\|\s*$/gm)].map(m => m[1].trim());
}
function stamp(sec, srt = false) {
  const ms = Math.round(sec * 1000), h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60;
  const s = Math.floor(ms / 1000) % 60, x = ms % 1000;
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}${srt?",":"."}${String(x).padStart(3,"0")}`;
}
const total = manifest.sequence.reduce((n, x) => n + x.targetSeconds, 0);
for (const lang of ["en", "ky"]) {
  const list = cues(await readFile(path.join(sourceDir, `subtitles-${lang}.md`), "utf8"));
  const weights = list.map(x => Math.max(12, x.length));
  const unit = total / weights.reduce((a,b) => a+b, 0);
  let cursor = 0;
  const timed = list.map((text, i) => {
    const start = cursor, duration = Math.max(2.2, weights[i] * unit);
    cursor += duration;
    return { start, end: Math.min(total - 0.1, cursor - 0.12), text };
  });
  const srt = timed.map((c,i) => `${i+1}\n${stamp(c.start,true)} --> ${stamp(c.end,true)}\n${c.text}\n`).join("\n");
  const vtt = `WEBVTT\n\n${timed.map((c,i) => `${i+1}\n${stamp(c.start)} --> ${stamp(c.end)}\n${c.text}\n`).join("\n")}`;
  await writeFile(path.join(outDir, `kg-statistics-mvp-demo-${lang}.srt`), srt);
  await writeFile(path.join(outDir, `kg-statistics-mvp-demo-${lang}.vtt`), vtt);
}
console.log(`Generated aligned EN/KY SRT and VTT for ${total} seconds.`);
