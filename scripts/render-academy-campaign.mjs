import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");
const require = createRequire(import.meta.url);

const campaignRoot = path.join(root, "out", "academy-demo");
const screenRoot = path.join(campaignRoot, "screens");
const audioRoot = path.join(campaignRoot, "audio");
const clipRoot = path.join(campaignRoot, "clips");
const narrationRoot = path.join(campaignRoot, "narration");
const youtubePath = path.join(campaignRoot, "oreum-academy-youtube.mp4");
const shortPath = path.join(campaignRoot, "oreum-academy-short.mp4");
const packagePath = path.join(campaignRoot, "oreum-academy-campaign-package.md");
const thumbnailPath = path.join(campaignRoot, "oreum-academy-youtube-thumbnail.png");
const shortCoverPath = path.join(campaignRoot, "oreum-academy-short-cover.png");

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

if (!playwright) {
  throw new Error("Playwright를 찾을 수 없습니다.");
}

const chromePath = "C:/Program Files/Google/Chrome/Application/chrome.exe";

const academy = {
  nameKo: "오름입시학원",
  nameEn: "Oreum Academy",
  location: "분당 수내역 3번 출구 앞 새 캠퍼스",
  campaign: "새 캠퍼스 이전 오픈",
  disclaimer: "본 영상의 학원명, 수치, 사례는 데모 제작을 위한 가상 설정입니다.",
};

