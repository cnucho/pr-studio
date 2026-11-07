import fs from "node:fs";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");
const appsRoot = path.resolve(root, "..");
const outRoot = path.join(root, "out", "office-ai-workflow-demo");
const inputScreens = {
  gpt: path.join(outRoot, "screens", "raw", "gpt-editor-edited.png"),
  chart: path.join(appsRoot, "mcp-chart-tools", "outputs", "editor.png"),
  sankey: path.join(appsRoot, "mcp-chart-tools", "outputs", "sankey.png"),
  sunflower: path.join(appsRoot, "mcp-chart-tools", "outputs", "sunflower.png"),
  diagram: path.join(outRoot, "screens", "raw", "diagram-editor-desktop.png"),
  pptx: path.join(appsRoot, "mcp-pptx-tools", "outputs", "editor-workspace-desktop.png"),
};
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const ffmpeg = require("ffmpeg-static");
const ffprobe = require("ffprobe-static").path;
const reuseAudio = process.env.PR_STUDIO_REUSE_OFFICE_AUDIO === "true";

const sources = [
  {
    label: "OpenAI Community",
    text: "전체 문서를 다시 만들지 않고 선택한 부분만 정확히 수정하고 싶다는 요구",
    url: "https://community.openai.com/t/canvas-again-restore-canvas-as-a-persistent-model-independent-workspace/1393271",
  },
  {
    label: "OpenAI Community",
    text: "PPTX의 텍스트와 도형, 레이아웃을 보존한 채 편집하고 싶다는 요구",
    url: "https://community.openai.com/t/production-grade-powerpoint-editing-for-chatgpt/1384928",
  },
  {
    label: "OpenAI Community",
    text: "생성 문서에서 간격과 머리글, 레이아웃이 수정 과정에서 달라지는 문제",
    url: "https://community.openai.com/t/feature-request-automatic-visual-qa-and-regression-checking-for-generated-documents/1398838",
  },
];

