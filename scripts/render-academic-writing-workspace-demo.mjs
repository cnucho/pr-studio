import fs from "node:fs";
import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const ffmpeg = require("ffmpeg-static");
const ffprobe = require("ffprobe-static").path;
const outRoot = path.join(root, "out", "academic-writing-workspace-demo");
const workRoot = path.join(outRoot, "work");
const slidesDir = path.join(workRoot, "slides");
const narrationDir = path.join(workRoot, "narration");
const audioDir = path.join(workRoot, "audio");
const clipsDir = path.join(workRoot, "clips");
const currentFile = path.join(outRoot, "academic-writing-workspace-introduction-current.mp4");
const previousFile = path.join(outRoot, "academic-writing-workspace-introduction-previous.mp4");
const candidateFile = path.join(workRoot, "academic-writing-workspace-introduction-candidate.mp4");
const reuseAudio = process.env.PR_STUDIO_REUSE_ACADEMIC_WRITING_AUDIO === "true";

const scenes = [
  {
    id: "01-not-translation",
    kicker: "영어 논문의 진짜 어려움",
    title: "영어 논문은 번역만 잘한다고 완성되지 않습니다",
    subtitle: "논리 전개, 개념화, 용어, 문장, 근거, 참고문헌과 저널 형식을 동시에 맞춰야 합니다.",
    cards: ["논리와 개념", "영문 용어와 문장", "근거와 참고문헌", "저널 형식"],
    narration: "영어 논문을 쓰는 일은 한국어 문장을 영어로 바꾸는 것보다 훨씬 복잡합니다. 논리 전개와 개념화가 분명해야 하고, 같은 개념에는 같은 용어를 써야 합니다. 문장은 자연스러워야 하며, 주장에는 근거가 연결되어야 합니다. 참고문헌과 저널 형식도 정확해야 합니다.",
    caption: "영어 논문 작성은 내용과 형식을 함께 관리하는 작업입니다.",
  },
  {
    id: "02-chat-limits",
    kicker: "대화창만으로 작업할 때",
    title: "AI는 문장을 잘 쓰지만, 긴 작업의 합의를 계속 기억하기는 어렵습니다",
    subtitle: "수정을 거듭하면 용어 선택, 논리 순서, 사용한 근거와 저널 규칙이 여러 대화에 흩어집니다.",
    beforeAfter: [
      ["첫 초안", "좋은 영문 문장"],
      ["반복 수정", "용어와 근거가 흔들림"],
      ["마지막 정리", "참고문헌과 형식을 다시 확인"],
    ],
    narration: "대화창의 AI는 초안을 만들고 문장을 다듬는 데 매우 유용합니다. 그러나 논문을 여러 차례 수정하면 문제가 생깁니다. 앞에서 합의한 용어와 논리 순서가 흔들리고, 어떤 근거를 사용했는지 다시 찾아야 합니다. 마지막에는 참고문헌과 저널 형식을 별도로 점검하게 됩니다.",
    caption: "문장 생성 능력과 장기 작업 관리는 서로 다른 문제입니다.",
  },
  {
    id: "03-content-workbench",
    kicker: "내용 작업대",
    title: "AI와 연구자는 논리와 문장에 집중하고, MCP는 합의된 맥락을 정리합니다",
    subtitle: "섹션 목적, 주장 순서, 핵심 개념, 표준 영문 용어, 연결 문헌과 초안 버전을 작업 단위로 묶습니다.",
    flow: ["섹션 목적", "논리 전개", "표준 용어", "영문 문장", "버전 보존"],
    narration: "내용 작업대에서는 먼저 이번 섹션이 무엇을 말해야 하는지 확인합니다. 그다음 주장과 근거의 순서를 논의하고, 핵심 개념에 사용할 표준 영문 용어를 기록합니다. AI는 이 맥락을 받아 문장을 작성하고, MCP는 수정된 초안과 버전을 보존합니다. 판단과 최종 결정은 계속 연구자가 합니다.",
    caption: "내용 작업대: 논리, 개념, 용어, 문장과 버전",
  },
  {
    id: "04-evidence-ledger",
    kicker: "문헌과 근거",
    title: "문헌은 Evidence Ledger와 연결해 출처와 참고문헌 정보를 함께 관리합니다",
    subtitle: "검색 결과를 그대로 믿는 대신 출처 식별자, 연구자 메모, 근거 연결과 씨에스엘 메타데이터를 남깁니다.",
    ledger: [
      ["SOURCE", "원문과 출처 식별"],
      ["EVIDENCE", "주장과 근거 연결"],
      ["CSL", "저자·연도·저널·디지털 객체 식별자"],
      ["WRITING", "필요한 섹션으로 전달"],
    ],
    narration: "문헌 수집과 근거 관리는 에비던스 레저를 활용합니다. 원문과 출처를 식별하고, 연구자 메모와 주장에 연결합니다. 저자, 연도, 저널명, 디지털 객체 식별자 같은 씨에스엘 메타데이터도 함께 보존합니다. 이렇게 정리된 문헌만 필요한 글쓰기 작업으로 전달합니다.",
    caption: "문헌의 내용과 참고문헌 메타데이터를 같은 출처에 연결합니다.",
  },
  {
    id: "05-format-workbench",
    kicker: "형식 작업대",
    title: "에이피에이를 기본으로, 목표 저널의 공식 지침을 확인해 형식을 바꿉니다",
    subtitle: "저널명을 입력하면 스타일 후보를 찾고, 공식 저자 지침과 정확한 씨에스엘 스타일이 확인된 경우에만 적용합니다.",
    format: {
      journal: "Academy of Management Review",
      style: "academy-of-management-review",
      checks: ["공식 Author Guidelines", "정확한 CSL 스타일", "논문 유형과 분량", "표·그림·참고문헌 규칙"],
    },
    narration: "형식 작업대는 에이피에이를 기본값으로 사용합니다. 목표 저널명을 입력하면 관련 스타일 후보를 찾습니다. 하지만 이름이 비슷하다는 이유로 자동 적용하지는 않습니다. 공식 저자 지침과 정확한 씨에스엘 스타일을 확인한 뒤, 논문 유형과 분량, 표와 그림, 참고문헌 규칙을 프로젝트 형식으로 기록합니다.",
    caption: "APA 기본값 + 공식 지침이 확인된 저널별 형식",
  },
  {
    id: "06-citations",
    kicker: "참고문헌 자동 정리",
    title: "같은 문헌 메타데이터를 APA 또는 저널 스타일로 일관되게 렌더링합니다",
    subtitle: "형식 엔진이 인용과 참고문헌을 만들고, 빠진 저자·연도·저널·DOI 정보는 임의로 채우지 않고 알려줍니다.",
    citation: {
      inText: "(Smith, 2024)",
      reference: "Smith, J. (2024). Testing institutional trust. Journal of Trust, 3(2), 10–20. https://doi.org/10.1234/example",
    },
    narration: "참고문헌은 AI가 눈대중으로 문장처럼 만드는 방식이 아닙니다. 저장된 씨에스엘 메타데이터를 형식 엔진이 에이피에이 또는 선택한 저널 스타일로 렌더링합니다. 저자나 연도, 저널명, 디지털 객체 식별자 정보가 빠졌다면 임의로 채우지 않고 확인할 항목으로 돌려줍니다.",
    caption: "참고문헌은 생성이 아니라 메타데이터 기반 렌더링입니다.",
  },
  {
    id: "07-companions",
    kicker: "차트와 다이어그램",
    title: "논문에 필요한 시각자료도 같은 대화 흐름에서 연결할 수 있습니다",
    subtitle: "Chart Studio와 Diagram Studio가 편집 가능한 산출물을 만들고, 연구자가 수정한 결과를 다시 대화창에 전달합니다.",
    tools: [
      ["CHART STUDIO", "데이터 기반 차트\n스타일 프리셋과 편집"],
      ["DIAGRAM STUDIO", "논리·개념·과정 도식\n노드와 연결 편집"],
      ["ACADEMIC WRITING", "캡션·본문 연결\n초안과 형식 보존"],
    ],
    narration: "차트나 다이어그램이 필요하면 같은 대화 흐름에서 전용 엠시피를 부릅니다. 차트 스튜디오는 데이터와 스타일 프리셋을 이용해 편집 가능한 차트를 만듭니다. 다이어그램 스튜디오는 논리, 개념, 연구과정을 도식화합니다. 연구자가 수정한 결과는 다시 논문 작업으로 돌아와 캡션과 본문에 연결됩니다.",
    caption: "글, 근거, 차트와 다이어그램을 하나의 연구 흐름으로 연결합니다.",
  },
  {
    id: "08-close",
    kicker: "Academic Writing Workspace",
    title: "연구자는 연구내용에 집중하고, AI는 글을 쓰며, MCP는 작업을 잊지 않게 합니다",
    subtitle: "영어 논문 작성의 부담을 줄이되, 학술적 판단과 최종 선택은 연구자에게 남겨 둡니다.",
    roles: [
      ["RESEARCHER", "개념·논리·판단"],
      ["CONVERSATIONAL AI", "토론·영문 작성·수정"],
      ["MCP WORKSPACE", "문헌·기억·순서·버전·형식"],
    ],
    narration: "이 도구의 목적은 논문을 대신 판단하는 것이 아닙니다. 연구자는 개념과 논리, 학술적 결정을 맡습니다. 대화창의 AI는 연구자와 충분히 논의하면서 영어 문장을 작성하고 수정합니다. 엠시피 작업대는 문헌, 용어, 순서, 버전과 저널 형식을 잊지 않게 관리합니다. 영어 논문을 준비하는 연구자가 내용에 더 집중할 수 있도록 돕는 방식입니다.",
    caption: "영어 논문 작성은 더 편하게, 학술적 판단은 연구자에게",
  },
];

