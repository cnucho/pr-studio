import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { chromeLaunchArgs, resolveChrome } from "./video-runtime.mjs";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const ffmpeg = require("ffmpeg-static");
const ffprobe = require("ffprobe-static").path;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function argument(name, fallback = "") {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

const scenarioArg = argument("--scenario");
if (!scenarioArg) throw new Error("--scenario is required");
const scenarioPath = path.resolve(root, scenarioArg);
const scenario = JSON.parse(await readFile(scenarioPath, "utf8"));
for (const event of scenario.events) {
  if (event.role === "artifact" && event.svgPath) {
    event.svg = await readFile(path.resolve(root, event.svgPath), "utf8");
  }
}
const outDir = path.join(root, "out", "live-usage-demos", scenario.id);
const rawDir = path.join(outDir, "raw");
const rawVideo = path.join(rawDir, "capture.webm");
const finalVideo = path.join(outDir, `${scenario.id}-ko.mp4`);

function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, stdio: "inherit", shell: false });
  if (result.status !== 0) throw new Error(`${command} failed with exit code ${result.status}`);
}

function capture(command, args) {
  const result = spawnSync(command, args, { cwd: root, encoding: "utf8", shell: false });
  if (result.status !== 0) throw new Error(result.stderr || `${command} failed`);
  return result.stdout.trim();
}

async function sha256(file) {
  return createHash("sha256").update(await readFile(file)).digest("hex");
}