const videos = [
  {
    id: "methodiq-office-workflow-overview",
    title: "AI가 만든 초안을, 사람이 완성하는 Office Workflow",
    youtubeTitle: "AI 초안을 완성본으로 만드는 MethodIQ Office Workflow",
    description: "GPT Editor, Chart Studio, Diagram Studio, PPTX Studio를 연결해 AI 초안을 사람이 편집하고 AI가 다시 다듬는 작업 흐름을 소개합니다.",
    scenes: [
      {
        id: "01-ai-first-draft",
        kicker: "AI Office Workflow",
        title: "GPT는 초안을 빠르게 만듭니다",
        subtitle: "내용을 정리하고, 문장을 만들고, 발표의 뼈대를 세우는 일은 이미 크게 빨라졌습니다.",
        points: ["자료 요약", "문장 초안", "발표 구성"],
        narration: "GPT는 자료를 정리하고, 문장 초안을 만들고, 발표의 뼈대를 세우는 일을 빠르게 해냅니다. 이제 문제는 초안을 만드는 데 있지 않습니다.",
        caption: "초안 생성은 빨라졌습니다. 문제는 마지막 편집입니다.",
      },
      {
        id: "02-real-complaints",
        kicker: "실제 사용자 요구",
        title: "한 곳만 고치고 싶은데, 전체가 다시 바뀝니다",
        subtitle: "문장, 슬라이드, 도식을 실제 업무 파일로 옮기는 순간 편집과 서식 복구가 다시 시작됩니다.",
        sources,
        narration: "실제 사용자들의 불만은 비슷합니다. 한 문장만 고치고 싶은데 다른 문단까지 다시 써지고, PPTX는 구조가 깨지거나 이미지처럼 굳습니다. 생성한 문서를 고칠수록 간격과 레이아웃이 달라지기도 합니다.",
        caption: "부분 수정, 구조 보존, 서식 유지가 마지막 단계의 병목입니다.",
      },
      {
        id: "03-core-workflow",
        kicker: "MethodIQ의 해법",
        title: "AI 초고 → 인간 수정 → AI 재편집",
        subtitle: "사람이 고친 내용을 없애지 않고, 필요한 범위만 AI가 다시 읽도록 합니다.",
        flow: ["AI가 초안 작성", "사람이 직접 수정", "선택 범위만 AI 재편집", "완성본 다운로드"],
        narration: "MethodIQ가 해결하는 핵심은 왕복 작업입니다. AI가 초안을 만들고, 사람이 직접 고칩니다. 그 수정본에서 필요한 부분만 AI가 다시 읽고 다듬습니다. 사람의 판단은 남고, AI의 장점은 한 번 더 사용됩니다.",
        caption: "사람의 수정은 보존하고, AI는 필요한 범위만 다시 읽습니다.",
      },
      {
        id: "04-gpt-editor",
        kicker: "GPT Editor",
        title: "문서 전체가 아니라, 고른 문장만 다시 다듬습니다",
        subtitle: "원본과 현재본을 비교하고, 선택한 문단만 AI에 보내 결과를 제자리에 반영합니다.",
        image: inputScreens.gpt,
        badge: "선택 범위 편집",
        narration: "GPT Editor에서는 AI 초안을 편집창에서 직접 고칩니다. 원본과 현재본을 비교하고, 선택한 문장이나 문단만 다시 다듬어 달라고 요청합니다. 결과는 같은 편집창의 제자리에 반영됩니다.",
        caption: "GPT Editor: 선택한 문장만 AI와 다시 주고받습니다.",
      },
      {
        id: "05-chart-studio",
        kicker: "Chart Studio",
        title: "차트는 그리는 순간부터 완성도를 관리합니다",
        subtitle: "스타일 프리셋으로 색상, 글꼴, 제목, 범례를 맞추고 해석과 함께 PPTX로 보냅니다.",
        image: inputScreens.chart,
        badge: "스타일 + 해석 + PPTX",
        narration: "Chart Studio는 데이터를 그림으로 바꾸는 단계부터 시작합니다. 스타일 프리셋을 고르면 색상과 글꼴, 제목과 범례가 함께 정리됩니다. 차트 해석을 확인한 뒤, 편집 가능한 결과를 PPTX로 바로 보냅니다.",
        caption: "Chart Studio: 완성도 높은 차트와 해석을 PPTX로 전달합니다.",
      },
      {
        id: "06-diagram-studio",
        kicker: "Diagram Studio",
        title: "텍스트 구조를 편집 가능한 도식으로 바꿉니다",
        subtitle: "사람이 노드와 문구를 고치면, AI가 수정된 전체 흐름을 다시 읽고 정리합니다.",
        image: inputScreens.diagram,
        badge: "텍스트 → 도식 → 재편집",
        narration: "Diagram Studio는 GPT가 정리한 내용을 도식으로 바꿉니다. 사람은 노드와 문구, 연결선을 직접 고칩니다. AI는 사람이 수정한 전체 흐름을 다시 읽고, 균형과 표현을 다듬습니다.",
        caption: "Diagram Studio: 이미지가 아니라, 다시 고칠 수 있는 도식입니다.",
      },
      {
        id: "07-pptx-studio",
        kicker: "PPTX Studio",
        title: "긴 발표도 필요한 1~2장만 다시 편집합니다",
        subtitle: "전체 파일은 한 번 불러오고, 선택한 슬라이드만 AI와 왕복한 뒤 최종 PPTX를 내려받습니다.",
        image: inputScreens.pptx,
        badge: "1~2장 부분 편집",
        narration: "PPTX Studio는 새 발표를 생성하는 도구가 아닙니다. GPT가 만든 파일을 한 번 불러온 뒤, 필요한 한두 장만 골라 AI에 다시 보냅니다. 수정한 슬라이드는 원래 위치로 돌아오고, 마지막 파일은 앱에서 내려받습니다.",
        caption: "PPTX Studio: 전체를 흔들지 않고 필요한 슬라이드만 고칩니다.",
      },
      {
        id: "08-closing",
        kicker: "MethodIQ AI Office Workflow",
        title: "AI가 만든 것을, 업무에서 끝까지 사용할 수 있게",
        subtitle: "초안 생성과 최종 편집 사이의 끊어진 구간을 하나의 작업 흐름으로 연결합니다.",
        flow: ["GPT 초안", "사람의 판단", "AI 재검토", "편집 가능한 최종 파일"],
        narration: "AI는 사무실 작업을 크게 도와줍니다. MethodIQ의 도구들은 그 도움을 초안에서 멈추지 않게 합니다. 사람의 판단과 AI의 재검토를 연결해, 실제로 고칠 수 있는 최종 파일까지 완성합니다.",
        caption: "초안이 아니라, 사람이 통제할 수 있는 완성본까지.",
      },
    ],
  },
  {
    id: "gpt-editor-tutorial",
    title: "GPT Editor 사용법",
    youtubeTitle: "GPT Editor 사용법 | AI 초고와 인간 수정을 왕복시키기",
    description: "AI가 만든 글을 편집창에서 수정하고 선택한 범위만 다시 AI에 보내 완성하는 방법입니다.",
    scenes: [
      { id: "01-open", kicker: "GPT Editor 사용법", title: "AI 초고를 편집창으로 가져옵니다", subtitle: "대화창에서 만든 글 전체를 처음 한 번 전달합니다.", image: inputScreens.gpt, badge: "1. 초고 가져오기", narration: "먼저 대화창에서 만든 글을 GPT Editor로 가져옵니다. 처음에는 문서 전체를 전달해도 됩니다. 편집이 시작된 뒤부터는 필요한 범위만 다시 보냅니다.", caption: "1. AI 초고 전체를 편집창으로 가져옵니다." },
      { id: "02-human-edit", kicker: "GPT Editor 사용법", title: "사람이 용어와 문장을 직접 고칩니다", subtitle: "회사 용어, 수치, 문장 톤처럼 사람이 더 정확히 아는 부분을 편집합니다.", image: inputScreens.gpt, badge: "2. 인간 수정", narration: "다음으로 사람이 직접 고칩니다. 회사에서 쓰는 용어, 수치의 의미, 문장의 톤처럼 사람이 더 정확히 아는 부분을 편집합니다. 원본과 현재본을 비교할 수도 있습니다.", caption: "2. 사람의 판단이 필요한 부분을 직접 수정합니다." },
      { id: "03-ai-revise", kicker: "GPT Editor 사용법", title: "고른 문장만 AI에 다시 보냅니다", subtitle: "선택 영역, 현재 문단, 전체 문서 중 범위를 정하고 명령합니다.", image: inputScreens.gpt, badge: "3. 선택 범위 AI 재편집", narration: "이제 다듬을 문장만 고릅니다. 선택 영역이나 현재 문단을 지정하고, 앞의 수치와 문장은 바꾸지 말라고 명확히 요청합니다. AI는 선택한 범위만 다시 작성합니다.", caption: "3. 선택한 범위만 AI가 다시 다듬습니다." },
      { id: "04-finish", kicker: "GPT Editor 사용법", title: "결과를 반영하고 최종본을 저장합니다", subtitle: "AI의 제안을 그대로 쓰거나, 일부만 반영하고 다시 수정할 수 있습니다.", flow: ["결과 확인", "필요한 부분만 반영", "현재본 태그", "저장"], narration: "AI의 제안을 확인한 뒤 필요한 부분만 반영합니다. 마음에 들지 않으면 다시 직접 고칠 수 있습니다. 현재본에 태그를 남기고 저장하면, 초고와 인간 수정, AI 재편집의 과정이 하나의 문서 안에 남습니다.", caption: "4. 제안을 선택적으로 반영하고 최종본을 저장합니다." },
    ],
  },
  {
    id: "chart-to-pptx-tutorial",
    title: "Chart Studio에서 PPTX까지",
    youtubeTitle: "Chart Studio 사용법 | 스타일 차트·AI 해석·PPTX 전달",
    description: "스타일 프리셋으로 고품질 차트를 만들고, AI 해석과 함께 PPTX로 보내는 방법입니다.",
    scenes: [
      { id: "01-data", kicker: "Chart Studio 사용법", title: "데이터와 차트 목적을 확인합니다", subtitle: "비교, 변화, 구성, 흐름 중 무엇을 보여줄지 먼저 정합니다.", image: inputScreens.chart, badge: "1. 목적과 데이터", narration: "먼저 데이터와 차트의 목적을 확인합니다. 집단 비교인지, 시간에 따른 변화인지, 구성 비율인지, 흐름인지에 따라 적합한 차트가 달라집니다.", caption: "1. 데이터보다 먼저, 보여줄 관계를 정합니다." },
      { id: "02-style", kicker: "Chart Studio 사용법", title: "스타일 프리셋을 먼저 선택합니다", subtitle: "색상 하나씩 고르지 않아도 제목, 글꼴, 범례, 주석이 함께 정리됩니다.", image: inputScreens.chart, badge: "2. 스타일 프리셋", narration: "다음은 스타일입니다. 색상을 하나씩 고르는 대신 프리셋을 선택합니다. 제목과 글꼴, 범례와 주석이 한 번에 맞춰져 차트마다 흔들리지 않는 브랜드 표현을 만듭니다.", caption: "2. 프리셋으로 디자인 기준을 먼저 고정합니다." },
      { id: "03-advanced", kicker: "Chart Studio 사용법", title: "Excel에서 번거로운 차트도 바로 만듭니다", subtitle: "Sankey는 이동 흐름을, sunflower는 겹친 빈도를 더 정확히 보여줍니다.", gallery: [inputScreens.sankey, inputScreens.sunflower], galleryLabels: ["Sankey: 이동과 전환", "Sunflower: 겹친 관측값"], narration: "필요하면 Excel에서 만들기 번거로운 차트도 선택합니다. Sankey는 이동과 전환의 흐름을 보여주고, sunflower는 겹친 관측값의 빈도를 드러냅니다. 결과는 단순 이미지에 머물지 않습니다.", caption: "3. Sankey와 sunflower도 편집 가능한 결과로 만듭니다." },
      { id: "04-interpret", kicker: "Chart Studio 사용법", title: "AI가 차트를 읽고 해석 초안을 만듭니다", subtitle: "제목과 데이터, 시각적 패턴을 함께 전달해 수치에 근거한 설명을 작성합니다.", image: inputScreens.chart, badge: "4. 차트 해석", narration: "차트가 완성되면 AI에 해석을 요청합니다. 제목과 데이터, 차트가 보여주는 패턴을 함께 전달하므로, 막연한 설명이 아니라 수치에 근거한 해석 초안을 받을 수 있습니다.", caption: "4. 차트와 데이터를 함께 읽어 해석 초안을 만듭니다." },
      { id: "05-pptx", kicker: "Chart Studio 사용법", title: "차트와 해석을 PPTX로 함께 보냅니다", subtitle: "PPTX Studio에서 위치와 문장을 다시 고치고 최종 파일을 내려받습니다.", flow: ["차트 확정", "해석 확인", "PPTX로 보내기", "슬라이드에서 최종 편집"], narration: "마지막으로 차트와 해석을 PPTX Studio로 함께 보냅니다. 슬라이드에서 크기와 위치를 조정하고, 해석 문장도 다시 고칠 수 있습니다. 최종 발표 파일은 PPTX Studio에서 내려받습니다.", caption: "5. 차트와 해석을 PPTX로 보내 최종 편집합니다." },
    ],
  },
  {
    id: "diagram-to-pptx-tutorial",
    title: "Diagram Studio에서 PPTX까지",
    youtubeTitle: "Diagram Studio 사용법 | 텍스트를 편집 가능한 도식으로",
    description: "GPT의 텍스트 구조를 도식화하고 사람이 편집한 뒤 AI가 다시 다듬어 PPTX로 보내는 방법입니다.",
    scenes: [
      { id: "01-structure", kicker: "Diagram Studio 사용법", title: "GPT가 도식의 내용을 먼저 구조화합니다", subtitle: "단계, 관계, 분기, 원인과 결과를 짧은 텍스트로 정리합니다.", flow: ["긴 설명", "핵심 개념 추출", "관계와 순서 정리", "도식 원문"], narration: "먼저 GPT가 긴 설명에서 핵심 개념과 관계를 정리합니다. 단계인지, 분기인지, 원인과 결과인지가 드러나도록 도식의 원문을 만듭니다.", caption: "1. GPT가 도식화할 내용을 구조화합니다." },
      { id: "02-render", kicker: "Diagram Studio 사용법", title: "텍스트를 편집 가능한 도식으로 바꿉니다", subtitle: "노드, 문구, 연결선이 살아 있어 이미지보다 쉽게 고칠 수 있습니다.", image: inputScreens.diagram, badge: "2. 도식 생성", narration: "Diagram Studio가 구조화된 텍스트를 도식으로 바꿉니다. 노드와 문구, 연결선이 살아 있으므로 이미지로 받은 그림보다 훨씬 쉽게 고칠 수 있습니다.", caption: "2. 이미지가 아니라 편집 가능한 도식을 만듭니다." },
      { id: "03-roundtrip", kicker: "Diagram Studio 사용법", title: "사람이 고친 전체 흐름을 AI가 다시 읽습니다", subtitle: "문구와 연결을 직접 수정한 뒤, 균형과 표현을 다시 다듬어 달라고 요청합니다.", image: inputScreens.diagram, badge: "3. 인간 수정 → AI 재검토", narration: "사람이 실제 업무에 맞게 문구와 연결을 고칩니다. 그다음 AI에 수정된 전체 흐름을 다시 읽히고, 빠진 단계나 어색한 표현, 균형을 점검해 달라고 요청합니다.", caption: "3. 인간의 수정본을 AI가 다시 읽고 정리합니다." },
      { id: "04-pptx", kicker: "Diagram Studio 사용법", title: "확정한 SVG를 PPTX로 보냅니다", subtitle: "슬라이드에서 크기와 위치를 조정하고 필요한 요소를 다시 편집합니다.", flow: ["도식 확정", "SVG 내보내기", "PPTX로 보내기", "슬라이드 최종 편집"], narration: "도식이 확정되면 SVG로 내보내거나 PPTX Studio로 바로 보냅니다. 슬라이드에서 크기와 위치를 조정하고, 필요한 문구와 요소를 다시 편집해 최종 발표에 넣습니다.", caption: "4. 확정한 도식을 PPTX로 보내 마무리합니다." },
    ],
  },
  {
    id: "pptx-partial-edit-tutorial",
    title: "PPTX Studio 부분 편집",
    youtubeTitle: "PPTX Studio 사용법 | 긴 발표에서 1~2장만 AI로 다시 편집",
    description: "GPT가 만든 PPTX를 불러와 필요한 1~2장만 AI로 재편집하고 최종 파일을 내려받는 방법입니다.",
    scenes: [
      { id: "01-upload", kicker: "PPTX Studio 사용법", title: "GPT가 만든 PPTX를 한 번 불러옵니다", subtitle: "전체 파일은 처음에만 전달하고, 앱이 슬라이드 구조와 순서를 유지합니다.", image: inputScreens.pptx, badge: "1. 전체 파일 불러오기", narration: "대화창에서 GPT가 만든 PPTX를 처음 한 번 불러옵니다. 앱은 슬라이드의 구조와 순서를 유지하고, 전체 파일을 편집창에서 확인할 수 있게 합니다.", caption: "1. 전체 PPTX는 처음 한 번만 불러옵니다." },
      { id: "02-select", kicker: "PPTX Studio 사용법", title: "고칠 슬라이드를 1~2장만 고릅니다", subtitle: "100장짜리 발표도 선택한 장과 필요한 목차 정보만 AI에 보냅니다.", image: inputScreens.pptx, badge: "2. 1~2장 선택", narration: "고칠 슬라이드를 한두 장만 고릅니다. 발표가 백 장이어도 매번 전체 파일을 보낼 필요가 없습니다. 선택한 장과 위치를 이해하는 데 필요한 목차 정보만 AI에 전달합니다.", caption: "2. 필요한 1~2장만 선택해 AI에 보냅니다." },
      { id: "03-edit", kicker: "PPTX Studio 사용법", title: "원하는 수정만 구체적으로 요청합니다", subtitle: "문장 추가·삭제, 내용 보강, 차트와 도식 삽입을 선택한 장에만 적용합니다.", image: inputScreens.pptx, badge: "3. 부분 재편집", narration: "선택한 슬라이드에서 문장을 추가하거나 삭제하고, 내용을 보강하거나 차트와 도식을 넣어 달라고 요청합니다. AI가 수정한 장은 편집창의 원래 위치로 돌아옵니다.", caption: "3. 선택한 장에만 문장·차트·도식 수정을 적용합니다." },
      { id: "04-download", kicker: "PPTX Studio 사용법", title: "전체 흐름을 확인하고 PPTX를 내려받습니다", subtitle: "필요한 장을 같은 방식으로 반복한 뒤 최종 파일을 앱에서 다운로드합니다.", flow: ["수정 장 확인", "필요하면 다시 선택", "전체 순서 검토", "PPTX 다운로드"], narration: "수정한 장이 전체 발표 흐름과 맞는지 확인합니다. 다른 장이 필요하면 같은 방식으로 반복합니다. 편집이 끝나면 최종 PPTX를 앱에서 내려받습니다.", caption: "4. 부분 편집을 반복하고 최종 PPTX를 다운로드합니다." },
    ],
  },
];

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: root, stdio: "inherit", shell: false, ...options });
  if (result.status !== 0) throw new Error(`${command} failed with exit code ${result.status}`);
}

