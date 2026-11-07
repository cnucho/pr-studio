import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const cleaningRoot = process.env.CLEANING_DEMO_REPO ?? "D:/Git/mcp-survey-qc-cleaning-tools";
const datasetRoot = process.env.CLEANING_DEMO_DATASET ?? "D:/Dropbox/survey-evaluation-library/survey-questionnaire-5000x200-v2";
const csvPath = path.join(datasetRoot, "responses_raw.csv");
const metadataPath = path.join(datasetRoot, "metadata_json.json");
const outRoot = path.join(root, "out", "survey-cleaning-demo");
const appUrl = "http://127.0.0.1:8824/";
const demoToken = "survey-cleaning-video-demo-token";
const playwrightCandidates = [
  "C:/git-app/kwcs-qc/frontend/control-center/node_modules/playwright",
  "C:/git-app/CI Plan Builder/node_modules/playwright",
  "C:/git-app/AcademicResearchCopilot/node_modules/playwright",
];

const videos = [
  {
    id: "part-1-principles",
    file: "survey-cleaning-part-1-principles-ko.mp4",
    title: "1부 · 정제 기준을 사람마다 다르게 두지 않는 이유",
    narration: "설문 데이터 정제는 담당자의 숙련도나 개인 판단에 따라 결과가 달라져서는 안 됩니다. 같은 질문지와 같은 응답자료라면 누가 작업해도 같은 기준으로 같은 후보를 찾아야 합니다. CLEANING은 설문 메타에 적힌 코드, 범위, 결측, 분기 조건을 규칙으로 고정합니다. 먼저 원응답 보존 정책을 선택하고, 합성자료 오천 행과 이백 개 변수를 실제로 진단합니다. 앱은 값을 곧바로 고치지 않습니다. 어떤 응답이 어떤 규칙 때문에 검토 대상인지 원값과 함께 보여 줍니다. 연구자는 설문지와 원자료를 확인해 필요한 결정만 기록합니다. 확인하지 않은 값은 그대로 남습니다. 이번 검증에서는 구천칠백사십칠 개 규칙 신호와 사천칠백십 개 검토 후보를 찾았지만, 자동 변경은 한 건도 하지 않았습니다. 그래서 결과는 분석 가능으로 표시되지 않았습니다. 이 차단이 중요합니다. 정제 완료라는 말과 분석 준비 완료라는 말을 구분하기 때문입니다. 마지막에는 원자료와 분리된 Parquet, 갱신 메타, 감사로그, QC 보고서, 검토 워크스페이스를 남깁니다. 핵심은 자동수정이 아니라, 원자료 보존, 명시적 규칙, 재현 가능한 판단, 승인 기록을 한 흐름으로 고정하는 것입니다.",
    subtitles: [
      [0, 10, "정제 기준은 담당자에 따라 달라지면 안 됩니다"],
      [10, 22, "메타의 코드·범위·결측·분기를 규칙으로 고정"],
      [22, 35, "원응답은 자동으로 바꾸지 않습니다"],
      [35, 49, "후보마다 원값과 규칙 근거를 함께 검토"],
      [49, 64, "9,747개 신호·4,710개 후보·자동 변경 0건"],
      [64, 78, "미해결 신호는 분석 가능으로 통과시키지 않음"],
      [78, 96, "원자료 보존·명시적 규칙·재현성·승인 기록"],
    ],
    async actions(page) {
      await page.goto(appUrl, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(2200);
      await hover(page, "원본을 덮어쓰지 않습니다.", 1500);
      await fillAndDiagnose(page, "principles-demo");
      await hover(page, "진단 플래그", 1300);
      await hover(page, "원자료 확인 후보", 1300);
      await scrollTo(page, "3. 원자료 확인 후보");
      await hover(page, "Required value is missing.", 1600);
      await scrollTo(page, "4. 결과 생성");
      await page.locator("#confirm").check();
      await click(page, page.locator("#finish"));
      await page.locator("#outputs:not(.hidden)").waitFor({ timeout: 120000 });
      await scrollTo(page, "5. 결과물 다운로드");
      await hover(page, "QC 보고서 HTML", 1500);
      await hover(page, "검토 워크스페이스 HTML", 1800);
    },
  },
  {
    id: "part-2-tutorial",
    file: "survey-cleaning-part-2-tutorial-ko.mp4",
    title: "2부 · 합성자료로 따라 하는 사용법",
    narration: "이제 실제 사용 순서를 보겠습니다. 먼저 응답 CSV와 설문 메타 JSON을 함께 선택합니다. 메타에는 변수명, 라벨, 허용 코드, 범위, 결측과 분기 조건이 있어야 합니다. 기본값인 원응답 보존 정책으로 업로드하고 진단합니다. 진단이 끝나면 사례 수, 원본 열 수, 규칙 신호, 원자료 확인 후보를 먼저 봅니다. 다음에는 후보를 고치기 전에 분포를 확인합니다. 성별 변수의 빈도표는 전체 오천 명, 유효 사천구백오십삼 명, 결측 마흔일곱 명을 구분합니다. 거주 권역과의 교차표도 두 변수가 모두 유효한 사천구백십삼 명을 별도 분모로 표시합니다. 이 분모 구분이 없으면 정제 판단도 흔들립니다. 원자료 확인 후보에서는 응답 ID, 변수, 원값, 이유를 함께 봅니다. 실제 설문지나 원자료로 확인된 경우에만 결측 처리나 값 수정을 선택합니다. 확인하지 않은 후보는 원값 유지입니다. 최종 단계에서는 선택한 결정과 정책을 다시 확인합니다. 이번 합성 시연은 어떤 원값도 확정 수정하지 않고 별도 결과물을 생성합니다. 결과 화면에서 미해결 차단 신호와 분석 준비 상태를 읽습니다. 분석 준비가 거짓이면 바로 분석으로 넘기지 않습니다. 마지막으로 정제 Parquet, 갱신 메타 JSON, 변경 감사 JSON, QC 보고서 HTML, 검토 워크스페이스 HTML을 내려받습니다. 이 다섯 파일이 데이터, 기준, 결정과 검토 근거를 함께 남깁니다.",
    subtitles: [
      [0, 12, "1. 응답 CSV와 설문 메타 JSON을 함께 등록"],
      [12, 25, "2. 원응답 보존 정책으로 진단"],
      [25, 40, "3. 전체·유효·결측 분모를 구분해 확인"],
      [40, 55, "4. 교차표도 유효쌍 분모를 별도 표시"],
      [55, 70, "5. 원값·이유·규칙을 보고 필요한 결정만 기록"],
      [70, 84, "6. 확인하지 않은 후보는 원값 유지"],
      [84, 100, "7. 분석 준비 상태와 남은 차단 신호 확인"],
      [100, 120, "8. 데이터·메타·감사·QC·검토 파일 저장"],
    ],
    async actions(page) {
      await page.goto(appUrl, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1700);
      await fillAndDiagnose(page, "tutorial-demo");
      await scrollTo(page, "2-1. 기준 검토용 탐색");
      await page.locator("#explore-variable").selectOption("D02");
      await click(page, page.locator("#show-frequency"));
      await page.locator("#exploration-summary").filter({ hasText: "전체 5000명" }).waitFor({ timeout: 30000 });
      await hover(page, "남성", 1200);
      await hover(page, "여성", 1200);
      await page.locator("#cross-variable").selectOption("D03");
      await click(page, page.locator("#show-crosstab"));
      await page.locator("#exploration-summary").filter({ hasText: "두 변수 모두 유효 4913명" }).waitFor({ timeout: 30000 });
      await page.waitForTimeout(2200);
      await scrollTo(page, "3. 원자료 확인 후보");
      await hover(page, "원값 유지", 1500);
      await scrollTo(page, "4. 결과 생성");
      await page.locator("#confirm").check();
      await click(page, page.locator("#finish"));
      await page.locator("#outputs:not(.hidden)").waitFor({ timeout: 120000 });
      await scrollTo(page, "5. 결과물 다운로드");
      await page.waitForTimeout(2600);
    },
  },
];

const cursorInit = `(() => {const d=document.createElement('div');d.id='__demo_cursor';Object.assign(d.style,{position:'fixed',width:'22px',height:'22px',borderRadius:'50%',border:'2px solid #0ea5e9',background:'#0ea5e938',left:'0',top:'0',transform:'translate(-50%,-50%)',pointerEvents:'none',zIndex:'2147483647',boxShadow:'0 0 0 4px #0ea5e920'});const a=()=>document.body&&!document.getElementById('__demo_cursor')&&document.body.appendChild(d);document.readyState==='loading'?document.addEventListener('DOMContentLoaded',a):a();window.addEventListener('mousemove',e=>{d.style.left=e.clientX+'px';d.style.top=e.clientY+'px'});window.__demoRipple=(x,y)=>{const r=document.createElement('div');Object.assign(r.style,{position:'fixed',left:x+'px',top:y+'px',width:'20px',height:'20px',borderRadius:'50%',transform:'translate(-50%,-50%)',border:'3px solid #0ea5e9aa',pointerEvents:'none',zIndex:'2147483646',animation:'__r .55s ease-out forwards'});document.body.appendChild(r);setTimeout(()=>r.remove(),650)};const s=document.createElement('style');s.textContent='@keyframes __r{to{opacity:0;width:76px;height:76px}}';document.head.appendChild(s)})();`;

function resolvePlaywright() { for (const candidate of playwrightCandidates) { try { return createRequire(path.join(candidate, "package.json"))("playwright"); } catch {} } return require("playwright"); }
function run(command, args, options={}) { const r=spawnSync(command,args,{cwd:root,encoding:"utf8",shell:false,...options}); if(r.status!==0) throw new Error(`${command} ${args.join(" ")}\n${r.stdout}\n${r.stderr}`); return r.stdout; }
function capture(command,args){return run(command,args).trim();}
function duration(file){return Number.parseFloat(capture("ffprobe",["-v","error","-show_entries","format=duration","-of","default=nw=1:nk=1",file]));}
function ts(s){const h=Math.floor(s/3600),m=Math.floor((s%3600)/60),x=Math.floor(s%60),cs=Math.floor((s-Math.floor(s))*100);return `${h}:${String(m).padStart(2,"0")}:${String(x).padStart(2,"0")}.${String(cs).padStart(2,"0")}`;}
function ass(text){return text.replaceAll("\\","\\\\").replaceAll("{","\\{").replaceAll("}","\\}");}
function filterPath(file){return path.relative(root,file).replaceAll("\\","/");}
async function hover(page,text,pause=900){const l=page.getByText(text,{exact:false}).first();if(!await l.count())return;const b=await l.boundingBox();if(!b)return;await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:20});await page.waitForTimeout(pause);}
async function click(page,l){const b=await l.boundingBox();if(b){const x=b.x+b.width/2,y=b.y+b.height/2;await page.mouse.move(x,y,{steps:20});await page.evaluate(([a,b])=>window.__demoRipple?.(a,b),[x,y]);}await l.click();}
async function scrollTo(page,text){const l=page.getByText(text,{exact:false}).first();await l.scrollIntoViewIfNeeded();await page.waitForTimeout(1100);}
async function fillAndDiagnose(page,project){await page.locator("#token").fill(demoToken);await page.locator("#project").fill(project);await page.locator("#csv").setInputFiles(csvPath);await page.locator("#metadata").setInputFiles(metadataPath);await page.locator("#policy").selectOption("response_preserving");await click(page,page.locator("#start"));await page.locator("#summary:not(.hidden)").waitFor({timeout:120000});await page.waitForTimeout(2400);}
async function waitHealth(){for(let i=0;i<80;i++){try{if((await fetch(`${appUrl}health`)).ok)return;}catch{}await new Promise(r=>setTimeout(r,250));}throw new Error("Local CLEANING server did not start");}
async function makeNarration(video){const dir=path.join(outRoot,"narration");await mkdir(dir,{recursive:true});const txt=path.join(dir,`${video.id}.txt`),wav=path.join(dir,`${video.id}.wav`);await writeFile(txt,video.narration,"utf8");run("node",[path.join(root,"scripts","synthesize-speech.mjs"),"--input",txt,"--output",wav],{env:{...process.env,PR_STUDIO_TTS_PROVIDER:"google",GOOGLE_APPLICATION_CREDENTIALS:process.env.GOOGLE_APPLICATION_CREDENTIALS??"C:/secure/pr-studio-google-tts.json",GOOGLE_TTS_VOICE_KO:process.env.GOOGLE_TTS_VOICE_KO??"ko-KR-Chirp3-HD-Kore",GOOGLE_TTS_SPEAKING_RATE:process.env.GOOGLE_TTS_SPEAKING_RATE??"0.94"}});return wav;}
async function makeSubs(video,file,audioDuration){const lines=video.subtitles.map(([start,end,text])=>`Dialogue: 0,${ts(start)},${ts(Math.min(end,audioDuration+1))},Caption,,0,0,0,,${ass(text)}`);await writeFile(file,["[Script Info]","ScriptType: v4.00+","PlayResX: 1920","PlayResY: 1080","","[V4+ Styles]","Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding","Style: Caption,Noto Sans CJK KR,48,&H00FFFFFF,&H00FFFFFF,&H7A000000,&H9A000000,-1,0,0,0,100,100,0,0,1,2,0,2,120,120,72,1","","[Events]","Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",...lines,""].join("\n"),"utf8");}

