import { existsSync } from "node:fs";
import { readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");
const require = createRequire(import.meta.url);
const ffmpegPath = require("ffmpeg-static");
const ffprobePath = require("ffprobe-static").path;

const outRoot = path.join(root, "out", "academy-premium-demo");
const screenRoot = path.join(outRoot, "screens");
const audioRoot = path.join(outRoot, "audio");
const clipRoot = path.join(outRoot, "clips");
const narrationRoot = path.join(outRoot, "narration");
const materialJsonPath = path.join(outRoot, "oreum-academy-source-brief.json");
const packagePath = path.join(outRoot, "oreum-academy-premium-package.md");
const campaignVideoPath = path.join(outRoot, "oreum-academy-premium-youtube.mp4");
const workflowVideoPath = path.join(outRoot, "pr-studio-academy-workflow-demo.mp4");

const assets = {
  exterior: path.join(root, "public", "demo-assets", "academy", "academy-exterior.png"),
  consultation: path.join(root, "public", "demo-assets", "academy", "academy-consultation.png"),
  studyRoom: path.join(root, "public", "demo-assets", "academy", "academy-study-room.png"),
};

const playwrightCandidates = [
  path.join(root, "node_modules", "playwright"),
  "C:/git-app/CI Plan Builder/node_modules/playwright",
  "C:/git-app/AcademicResearchCopilot/node_modules/playwright",
];

let playwright;
for (const candidate of playwrightCandidates) {
  try {
    playwright = require(candidate);
    break;
  } catch {
    // Try the next local workspace dependency.
  }
}

if (!playwright) throw new Error("Playwright를 찾을 수 없습니다.");

const chromeCandidates = [
  process.env.CHROME_PATH,
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/usr/bin/google-chrome",
].filter(Boolean);
const chromePath = chromeCandidates.find((candidate) => existsSync(candidate));

const sourceBrief = {
  academy: {
    name: "오름입시학원",
    campaign: "새 캠퍼스 이전 오픈 프리미엄 홍보 패키지",
    location: "분당 수내역 3번 출구 앞",
    audience: ["고1·고2 내신 관리가 필요한 학부모", "고3 수능·수시 병행 전략이 필요한 학생"],
    situation:
      "기존 캠퍼스는 자습 좌석과 상담실이 부족했고, 고등부 문의가 늘어나 새 캠퍼스로 확장 이전했다.",
    promise: "성적 상승을 보장하지 않고, 성적이 막힌 이유를 진단해 다음 16주 학습 구조를 제안한다.",
  },
  fictionalStatistics: [
    { value: "87%", label: "정규반 주요 과목 1등급 이상 상승", caution: "데모용 가상 수치" },
    { value: "14p", label: "수학 집중반 모의고사 백분위 평균 상승", caution: "기간·표본 공개 필요" },
    { value: "92%", label: "주간 학습 계획 10주 이상 유지", caution: "상담 참여 학생 기준" },
    { value: "2.4x", label: "자습 좌석 확장", caution: "이전 전후 좌석 수 기준" },
  ],
  proofPolicy: [
    "성과 수치는 기간, 대상 학생 수, 과목, 제외 기준을 함께 공개한다.",
    "학생 사례는 학교명, 얼굴, 세부 신상 정보를 제거해 익명화한다.",
    "등록 유도보다 진단 상담과 적합성 판단을 먼저 제시한다.",
  ],
  keyMessages: [
    "현재 등급보다 먼저, 성적이 막힌 이유를 확인하세요.",
    "진단, 분반, 오답 루틴, 주간 리포트가 하나의 학습 흐름으로 이어집니다.",
    "수업을 많이 듣는 것보다 맞는 구조를 오래 유지하는 것이 중요합니다.",
  ],
  suppliedAssets: [
    "academy-exterior.png",
    "academy-consultation.png",
    "academy-study-room.png",
  ],
};

const campaignSlides = [
  {
    id: "campaign-01",
    type: "photo",
    image: assets.exterior,
    kicker: "FICTIONAL ACADEMY CASE",
    title: "오름입시학원 새 캠퍼스 이전 오픈",
    subtitle: "고등부 성적 관리의 흐름을 공간, 상담, 자습까지 다시 설계한 가상 홍보 사례",
    stats: [["2.4x", "자습 좌석"], ["8 rooms", "소수 정예 강의실"], ["30 min", "진단 상담"]],
    narration:
      "이 영상은 PR Studio가 만든 가상 학원 홍보 패키지입니다. 오름입시학원은 고등부 문의 증가와 자습 좌석 부족을 해결하기 위해 수내역 앞 새 캠퍼스로 이전했다는 설정입니다.",
    caption: "가상 자료 기반 프리미엄 학원 홍보 데모",
  },
  {
    id: "campaign-02",
    type: "split",
    image: assets.consultation,
    kicker: "SOURCE MATERIAL",
    title: "사용자가 앱에 넣을 만한 수준의 원자료",
    subtitle: "상황, 통계, 사진, 강조 문구, 광고 준수 메모를 한 번에 입력합니다",
    bullets: [
      "상황: 자습 좌석과 상담실 부족으로 확장 이전",
      "통계: 87%, 14p, 92%는 모두 데모용 가상 수치",
      "강조: 성적 보장보다 진단과 루틴의 신뢰를 앞세움",
    ],
    narration:
      "첫 단계는 원자료를 만드는 것입니다. 학원명, 이전 이유, 가상 통계, 사진, 강조하고 싶은 문장, 그리고 광고에서 조심해야 할 준수 메모까지 앱에 넣을 수 있는 수준으로 정리합니다.",
    caption: "입력 원자료: 상황, 사진, 통계, 강조 문구, 준수 메모",
  },
  {
    id: "campaign-03",
    type: "motion",
    kicker: "STRATEGY",
    title: "PR Studio가 먼저 잡는 것은 예쁜 문구가 아니라 구조입니다",
    subtitle: "문제 → 근거 → 시스템 → 사례 → 상담 전환",
    steps: ["문제", "근거", "시스템", "사례", "상담"],
    narration:
      "PR Studio는 자료를 바로 광고 문구로 바꾸지 않습니다. 먼저 영상의 설득 구조를 잡습니다. 문제를 보여 주고, 근거를 제시하고, 학습 시스템과 학생 사례를 거쳐 상담 전환으로 연결합니다.",
    caption: "계획: 문제 → 근거 → 시스템 → 사례 → 상담",
  },
  {
    id: "campaign-04",
    type: "photo",
    image: assets.studyRoom,
    kicker: "PROOF WITHOUT OVERCLAIM",
    title: "고급스러운 홍보는 과장보다 증빙을 보여줍니다",
    subtitle: "성과 수치는 기준과 기간을 함께 제시하고, 학생 사례는 익명화합니다",
    stats: [["87%", "가상 상승률"], ["14p", "가상 백분위"], ["92%", "루틴 유지"]],
    narration:
      "학원 홍보에서 고급스러움은 화려한 표현이 아니라 신뢰에서 나옵니다. 성과 수치는 집계 기간과 표본 기준을 함께 밝히고, 학생 사례는 개인정보를 보호한 방식으로 제시해야 합니다.",
    caption: "성과보다 중요한 것: 기준, 기간, 익명화",
  },
  {
    id: "campaign-05",
    type: "package",
    kicker: "FINAL PACKAGE",
    title: "완성 패키지는 영상 하나가 아닙니다",
    subtitle: "YouTube, Shorts, 블로그, 카카오 채널, 상담 스크립트, 준수 체크리스트까지 함께 만듭니다",
    packageItems: ["YouTube 대본", "Shorts 훅", "블로그 도입부", "상담 스크립트", "광고 준수 체크"],
    narration:
      "완성 결과물은 영상 하나로 끝나지 않습니다. 유튜브 대본, 쇼츠 훅, 블로그 도입부, 카카오 채널 메시지, 상담 스크립트, 광고 준수 체크리스트까지 하나의 패키지로 생성합니다.",
    caption: "완성물: 채널별 홍보 패키지와 준수 체크리스트",
  },
];

const workflowSlides = [
  {
    id: "workflow-01",
    type: "app",
    kicker: "STEP 1",
    title: "가상 학원 자료를 PR Studio에 입력",
    subtitle: "사진, 상황, 통계, 강조 문구, 주의사항을 하나의 브리프로 정리합니다",
    uiTitle: "Agent Brief",
    uiBody:
      "오름입시학원 새 캠퍼스 이전. 고등부 대상. 자습 좌석 2.4배, 가상 성과 87%, 수학 백분위 14p. 성적 보장 표현 금지.",
    narration:
      "이 절차 데모는 앱 사용자가 어떤 자료를 넣는지부터 보여 줍니다. 사진과 통계, 강조 문구, 광고 준수 메모를 하나의 브리프로 정리해 PR Studio에 입력합니다.",
    caption: "1단계: 원자료 입력",
  },
  {
    id: "workflow-02",
    type: "app",
    kicker: "STEP 2",
    title: "앱이 캠페인 계획을 작성",
    subtitle: "대상, 약속, 장면 순서, 증빙 기준, 채널별 산출물을 먼저 설계합니다",
    uiTitle: "Production Plan",
    uiBody:
      "문제 제기 → 새 캠퍼스 이유 → 가상 성과 → 학습 시스템 → 학생 사례 → 진단 상담 CTA",
    narration:
      "두 번째 단계에서 앱은 바로 영상을 만들지 않고 계획을 먼저 작성합니다. 어떤 순서로 설득할지, 어떤 수치를 어떻게 조심스럽게 보여 줄지, 어떤 채널별 산출물이 필요한지 정합니다.",
    caption: "2단계: 캠페인 계획 작성",
  },
  {
    id: "workflow-03",
    type: "app",
    kicker: "STEP 3",
    title: "실제 패키지 생성",
    subtitle: "유튜브 설명, 쇼츠 문안, 블로그 도입부, 상담 메시지, 준수 체크리스트를 만듭니다",
    uiTitle: "Generated Package",
    uiBody:
      "YouTube title, chapters, description, Shorts hook, Naver blog intro, Kakao message, compliance notes",
    narration:
      "세 번째 단계에서는 실제 패키지를 생성합니다. 영상 대본뿐 아니라 유튜브 제목과 챕터, 쇼츠 훅, 블로그 도입부, 카카오 채널 메시지, 준수 체크리스트가 함께 만들어집니다.",
    caption: "3단계: 채널별 홍보 패키지 생성",
  },
  {
    id: "workflow-04",
    type: "app",
    kicker: "STEP 4",
    title: "사진과 앱 화면이 들어간 데모 영상 렌더링",
    subtitle: "텍스트 슬라이드가 아니라 사진 컷, 모션 카드, 통계 패널, 실제 절차 화면을 섞습니다",
    uiTitle: "Render Queue",
    uiBody:
      "Photo inserts · Motion cards · Stats panels · Captions · MP4 verification · Download package",
    narration:
      "마지막 단계에서는 데모 영상을 렌더링합니다. 단순 텍스트 슬라이드가 아니라 사진 컷, 모션 카드, 통계 패널, 절차 화면을 섞어 제품 사용 과정 자체를 보여 줍니다.",
    caption: "4단계: 절차 자체를 데모영상으로 렌더링",
  },
];

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function imageDataUrl(file) {
  const data = readFileSync(file);
  const ext = path.extname(file).toLowerCase();
  const mime = ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : "image/png";
  return `data:${mime};base64,${data.toString("base64")}`;
}

function run(command, args) {
  const resolvedCommand =
    command === "ffmpeg" && ffmpegPath
      ? ffmpegPath
      : command === "ffprobe" && ffprobePath
        ? ffprobePath
        : command;
  const result = spawnSync(resolvedCommand, args, {
    cwd: root,
    encoding: "utf8",
    shell: false,
    windowsHide: true,
  });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")}\n${result.stdout}\n${result.stderr}`);
  }
  return result.stdout.trim();
}

