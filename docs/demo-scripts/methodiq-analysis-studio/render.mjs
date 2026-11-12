import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { chromium } from "playwright";

const root = path.resolve(".");
const out = path.join(root, "out", "methodiq-analysis-studio");
const narrationDir = path.join(out, "narration");
const audioDir = path.join(out, "audio");
const appUrl = process.env.ANALYSIS_DEMO_APP_URL ?? "http://127.0.0.1:18814/";
const scenes = [
  { id: "01", caption: "MethodIQ Analysis Studio | 가상자료 체험", narration: "MethodIQ Analysis Studio는 조사 연구자와 정책 평가 담당자가 인과분석, 예측, 회귀분석을 직접 실행하고 결과를 검토하는 도구입니다.", action: async () => {} },
  { id: "02", caption: "일반 머신러닝 선택", narration: "고객 이탈을 살펴보겠습니다. 일반 머신러닝을 선택하면 가상 고객 팔백 명의 질문과 분석 조건이 나타납니다.", action: async (page) => { await page.getByRole("button", { name: "일반 머신러닝" }).click(); } },
  { id: "03", caption: "가상 고객 800명 · 변수 확인", narration: "예제 데이터가 이미 준비되어 있습니다. 변수 설명을 열어 목표 변수와 예측 변수를 먼저 확인합니다.", action: async (page) => { await page.getByText("변수 설명 보기").click(); } },
  { id: "04", caption: "예제 분석 실행", narration: "예제 분석 실행을 누릅니다. 앱은 학습 자료와 검증 자료를 나누고, 실제 계산 결과를 화면에 표시합니다.", action: async (page) => { await page.getByRole("button", { name: "예제 분석 실행" }).click(); await page.getByText("분석과 검증이 완료되었습니다.").waitFor({ timeout: 30000 }); } },
  { id: "05", caption: "ROC-AUC 0.708 · 재현율 0.476", narration: "검증 결과 ROC 에이유씨는 영 점 칠공팔, 재현율은 영 점 사칠육입니다. 정확도만 보면 놓치기 쉬운 이탈 고객도 함께 확인합니다.", action: async (page) => { await page.locator("#results").scrollIntoViewIfNeeded(); } },
  { id: "06", caption: "혼동행렬과 검증 조건 검토", narration: "세부 결과를 열면 혼동행렬과 검증 조건을 볼 수 있습니다. 예측 기여도는 원인이나 정책 효과를 뜻하지 않습니다.", action: async (page) => { await page.getByText("세부 결과와 검증 보기").click(); await page.mouse.wheel(0, 340); } },
  { id: "07", caption: "지시 예: 이탈예측 후 AUC와 재현율 설명", narration: "대화형 도구에는 가상 고객 이탈 예제를 실행하고, 검증자료의 에이유씨와 재현율, 혼동행렬을 설명해 달라고 지시할 수 있습니다.", action: async (page) => { await page.mouse.wheel(0, -430); } },
  { id: "08", caption: "회귀분석도 같은 방식으로 실행", narration: "다른 질문이라면 회귀분석을 고르고 같은 방식으로 실행합니다. 실제 업무에서는 자체 CSV 파일과 변수도 선택할 수 있습니다.", action: async (page) => { await page.getByRole("button", { name: "회귀분석" }).click(); await page.getByRole("button", { name: "예제 분석 실행" }).click(); await page.getByText("분석과 검증이 완료되었습니다.").waitFor({ timeout: 30000 }); } },
  { id: "09", caption: "앱 실행하기 → 예제 데이터 → 예제 분석 실행", narration: "포털에서 앱 실행하기를 누르고 로그인한 뒤, 예제 데이터를 선택해 직접 시험해 보세요. 분석 결과는 연구 설계와 데이터 품질을 함께 검토해야 합니다.", action: async (page) => { await page.mouse.wheel(0, -700); } },
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
let position = 0;
let subtitles = "";
const audioList = [];
for (const [index, scene] of scenes.entries()) {
  const input = path.join(narrationDir, scene.id + ".txt");
  const voice = path.join(audioDir, scene.id + ".wav");
  const normalized = path.join(audioDir, scene.id + "-norm.wav");
  await fsp.writeFile(input, scene.narration, "utf8");
  if (!fs.existsSync(voice)) run("node", ["--use-system-ca", "scripts/synthesize-speech.mjs", "--input", input, "--output", voice], { env: { ...process.env, PR_STUDIO_TTS_PROVIDER: "google", GOOGLE_TTS_SPEAKING_RATE: "0.94" } });
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