function capture(command, args) {
  const result = spawnSync(command, args, { cwd: root, encoding: "utf8", shell: false });
  if (result.status !== 0) throw new Error(result.stderr || `${command} failed`);
  return result.stdout.trim();
}

function escapeHtml(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function imageDataUrl(file) {
  return `data:image/png;base64,${fs.readFileSync(file).toString("base64")}`;
}

function duration(file) {
  return Number.parseFloat(capture(ffprobe, ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", file]));
}

function srtTime(seconds) {
  const total = Math.round(seconds * 1000);
  const ms = total % 1000;
  const s = Math.floor(total / 1000) % 60;
  const m = Math.floor(total / 60000) % 60;
  const h = Math.floor(total / 3600000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(ms).padStart(3, "0")}`;
}

function sceneHtml(video, scene, index) {
  const points = scene.points?.map((item) => `<div class="point">${escapeHtml(item)}</div>`).join("") ?? "";
  const flow = scene.flow?.map((item, i) => `<div class="flow-item"><span>${String(i + 1).padStart(2, "0")}</span><strong>${escapeHtml(item)}</strong></div>${i < scene.flow.length - 1 ? '<div class="arrow">→</div>' : ""}`).join("") ?? "";
  const sourceCards = scene.sources?.map((item) => `<article class="source"><small>${escapeHtml(item.label)}</small><strong>${escapeHtml(item.text)}</strong><em>${escapeHtml(new URL(item.url).pathname.split("/").filter(Boolean).at(-1))}</em></article>`).join("") ?? "";
  const image = scene.image ? `<div class="browser"><div class="browser-top"><i></i><i></i><i></i><span>ci.methodiq.tools · ${escapeHtml(scene.kicker)}</span></div><img src="${imageDataUrl(scene.image)}"><b>${escapeHtml(scene.badge ?? "실제 앱 화면")}</b></div>` : "";
  const gallery = scene.gallery ? `<div class="gallery">${scene.gallery.map((file, i) => `<figure><img src="${imageDataUrl(file)}"><figcaption>${escapeHtml(scene.galleryLabels?.[i] ?? "")}</figcaption></figure>`).join("")}</div>` : "";
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>
    *{box-sizing:border-box}body{margin:0;background:#f5f4ef;color:#10292e;font-family:"Malgun Gothic","Noto Sans KR",Arial,sans-serif}.slide{width:1920px;height:1080px;padding:58px 76px 86px;position:relative;overflow:hidden;background:radial-gradient(circle at 88% 8%,rgba(21,111,111,.17),transparent 33%),linear-gradient(135deg,#fbfaf7,#eef4f0)}
    .top{display:flex;align-items:center;justify-content:space-between}.brand{font-size:22px;font-weight:900;letter-spacing:.08em;color:#176765}.kicker{padding:10px 18px;border-radius:999px;background:#fff;border:1px solid rgba(23,103,101,.24);font-size:19px;font-weight:850;color:#176765}h1{margin:30px 0 12px;max-width:1600px;font-size:60px;line-height:1.14;letter-spacing:-.045em}.sub{margin:0;max-width:1530px;color:#52666a;font-size:28px;line-height:1.45;font-weight:650}.points{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;margin-top:68px}.point{min-height:180px;display:flex;align-items:center;justify-content:center;padding:28px;border-radius:24px;background:#fff;border:1px solid rgba(16,41,46,.08);box-shadow:0 18px 52px rgba(16,41,46,.1);font-size:38px;font-weight:900;color:#176765}
    .flows{display:flex;align-items:stretch;gap:14px;margin-top:68px}.flow-item{flex:1;min-height:180px;display:flex;flex-direction:column;justify-content:center;gap:14px;padding:26px;border-radius:24px;background:#fff;box-shadow:0 18px 48px rgba(16,41,46,.09)}.flow-item span{color:#d96f45;font-size:20px;font-weight:900}.flow-item strong{font-size:29px;line-height:1.35}.arrow{display:flex;align-items:center;color:#d96f45;font-size:44px;font-weight:900}
    .sources{display:grid;grid-template-columns:repeat(3,1fr);gap:22px;margin-top:48px}.source{min-height:250px;padding:30px;border-radius:22px;background:#fff;box-shadow:0 17px 46px rgba(16,41,46,.09)}.source small{display:block;color:#d96f45;font-size:20px;font-weight:900}.source strong{display:block;margin-top:22px;font-size:27px;line-height:1.45}.source em{display:block;margin-top:24px;color:#7b8a8d;font-size:15px;font-style:normal;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .browser{position:absolute;left:76px;right:76px;top:270px;height:700px;border-radius:24px;overflow:hidden;background:#fff;border:1px solid rgba(16,41,46,.13);box-shadow:0 28px 80px rgba(16,41,46,.17)}.browser-top{height:48px;display:flex;align-items:center;gap:10px;padding:0 18px;background:#edf1f1;border-bottom:1px solid #d8dfdf}.browser-top i{width:12px;height:12px;border-radius:50%;background:#d36f62}.browser-top i:nth-child(2){background:#d3a94d}.browser-top i:nth-child(3){background:#55a276}.browser-top span{margin-left:12px;color:#6e7d80;font-size:16px}.browser img{width:100%;height:652px;object-fit:cover;object-position:top}.browser b{position:absolute;right:28px;top:72px;padding:13px 20px;border-radius:999px;background:#d96f45;color:#fff;font-size:20px;box-shadow:0 8px 25px rgba(0,0,0,.18)}
    .gallery{display:grid;grid-template-columns:1fr 1fr;gap:26px;margin-top:38px}.gallery figure{margin:0;height:600px;overflow:hidden;border-radius:22px;background:#fff;box-shadow:0 22px 60px rgba(16,41,46,.14);position:relative}.gallery img{width:100%;height:100%;object-fit:cover;object-position:top}.gallery figcaption{position:absolute;left:20px;bottom:20px;padding:12px 18px;border-radius:999px;background:#176765;color:#fff;font-size:20px;font-weight:900}
    .caption{position:absolute;left:0;right:0;bottom:0;height:68px;display:flex;align-items:center;justify-content:center;padding:0 100px;background:rgba(9,28,32,.94);color:#fff;font-size:27px;font-weight:850;letter-spacing:-.02em}.progress{position:absolute;top:0;left:0;height:6px;background:#d96f45;width:${((index + 1) / video.scenes.length) * 100}%}.count{position:absolute;right:30px;bottom:22px;color:#b9c5c7;font-size:16px}.title-tag{position:absolute;left:76px;bottom:22px;color:#b9c5c7;font-size:16px;font-weight:800}
  </style></head><body><main class="slide"><div class="progress"></div><div class="top"><div class="brand">CONSUMER INSIGHT · METHODIQ</div><div class="kicker">${escapeHtml(scene.kicker)}</div></div><h1>${escapeHtml(scene.title)}</h1><p class="sub">${escapeHtml(scene.subtitle)}</p>${points ? `<div class="points">${points}</div>` : ""}${flow ? `<div class="flows">${flow}</div>` : ""}${sourceCards ? `<div class="sources">${sourceCards}</div>` : ""}${image}${gallery}<div class="caption">${escapeHtml(scene.caption)}<span class="title-tag">${escapeHtml(video.title)}</span><span class="count">${String(index + 1).padStart(2, "0")} / ${String(video.scenes.length).padStart(2, "0")}</span></div></main></body></html>`;
}

async function synthesizeScene(video, scene, audioDir, narrationDir) {
  const textPath = path.join(narrationDir, `${scene.id}.txt`);
  const audioPath = path.join(audioDir, `${scene.id}.wav`);
  await writeFile(textPath, `${scene.narration.trim()}\n`, "utf8");
  if (!reuseAudio || !fs.existsSync(audioPath)) {
    run("node", [path.join(root, "scripts", "synthesize-speech.mjs"), "--input", textPath, "--output", audioPath]);
  }
  scene.audio = audioPath;
  scene.duration = duration(audioPath) + 0.85;
}

async function renderVideo(browser, video) {
  const videoRoot = path.join(outRoot, video.id);
  const slidesDir = path.join(videoRoot, "slides");
  const narrationDir = path.join(videoRoot, "narration");
  const audioDir = path.join(videoRoot, "audio");
  const clipsDir = path.join(videoRoot, "clips");
  await Promise.all([slidesDir, narrationDir, audioDir, clipsDir].map((dir) => mkdir(dir, { recursive: true })));
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  try {
    for (const [index, scene] of video.scenes.entries()) {
      await page.setContent(sceneHtml(video, scene, index), { waitUntil: "networkidle" });
      await page.screenshot({ path: path.join(slidesDir, `${scene.id}.png`) });
      await synthesizeScene(video, scene, audioDir, narrationDir);
    }
  } finally {
    await page.close();
  }

  const concatLines = [];
  const srtLines = [];
  let cursor = 0;
  for (const [index, scene] of video.scenes.entries()) {
    const slide = path.join(slidesDir, `${scene.id}.png`);
    const clip = path.join(clipsDir, `${scene.id}.mp4`);
    run(ffmpeg, ["-y", "-loglevel", "error", "-loop", "1", "-framerate", "30", "-i", slide, "-i", scene.audio, "-filter_complex", "[1:a]apad=pad_dur=0.85[a]", "-map", "0:v", "-map", "[a]", "-t", scene.duration.toFixed(3), "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-tune", "stillimage", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "160k", "-ar", "24000", "-movflags", "+faststart", clip]);
    concatLines.push(`file '${clip.replaceAll("\\", "/").replaceAll("'", "'\\''")}'`);
    srtLines.push(String(index + 1), `${srtTime(cursor)} --> ${srtTime(cursor + scene.duration)}`, scene.caption, "");
    cursor += scene.duration;
  }
  const concatPath = path.join(videoRoot, "concat.txt");
  const srtPath = path.join(videoRoot, `${video.id}.ko.srt`);
  const finalPath = path.join(outRoot, `${video.id}-current.mp4`);
  await writeFile(concatPath, `${concatLines.join("\n")}\n`, "utf8");
  await writeFile(srtPath, `${srtLines.join("\n")}\n`, "utf8");
  run(ffmpeg, ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", concatPath, "-c", "copy", "-movflags", "+faststart", finalPath]);
  const samplePath = path.join(videoRoot, "sample-frame.png");
  run(ffmpeg, ["-y", "-loglevel", "error", "-ss", Math.min(3, Math.max(0.5, cursor / 3)).toFixed(2), "-i", finalPath, "-frames:v", "1", samplePath]);
  return {
    id: video.id,
    title: video.title,
    youtubeTitle: video.youtubeTitle,
    description: video.description,
    file: finalPath,
    subtitle: srtPath,
    sampleFrame: samplePath,
    durationSeconds: duration(finalPath),
    bytes: fs.statSync(finalPath).size,
    sha256: createHash("sha256").update(await readFile(finalPath)).digest("hex"),
  };
}

for (const file of Object.values(inputScreens)) {
  if (!fs.existsSync(file)) throw new Error(`Required app screenshot is missing: ${file}`);
}
if ((process.env.PR_STUDIO_TTS_PROVIDER_KO ?? "") !== "google") {
  throw new Error("Set PR_STUDIO_TTS_PROVIDER_KO=google before rendering.");
}
await mkdir(outRoot, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ["--font-render-hinting=none"] });
const rendered = [];
try {
  for (const video of videos) rendered.push(await renderVideo(browser, video));
} finally {
  await browser.close();
}
const report = {
  renderedAt: new Date().toISOString(),
  narrationProvider: "google",
  voice: process.env.GOOGLE_TTS_VOICE_KO ?? "ko-KR-Chirp3-HD-Kore",
  speakingRate: Number(process.env.GOOGLE_TTS_SPEAKING_RATE ?? 0.94),
  resolution: "1920x1080",
  fps: 30,
  sourceScreens: inputScreens,
  publicSources: sources,
  videos: rendered,
};
await writeFile(path.join(outRoot, "render-report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
await writeFile(path.join(outRoot, "youtube-metadata.json"), `${JSON.stringify(videos.map(({ id, youtubeTitle, description }) => ({ id, youtubeTitle, description })), null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));