const youtubeSlides = [
  {
    id: "yt-01-open",
    kicker: "FICTIONAL ACADEMY DEMO",
    title: "성적이 오르는 학원은 무엇이 다를까요?",
    subtitle: "오름입시학원 새 캠퍼스 이전 오픈",
    bullets: ["고등부 내신·수능 집중", "1:1 진단 기반 학습 설계", "수내역 앞 확장 이전"],
    stats: [
      ["Demo", "가상 사례"],
      ["16 weeks", "성장 루틴"],
      ["New", "집중 캠퍼스"],
    ],
    narration:
      "성적이 오르는 학원은 무엇이 다를까요. 오름입시학원은 더 넓고 조용한 새 캠퍼스로 이전하며, 고등학생에게 필요한 진단, 수업, 피드백, 자습 관리의 흐름을 다시 설계했습니다. 이 영상은 가상의 학원 홍보 데모입니다.",
    caption: "오름입시학원 새 캠퍼스 이전 오픈",
  },
  {
    id: "yt-02-problem",
    kicker: "WHY MOVE",
    title: "이전한 이유는 단순히 공간이 아닙니다",
    subtitle: "상담 대기, 자습 좌석, 레벨별 분반을 동시에 해결하기 위한 결정",
    bullets: [
      "기존 공간은 고등부 자습 좌석이 부족했습니다.",
      "학생별 피드백 상담을 더 자주 운영할 필요가 있었습니다.",
      "학년·등급·목표 전형별 수업을 분리하기 위해 캠퍼스를 확장했습니다.",
    ],
    stats: [
      ["2.4x", "자습 좌석"],
      ["8 rooms", "소수 정예 강의실"],
      ["1:1", "주간 피드백"],
    ],
    narration:
      "오름입시학원이 이전한 이유는 단순히 더 큰 공간이 필요해서가 아닙니다. 고등부 학생은 수업만 듣는다고 성적이 오르지 않습니다. 진단하고, 틀린 이유를 찾고, 다시 풀고, 다음 시험 전략을 조정하는 시간이 필요합니다. 새 캠퍼스는 이 과정을 더 안정적으로 운영하기 위한 공간입니다.",
    caption: "이전 이유: 자습, 상담, 분반을 제대로 운영하기 위해",
  },
  {
    id: "yt-03-performance",
    kicker: "DEMO PERFORMANCE",
    title: "가상 내부 지표로 보는 오름의 성과",
    subtitle: "실제 광고 전에는 반드시 증빙 자료와 기준 공개가 필요합니다",
    bullets: [
      "고2·고3 정규반 87%가 한 학기 안에 주요 과목 1등급 이상 상승",
      "수학 집중반 평균 모의고사 백분위 14p 상승",
      "상담 참여 학생 92%가 주간 학습 계획을 10주 이상 유지",
    ],
    stats: [
      ["87%", "1등급 이상 상승"],
      ["14p", "백분위 상승"],
      ["92%", "루틴 유지"],
    ],
    narration:
      "가상의 내부 지표를 예로 들면, 고등부 정규반 학생의 팔십칠 퍼센트가 한 학기 안에 주요 과목에서 한 등급 이상 상승했습니다. 수학 집중반은 모의고사 백분위가 평균 십사 포인트 올랐고, 상담에 꾸준히 참여한 학생의 대부분은 주간 학습 계획을 유지했습니다. 실제 광고라면 이 수치의 기준과 증빙을 함께 공개해야 합니다.",
    caption: "가상 실적: 87% 1등급 이상 상승, 수학 백분위 14p 상승",
  },
  {
    id: "yt-04-system",
    kicker: "OREUM SYSTEM",
    title: "수업보다 먼저 보는 것은 학생의 현재 위치입니다",
    subtitle: "진단 → 분반 → 오답 루틴 → 주간 리포트",
    bullets: [
      "입학 진단으로 과목별 약점과 시험 습관을 파악합니다.",
      "레벨별 소수 정예 수업으로 과제 난이도를 조절합니다.",
      "매주 오답 원인과 다음 주 학습량을 학부모에게 공유합니다.",
    ],
    stats: [
      ["01", "진단"],
      ["02", "분반"],
      ["03", "피드백"],
    ],
    narration:
      "오름의 핵심은 수업보다 먼저 학생의 현재 위치를 보는 것입니다. 입학 진단으로 약점과 시험 습관을 확인하고, 레벨별 소수 정예 수업으로 과제 난이도를 조절합니다. 그리고 매주 오답 원인과 다음 주 학습량을 리포트로 공유합니다.",
    caption: "진단 → 분반 → 오답 루틴 → 주간 리포트",
  },
  {
    id: "yt-05-case",
    kicker: "STUDENT STORY",
    title: "가상 사례: 4등급 학생이 달라진 순간",
    subtitle: "열심히 하는데 점수가 안 오르는 학생에게 필요한 것은 공부량보다 구조입니다",
    bullets: [
      "고2 1학기 중간고사 수학 4등급",
      "계산 실수보다 개념 연결 실패가 핵심 원인",
      "16주 동안 단원별 오답 노트와 주 2회 재시험 루틴 운영",
    ],
    stats: [
      ["4등급", "시작점"],
      ["16주", "루틴"],
      ["2등급", "목표권"],
    ],
    narration:
      "가상의 학생 사례를 보겠습니다. 고등학교 이학년 학생이 수학 사등급에서 시작했습니다. 문제는 공부 시간이 아니라 개념 연결과 시험 시간 배분이었습니다. 오름은 십육 주 동안 단원별 오답 노트와 주 이회 재시험 루틴을 운영했고, 학생은 이등급 목표권에 들어왔습니다.",
    caption: "가상 학생 사례: 공부량보다 구조를 바꾸다",
  },
  {
    id: "yt-06-campus",
    kicker: "NEW CAMPUS",
    title: "새 캠퍼스는 학생 동선을 기준으로 설계했습니다",
    subtitle: "수업, 자습, 상담이 한 공간에서 이어지는 구조",
    bullets: [
      "역 앞 접근성과 늦은 시간 귀가 동선을 고려했습니다.",
      "자습실, 질문존, 상담실을 분리해 집중도를 높였습니다.",
      "학부모 상담은 예약제로 운영해 대기 시간을 줄였습니다.",
    ],
    stats: [
      ["3 min", "역세권"],
      ["Quiet", "자습실"],
      ["Booked", "상담제"],
    ],
    narration:
      "새 캠퍼스는 학생 동선을 기준으로 설계했습니다. 수업을 듣고 바로 자습실로 이동하고, 막히는 문제는 질문존에서 해결하고, 상담은 예약제로 진행합니다. 학부모에게는 접근성과 귀가 동선도 중요한 기준입니다.",
    caption: "새 캠퍼스: 수업, 자습, 상담이 이어지는 공간",
  },
  {
    id: "yt-07-proof",
    kicker: "TRUST MESSAGE",
    title: "좋은 홍보는 결과만 말하지 않습니다",
    subtitle: "기준, 과정, 증빙을 함께 보여 줄 때 신뢰가 생깁니다",
    bullets: [
      "등급 상승 기준과 기간을 명확히 공개합니다.",
      "학생 사례는 개인정보를 보호해 익명화합니다.",
      "상담에서는 맞지 않는 학생에게도 솔직히 안내합니다.",
    ],
    stats: [
      ["Clear", "기준 공개"],
      ["Private", "익명 사례"],
      ["Honest", "상담 원칙"],
    ],
    narration:
      "학원 홍보에서 가장 조심해야 할 것은 성과를 과장하는 일입니다. 좋은 홍보는 결과만 말하지 않습니다. 기준과 기간, 학생 수, 익명 처리 방식, 실제 상담 원칙을 함께 보여 줄 때 신뢰가 생깁니다.",
    caption: "성과보다 중요한 것: 기준과 증빙",
  },
  {
    id: "yt-08-cta",
    kicker: "OPEN CLASS",
    title: "새 캠퍼스 오픈 진단 상담을 시작합니다",
    subtitle: "현재 등급보다 먼저, 성적이 막힌 이유를 확인하세요",
    bullets: [
      "고1·고2: 내신 습관과 과목별 약점 진단",
      "고3: 수능·수시 병행 전략 점검",
      "상담 후 맞지 않으면 등록을 권하지 않습니다",
    ],
    stats: [
      ["30 min", "진단 상담"],
      ["High school", "고등부"],
      ["Oreum", "오름입시학원"],
    ],
    narration:
      "오름입시학원은 새 캠퍼스 오픈과 함께 고등부 진단 상담을 시작합니다. 지금 필요한 것은 더 많은 공부가 아니라, 성적이 막힌 이유를 정확히 아는 것일 수 있습니다. 현재 등급과 목표를 가져오세요. 오름이 다음 한 학기의 전략을 함께 점검하겠습니다.",
    caption: "새 캠퍼스 오픈 진단 상담 예약",
  },
];