function audioDuration(file) {
  return Number(
    run("ffprobe", [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      file,
    ]),
  );
}

function metadata(file) {
  return JSON.parse(
    run("ffprobe", [
      "-v",
      "error",
      "-select_streams",
      "v:0",
      "-show_entries",
      "stream=width,height:format=duration,size",
      "-of",
      "json",
      file,
    ]),
  );
}

function assTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const cs = Math.floor((seconds - Math.floor(seconds)) * 100);
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}

function assText(value) {
  return String(value).replaceAll("\\", "\\\\").replaceAll("{", "\\{").replaceAll("}", "\\}");
}

function html(slide) {
  const bullets = slide.bullets?.map((item) => `<li>${escapeHtml(item)}</li>`).join("") ?? "";
  const stats = slide.stats
    ?.map(([value, label]) => `<div class="stat"><b>${escapeHtml(value)}</b><span>${escapeHtml(label)}</span></div>`)
    .join("") ?? "";
  const steps = slide.steps
    ?.map((item, index) => `<div class="step"><em>${String(index + 1).padStart(2, "0")}</em>${escapeHtml(item)}</div>`)
    .join("") ?? "";
  const packageItems = slide.packageItems
    ?.map((item) => `<div class="pill">${escapeHtml(item)}</div>`)
    .join("") ?? "";
  const image = slide.image ? `<img class="photo" src="${imageDataUrl(slide.image)}" />` : "";
  const appPanel = slide.type === "app"
    ? `<div class="app-panel">
        <div class="app-top"><span></span><span></span><span></span><strong>PR Studio</strong></div>
        <div class="app-side"><b>AI Agent</b><b>Campaign</b><b>Render</b></div>
        <div class="app-main">
          <p>${escapeHtml(slide.uiTitle)}</p>
          <div>${escapeHtml(slide.uiBody)}</div>
          <section><i></i><i></i><i></i></section>
        </div>
      </div>`
    : "";

  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<style>
*{box-sizing:border-box}body{margin:0;width:1920px;height:1080px;overflow:hidden;font-family:"Malgun Gothic","Segoe UI",sans-serif;color:#162033;background:#f4f7f6}
.frame{position:relative;width:1920px;height:1080px;padding:72px 88px;background:linear-gradient(120deg,#f7fbff 0%,#eef4f1 52%,#fff8f0 100%)}
.grid{display:grid;grid-template-columns:1fr 760px;gap:58px;align-items:center;height:100%}
.kicker{display:inline-flex;padding:12px 18px;border-radius:999px;background:#102033;color:#fff;font-size:22px;font-weight:900}
h1{margin:28px 0 0;font-size:76px;line-height:1.06;letter-spacing:0;word-break:keep-all}
.subtitle{margin:26px 0 0;font-size:32px;line-height:1.42;font-weight:800;color:rgba(22,32,51,.68);word-break:keep-all}
ul{display:grid;gap:14px;margin:34px 0 0;padding:0;list-style:none}li{padding:18px 22px;border-radius:8px;background:rgba(255,255,255,.82);box-shadow:0 16px 38px rgba(16,32,51,.08);font-size:25px;font-weight:800;line-height:1.36}
.visual{position:relative;min-height:760px;border-radius:8px;overflow:hidden;background:#fff;box-shadow:0 26px 80px rgba(16,32,51,.16);border:1px solid rgba(16,32,51,.08)}
.photo{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;filter:saturate(1.02) contrast(1.03)}
.overlay{position:absolute;inset:auto 28px 28px 28px;padding:26px;border-radius:8px;background:rgba(255,255,255,.9);backdrop-filter:blur(12px)}
.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.stat{padding:22px;border-radius:8px;background:#fff;border:1px solid rgba(16,32,51,.1)}.stat b{display:block;color:#245ee8;font-size:46px;line-height:1}.stat span{display:block;margin-top:10px;font-size:17px;font-weight:900;color:rgba(22,32,51,.65)}
.steps{position:absolute;inset:86px 48px;display:grid;grid-template-columns:repeat(5,1fr);gap:14px;align-items:center}.step{height:300px;display:grid;place-items:center;text-align:center;border-radius:8px;background:#fff;border:1px solid rgba(16,32,51,.1);font-size:34px;font-weight:900;box-shadow:0 18px 40px rgba(16,32,51,.08)}.step em{display:block;color:#16a37d;font-size:24px;font-style:normal}
.package{position:absolute;inset:80px 60px;display:grid;grid-template-columns:1fr 1fr;gap:18px}.pill{padding:34px;border-radius:8px;background:#fff;border:1px solid rgba(16,32,51,.1);font-size:30px;font-weight:900;box-shadow:0 18px 42px rgba(16,32,51,.08)}
.app-panel{position:absolute;inset:44px;border-radius:8px;background:#fff;border:1px solid rgba(16,32,51,.12);box-shadow:0 24px 70px rgba(16,32,51,.14);overflow:hidden}.app-top{height:58px;background:#162033;color:#fff;display:flex;align-items:center;gap:10px;padding:0 22px}.app-top span{width:13px;height:13px;border-radius:50%;background:#ffcb66}.app-top span:nth-child(2){background:#ff7b72}.app-top span:nth-child(3){background:#4ad295}.app-top strong{margin-left:auto}.app-side{position:absolute;top:58px;bottom:0;left:0;width:180px;background:#f1f4f7;padding:24px;display:grid;align-content:start;gap:16px}.app-side b{padding:14px;border-radius:8px;background:#fff}.app-main{position:absolute;top:58px;left:180px;right:0;bottom:0;padding:42px}.app-main p{margin:0 0 18px;font-size:24px;font-weight:900;color:#245ee8}.app-main div{padding:28px;border-radius:8px;background:#f7faf9;font-size:27px;line-height:1.45;font-weight:800}.app-main section{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-top:28px}.app-main i{height:150px;border-radius:8px;background:linear-gradient(180deg,#245ee8,#16a37d)}
.disclaimer{position:absolute;left:88px;right:88px;bottom:36px;font-size:18px;font-weight:800;color:rgba(22,32,51,.45)}
</style>
</head>
<body>
<main class="frame">
  <section class="grid">
    <div>
      <div class="kicker">${escapeHtml(slide.kicker)}</div>
      <h1>${escapeHtml(slide.title)}</h1>
      <p class="subtitle">${escapeHtml(slide.subtitle)}</p>
      ${bullets ? `<ul>${bullets}</ul>` : ""}
    </div>
    <div class="visual">
      ${image}
      ${slide.type === "motion" ? `<div class="steps">${steps}</div>` : ""}
      ${slide.type === "package" ? `<div class="package">${packageItems}</div>` : ""}
      ${appPanel}
      ${stats ? `<div class="overlay"><div class="stats">${stats}</div></div>` : ""}
    </div>
  </section>
  <div class="disclaimer">본 학원명, 수치, 사례, 사진은 PR Studio 데모 제작을 위한 가상 설정입니다.</div>
</main>
</body>
</html>`;
}

async function ensureDirs() {
  await mkdir(screenRoot, { recursive: true });
  await mkdir(audioRoot, { recursive: true });
  await mkdir(clipRoot, { recursive: true });
  await mkdir(narrationRoot, { recursive: true });
}

async function renderScreens(slides, prefix) {
  const browser = await playwright.chromium.launch({
    headless: true,
    ...(chromePath ? { executablePath: chromePath } : {}),
    args: ["--disable-dev-shm-usage", "--font-render-hinting=none"],
  });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  try {
    for (const slide of slides) {
      await page.setContent(html(slide), { waitUntil: "load" });
      await page.screenshot({ path: path.join(screenRoot, `${prefix}-${slide.id}.png`), fullPage: false });
    }
  } finally {
    await browser.close();
  }
}

async function makeAudio(slides, prefix) {
  for (const slide of slides) {
    const textPath = path.join(narrationRoot, `${prefix}-${slide.id}.txt`);
    const wavPath = path.join(audioRoot, `${prefix}-${slide.id}.wav`);
    await writeFile(textPath, slide.narration, "utf8");
    run("powershell", [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      path.join(root, "scripts", "speak.ps1"),
      "-InputText",
      textPath,
      "-OutputWav",
      wavPath,
    ]);
    slide.audio = wavPath;
    slide.duration = audioDuration(wavPath) + 0.5;
  }
}

async function makeClip(slide, prefix) {
  const imagePath = path.join(screenRoot, `${prefix}-${slide.id}.png`);
  const clipPath = path.join(clipRoot, `${prefix}-${slide.id}.mp4`);
  const frames = Math.max(1, Math.round(slide.duration * 30));
  run("ffmpeg", [
    "-y",
    "-loglevel",
    "error",
    "-loop",
    "1",
    "-framerate",
    "30",
    "-i",
    imagePath,
    "-i",
    slide.audio,
    "-filter_complex",
    `[0:v]scale=2048:-1,zoompan=z='min(zoom+0.00055,1.035)':d=${frames}:s=1920x1080:fps=30,format=yuv420p[v];[1:a]apad=pad_dur=0.5[a]`,
    "-map",
    "[v]",
    "-map",
    "[a]",
    "-t",
    slide.duration.toFixed(3),
    "-c:v",
    "libx264",
    "-preset",
    "slow",
    "-crf",
    "16",
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    "-movflags",
    "+faststart",
    clipPath,
  ]);
  slide.video = clipPath;
}

async function subtitles(slides, prefix) {
  let cursor = 0;
  const events = [];
  const subtitlePath = path.join(outRoot, `${prefix}-subtitles.ass`);
  for (const slide of slides) {
    events.push(`Dialogue: 0,${assTime(cursor + 0.18)},${assTime(cursor + slide.duration - 0.12)},Caption,,0,0,0,,${assText(slide.caption)}`);
    cursor += slide.duration;
  }
  await writeFile(
    subtitlePath,
    `[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Caption,Malgun Gothic,42,&H00FFFFFF,&H00FFFFFF,&H66102033,&HD0102033,-1,0,0,0,100,100,0,0,3,16,0,2,120,120,52,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
${events.join("\n")}
`,
    "utf8",
  );
  return subtitlePath;
}

async function concat(slides, prefix, outputPath) {
  const concatPath = path.join(outRoot, `${prefix}-concat.txt`);
  await writeFile(
    concatPath,
    `${slides.map((slide) => `file '${slide.video.replaceAll("\\", "/").replaceAll("'", "'\\''")}'`).join("\n")}\n`,
    "utf8",
  );
  const draftPath = path.join(outRoot, `${prefix}-draft.mp4`);
  run("ffmpeg", ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", concatPath, "-c", "copy", draftPath]);
  const subtitlePath = (await subtitles(slides, prefix)).replaceAll("\\", "/").replaceAll(":", "\\:");
  run("ffmpeg", [
    "-y",
    "-loglevel",
    "error",
    "-i",
    draftPath,
    "-vf",
    `ass='${subtitlePath}'`,
    "-c:v",
    "libx264",
    "-preset",
    "slow",
    "-crf",
    "16",
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    "-movflags",
    "+faststart",
    outputPath,
  ]);
}

async function render(slides, prefix, outputPath) {
  await renderScreens(slides, prefix);
  await makeAudio(slides, prefix);
  for (const slide of slides) await makeClip(slide, prefix);
  await concat(slides, prefix, outputPath);
}

async function writeMaterials() {
  await writeFile(materialJsonPath, `${JSON.stringify(sourceBrief, null, 2)}\n`, "utf8");
  await writeFile(
    packagePath,
    `# 오름입시학원 프리미엄 데모 패키지

> 본 학원명, 수치, 사례, 사진은 PR Studio 데모 제작을 위한 가상 설정입니다.

## 1. 사용자가 앱에 넣은 원자료

- 학원: ${sourceBrief.academy.name}
- 상황: ${sourceBrief.academy.situation}
- 대상: ${sourceBrief.academy.audience.join(", ")}
- 핵심 약속: ${sourceBrief.academy.promise}
- 사진 자료: \`public/demo-assets/academy/academy-exterior.png\`, \`academy-consultation.png\`, \`academy-study-room.png\`

## 2. 앱이 작성한 캠페인 계획

1. 문제 제기: 열심히 해도 성적이 막히는 이유를 보여준다.
2. 근거 제시: 가상 통계는 기준과 주의 문구를 붙여 신뢰형 메시지로 사용한다.
3. 시스템 설명: 진단, 분반, 오답 루틴, 주간 리포트의 흐름을 보여준다.
4. 상황 증명: 새 캠퍼스의 자습, 질문, 상담 동선을 사진 컷으로 보여준다.
5. 전환: 현재 등급보다 먼저 막힌 이유를 확인하라는 진단 상담 CTA로 마무리한다.

## 3. 완성 산출물

- YouTube 영상: \`out/academy-premium-demo/oreum-academy-premium-youtube.mp4\`
- 앱 사용 절차 데모: \`out/academy-premium-demo/pr-studio-academy-workflow-demo.mp4\`
- 원자료 JSON: \`out/academy-premium-demo/oreum-academy-source-brief.json\`

## 4. 채널별 문안

### YouTube 제목

성적이 오르는 학원은 무엇이 다를까요? | 오름입시학원 새 캠퍼스 이전 오픈

### YouTube 설명

오름입시학원이 수내역 앞 새 캠퍼스로 이전했다는 가상 설정의 홍보 영상입니다. 이 영상은 성적 상승을 보장하기보다, 학생의 현재 위치를 진단하고 16주 학습 구조를 설계하는 과정을 보여 줍니다. 모든 수치와 사례는 데모용이며 실제 광고 전에는 기준과 증빙 자료가 필요합니다.

### Shorts 훅

학원을 옮겼는데 문의가 더 늘어난 이유: 공간이 아니라 공부 흐름을 바꿨기 때문입니다.

### 블로그 도입부

고등학생 학부모가 학원을 선택할 때 궁금한 것은 단순한 합격 실적이 아닙니다. 우리 아이가 왜 점수가 막혔는지, 지금 필요한 수업은 무엇인지, 그리고 그 과정을 얼마나 꾸준히 관리하는지가 더 중요합니다.

### 카카오 채널 메시지

[오름입시학원 새 캠퍼스 이전 오픈] 현재 등급보다 먼저, 성적이 막힌 이유를 확인하세요. 고1·고2 내신 습관 진단과 고3 수능·수시 병행 전략 상담을 예약제로 진행합니다.

## 5. 준수 체크리스트

${sourceBrief.proofPolicy.map((item) => `- ${item}`).join("\n")}
`,
    "utf8",
  );
}

await ensureDirs();
await writeMaterials();
await render(campaignSlides, "campaign", campaignVideoPath);
await render(workflowSlides, "workflow", workflowVideoPath);

console.log(JSON.stringify({
  sourceBrief: materialJsonPath,
  package: packagePath,
  campaignVideo: {
    path: campaignVideoPath,
    metadata: metadata(campaignVideoPath),
  },
  workflowVideo: {
    path: workflowVideoPath,
    metadata: metadata(workflowVideoPath),
  },
}, null, 2));