async function render(playwright,video){const rawDir=path.join(outRoot,"raw",video.id);await mkdir(rawDir,{recursive:true});const wav=await makeNarration(video);const browser=await playwright.chromium.launch({headless:true,executablePath:"C:/Program Files/Google/Chrome/Application/chrome.exe",args:["--window-size=1920,1080"]});const context=await browser.newContext({viewport:{width:1920,height:1080},recordVideo:{dir:rawDir,size:{width:1920,height:1080}}});await context.addInitScript(cursorInit);const page=await context.newPage();const rawPromise=page.video().path();await video.actions(page);await context.close();await browser.close();const raw=await rawPromise;const audioDuration=duration(wav),pad=Math.max(0,audioDuration+1.3-duration(raw)),extended=path.join(rawDir,"extended.mp4");run("ffmpeg",["-y","-loglevel","error","-i",raw,"-vf",pad>0.2?`tpad=stop_mode=clone:stop_duration=${pad.toFixed(2)}`:"null","-an","-c:v","libx264","-pix_fmt","yuv420p",extended]);const noSubs=path.join(rawDir,"no-subs.mp4"),assFile=path.join(rawDir,"captions.ass"),final=path.join(outRoot,video.file);await makeSubs(video,assFile,audioDuration);run("ffmpeg",["-y","-loglevel","error","-i",extended,"-i",wav,"-map","0:v:0","-map","1:a:0","-c:v","libx264","-pix_fmt","yuv420p","-c:a","aac","-b:a","192k","-shortest",noSubs]);run("ffmpeg",["-y","-loglevel","error","-i",noSubs,"-vf",`subtitles=${filterPath(assFile)}`,"-c:v","libx264","-pix_fmt","yuv420p","-c:a","copy","-movflags","+faststart",final]);const sample=path.join(outRoot,`${video.id}-sample.png`);run("ffmpeg",["-y","-loglevel","error","-ss",String(Math.max(2,duration(final)*0.65)),"-i",final,"-frames:v","1",sample]);run("ffmpeg",["-v","error","-i",final,"-f","null","-"]);return {title:video.title,final,sample,probe:JSON.parse(capture("ffprobe",["-v","error","-show_entries","stream=codec_name,width,height,sample_rate,channels:format=duration,size","-of","json",final]))};}

async function main(){await rm(outRoot,{recursive:true,force:true});await mkdir(path.join(outRoot,"server"),{recursive:true});const server=spawn(process.execPath,[path.join(cleaningRoot,"src","http-server.mjs")],{cwd:cleaningRoot,windowsHide:true,env:{...process.env,PORT:"8824",CLEANING_BIND_HOST:"127.0.0.1",CI_RESEARCH_HUB_MCP_TOKEN:demoToken,CLEANING_JOB_ROOT:path.join(outRoot,"server","jobs"),CLEANING_ARTIFACT_ROOT:path.join(outRoot,"server","artifacts")},stdio:["ignore","pipe","pipe"]});let stderr="";server.stderr.on("data",d=>stderr+=d);try{await waitHealth();const playwright=resolvePlaywright(),results=[];for(const video of videos)results.push(await render(playwright,video));console.log(JSON.stringify({appUrl,results},null,2));}finally{server.kill();if(server.exitCode&&server.exitCode!==0)console.error(stderr);}}
main().catch(error=>{console.error(error);process.exit(1)});