function esc(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function pageHtml() {
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>
  *{box-sizing:border-box}body{margin:0;background:#f6f4ee;color:#152b30;font-family:"Malgun Gothic","Noto Sans KR",system-ui,sans-serif;overflow:hidden}.app{width:1920px;height:1080px;display:grid;grid-template-columns:310px 1fr}.side{background:#102e34;color:#fff;padding:38px 30px}.brand{font-size:25px;font-weight:900}.side h1{font-size:25px;line-height:1.35;margin:74px 0 12px}.side p{color:#b9cbc7;line-height:1.7}.badge{display:inline-block;margin-top:20px;padding:8px 12px;border:1px solid #4f7b75;border-radius:999px;color:#bce5db;font-size:13px;font-weight:800}.main{display:grid;grid-template-rows:76px 1fr 108px;min-width:0}.top{display:flex;align-items:center;justify-content:space-between;padding:0 38px;background:#fff;border-bottom:1px solid #d8dfdc}.top strong{font-size:20px}.top span{font-size:13px;color:#60716c}.chat{overflow:hidden;padding:26px 46px 10px}.stream{max-width:1240px;margin:0 auto;display:grid;gap:14px}.event{opacity:0;transform:translateY(12px);animation:in .28s ease forwards}.bubble{max-width:980px;padding:16px 20px;border-radius:18px;font-size:18px;line-height:1.62;box-shadow:0 8px 24px #2139320d}.user{justify-self:end;background:#176e68;color:#fff;border-bottom-right-radius:5px}.assistant{justify-self:start;background:#fff;border:1px solid #d8dfdc;border-bottom-left-radius:5px}.tool{background:#edf3f1;border:1px solid #c5d3cf;border-radius:14px;padding:16px 18px}.tool.error{background:#fff0ea;border-color:#e9b39e}.toolhead{display:flex;align-items:center;justify-content:space-between;gap:16px;font-weight:900}.toolname{font-family:Consolas,monospace;color:#176e68}.error .toolname{color:#a8472b}.toolbody{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:12px}.toolbody div{padding:12px;border-radius:9px;background:#ffffffb8}.toolbody small{display:block;margin-bottom:5px;color:#687873;font-weight:800}.artifact{background:#fff;border:1px solid #ccd7d3;border-radius:16px;padding:18px}.artifact h2{margin:0 0 14px;font-size:20px}.graph{height:310px;position:relative;background:#fbfcfa;border-radius:12px;overflow:hidden}.node{position:absolute;width:190px;min-height:54px;padding:14px 10px;border:2px solid #49655f;border-radius:12px;background:#fff;text-align:center;font-weight:850;z-index:2}.terminal{border-radius:28px}.decision{transform:rotate(45deg);width:128px;height:128px;padding:0}.decision span{display:flex;align-items:center;justify-content:center;width:100%;height:100%;transform:rotate(-45deg);font-size:14px}.line{position:absolute;height:2px;background:#76918b;transform-origin:left center;z-index:1}.composer{padding:16px 46px 20px;background:#fff;border-top:1px solid #d8dfdc}.composebox{max-width:1240px;height:70px;margin:0 auto;display:flex;align-items:center;gap:14px;padding:12px 14px;border:1px solid #bdcbc6;border-radius:16px}.composebox textarea{flex:1;height:42px;border:0;resize:none;outline:0;font:17px/1.45 inherit}.composebox button{height:44px;padding:0 22px;border:0;border-radius:11px;background:#176e68;color:#fff;font-weight:900}.cursor{position:fixed;width:22px;height:22px;border:2px solid #176e68;border-radius:50%;background:#176e6833;pointer-events:none;z-index:20;transform:translate(-50%,-50%)}@keyframes in{to{opacity:1;transform:none}}
  .chat{overflow-y:auto;scrollbar-width:none}.chat::-webkit-scrollbar{display:none}.graph{height:350px;display:flex;align-items:center;justify-content:center;position:static}.graph svg{width:100%;height:100%;display:block;transform:scale(1.4);transform-origin:50% 32%}
  </style></head><body><div class="app"><aside class="side"><div class="brand">MCP Live Usage</div><h1>${esc(scenario.title)}</h1><p>${esc(scenario.subtitle)}</p><div class="badge">실제 MCP 실행 기록</div></aside><main class="main"><header class="top"><strong>MethodIQ Tools</strong><span>${esc(scenario.source.connector)} · revision ${esc(scenario.source.finalRevision)}</span></header><section class="chat"><div id="stream" class="stream"></div></section><footer class="composer"><div class="composebox"><textarea id="composer" aria-label="사용자 지시" placeholder="자연어로 요청하세요"></textarea><button id="send">보내기</button></div></footer></main></div><div id="cursor" class="cursor"></div><script>
  const events=${JSON.stringify(scenario.events)};const stream=document.querySelector('#stream');const composer=document.querySelector('#composer');document.addEventListener('mousemove',e=>{const c=document.querySelector('#cursor');c.style.left=e.clientX+'px';c.style.top=e.clientY+'px'});
  function node(tag,cls,text){const el=document.createElement(tag);if(cls)el.className=cls;if(text!=null)el.textContent=text;return el}
  function line(x1,y1,x2,y2){const d=Math.hypot(x2-x1,y2-y1);const a=Math.atan2(y2-y1,x2-x1)*180/Math.PI;const el=node('div','line');Object.assign(el.style,{left:x1+'px',top:y1+'px',width:d+'px',transform:'rotate('+a+'deg)'});return el}
  function graphCard(event){const card=node('div','event artifact');card.append(node('h2','',event.text));const g=node('div','graph');g.innerHTML=event.svg;card.append(g);return card}
  window.addEvent=(index)=>{const e=events[index];let el;if(e.role==='user'){el=node('div','event bubble user',e.text)}else if(e.role==='assistant'){el=node('div','event bubble assistant',e.text)}else if(e.role==='tool'){el=node('div','event tool '+(e.status==='error'?'error':''));const head=node('div','toolhead');head.append(node('span','toolname',e.tool),node('span','',e.status==='success'?'MCP 결과':'MCP 오류'));const body=node('div','toolbody');const input=node('div');input.append(node('small','','입력'),document.createTextNode(e.input));const result=node('div');result.append(node('small','','반환'),document.createTextNode(e.result));body.append(input,result);el.append(head,body)}else{el=graphCard(e)}stream.append(el);requestAnimationFrame(()=>{el.scrollIntoView({behavior:'smooth',block:'end'})})};
  window.sendUser=(index)=>{const text=events[index].text;const el=node('div','event bubble user',text);stream.append(el);composer.value='';requestAnimationFrame(()=>el.scrollIntoView({behavior:'smooth',block:'end'}))};
  </script></body></html>`;
}

await mkdir(rawDir, { recursive: true });
const executablePath = resolveChrome();
const browser = await chromium.launch({ headless: true, args: chromeLaunchArgs(process.env), ...(executablePath ? { executablePath } : {}) });
const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, recordVideo: { dir: rawDir, size: { width: 1920, height: 1080 } } });
const page = await context.newPage();
await page.setContent(pageHtml(), { waitUntil: "networkidle" });
for (const [index, event] of scenario.events.entries()) {
  if (event.role === "user") {
    await page.locator("#composer").pressSequentially(event.text, { delay: 14 });
    await page.waitForTimeout(350);
    await page.locator("#send").click();
    await page.evaluate((i) => window.sendUser(i), index);
  } else {
    await page.evaluate((i) => window.addEvent(i), index);
  }
  const defaultHoldMs = event.role === "artifact" ? 4200 : event.role === "tool" ? 2500 : 1800;
  const holdMs = Number.isFinite(Number(event.holdSeconds))
    ? Math.max(800, Number(event.holdSeconds) * 1000)
    : defaultHoldMs;
  await page.waitForTimeout(holdMs);
}
await page.waitForTimeout(1800);
const video = page.video();
await context.close();
if (video) await video.saveAs(rawVideo);
await browser.close();

run(ffmpeg, ["-y", "-loglevel", "error", "-i", rawVideo, "-f", "lavfi", "-i", "anullsrc=r=48000:cl=mono", "-map", "0:v:0", "-map", "1:a:0", "-r", "30", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "19", "-c:a", "aac", "-b:a", "96k", "-shortest", "-movflags", "+faststart", finalVideo]);
run(ffmpeg, ["-v", "error", "-i", finalVideo, "-f", "null", "-"]);
const probe = JSON.parse(capture(ffprobe, ["-v", "error", "-show_entries", "format=duration,size:stream=codec_name,codec_type,width,height,r_frame_rate,sample_rate,channels", "-of", "json", finalVideo]));
const durationSeconds = Number(probe.format.duration);
const samples = [];
for (const percent of [20, 55, 85]) { const sample = path.join(outDir, `sample-${percent}.png`); run(ffmpeg, ["-y", "-loglevel", "error", "-ss", String(durationSeconds * percent / 100), "-i", finalVideo, "-frames:v", "1", sample]); samples.push(path.relative(root, sample).replaceAll("\\", "/")); }
const verification = { generatedAt: new Date().toISOString(), scenario: path.relative(root, scenarioPath).replaceAll("\\", "/"), source: scenario.source, output: path.relative(root, finalVideo).replaceAll("\\", "/"), durationSeconds, sha256: await sha256(finalVideo), probe, samples, fullDecode: "passed", narration: false, persuasiveClaims: false };
await writeFile(path.join(outDir, "verification.json"), `${JSON.stringify(verification, null, 2)}\n`, "utf8");
console.log(JSON.stringify(verification, null, 2));
