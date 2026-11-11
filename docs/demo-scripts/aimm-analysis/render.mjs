import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../../..");
const out = path.join(root, "out", "aimm-analysis");
const frames = path.join(out, "frames");
const audio = path.join(out, "audio");
const clips = path.join(out, "clips");
const source = JSON.parse(await readFile(path.join(here, "storyboard.json"), "utf8"));
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PR_STUDIO_PLAYWRIGHT_PATH || "C:/git-app/CI Plan Builder/node_modules/playwright");
const appUrl = process.env.AIMM_DEMO_URL || "http://127.0.0.1:8788";
const video = path.join(out, "aimm-detailed-tutorial-ko.mp4");
const voice = "ko-KR-Chirp3-HD-Kore";

function run(command, args, options = {}) {
  const r = spawnSync(command, args, { cwd: root, encoding: "utf8", shell: false, ...options });
  if (r.status !== 0) throw new Error(command + " failed: " + String(r.stderr || r.stdout).slice(-2000));
  return String(r.stdout || "").trim();
}
function stamp(seconds) {
  const ms = Math.round(seconds * 1000);
  const h = Math.floor(ms / 3600000);
  const m = Math.floor(ms / 60000) % 60;
  const s = Math.floor(ms / 1000) % 60;
  return [h,m,s].map(x => String(x).padStart(2,"0")).join(":") + "," + String(ms % 1000).padStart(3,"0");
}
await Promise.all([frames,audio,clips].map(x => mkdir(x,{recursive:true})));
const browser = await chromium.launch({headless:true});
const page = await browser.newPage({viewport:{width:1600,height:900},deviceScaleFactor:1});
await page.goto(appUrl, {waitUntil:"domcontentloaded"});
await page.getByText("AIMM 분석 작업대").first().waitFor({timeout:30000});
const subtitles = [], transcript = [], concat = [];
let cursor = 0;
for (let i=0;i<source.scenes.length;i++) {
  const scene = source.scenes[i], order=String(i+1).padStart(2,"0"), stem=order+"-"+scene.id;
  await page.getByRole("tab",{name:scene.tab}).click();
  await page.waitForTimeout(700);
  const target = page.getByText(scene.focus,{exact:false}).first();
  if (await target.count()) {
    await target.scrollIntoViewIfNeeded().catch(()=>{});
    await target.evaluate(el=>{ el.style.outline="4px solid #f59e0b"; el.style.outlineOffset="5px"; el.style.backgroundColor="rgba(245,158,11,.15)"; }).catch(()=>{});
  }
  const png=path.join(frames,stem+".png"), txt=path.join(audio,stem+".txt"), wav=path.join(audio,stem+".wav"), mp4=path.join(clips,stem+".mp4");
  await page.screenshot({path:png,animations:"disabled"});
  if (await target.count()) await target.evaluate(el=>{el.style.outline="";el.style.outlineOffset="";el.style.backgroundColor="";}).catch(()=>{});
  await writeFile(txt,scene.narration,"utf8");
  if (!existsSync(wav)) run("node",[path.join(root,"scripts","synthesize-speech.mjs"),"--input",txt,"--output",wav],{env:{...process.env,PR_STUDIO_TTS_PROVIDER:"google",GOOGLE_TTS_VOICE_KO:voice,GOOGLE_TTS_SPEAKING_RATE:"0.94"}});
  const spoken=Number(run("ffprobe",["-v","error","-show_entries","format=duration","-of","default=nw=1:nk=1",wav]));
  const hold=spoken+2.2;
  run("ffmpeg",["-y","-loglevel","error","-loop","1","-framerate","24","-i",png,"-i",wav,"-vf","scale=1920:1080,format=yuv420p","-af","apad=pad_dur=2.2","-t",hold.toFixed(3),"-c:v","libx264","-preset","veryfast","-crf","21","-c:a","aac","-b:a","128k","-movflags","+faststart",mp4]);
  concat.push("file '"+mp4.replaceAll("\\","/")+"'");
  subtitles.push((i+1)+"\n"+stamp(cursor)+" --> "+stamp(cursor+hold)+"\n"+scene.caption+"\n");
  transcript.push("["+order+"] "+scene.caption+"\n"+scene.narration);
  cursor+=hold;
  process.stdout.write(stem+" "+hold.toFixed(1)+"s\n");
}
await browser.close();
await writeFile(path.join(out,"concat.txt"),concat.join("\n")+"\n");
await writeFile(path.join(out,"aimm-detailed-tutorial-ko.srt"),subtitles.join("\n"));
await writeFile(path.join(out,"aimm-detailed-tutorial-ko-transcript.txt"),transcript.join("\n\n"));
run("ffmpeg",["-y","-loglevel","error","-f","concat","-safe","0","-i",path.join(out,"concat.txt"),"-c","copy","-movflags","+faststart",video]);
run("ffmpeg",["-v","error","-i",video,"-f","null","-"]);
const probe=JSON.parse(run("ffprobe",["-v","error","-show_entries","stream=codec_name,width,height,sample_rate,channels:format=duration,size","-of","json",video]));
for(const [label,ratio] of [["start",.08],["middle",.5],["end",.9]]) run("ffmpeg",["-y","-loglevel","error","-ss",String(cursor*ratio),"-i",video,"-frames:v","1",path.join(out,"sample-"+label+".png")]);
const sha256=createHash("sha256").update(await readFile(video)).digest("hex");
await writeFile(path.join(out,"verification.json"),JSON.stringify({video,sha256,probe,scenes:source.scenes.length,voice,appUrl,fullDecode:"passed"},null,2));
process.stdout.write(JSON.stringify({video,sha256,duration:probe.format.duration,bytes:probe.format.size,scenes:source.scenes.length})+"\n");