const shortSlides = [
  {
    id: "short-01-hook",
    title: "학원을 옮겼는데\n문의가 더 늘어난 이유",
    subtitle: "오름입시학원 새 캠퍼스",
    bullets: ["고등부 내신·수능 집중", "진단 상담과 자습 동선 확장"],
    narration:
      "학원을 옮겼는데 문의가 더 늘어난 이유. 오름입시학원은 고등부 성적 관리 방식을 새 캠퍼스에서 다시 설계했습니다.",
    caption: "이전 오픈 · 고등부 집중",
  },
  {
    id: "short-02-proof",
    title: "가상 실적\n87% 1등급 이상 상승",
    subtitle: "데모용 내부 지표",
    bullets: ["한 학기 주요 과목 기준", "실제 광고 전 증빙 필요"],
    narration:
      "가상 실적 기준, 정규반 팔십칠 퍼센트가 한 학기 안에 주요 과목 한 등급 이상 상승했습니다.",
    caption: "데모 수치 · 실제 광고 전 증빙 필요",
  },
  {
    id: "short-03-system",
    title: "수업보다 먼저\n현재 위치를 진단",
    subtitle: "진단 → 분반 → 오답 → 리포트",
    bullets: ["입학 진단으로 약점 확인", "매주 오답 원인 리포트"],
    narration:
      "비결은 수업보다 먼저 현재 위치를 보는 것. 진단, 분반, 오답 루틴, 주간 리포트가 이어집니다.",
    caption: "진단 기반 학습 루틴",
  },
  {
    id: "short-04-campus",
    title: "수내역 앞\n새 집중 캠퍼스",
    subtitle: "자습실 · 질문존 · 예약 상담",
    bullets: ["수업 후 바로 자습", "막히는 문제는 질문존에서 해결"],
    narration:
      "새 캠퍼스는 수내역 앞. 자습실, 질문존, 예약 상담실을 분리해 집중 흐름을 만들었습니다.",
    caption: "새 캠퍼스 이전 오픈",
  },
  {
    id: "short-05-cta",
    title: "현재 등급보다 먼저\n막힌 이유를 보세요",
    subtitle: "고등부 진단 상담 예약",
    bullets: ["고1·고2 내신 습관 진단", "고3 수능·수시 전략 점검"],
    narration:
      "현재 등급보다 먼저, 성적이 막힌 이유를 확인하세요. 오름입시학원 고등부 진단 상담을 예약하세요.",
    caption: "고등부 진단 상담 예약",
  },
];

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    shell: false,
    ...options,
  });

  if (result.status !== 0) {
    throw new Error(`${command} failed:\n${result.stderr || result.stdout}`);
  }

  return result.stdout.trim();
}