function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, stdio: "inherit", shell: false });
  if (result.status !== 0) throw new Error(`${command} failed with exit code ${result.status}`);
}

function capture(command, args) {
  const result = spawnSync(command, args, { cwd: root, encoding: "utf8", shell: false });
  if (result.status !== 0) throw new Error(result.stderr || `${command} failed`);
  return result.stdout.trim();
}

function duration(file) {
  return Number.parseFloat(capture(ffprobe, ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", file]));
}

function escapeHtml(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function srtTime(seconds) {
  const n = Math.round(seconds * 1000);
  return `${String(Math.floor(n / 3600000)).padStart(2, "0")}:${String(Math.floor(n / 60000) % 60).padStart(2, "0")}:${String(Math.floor(n / 1000) % 60).padStart(2, "0")},${String(n % 1000).padStart(3, "0")}`;
}

function contentHtml(scene) {
  if (scene.cards) return `<div class="quad">${scene.cards.map((x, i) => `<article><b>0${i + 1}</b><strong>${escapeHtml(x)}</strong></article>`).join("")}</div>`;
  if (scene.beforeAfter) return `<div class="steps">${scene.beforeAfter.map(([a, b], i) => `<article><small>STEP ${i + 1}</small><strong>${escapeHtml(a)}</strong><span>${escapeHtml(b)}</span></article>`).join("<i>→</i>")}</div>`;
  if (scene.flow) return `<div class="flow">${scene.flow.map((x, i) => `<article><b>${i + 1}</b><strong>${escapeHtml(x)}</strong></article>`).join("<i>›</i>")}</div>`;
  if (scene.ledger) return `<div class="ledger">${scene.ledger.map(([a, b]) => `<article><code>${escapeHtml(a)}</code><strong>${escapeHtml(b)}</strong></article>`).join("")}</div>`;
  if (scene.format) return `<div class="format"><section><small>TARGET JOURNAL</small><strong>${escapeHtml(scene.format.journal)}</strong><small>CSL STYLE</small><code>${escapeHtml(scene.format.style)}</code></section><ul>${scene.format.checks.map((x) => `<li>${escapeHtml(x)}</li>`).join("")}</ul></div>`;
  if (scene.citation) return `<div class="citation"><small>IN-TEXT CITATION</small><strong>${escapeHtml(scene.citation.inText)}</strong><small>REFERENCE</small><p>${escapeHtml(scene.citation.reference)}</p></div>`;
  if (scene.tools) return `<div class="tools">${scene.tools.map(([a, b]) => `<article><code>${escapeHtml(a)}</code><strong>${escapeHtml(b).replaceAll("\n", "<br>")}</strong></article>`).join("<i>+</i>")}</div>`;
  if (scene.roles) return `<div class="roles">${scene.roles.map(([a, b]) => `<article><code>${escapeHtml(a)}</code><strong>${escapeHtml(b)}</strong></article>`).join("")}</div>`;
  return "";
}

function sceneHtml(scene, index) {
  return `<!doctype html><html lang="ko"><meta charset="utf-8"><style>
  *{box-sizing:border-box}body{margin:0;font-family:"Malgun Gothic","Noto Sans KR",sans-serif;color:#152335}.slide{position:relative;width:1920px;height:1080px;padding:62px 82px 92px;overflow:hidden;background:radial-gradient(circle at 90% 8%,rgba(23,111,111,.18),transparent 34%),linear-gradient(145deg,#fbfaf6,#eef5f2)}.slide:before{content:"";position:absolute;left:-160px;bottom:-250px;width:650px;height:650px;border-radius:50%;background:rgba(206,115,68,.08)}.top{display:flex;align-items:center;justify-content:space-between}.brand{font-weight:900;letter-spacing:.13em;color:#176f6f;font-size:20px}.kicker{border-radius:99px;padding:11px 20px;background:#fff;border:1px solid #bdd6d1;color:#176f6f;font-weight:900;font-size:20px}h1{position:relative;margin:28px 0 12px;max-width:1700px;font-size:58px;line-height:1.17;letter-spacing:-.045em}.sub{position:relative;margin:0;max-width:1660px;color:#5b6a73;font-size:27px;line-height:1.47;font-weight:650}.quad{display:grid;grid-template-columns:repeat(4,1fr);gap:22px;margin-top:70px}.quad article,.ledger article,.roles article{min-height:215px;padding:28px;border-radius:24px;background:#fff;box-shadow:0 18px 55px rgba(31,57,58,.1);display:flex;flex-direction:column;justify-content:space-between}.quad b{font-size:20px;color:#ce7344}.quad strong,.ledger strong,.roles strong{font-size:30px;line-height:1.3}.steps,.flow,.tools{display:flex;align-items:stretch;gap:14px;margin-top:70px}.steps article,.flow article,.tools article{flex:1;min-height:225px;padding:30px;border-radius:24px;background:#fff;box-shadow:0 18px 55px rgba(31,57,58,.1);display:flex;flex-direction:column;justify-content:center;gap:18px}.steps small{color:#ce7344;font-weight:900}.steps strong,.flow strong,.tools strong{font-size:28px;line-height:1.35}.steps span{font-size:22px;color:#62717a}.steps i,.flow i,.tools i{display:flex;align-items:center;font-style:normal;color:#ce7344;font-size:44px}.flow article{align-items:center;text-align:center}.flow b{width:44px;height:44px;border-radius:50%;display:grid;place-items:center;background:#176f6f;color:#fff}.ledger{display:grid;grid-template-columns:repeat(4,1fr);gap:22px;margin-top:68px}.ledger code,.roles code,.tools code{color:#176f6f;font-size:19px;font-weight:900;letter-spacing:.08em}.format{display:grid;grid-template-columns:1.1fr .9fr;gap:30px;margin-top:62px}.format section,.format ul,.citation{margin:0;padding:36px;border-radius:24px;background:#fff;box-shadow:0 18px 55px rgba(31,57,58,.1)}.format section{display:grid;grid-template-columns:190px 1fr;gap:24px;align-items:center}.format small,.citation small{color:#176f6f;font-weight:900;letter-spacing:.08em}.format strong{font-size:28px}.format code{font-size:22px;color:#ce7344}.format ul{list-style:none;display:grid;gap:16px}.format li{font-size:24px;font-weight:750;padding-left:34px;position:relative}.format li:before{content:"✓";position:absolute;left:0;color:#176f6f}.citation{margin-top:62px;display:grid;grid-template-columns:220px 1fr;gap:25px;align-items:center}.citation strong{font-size:35px}.citation p{font-family:Georgia,serif;font-size:25px;line-height:1.5;margin:0}.tools article{min-height:245px}.roles{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;margin-top:66px}.caption{position:absolute;left:0;right:0;bottom:0;height:74px;background:#152335;color:#fff;display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:850}.caption small{position:absolute;right:32px;color:#b8c6ca;font-size:16px}.progress{position:absolute;left:0;top:0;height:7px;background:#ce7344;width:${((index + 1) / scenes.length) * 100}%}
  </style><main class="slide"><div class="progress"></div><div class="top"><div class="brand">CONSUMER INSIGHT · METHODIQ</div><div class="kicker">${escapeHtml(scene.kicker)}</div></div><h1>${escapeHtml(scene.title)}</h1><p class="sub">${escapeHtml(scene.subtitle)}</p>${contentHtml(scene)}<div class="caption">${escapeHtml(scene.caption)}<small>${String(index + 1).padStart(2, "0")} / ${String(scenes.length).padStart(2, "0")}</small></div></main></html>`;
}

if (process.env.PR_STUDIO_TTS_PROVIDER_KO !== "google") throw new Error("Set PR_STUDIO_TTS_PROVIDER_KO=google.");
if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON && !process.env.GOOGLE_APPLICATION_CREDENTIALS && !process.env.GOOGLE_CLOUD_ACCESS_TOKEN) throw new Error("Google TTS credentials are unavailable.");

await Promise.all([outRoot, workRoot, slidesDir, narrationDir, audioDir, clipsDir].map((dir) => mkdir(dir, { recursive: true })));
const browser = await chromium.launch({ headless: true, args: ["--font-render-hinting=none"] });
try {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  for (const [index, scene] of scenes.entries()) {
    await page.setContent(sceneHtml(scene, index), { waitUntil: "networkidle" });
    const slide = path.join(slidesDir, `${scene.id}.png`);
    const textFile = path.join(narrationDir, `${scene.id}.txt`);
    const audioFile = path.join(audioDir, `${scene.id}.wav`);
    await page.screenshot({ path: slide });
    await writeFile(textFile, `${scene.narration}\n`, "utf8");
    if (!reuseAudio || !fs.existsSync(audioFile)) {
      run("node", [path.join(root, "scripts", "synthesize-speech.mjs"), "--input", textFile, "--output", audioFile]);
    }
    scene.slide = slide;
    scene.audio = audioFile;
    scene.duration = duration(audioFile) + 1.0;
  }
  await page.close();
} finally {
  await browser.close();
}

let cursor = 0;
const concat = [];
const srt = [];
for (const [index, scene] of scenes.entries()) {
  const clip = path.join(clipsDir, `${scene.id}.mp4`);
  run(ffmpeg, ["-y", "-loglevel", "error", "-loop", "1", "-framerate", "30", "-i", scene.slide, "-i", scene.audio, "-filter_complex", "[1:a]apad=pad_dur=1.0[a]", "-map", "0:v", "-map", "[a]", "-t", scene.duration.toFixed(3), "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-tune", "stillimage", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "160k", "-ar", "24000", clip]);
  concat.push(`file '${clip.replaceAll("\\", "/")}'`);
  srt.push(String(index + 1), `${srtTime(cursor)} --> ${srtTime(cursor + scene.duration)}`, scene.caption, "");
  cursor += scene.duration;
}

const concatFile = path.join(workRoot, "concat.txt");
const subtitleFile = path.join(outRoot, "academic-writing-workspace-introduction.ko.srt");
const transcriptFile = path.join(outRoot, "academic-writing-workspace-introduction-transcript.md");
await writeFile(concatFile, `${concat.join("\n")}\n`, "utf8");
await writeFile(subtitleFile, `${srt.join("\n")}\n`, "utf8");
await writeFile(transcriptFile, `# Academic Writing Workspace 소개영상 대본\n\n${scenes.map((scene, index) => `## ${index + 1}. ${scene.title}\n\n${scene.narration}\n`).join("\n")}\n`, "utf8");
run(ffmpeg, ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", concatFile, "-c", "copy", "-movflags", "+faststart", candidateFile]);

const videoProbe = JSON.parse(capture(ffprobe, ["-v", "error", "-show_entries", "stream=codec_name,width,height,r_frame_rate,sample_rate,channels:format=duration,size", "-of", "json", candidateFile]));
const videoStream = videoProbe.streams.find((stream) => stream.codec_name === "h264");
const audioStream = videoProbe.streams.find((stream) => stream.codec_name === "aac");
if (!videoStream || videoStream.width !== 1920 || videoStream.height !== 1080 || !audioStream) throw new Error("Rendered media failed stream verification.");

if (fs.existsSync(currentFile)) await copyFile(currentFile, previousFile);
await copyFile(candidateFile, currentFile);
fs.rmSync(candidateFile);
const sampleFrame = path.join(outRoot, "academic-writing-workspace-introduction-sample.png");
run(ffmpeg, ["-y", "-loglevel", "error", "-ss", Math.max(1, cursor * 0.58).toFixed(2), "-i", currentFile, "-frames:v", "1", sampleFrame]);

const youtube = {
  title: "영어 논문, 문장보다 더 어려운 것들 | Academic Writing Workspace",
  description: "영어 논문 작성은 번역만의 문제가 아닙니다. 논리 전개, 개념화, 용어 일관성, 근거와 문헌, APA 참고문헌, 목표 저널 형식을 함께 관리해야 합니다. Academic Writing Workspace는 대화창의 AI가 연구자와 논의하고 영문을 작성하는 동안 MCP가 문헌, 용어, 순서, 버전과 형식을 정리합니다. Evidence Ledger, Chart Studio, Diagram Studio와의 연결 방식도 소개합니다.",
  tags: ["academic writing", "English manuscript", "APA style", "reference management", "MCP", "MethodIQ"],
};
const report = {
  renderedAt: new Date().toISOString(),
  narrationProvider: "google",
  voice: process.env.GOOGLE_TTS_VOICE_KO ?? "ko-KR-Chirp3-HD-Charon",
  speakingRate: Number(process.env.GOOGLE_TTS_SPEAKING_RATE ?? 0.94),
  resolution: "1920x1080",
  fps: 30,
  durationSeconds: duration(currentFile),
  bytes: fs.statSync(currentFile).size,
  sha256: createHash("sha256").update(await readFile(currentFile)).digest("hex"),
  video: currentFile,
  subtitle: subtitleFile,
  transcript: transcriptFile,
  sampleFrame,
  probe: videoProbe,
  youtube,
};
await writeFile(path.join(outRoot, "render-report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
await writeFile(path.join(outRoot, "youtube-metadata.json"), `${JSON.stringify(youtube, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));
