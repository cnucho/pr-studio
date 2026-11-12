import fsp from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { chromium } from "playwright";

const root = path.resolve(".");
const out = path.join(root, "out", "methodiq-analysis-studio");
const narrationDir = path.join(out, "narration");
const audioDir = path.join(out, "audio");
const appUrl = process.env.ANALYSIS_DEMO_APP_URL ?? "http://127.0.0.1:18814/";
const sampleSav = path.join(out, "synthetic-survey.sav");
const scenes = [
  { id: "01", caption: "MethodIQ Analysis Studio | 조사 연구자의 분석 작업", narration: "MethodIQ Analysis Studio는 조사 연구자와 정책 평가 담당자가 SPSS 자료를 올리고, 클라이언트 질문에 맞는 분석을 실행하는 앱입니다.", action: async () => {} },
  { id: "02", caption: "가상 응답자 120명의 SPSS 파일 업로드", narration: "지금은 가상 응답자 백이십 명의 SPSS 파일을 사용합니다. 앱이 변수 라벨과 응답값 라벨을 읽어 분석 준비 상태를 보여 줍니다.", action: async (page) => { await page.locator("#spss-file").setInputFiles(sampleSav); await page.getByText("synthetic-survey.sav · 120행 · 4개 변수").waitFor({ timeout: 30000 }); await page.locator("#file-summary").scrollIntoViewIfNeeded(); } },
  { id: "03", caption: "질문: 만족도는 충성도 점수와 관련이 있는가?", narration: "클라이언트 질문을 자연어로 적습니다. 어떤 요인이 결과와 관련되는지 선택하고, 앱이 추천한 변수 역할을 연구자가 다시 확인합니다.", action: async (page) => { await page.locator("#research-question").fill("만족도는 충성도 점수와 관련이 있는가?"); await page.locator("#analysis-task").selectOption("regression"); await page.locator("#outcome-column").selectOption("loyalty"); await page.locator("#feature-columns").selectOption(["satisfaction"]); await page.locator("#question-box").scrollIntoViewIfNeeded(); } },
  { id: "04", caption: "충성도=결과 · 만족도=설명변수 · 역할 확인", narration: "충성도를 결과변수, 만족도를 설명변수로 정했습니다. 질문과 분석법, 변수 역할을 확인한 뒤 실행합니다.", action: async (page) => { await page.locator("#analysis-confirm").check(); await page.getByRole("button", { name: "내 데이터 분석 실행" }).click(); await page.getByText("분석과 검증이 완료되었습니다.").waitFor({ timeout: 30000 }); await page.locator("#results").scrollIntoViewIfNeeded(); } },
  { id: "05", caption: "실제 계산 결과: R² 0.091 · 검증 WARN", narration: "합성 설문 분석의 결정계수는 영 점 공구일입니다. 검증은 주의 상태로 표시됐고, 영향 관측치와 잔차 진단을 추가로 보라고 안내합니다.", action: async (page) => { await page.locator("#results").scrollIntoViewIfNeeded(); } },
  { id: "06", caption: "AI 지시: 검증 결과를 읽고 보고서를 작성해 줘", narration: "대화창에는 이 분석의 검증 결과를 읽고, 질문에 답하는 보고서를 작성해 달라고 지시합니다. 앱의 계산 결과를 임의로 바꾸지 않는 것이 중요합니다.", action: async (page) => { await page.getByRole("button", { name: "대화창 AI에 보고서 작성 요청" }).scrollIntoViewIfNeeded(); } },
  { id: "07", caption: "로그인 후 예제 데이터로 바로 시험 가능", narration: "자체 자료가 없어도 예제 데이터로 바로 시험할 수 있습니다. 예제 데이터 버튼을 누르면 분석 종류별 가상 사례가 나옵니다.", action: async (page) => { await page.getByRole("button", { name: "예제 데이터" }).click(); await page.locator("#example-tabs").scrollIntoViewIfNeeded(); } },
  { id: "08", caption: "가상 고객 800명 · 이탈 예측 실행", narration: "일반 머신러닝에서 가상 고객 팔백 명의 이탈 예제를 실행합니다. 학습 자료와 검증 자료를 나누어 예측 성능을 계산합니다.", action: async (page) => { await page.getByRole("button", { name: "일반 머신러닝" }).click(); await page.getByRole("button", { name: "예제 분석 실행" }).click(); await page.getByText("분석과 검증이 완료되었습니다.").waitFor({ timeout: 30000 }); } },
  { id: "09", caption: "ROC-AUC 0.708 · 재현율 0.476 | 직접 체험", narration: "ROC 에이유씨는 영 점 칠공팔, 재현율은 영 점 사칠육입니다. 포털의 가상 데이터로 앱 시험하기를 눌러 로그인한 뒤 직접 실행해 보세요.", action: async (page) => { await page.locator("#results").scrollIntoViewIfNeeded(); } },
];

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: root, encoding: "utf8", shell: false, ...options });
  if (result.status !== 0) throw new Error(command + " failed: " + (result.stderr || result.stdout || "").slice(-1600));
  return (result.stdout || "").trim();
}
function duration(file) { return Number(run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", file])); }
function srtTime(sec) {
  const ms = Math.round(sec * 1000);
  const parts = [Math.floor(ms / 3600000), Math.floor(ms % 3600000 / 60000), Math.floor(ms % 60000 / 1000)];
  return parts.map((n) => String(n).padStart(2, "0")).join(":") + "," + String(ms % 1000).padStart(3, "0");
}

await fsp.mkdir(narrationDir, { recursive: true });
await fsp.mkdir(audioDir, { recursive: true });
run(process.env.ANALYSIS_PYTHON ?? "D:/Git/mcp-special-analysis-tools/.venv/Scripts/python.exe", ["docs/demo-scripts/methodiq-analysis-studio/make_synthetic_sav.py", sampleSav]);
let position = 0;
let subtitles = "";
const audioList = [];
for (const [index, scene] of scenes.entries()) {
  const input = path.join(narrationDir, scene.id + ".txt");
  const voice = path.join(audioDir, scene.id + ".wav");
  const normalized = path.join(audioDir, scene.id + "-norm.wav");
  await fsp.writeFile(input, scene.narration, "utf8");
  run("node", ["--use-system-ca", "scripts/synthesize-speech.mjs", "--input", input, "--output", voice], { env: { ...process.env, PR_STUDIO_TTS_PROVIDER: "google", GOOGLE_TTS_SPEAKING_RATE: "0.94" } });
  run("ffmpeg", ["-y", "-v", "error", "-i", voice, "-ar", "48000", "-ac", "2", "-c:a", "pcm_s16le", normalized]);
  scene.hold = Math.max(5, duration(normalized) + 1.7);
  subtitles += String(index + 1) + "\n" + srtTime(position) + " --> " + srtTime(position + scene.hold - 0.3) + "\n" + scene.caption + "\n\n";
  position += scene.hold;
  audioList.push(normalized);
}
const silence = path.join(audioDir, "silence.wav");
run("ffmpeg", ["-y", "-v", "error", "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo", "-t", "1.7", "-c:a", "pcm_s16le", silence]);
const concatList = path.join(audioDir, "concat.txt");
await fsp.writeFile(concatList, audioList.map((file) => "file '" + file.replaceAll("\\", "/") + "'\nfile '" + silence.replaceAll("\\", "/") + "'").join("\n") + "\n", "utf8");
const combinedAudio = path.join(audioDir, "narration.wav");
run("ffmpeg", ["-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", concatList, "-c:a", "pcm_s16le", combinedAudio]);
await fsp.writeFile(path.join(out, "captions.srt"), subtitles, "utf8");

const browser = await chromium.launch({ headless: true, executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", args: ["--no-sandbox"] });
const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1, recordVideo: { dir: out, size: { width: 1280, height: 720 } }, acceptDownloads: true });
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(String(error)));
await page.goto(appUrl, { waitUntil: "networkidle" });
await page.getByRole("heading", { name: "Analysis Studio" }).waitFor();
for (const scene of scenes) {
  const start = Date.now();
  await scene.action(page);
  const remaining = scene.hold * 1000 - (Date.now() - start);
  if (remaining > 0) await page.waitForTimeout(remaining);
}
const recording = await page.video().path();
await context.close();
await browser.close();
if (errors.length) throw new Error("Page errors: " + errors.join(" | "));

const output = path.join(out, "methodiq-analysis-studio-demo-ko.mp4");
run("ffmpeg", ["-y", "-v", "error", "-i", recording, "-i", combinedAudio, "-vf", "subtitles=captions.srt:force_style='FontName=Malgun Gothic,FontSize=22,PrimaryColour=&H00FFFFFF,OutlineColour=&H00322515,BorderStyle=1,Outline=2,Alignment=2,MarginV=26'", "-c:v", "libx264", "-preset", "medium", "-crf", "22", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "160k", "-shortest", output], { cwd: out });
run("ffmpeg", ["-v", "error", "-i", output, "-f", "null", "-"]);
const probe = JSON.parse(run("ffprobe", ["-v", "error", "-show_entries", "format=duration,size:stream=codec_name,width,height", "-of", "json", output]));
await fsp.writeFile(path.join(out, "render-receipt.json"), JSON.stringify({ source: appUrl, synthetic: true, scenes: scenes.map(({ id, caption, hold }) => ({ id, caption, hold })), probe, errors }, null, 2) + "\n");
console.log(JSON.stringify({ output, probe, scenes: scenes.length }));