function ffmpegPath(value) {
  return value.replaceAll("\\", "/");
}

function assTime(seconds) {
  const centiseconds = Math.round(seconds * 100);
  const cs = centiseconds % 100;
  const totalSeconds = Math.floor(centiseconds / 100);
  const s = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const m = totalMinutes % 60;
  const h = Math.floor(totalMinutes / 60);
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}

function assText(value) {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll("{", "\\{")
    .replaceAll("}", "\\}")
    .replaceAll("\n", "\\N");
}

function audioDuration(file) {
  return Number.parseFloat(
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

function slideHtml(slide, { vertical = false, thumbnail = false } = {}) {
  const width = vertical ? 1080 : 1920;
  const height = vertical ? 1920 : 1080;
  const statCards =
    slide.stats
      ?.map(
        ([value, label]) => `
          <div class="stat">
            <strong>${value}</strong>
            <span>${label}</span>
          </div>
        `,
      )
      .join("") ?? "";
  const bullets =
    slide.bullets
      ?.map(
        (item) => `
          <li>${item}</li>
        `,
      )
      .join("") ?? "";

  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0;
    width: ${width}px;
    height: ${height}px;
    overflow: hidden;
    font-family: "Malgun Gothic", "Segoe UI", sans-serif;
    color: #172033;
    background:
      radial-gradient(circle at 18% 15%, rgba(55, 103, 246, 0.18), transparent 30%),
      radial-gradient(circle at 82% 12%, rgba(22, 163, 125, 0.18), transparent 28%),
      linear-gradient(135deg, #f7fbff 0%, #eef7f2 48%, #fff7ed 100%);
  }
  .frame {
    position: relative;
    width: ${width}px;
    height: ${height}px;
    padding: ${vertical ? "72px 58px" : "76px 92px"};
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 18px;
    font-weight: 900;
    letter-spacing: 0;
  }
  .mark {
    display: grid;
    place-items: center;
    width: ${vertical ? "76px" : "84px"};
    height: ${vertical ? "76px" : "84px"};
    border-radius: 22px;
    color: white;
    background: #172033;
    box-shadow: 0 22px 50px rgba(23, 32, 51, 0.18);
    font-size: ${vertical ? "36px" : "42px"};
  }
  .brand-text strong {
    display: block;
    font-size: ${vertical ? "34px" : "38px"};
    line-height: 1;
  }
  .brand-text span {
    display: block;
    margin-top: 7px;
    color: #3767f6;
    font-size: ${vertical ? "18px" : "20px"};
    font-weight: 800;
  }
  .content {
    position: relative;
    z-index: 2;
    display: grid;
    grid-template-columns: ${vertical ? "1fr" : "1.05fr 0.8fr"};
    gap: ${vertical ? "42px" : "74px"};
    align-items: center;
    height: ${vertical ? "calc(100% - 118px)" : "calc(100% - 112px)"};
    padding-top: ${vertical ? "60px" : "68px"};
  }
  .kicker {
    display: inline-flex;
    width: fit-content;
    border-radius: 999px;
    padding: ${vertical ? "12px 18px" : "12px 20px"};
    background: rgba(55, 103, 246, 0.12);
    color: #2149c9;
    font-size: ${vertical ? "24px" : "21px"};
    font-weight: 900;
  }
  h1 {
    margin: ${vertical ? "30px 0 0" : "28px 0 0"};
    max-width: ${vertical ? "920px" : "1040px"};
    font-size: ${thumbnail ? "104px" : vertical ? "78px" : "82px"};
    line-height: ${vertical ? "1.14" : "1.08"};
    letter-spacing: 0;
    word-break: keep-all;
  }
  .subtitle {
    margin-top: ${vertical ? "30px" : "28px"};
    max-width: ${vertical ? "890px" : "940px"};
    color: rgba(23, 32, 51, 0.72);
    font-size: ${vertical ? "34px" : "34px"};
    line-height: 1.45;
    font-weight: 800;
    word-break: keep-all;
  }
  ul {
    display: grid;
    gap: ${vertical ? "18px" : "16px"};
    margin: ${vertical ? "40px 0 0" : "34px 0 0"};
    padding: 0;
    list-style: none;
  }
  li {
    position: relative;
    padding: ${vertical ? "23px 26px 23px 68px" : "18px 24px 18px 62px"};
    border: 1px solid rgba(23, 32, 51, 0.1);
    border-radius: 20px;
    background: rgba(255, 255, 255, 0.72);
    box-shadow: 0 18px 40px rgba(23, 32, 51, 0.08);
    font-size: ${vertical ? "29px" : "27px"};
    line-height: 1.36;
    font-weight: 800;
    word-break: keep-all;
  }
  li::before {
    content: "";
    position: absolute;
    left: ${vertical ? "26px" : "24px"};
    top: 50%;
    width: 20px;
    height: 20px;
    border-radius: 999px;
    transform: translateY(-50%);
    background: #16a37d;
    box-shadow: 0 0 0 8px rgba(22, 163, 125, 0.12);
  }
  .panel {
    display: grid;
    gap: 22px;
    align-self: stretch;
  }
  .card {
    position: relative;
    overflow: hidden;
    min-height: ${vertical ? "360px" : "430px"};
    border: 1px solid rgba(23, 32, 51, 0.1);
    border-radius: 28px;
    background: rgba(255, 255, 255, 0.74);
    box-shadow: 0 24px 80px rgba(23, 32, 51, 0.13);
    padding: ${vertical ? "36px" : "42px"};
  }
  .graph {
    position: absolute;
    left: ${vertical ? "50px" : "62px"};
    right: ${vertical ? "50px" : "62px"};
    bottom: ${vertical ? "52px" : "62px"};
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: ${vertical ? "18px" : "22px"};
    align-items: end;
    height: ${vertical ? "260px" : "280px"};
  }
  .bar {
    border-radius: 18px 18px 8px 8px;
    background: linear-gradient(180deg, #3767f6 0%, #16a37d 100%);
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.4);
  }
  .bar:nth-child(1) { height: 34%; opacity: 0.42; }
  .bar:nth-child(2) { height: 46%; opacity: 0.58; }
  .bar:nth-child(3) { height: 62%; opacity: 0.7; }
  .bar:nth-child(4) { height: 78%; opacity: 0.86; }
  .bar:nth-child(5) { height: 96%; }
  .badge {
    width: fit-content;
    border-radius: 18px;
    padding: 13px 16px;
    color: white;
    background: #172033;
    font-size: ${vertical ? "24px" : "22px"};
    font-weight: 900;
  }
  .stat-grid {
    display: grid;
    grid-template-columns: ${vertical ? "1fr" : "repeat(3, 1fr)"};
    gap: ${vertical ? "18px" : "20px"};
  }
  .stat {
    border: 1px solid rgba(23, 32, 51, 0.1);
    border-radius: 24px;
    background: white;
    padding: ${vertical ? "28px" : "26px"};
    box-shadow: 0 20px 50px rgba(23, 32, 51, 0.1);
  }
  .stat strong {
    display: block;
    color: #3767f6;
    font-size: ${vertical ? "54px" : "48px"};
    line-height: 1;
  }
  .stat span {
    display: block;
    margin-top: 12px;
    color: rgba(23, 32, 51, 0.66);
    font-size: ${vertical ? "24px" : "20px"};
    font-weight: 900;
  }
  .footnote {
    position: absolute;
    left: ${vertical ? "58px" : "92px"};
    right: ${vertical ? "58px" : "92px"};
    bottom: ${vertical ? "46px" : "40px"};
    color: rgba(23, 32, 51, 0.48);
    font-size: ${vertical ? "20px" : "20px"};
    font-weight: 700;
  }
  .route {
    position: absolute;
    right: ${vertical ? "58px" : "92px"};
    top: ${vertical ? "72px" : "80px"};
    border: 1px solid rgba(23, 32, 51, 0.1);
    border-radius: 999px;
    background: rgba(255,255,255,0.78);
    padding: ${vertical ? "13px 18px" : "13px 20px"};
    color: #172033;
    font-size: ${vertical ? "20px" : "19px"};
    font-weight: 900;
  }
  ${vertical ? `
    .content { align-content: start; }
    .panel { display: none; }
    h1 { white-space: pre-line; }
    .subtitle { max-width: 900px; }
  ` : ""}
</style>
</head>
<body>
  <main class="frame">
    <div class="brand">
      <div class="mark">O</div>
      <div class="brand-text">
        <strong>${academy.nameKo}</strong>
        <span>${academy.nameEn} · ${academy.campaign}</span>
      </div>
    </div>
    <div class="route">${academy.location}</div>
    <section class="content">
      <div>
        <div class="kicker">${slide.kicker ?? "OREUM ACADEMY"}</div>
        <h1>${slide.title}</h1>
        <p class="subtitle">${slide.subtitle}</p>
        ${bullets ? `<ul>${bullets}</ul>` : ""}
      </div>
      <div class="panel">
        <div class="card">
          <div class="badge">Performance path</div>
          <div class="graph">
            <div class="bar"></div>
            <div class="bar"></div>
            <div class="bar"></div>
            <div class="bar"></div>
            <div class="bar"></div>
          </div>
        </div>
        <div class="stat-grid">${statCards}</div>
      </div>
    </section>
    <div class="footnote">${academy.disclaimer}</div>
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

async function renderScreens(slides, { vertical, prefix }) {
  const browser = await playwright.chromium.launch({
    headless: true,
    executablePath: chromePath,
    args: ["--disable-dev-shm-usage", "--font-render-hinting=none"],
  });

  const page = await browser.newPage({
    viewport: vertical ? { width: 1080, height: 1920 } : { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
  });

  try {
    for (const slide of slides) {
      await page.setContent(slideHtml(slide, { vertical }), { waitUntil: "load" });
      await page.screenshot({
        path: path.join(screenRoot, `${prefix}-${slide.id}.png`),
        fullPage: false,
      });
    }

    await page.setContent(slideHtml(slides[0], { vertical, thumbnail: !vertical }), {
      waitUntil: "load",
    });
    await page.screenshot({
      path: vertical ? shortCoverPath : thumbnailPath,
      fullPage: false,
    });
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
    slide.duration = audioDuration(wavPath) + 0.45;
  }
}

async function makeClip(slide, { vertical, prefix }) {
  const width = vertical ? 1080 : 1920;
  const height = vertical ? 1920 : 1080;
  const imagePath = path.join(screenRoot, `${prefix}-${slide.id}.png`);
  const clipPath = path.join(clipRoot, `${prefix}-${slide.id}.mp4`);

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
    `[1:a]apad=pad_dur=0.45[a]`,
    "-map",
    "0:v",
    "-map",
    "[a]",
    "-t",
    slide.duration.toFixed(3),
    "-vf",
    `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=0xf7fbff,format=yuv420p`,
    "-c:v",
    "libx264",
    "-preset",
    "medium",
    "-crf",
    "18",
    "-tune",
    "stillimage",
    "-c:a",
    "aac",
    "-b:a",
    "160k",
    "-movflags",
    "+faststart",
    clipPath,
  ]);

  slide.video = clipPath;
}

async function makeSubtitles(slides, { vertical, prefix }) {
  let cursor = 0;
  const events = [];
  const subtitlePath = path.join(campaignRoot, `${prefix}-subtitles.ass`);

  for (const slide of slides) {
    const start = cursor + 0.2;
    const end = cursor + slide.duration - 0.15;
    events.push(
      `Dialogue: 0,${assTime(start)},${assTime(end)},Caption,,0,0,0,,${assText(slide.caption)}`,
    );
    cursor += slide.duration;
  }

  const ass = `[Script Info]
ScriptType: v4.00+
PlayResX: ${vertical ? 1080 : 1920}
PlayResY: ${vertical ? 1920 : 1080}
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Caption,Malgun Gothic,${vertical ? 55 : 42},&H00FFFFFF,&H00FFFFFF,&H660F172A,&HD00F172A,-1,0,0,0,100,100,0,0,3,16,0,2,${vertical ? 56 : 120},${vertical ? 56 : 120},${vertical ? 105 : 52},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
${events.join("\n")}
`;

  await writeFile(subtitlePath, ass, "utf8");
  return subtitlePath;
}

async function concatAndBurn(slides, { vertical, prefix, outputPath }) {
  const concatPath = path.join(campaignRoot, `${prefix}-concat.txt`);
  await writeFile(
    concatPath,
    `${slides.map((slide) => `file '${ffmpegPath(slide.video)}'`).join("\n")}\n`,
    "utf8",
  );

  const draftPath = path.join(campaignRoot, `${prefix}-draft.mp4`);
  run("ffmpeg", [
    "-y",
    "-loglevel",
    "error",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    concatPath,
    "-c",
    "copy",
    draftPath,
  ]);

  const subtitles = await makeSubtitles(slides, { vertical, prefix });
  const relativeSubtitlePath = ffmpegPath(path.relative(root, subtitles));
  run("ffmpeg", [
    "-y",
    "-loglevel",
    "error",
    "-i",
    draftPath,
    "-vf",
    `ass=${relativeSubtitlePath}`,
    "-c:v",
    "libx264",
    "-preset",
    "medium",
    "-crf",
    "18",
    "-c:a",
    "aac",
    "-b:a",
    "160k",
    "-movflags",
    "+faststart",
    outputPath,
  ]);
}

async function renderVideo(slides, options) {
  await renderScreens(slides, options);
  await makeAudio(slides, options.prefix);

  for (const slide of slides) {
    await makeClip(slide, options);
  }

  await concatAndBurn(slides, options);
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

async function writeCampaignPackage() {
  const md = `# ${academy.nameKo} (${academy.nameEn}) Demo Campaign

> ${academy.disclaimer}

## 가상 상황

- 학원: ${academy.nameKo}
- 대상: 고등학생과 학부모
- 상황: 기존 캠퍼스의 자습 좌석과 상담 공간이 부족해 ${academy.location}로 확장 이전
- 핵심 메시지: 성적 상승은 강의력만이 아니라 진단, 분반, 오답 루틴, 주간 피드백이 함께 작동할 때 만들어진다
- 주의: 실제 광고 집행 전에는 등급 상승 기준, 대상 학생 수, 기간, 증빙 자료, 개인정보 익명화 기준을 반드시 공개해야 함

## YouTube Long Form

- File: \`out/academy-demo/oreum-academy-youtube.mp4\`
- Thumbnail: \`out/academy-demo/oreum-academy-youtube-thumbnail.png\`
- Suggested title: \`성적이 오르는 학원은 무엇이 다를까요? | 오름입시학원 새 캠퍼스 이전 오픈\`
- Alternative titles:
  - \`고등부 성적 관리, 수업보다 먼저 봐야 할 것\`
  - \`오름입시학원 새 캠퍼스 공개: 진단부터 주간 리포트까지\`
  - \`열심히 해도 안 오르는 학생에게 필요한 공부 구조\`

### Description

오름입시학원이 분당 수내역 앞 새 캠퍼스로 이전했습니다.  
이번 영상은 고등부 학생의 성적이 왜 막히는지, 그리고 진단, 분반, 오답 루틴, 주간 리포트가 어떻게 하나의 학습 흐름으로 연결되는지 보여 주는 데모 영상입니다.

본 영상의 학원명, 수치, 학생 사례는 PR Studio 데모 제작을 위한 가상 설정입니다. 실제 광고 집행 전에는 모든 성과 수치의 기준과 증빙 자료를 확인해야 합니다.

### Chapters

00:00 성적이 오르는 학원은 무엇이 다를까  
00:18 새 캠퍼스로 이전한 이유  
00:43 가상 내부 지표와 성과 메시지  
01:06 오름의 학습 관리 시스템  
01:29 가상 학생 사례  
01:52 새 캠퍼스 동선  
02:14 신뢰를 만드는 성과 공개 방식  
02:35 진단 상담 안내

### Tags

\`고등부학원\`, \`입시학원\`, \`내신관리\`, \`수능관리\`, \`분당학원\`, \`수내역학원\`, \`고등학생공부법\`, \`오답관리\`, \`학부모상담\`

## TikTok / Reels / Shorts

- File: \`out/academy-demo/oreum-academy-short.mp4\`
- Cover: \`out/academy-demo/oreum-academy-short-cover.png\`
- Hook: \`학원을 옮겼는데 문의가 더 늘어난 이유\`
- Caption:

학원 공간이 바뀌면 공부 흐름도 바뀔 수 있습니다.  
오름입시학원은 진단, 분반, 오답 루틴, 주간 리포트가 이어지는 고등부 집중 캠퍼스를 가상으로 설계했습니다.  
※ 데모용 가상 사례입니다.

### Short Form Hashtags

\`#고등부학원 #입시학원 #내신관리 #수능준비 #분당학원 #수내역 #고등학생공부 #학부모정보 #공부루틴\`

## Instagram Carousel

1. 성적이 오르는 학원은 무엇이 다를까요?
2. 수업보다 먼저 보는 것은 학생의 현재 위치입니다.
3. 진단 → 분반 → 오답 루틴 → 주간 리포트
4. 새 캠퍼스는 자습, 질문, 상담 동선을 분리했습니다.
5. 실제 광고라면 성과 기준과 증빙을 함께 공개해야 합니다.
6. 고등부 진단 상담 예약 안내

## Naver Blog Intro

고등학생 학부모가 학원을 선택할 때 가장 궁금한 것은 단순한 합격 실적이 아닙니다.  
우리 아이가 왜 점수가 막혔는지, 지금 필요한 수업은 무엇인지, 그리고 학원이 그 과정을 얼마나 꾸준히 관리하는지가 더 중요합니다.  
오름입시학원은 새 캠퍼스 이전을 계기로 진단, 분반, 오답 루틴, 주간 리포트가 연결되는 고등부 관리 시스템을 소개합니다.

## Kakao Channel Message

[오름입시학원 새 캠퍼스 이전 오픈]  
고등부 내신·수능 진단 상담을 시작합니다.  
현재 등급보다 먼저, 성적이 막힌 이유를 확인하세요.  
수내역 3번 출구 앞 새 캠퍼스에서 상담 예약을 받고 있습니다.  
※ 본 메시지는 데모용 가상 홍보 문안입니다.

## Compliance Notes

- "87% 상승", "14p 상승" 같은 수치는 반드시 집계 기간, 대상 학생 수, 과목, 제외 기준을 함께 밝혀야 합니다.
- 학생 사례는 개인정보를 익명화하고, 보호자 동의 없이 얼굴이나 학교 정보를 노출하지 않습니다.
- 모든 광고 문구는 "보장"보다 "진단", "관리", "사례" 중심으로 표현합니다.
`;

  await writeFile(packagePath, md, "utf8");
}

await ensureDirs();
await renderVideo(youtubeSlides, {
  vertical: false,
  prefix: "youtube",
  outputPath: youtubePath,
});
await renderVideo(shortSlides, {
  vertical: true,
  prefix: "short",
  outputPath: shortPath,
});
await writeCampaignPackage();

console.log(JSON.stringify({
  youtube: {
    path: youtubePath,
    metadata: metadata(youtubePath),
  },
  short: {
    path: shortPath,
    metadata: metadata(shortPath),
  },
  thumbnail: thumbnailPath,
  shortCover: shortCoverPath,
  package: packagePath,
}, null, 2));
