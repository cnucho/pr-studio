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
const currentFile = path.join(outRoot, "academic-writing-workspace-introduction-current.mp4");
const previousFile = path.join(outRoot, "academic-writing-workspace-introduction-previous.mp4");
const reuseAudio = process.env.PR_STUDIO_REUSE_ACADEMIC_WRITING_AUDIO === "true";

const originalScenes = [
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

const part1Scenes = [
  {
    id: "p1-01-not-translation",
    kicker: "1부 · 왜 사용하는가",
    title: "영어 논문은 좋은 번역만으로 통과하지 않습니다",
    subtitle: "개념이 선명하고, 논리가 이어지고, 용어와 문장이 일관되며, 저널 형식까지 맞아야 합니다.",
    cards: ["개념과 정의", "논리 전개", "용어와 문장", "저널 형식"],
    narration: "영어 논문이 어려운 이유는 단순히 영어 때문만은 아닙니다. 핵심 개념이 분명하게 정의되어야 하고, 주장과 근거가 논리적으로 이어져야 합니다. 같은 개념에는 같은 영문 용어를 써야 하며, 문장은 정확하고 자연스러워야 합니다. 목표 저널의 형식과 참고문헌도 함께 맞아야 합니다.",
    caption: "영어 논문의 핵심은 번역보다 개념·논리·용어·문장의 완성도입니다.",
  },
  {
    id: "p1-02-review-risks",
    kicker: "심사에서 반복되는 문제",
    title: "문장이 자연스러워도, 논문의 구조가 약하면 멈춥니다",
    subtitle: "개념 중복, 정의 부족, 논리적 비약, 용어 불일치와 형식 누락은 심사 지적과 게재 거절로 이어질 수 있습니다.",
    cards: ["비슷한 개념의 중복", "핵심 개념 정의 부족", "주장 사이의 논리 비약", "용어·인용·형식 불일치"],
    narration: "영문 문장이 자연스럽다고 논문이 완성되는 것은 아닙니다. 비슷한 개념이 구분되지 않고 반복되거나, 핵심 개념의 정의가 부족하면 연구의 기여가 흐려집니다. 주장 사이의 논리가 뛰고 같은 개념을 서로 다른 용어로 쓰면 독자는 따라가기 어렵습니다. 이런 문제와 인용, 저널 형식의 누락은 심사에서 반복적으로 지적되고 게재 거절의 한 원인이 될 수 있습니다.",
    caption: "좋은 문장과 좋은 논문은 같은 말이 아닙니다.",
  },
  {
    id: "p1-03-audience",
    kicker: "누가 사용하는가",
    title: "연구 아이디어는 있지만 영어 논문의 마지막 완성도가 부담인 연구자",
    subtitle: "비영어권 연구자, 대학원생, 학술지 투고를 준비하는 실무 연구자가 주된 사용자입니다.",
    roles: [
      ["RESEARCHER", "아이디어와 자료는 준비됨"],
      ["WRITING CHALLENGE", "개념·논리·영문을 함께 다듬어야 함"],
      ["SUBMISSION", "참고문헌과 저널 형식까지 완성해야 함"],
    ],
    narration: "이 도구는 연구주제와 자료가 없는 사람을 대신해 논문을 만들어 주는 도구가 아닙니다. 연구 아이디어와 분석 결과는 있지만 개념과 논리를 영어 문장으로 정교하게 전개하기 어려운 비영어권 연구자, 영어 논문을 처음 쓰는 대학원생, 목표 학술지에 맞춰 원고를 완성해야 하는 실무 연구자를 위한 작업공간입니다.",
    caption: "연구는 준비됐지만 영어 논문의 완성 과정이 부담인 사람을 위한 도구입니다.",
  },
  {
    ...originalScenes[1],
    id: "p1-04-chat-limits",
  },
  {
    ...originalScenes[2],
    id: "p1-05-concept-workbench",
    kicker: "개념·문장 작업대",
    title: "AI는 논리와 문장을 다듬고, MCP는 합의된 개념과 용어를 잊지 않게 합니다",
    subtitle: "섹션 목적, 개념 정의, 주장 순서, 표준 영문 용어, 연결 문헌과 초안 버전을 작업 단위로 묶습니다.",
    flow: ["개념 정의", "논리 전개", "표준 용어", "영문 문장", "버전 보존"],
    narration: "Academic Writing Workspace는 대화창의 인공지능을 평가자나 검열자로 만들지 않습니다. 연구자와 인공지능은 핵심 개념과 주장 순서를 논의하고 영문 문장을 작성합니다. 엠시피는 합의한 개념 정의와 표준 용어, 연결 문헌, 섹션 순서와 수정 버전을 정리해 다음 대화에서도 다시 사용할 수 있게 합니다.",
    caption: "중심은 내용 생성이 아니라 개념·논리·용어·문장의 일관성입니다.",
  },
  {
    ...originalScenes[7],
    id: "p1-06-close",
    title: "연구자는 개념과 판단에 집중하고, AI는 글을 쓰며, MCP는 작업을 기억합니다",
    narration: "이 도구의 목적은 학술적 판단을 대신하는 것이 아닙니다. 연구자는 개념과 논리, 최종 결정을 맡습니다. 대화창의 인공지능은 연구자와 충분히 토론하면서 영어 문장을 작성하고 수정합니다. 엠시피 작업대는 문헌, 개념과 용어, 섹션 순서, 버전과 저널 형식을 잊지 않게 관리합니다.",
    caption: "개념과 문장은 더 정교하게, 학술적 판단은 연구자에게 남깁니다.",
  },
];

const part2Scenes = [
  {
    id: "p2-01-connect",
    kicker: "2부 · 어떻게 사용하는가",
    title: "먼저 대화창에 Academic Writing Workspace MCP를 연결합니다",
    subtitle: "포털의 MCP 연결 페이지에서 전용 주소를 등록하면, 논문 작업은 평소처럼 대화창에서 진행합니다.",
    flow: ["포털에서 선택", "MCP 연결", "새 대화 시작", "프로젝트 생성"],
    narration: "사용은 대화창에서 시작합니다. MethodIQ 포털에서 Academic Writing Workspace를 선택하고 전용 엠시피 주소를 연결합니다. 새 대화에서 연구주제와 현재 작성 단계를 말하면 엠시피가 프로젝트를 만들고 작업 순서를 준비합니다.",
    caption: "논문 작성의 주 작업공간은 대화창이고, MCP는 뒤에서 작업을 정리합니다.",
  },
  {
    id: "p2-02-project",
    kicker: "1 · 프로젝트 설정",
    title: "연구주제, 논문 유형과 목표 저널을 먼저 기록합니다",
    subtitle: "목표 저널이 정해지지 않았다면 APA를 작업 기본값으로 두고 나중에 공식 지침을 확인해 바꿀 수 있습니다.",
    flow: ["연구 질문", "논문 유형", "작성 언어", "목표 저널", "APA 기본값"],
    narration: "먼저 연구 질문과 논문 유형, 작성 언어, 목표 저널을 기록합니다. 목표 저널이 아직 정해지지 않았다면 에이피에이를 작업 기본값으로 둡니다. 저널이 결정되면 공식 저자 지침과 정확한 씨에스엘 스타일을 확인한 뒤 형식 프로필을 갱신합니다.",
    caption: "저널명만으로 형식을 추정하지 않고, 확인 가능한 규칙만 기록합니다.",
  },
  {
    id: "p2-03-terms",
    kicker: "2 · 개념과 용어",
    title: "핵심 개념은 정의와 표준 영문 용어를 한 쌍으로 기록합니다",
    subtitle: "비슷하지만 다른 개념을 분리하고, 같은 개념에 여러 영문 표현이 섞이지 않게 합니다.",
    ledger: [
      ["CONCEPT", "핵심 개념 이름"],
      ["DEFINITION", "이 연구에서 사용하는 정의"],
      ["CANONICAL TERM", "표준 영문 용어"],
      ["AVOID", "혼동되는 대체 표현"],
    ],
    narration: "다음은 개념과 용어 작업입니다. 핵심 개념마다 이 연구에서 사용할 정의와 표준 영문 용어를 기록합니다. 비슷하지만 다른 개념은 구분하고, 피해야 할 대체 표현이나 특별한 사용 조건도 메모합니다. 이후 인공지능은 이 용어표를 받아 같은 개념을 일관되게 표현합니다.",
    caption: "개념 정의와 영문 용어를 먼저 고정하면 반복 수정에서도 표현이 흔들리지 않습니다.",
  },
  {
    id: "p2-04-section",
    kicker: "3 · 섹션 작성",
    title: "섹션 목적과 주장 순서를 정한 뒤 AI와 영문 문장을 다듬습니다",
    subtitle: "MCP는 판단하지 않고 목적·주장·근거·용어·버전을 돌려주며, AI는 그 맥락에서 문장을 작성합니다.",
    flow: ["섹션 목적", "주장 순서", "연결 근거", "영문 작성", "수정본 보존"],
    narration: "각 섹션에서는 먼저 무엇을 설명해야 하는지 정합니다. 주장과 근거의 순서를 확인하고 필요한 문헌을 연결합니다. 엠시피는 지금까지 합의한 개념과 용어, 섹션 목적을 대화창에 돌려줍니다. 인공지능은 이 맥락에서 영문 문장을 만들고, 연구자가 수정한 초안은 새 버전으로 보존됩니다.",
    caption: "MCP는 진행자와 기억장치이고, 문장 작성과 토론은 대화창 AI가 맡습니다.",
  },
  {
    ...originalScenes[3],
    id: "p2-05-evidence-ledger",
  },
  {
    ...originalScenes[4],
    id: "p2-06-format",
  },
  {
    ...originalScenes[5],
    id: "p2-07-citations",
  },
  {
    ...originalScenes[6],
    id: "p2-08-companions",
  },
  {
    ...originalScenes[7],
    id: "p2-09-close",
    title: "대화가 바뀌어도 개념·문헌·문장·형식의 작업 맥락은 이어집니다",
    subtitle: "연구자는 결정하고, AI는 토론하고 쓰며, MCP는 다음 작업에 필요한 맥락을 정확히 돌려줍니다.",
    narration: "이제 대화가 길어지거나 새 대화로 옮겨도 처음부터 다시 설명할 필요가 줄어듭니다. 연구자는 개념과 논리를 결정하고, 인공지능은 토론과 영문 작성에 집중합니다. 엠시피는 표준 용어, 문헌, 섹션 순서, 버전과 목표 저널 형식을 다음 작업에 필요한 만큼 다시 제공합니다.",
    caption: "Academic Writing Workspace · 영어 논문의 개념과 문장을 이어 주는 MCP 작업공간",
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

function sceneHtml(scene, index, totalScenes) {
  return `<!doctype html><html lang="ko"><meta charset="utf-8"><style>
  *{box-sizing:border-box}body{margin:0;font-family:"Malgun Gothic","Noto Sans KR",sans-serif;color:#152335}.slide{position:relative;width:1920px;height:1080px;padding:62px 82px 92px;overflow:hidden;background:radial-gradient(circle at 90% 8%,rgba(23,111,111,.18),transparent 34%),linear-gradient(145deg,#fbfaf6,#eef5f2)}.slide:before{content:"";position:absolute;left:-160px;bottom:-250px;width:650px;height:650px;border-radius:50%;background:rgba(206,115,68,.08)}.top{display:flex;align-items:center;justify-content:space-between}.brand{font-weight:900;letter-spacing:.13em;color:#176f6f;font-size:20px}.kicker{border-radius:99px;padding:11px 20px;background:#fff;border:1px solid #bdd6d1;color:#176f6f;font-weight:900;font-size:20px}h1{position:relative;margin:28px 0 12px;max-width:1700px;font-size:58px;line-height:1.17;letter-spacing:-.045em}.sub{position:relative;margin:0;max-width:1660px;color:#5b6a73;font-size:27px;line-height:1.47;font-weight:650}.quad{display:grid;grid-template-columns:repeat(4,1fr);gap:22px;margin-top:70px}.quad article,.ledger article,.roles article{min-height:215px;padding:28px;border-radius:24px;background:#fff;box-shadow:0 18px 55px rgba(31,57,58,.1);display:flex;flex-direction:column;justify-content:space-between}.quad b{font-size:20px;color:#ce7344}.quad strong,.ledger strong,.roles strong{font-size:30px;line-height:1.3}.steps,.flow,.tools{display:flex;align-items:stretch;gap:14px;margin-top:70px}.steps article,.flow article,.tools article{flex:1;min-height:225px;padding:30px;border-radius:24px;background:#fff;box-shadow:0 18px 55px rgba(31,57,58,.1);display:flex;flex-direction:column;justify-content:center;gap:18px}.steps small{color:#ce7344;font-weight:900}.steps strong,.flow strong,.tools strong{font-size:28px;line-height:1.35}.steps span{font-size:22px;color:#62717a}.steps i,.flow i,.tools i{display:flex;align-items:center;font-style:normal;color:#ce7344;font-size:44px}.flow article{align-items:center;text-align:center}.flow b{width:44px;height:44px;border-radius:50%;display:grid;place-items:center;background:#176f6f;color:#fff}.ledger{display:grid;grid-template-columns:repeat(4,1fr);gap:22px;margin-top:68px}.ledger code,.roles code,.tools code{color:#176f6f;font-size:19px;font-weight:900;letter-spacing:.08em}.format{display:grid;grid-template-columns:1.1fr .9fr;gap:30px;margin-top:62px}.format section,.format ul,.citation{margin:0;padding:36px;border-radius:24px;background:#fff;box-shadow:0 18px 55px rgba(31,57,58,.1)}.format section{display:grid;grid-template-columns:190px 1fr;gap:24px;align-items:center}.format small,.citation small{color:#176f6f;font-weight:900;letter-spacing:.08em}.format strong{font-size:28px}.format code{font-size:22px;color:#ce7344}.format ul{list-style:none;display:grid;gap:16px}.format li{font-size:24px;font-weight:750;padding-left:34px;position:relative}.format li:before{content:"✓";position:absolute;left:0;color:#176f6f}.citation{margin-top:62px;display:grid;grid-template-columns:220px 1fr;gap:25px;align-items:center}.citation strong{font-size:35px}.citation p{font-family:Georgia,serif;font-size:25px;line-height:1.5;margin:0}.tools article{min-height:245px}.roles{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;margin-top:66px}.caption{position:absolute;left:0;right:0;bottom:0;height:74px;background:#152335;color:#fff;display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:850}.caption small{position:absolute;right:32px;color:#b8c6ca;font-size:16px}.progress{position:absolute;left:0;top:0;height:7px;background:#ce7344;width:${((index + 1) / totalScenes) * 100}%}
  </style><main class="slide"><div class="progress"></div><div class="top"><div class="brand">CONSUMER INSIGHT · METHODIQ</div><div class="kicker">${escapeHtml(scene.kicker)}</div></div><h1>${escapeHtml(scene.title)}</h1><p class="sub">${escapeHtml(scene.subtitle)}</p>${contentHtml(scene)}<div class="caption">${escapeHtml(scene.caption)}<small>${String(index + 1).padStart(2, "0")} / ${String(totalScenes).padStart(2, "0")}</small></div></main></html>`;
}

if (process.env.PR_STUDIO_TTS_PROVIDER_KO !== "google") throw new Error("Set PR_STUDIO_TTS_PROVIDER_KO=google.");
if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON && !process.env.GOOGLE_APPLICATION_CREDENTIALS && !process.env.GOOGLE_CLOUD_ACCESS_TOKEN) throw new Error("Google TTS credentials are unavailable.");

async function renderProduction({ slug, transcriptTitle, scenes, youtube }) {
  const productionWorkRoot = path.join(workRoot, slug);
  const productionSlidesDir = path.join(productionWorkRoot, "slides");
  const productionNarrationDir = path.join(productionWorkRoot, "narration");
  const productionAudioDir = path.join(productionWorkRoot, "audio");
  const productionClipsDir = path.join(productionWorkRoot, "clips");
  const current = path.join(outRoot, `academic-writing-workspace-${slug}-current.mp4`);
  const previous = path.join(outRoot, `academic-writing-workspace-${slug}-previous.mp4`);
  const candidate = path.join(productionWorkRoot, `academic-writing-workspace-${slug}-candidate.mp4`);

  await Promise.all([
    outRoot,
    productionWorkRoot,
    productionSlidesDir,
    productionNarrationDir,
    productionAudioDir,
    productionClipsDir,
  ].map((dir) => mkdir(dir, { recursive: true })));

  const browser = await chromium.launch({ headless: true, args: ["--font-render-hinting=none"] });
  try {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    for (const [index, scene] of scenes.entries()) {
      await page.setContent(sceneHtml(scene, index, scenes.length), { waitUntil: "networkidle" });
      const slide = path.join(productionSlidesDir, `${scene.id}.png`);
      const textFile = path.join(productionNarrationDir, `${scene.id}.txt`);
      const audioFile = path.join(productionAudioDir, `${scene.id}.wav`);
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
    const clip = path.join(productionClipsDir, `${scene.id}.mp4`);
    run(ffmpeg, ["-y", "-loglevel", "error", "-loop", "1", "-framerate", "30", "-i", scene.slide, "-i", scene.audio, "-filter_complex", "[1:a]apad=pad_dur=1.0[a]", "-map", "0:v", "-map", "[a]", "-t", scene.duration.toFixed(3), "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-tune", "stillimage", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "160k", "-ar", "24000", clip]);
    concat.push(`file '${clip.replaceAll("\\", "/")}'`);
    srt.push(String(index + 1), `${srtTime(cursor)} --> ${srtTime(cursor + scene.duration)}`, scene.caption, "");
    cursor += scene.duration;
  }

  const concatFile = path.join(productionWorkRoot, "concat.txt");
  const subtitleFile = path.join(outRoot, `academic-writing-workspace-${slug}.ko.srt`);
  const transcriptFile = path.join(outRoot, `academic-writing-workspace-${slug}-transcript.md`);
  await writeFile(concatFile, `${concat.join("\n")}\n`, "utf8");
  await writeFile(subtitleFile, `${srt.join("\n")}\n`, "utf8");
  await writeFile(transcriptFile, `# ${transcriptTitle}\n\n${scenes.map((scene, index) => `## ${index + 1}. ${scene.title}\n\n${scene.narration}\n`).join("\n")}\n`, "utf8");
  run(ffmpeg, ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", concatFile, "-c", "copy", "-movflags", "+faststart", candidate]);

  const probe = JSON.parse(capture(ffprobe, ["-v", "error", "-show_entries", "stream=codec_name,width,height,r_frame_rate,sample_rate,channels:format=duration,size", "-of", "json", candidate]));
  const videoStream = probe.streams.find((stream) => stream.codec_name === "h264");
  const audioStream = probe.streams.find((stream) => stream.codec_name === "aac");
  if (!videoStream || videoStream.width !== 1920 || videoStream.height !== 1080 || !audioStream) throw new Error(`${slug} failed stream verification.`);

  if (fs.existsSync(current)) await copyFile(current, previous);
  await copyFile(candidate, current);
  fs.rmSync(candidate);
  const sampleFrame = path.join(outRoot, `academic-writing-workspace-${slug}-sample.png`);
  run(ffmpeg, ["-y", "-loglevel", "error", "-ss", Math.max(1, cursor * 0.58).toFixed(2), "-i", current, "-frames:v", "1", sampleFrame]);

  const report = {
    renderedAt: new Date().toISOString(),
    narrationProvider: "google",
    voice: process.env.GOOGLE_TTS_VOICE_KO ?? "ko-KR-Chirp3-HD-Charon",
    speakingRate: Number(process.env.GOOGLE_TTS_SPEAKING_RATE ?? 0.94),
    resolution: "1920x1080",
    fps: 30,
    durationSeconds: duration(current),
    bytes: fs.statSync(current).size,
    sha256: createHash("sha256").update(await readFile(current)).digest("hex"),
    video: current,
    subtitle: subtitleFile,
    transcript: transcriptFile,
    sampleFrame,
    probe,
    youtube,
  };
  await writeFile(path.join(outRoot, `render-report-${slug}.json`), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await writeFile(path.join(outRoot, `youtube-metadata-${slug}.json`), `${JSON.stringify(youtube, null, 2)}\n`, "utf8");
  return report;
}

const productions = [
  {
    slug: "part1-why",
    transcriptTitle: "Academic Writing Workspace 1부 · 왜 사용하는가",
    scenes: part1Scenes,
    youtube: {
      title: "영어 논문은 좋은 번역만으로 통과하지 않습니다 | Academic Writing 1부",
      description: "영어 논문에서 중요한 것은 번역만이 아닙니다. 개념 중복과 정의 부족, 논리적 비약, 용어 불일치, 어색한 학술 문장과 저널 형식 누락이 왜 심사 지적과 게재 거절로 이어질 수 있는지, Academic Writing Workspace가 누구에게 필요한지 소개합니다.",
      tags: ["academic writing", "English manuscript", "논문 작성", "개념화", "논리 전개", "MCP", "MethodIQ"],
    },
  },
  {
    slug: "part2-how",
    transcriptTitle: "Academic Writing Workspace 2부 · 어떻게 사용하는가",
    scenes: part2Scenes,
    youtube: {
      title: "AI와 영어 논문을 함께 쓰는 방법 | Academic Writing Workspace 사용법",
      description: "Academic Writing Workspace MCP 연결부터 프로젝트 설정, 개념 정의와 표준 영문 용어 기록, 섹션별 논리와 문장 작성, Evidence Ledger 문헌 연결, APA 및 목표 저널 형식, Chart Studio와 Diagram Studio 연결까지 실제 작업 순서를 안내합니다.",
      tags: ["academic writing", "English manuscript", "APA style", "reference management", "MCP tutorial", "MethodIQ"],
    },
  },
];

const reports = [];
for (const production of productions) reports.push(await renderProduction(production));

if (fs.existsSync(currentFile)) {
  await copyFile(currentFile, previousFile);
  fs.rmSync(currentFile);
}
await writeFile(path.join(outRoot, "render-report-series.json"), `${JSON.stringify(reports, null, 2)}\n`, "utf8");
console.log(JSON.stringify(reports, null, 2));
