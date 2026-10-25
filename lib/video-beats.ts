export type BeatMedium = "motion" | "still" | "insert";
export type InsertKind = "table" | "chart" | "diagram";
export type VideoTrack = "press" | "news" | "youtube";

export type ManifestBrief = {
  purpose: string;
  targetAudience: string;
  track: VideoTrack;
  targetDurationSec?: number;
  outline?: string;
};

export type InsertCard = {
  kind: InsertKind;
  title: string;
  caption: string;
  rows: { label: string; value: string; emphasis?: boolean }[];
};

export type VideoBeat = {
  id: string;
  screenId: string;
  medium: BeatMedium;
  purpose: string;
  viewerTakeaway: string;
  screenAction: string;
  transitionReason: string;
  minScreenTimeMs: number;
  estimatedNarrationMs: number;
  /** @deprecated 단계 5 이전 제작 스크립트 호환 필드 */
  action: string;
  focus: string;
  /** @deprecated viewerTakeaway를 사용한다. */
  point: string;
  narration: string;
  subtitle: string;
  /** @deprecated minScreenTimeMs를 사용한다. */
  minHoldMs: number;
  postPauseMs: number;
  evidence: string;
  observe: string;
  insert?: InsertCard;
};

export type VideoFixtures = {
  press: {
    policyName: string;
    business: string;
    budget: string;
    audience: string;
    expectedEffect: string;
  };
  newsArticles: string;
  youtube: {
    policyText: string;
    audience: string;
    durationMinutes: string;
  };
};

export type VideoRuntimeTools = {
  capture: "chromium";
  cards: "chromium-html";
  voice: "openai-tts";
  assemble: "ffmpeg";
  review: "ffmpeg+tesseract";
};

export type BeatManifest = {
  version: "2.0";
  title: string;
  audience: string;
  purpose: string;
  track: VideoTrack;
  model: string;
  mode: "gpt" | "local";
  summary: string;
  viewerPromise: string;
  timing: {
    targetSec: number;
    minSec: number;
    maxSec: number;
    estimatedSec: number;
  };
  runtime: VideoRuntimeTools;
  preset: VideoPreset;
  beats: VideoBeat[];
  fixtures: VideoFixtures;
};

export type BeatDraft = {
  screenId: string;
  medium?: BeatMedium;
  purpose?: string;
  viewerTakeaway?: string;
  transitionReason?: string;
  action?: string;
  focus?: string;
  point?: string;
  narration?: string;
  subtitle?: string;
};

export type CaptureMark = {
  beatId: string;
  screenId: string;
  startedAtMs: number;
  endedAtMs: number;
  screenshot: string;
  observedText: string;
  observationBox?: { x: number; y: number; width: number; height: number };
  captureViewport?: { width: number; height: number };
  stableFromMs?: number;
  stableToMs?: number;
};

export type ReviewProbe = {
  hasAudio: boolean;
  width: number;
  height: number;
  ocrAvailable: boolean;
};

const FORBIDDEN_CLAIM = /(?:AI|인공지능|GPT|모델)(?:이|가|은|는)?\s*(?:직접\s*)?(?:작성|생성|분석|만들)/u;

export const videoFixtures: VideoFixtures = {
  press: {
    policyName: "청년 지역정착 패키지",
    business: "지역 기업 일자리 연계, 월 최대 30만 원 주거비 지원, 생활 기반 상담 통합 제공",
    budget: "120억 원",
    audience: "만 19세부터 34세까지의 지역 청년",
    expectedEffect: "초기 정착 비용을 낮추고 지역 기업의 인재 확보를 지원",
  },
  newsArticles: `언론사: 서울정책신문
제목: 청년 지역정착 패키지 확대, 현장 기대감 커져
청년 주거비 지원과 지역 기업 일자리 연계가 강화되며 현장에서는 정책 효과에 대한 기대가 커지고 있다.
---
언론사: 시민경제
제목: 120억 예산 집행 기준 놓고 형평성 우려
일부 시민단체는 지원 대상 선정 기준이 부족하면 예산 부담과 형평성 논란이 생길 수 있다고 지적했다.
---
언론사: 지역미래
제목: 지역 기업 인재 확보에 청년 정책 효과 기대
지역 기업들은 청년 정착 지원이 인력난 해소에 도움이 될 것으로 보고 있다.`,
  youtube: {
    policyText:
      "청년 지역정착 패키지는 지역 기업 일자리 연계, 주거비 지원, 생활 기반 상담을 통합 제공하는 정책이다. 총 120억 원을 투입해 청년의 초기 정착 비용을 낮추고 지역 기업의 인재 확보를 돕는다.",
    audience: "일반 시민과 정책 관심층",
    durationMinutes: "6",
  },
};

const runtimeTools: VideoRuntimeTools = {
  capture: "chromium",
  cards: "chromium-html",
  voice: "openai-tts",
  assemble: "ffmpeg",
  review: "ffmpeg+tesseract",
};

export type VideoPreset = {
  track: VideoTrack;
  label: string;
  durationSec: { target: number; min: number; max: number };
  principles: string[];
  materialsOnHand: string[];
  tools: { id: string; description: string }[];
  method: string;
  subtitle: { position: string; fontSize: number; alignment: number; marginV: number; outline: number };
  voice: { provider: string; voice: string; speakingRate: number };
};

const sharedTools: VideoPreset["tools"] = [
  { id: "chromium", description: "기획 수집에서는 등록된 예시를 앱에 입력하고 실행해 결과 문구를 확인하며, 제작 승인 뒤에는 정해진 장면 동작을 녹화한다" },
  { id: "html-card", description: "표, 차트, 도식을 1920x1080 카드 이미지로 만든다" },
  { id: "openai-tts", description: "한국어 문맥과 문장 호흡을 반영한 명시적 OpenAI 음성으로 만든다" },
  { id: "ffmpeg", description: "장면, 음성, 하단 자막을 1080p MP4로 조립한다" },
  { id: "tesseract", description: "만들어진 프레임에서 한글 화면 글자를 읽는다" },
  { id: "video-analyzer", description: "이미 만들어진 MP4의 시간표, 프레임, 대사를 읽는다. 파일이 없으면 없다" },
];

const sharedPrinciples = [
  "한 장면은 한 가지를 말한다",
  "입력, 실행, 결과 순서를 지킨다",
  "화면에 없는 수치와 효과를 만들지 않는다",
  "화면의 결과를 모델이 작성했다고 말하지 않는다",
];

const demoLook = {
  subtitle: { position: "하단 중앙", fontSize: 46, alignment: 2, marginV: 64, outline: 14 },
  voice: { provider: "openai", voice: "marin", speakingRate: 0.94 },
};

export const videoPresets: Record<VideoTrack, VideoPreset> = {
  press: {
    track: "press",
    label: "보도자료 데모",
    durationSec: { target: 75, min: 45, max: 120 },
    principles: sharedPrinciples,
    materialsOnHand: ["보도자료 입력 예시", "보도자료 화면", "기능 요약표", "입력-생성-결과 도식"],
    tools: sharedTools,
    method: "앱에서 정책 정보를 입력하고 생성 결과를 보여 준 뒤, 표와 도식으로 흐름을 잇는다",
    ...demoLook,
  },
  news: {
    track: "news",
    label: "뉴스 분석 데모",
    durationSec: { target: 80, min: 45, max: 120 },
    principles: sharedPrinciples,
    materialsOnHand: ["기사 원문 3건", "뉴스 분석 화면", "기사 수 차트", "기능 요약표"],
    tools: sharedTools,
    method: "기사 원문을 넣고 분석 결과와 자동 보고서를 보여 준 뒤, 입력 기사 수를 차트로 잇는다",
    ...demoLook,
  },
  youtube: {
    track: "youtube",
    label: "유튜브 제작 데모",
    durationSec: { target: 70, min: 40, max: 120 },
    principles: sharedPrinciples,
    materialsOnHand: ["정책자료 텍스트", "유튜브 제작 화면", "기능 요약표", "입력-생성-결과 도식"],
    tools: sharedTools,
    method: "정책자료를 넣고 대본과 게시 패키지 초안을 보여 준다",
    ...demoLook,
  },
};

export function reportCollection(order: string): { order: string; status: "있음" | "없음"; detail: string } {
  const text = order.trim();
  if (!text) return { order, status: "없음", detail: "빈 지시" };
  const known = [
    { keys: ["보도자료", "정책명", "press-input"], detail: "보도자료 입력 예시와 화면이 있다" },
    { keys: ["뉴스", "기사", "news-input"], detail: "기사 원문 3건과 뉴스 분석 화면이 있다" },
    { keys: ["유튜브", "youtube-input"], detail: "정책자료 텍스트와 유튜브 제작 화면이 있다" },
    { keys: ["자막", "글자 크기", "폰트"], detail: "자막은 하단 중앙, 글자 크기 46, 아래 여백 64로 정해져 있다" },
    { keys: ["음성", "목소리", "tts"], detail: "음성은 OpenAI marin이며 자연스러운 한국어 제품 설명 지시를 사용한다" },
    { keys: ["캡처", "화면", "chromium"], detail: "Chromium으로 앱 화면을 연다" },
    { keys: ["요약표", "차트", "도식", "다이어그램"], detail: "표, 차트, 도식 카드를 만든다" },
    { keys: ["분석기", "analyzer", "시간표"], detail: "분석 도구는 있다. 이미 만들어진 MP4가 없으면 시간표는 없다" },
  ];
  const hit = known.find((item) => item.keys.some((key) => text.toLowerCase().includes(key.toLowerCase())));
  if (hit) return { order: text, status: "있음", detail: hit.detail };
  return { order: text, status: "없음", detail: "앱에 그 자료나 도구가 없다" };
}

type ScreenDef = {
  id: string;
  tracks: VideoTrack[] | "shared";
  medium: BeatMedium;
  purpose: string;
  transitionReason: string;
  action: string;
  focus: string;
  narration: string;
  subtitle: string;
  evidence: string;
  observe: string;
  minHoldMs: number;
  postPauseMs: number;
  insert?: (track: VideoTrack) => InsertCard;
};

const screens: ScreenDef[] = [
  {
    id: "feature-summary",
    tracks: "shared",
    medium: "insert",
    purpose: "이번 영상이 다룰 기능과 범위를 먼저 한정한다",
    transitionReason: "강조한 기능을 실제 입력 화면에서 확인하기 위해 전환한다",
    action: "기능 요약표를 가운데에 보여 준다",
    focus: "이번 영상에서 다룰 기능 행",
    narration: "먼저 이번 영상에서 볼 기능을 표로 짚습니다. 이어서 그 기능이 실제로 동작하는 화면으로 들어갑니다.",
    subtitle: "먼저 볼 기능을 표에서 확인합니다",
    evidence: "보도자료 작성기, 뉴스 분석기, 유튜브 제작이 앱에 있다",
    observe: "기능 요약",
    minHoldMs: 3200,
    postPauseMs: 400,
    insert: summaryCard,
  },
  {
    id: "press-input",
    tracks: ["press"],
    medium: "motion",
    purpose: "보도자료 초안의 근거가 되는 입력 자료를 보여 준다",
    transitionReason: "입력 자료가 결과로 바뀌는 과정을 보기 위해 실행 장면으로 전환한다",
    action: "보도자료 탭에서 정책명을 입력한다",
    focus: "정책명 입력칸",
    narration: "정책명에 청년 지역정착 패키지를 입력합니다. 사업내용, 예산, 대상, 기대효과가 초안의 재료입니다.",
    subtitle: "정책명과 사업 내용을 입력합니다",
    evidence: "정책명, 사업내용, 예산, 대상, 기대효과 입력칸",
    observe: "청년 지역정착 패키지",
    minHoldMs: 2800,
    postPauseMs: 450,
  },
  {
    id: "press-generate",
    tracks: ["press"],
    medium: "motion",
    purpose: "사용자 동작과 결과가 나타나는 시점을 연결한다",
    transitionReason: "생성된 초안과 요약을 충분히 읽기 위해 결과 화면으로 전환한다",
    action: "생성 버튼을 누른다",
    focus: "생성 버튼과 결과가 나타나는 순간",
    narration: "생성을 누릅니다. 입력한 항목이 보도자료 초안과 SNS 요약으로 바뀌는 화면을 확인합니다.",
    subtitle: "생성을 누르면 초안과 SNS 요약이 나타납니다",
    evidence: "생성 버튼 뒤 보도자료 초안과 SNS 요약이 표시된다",
    observe: "SNS 요약",
    minHoldMs: 2400,
    postPauseMs: 400,
  },
  {
    id: "press-output",
    tracks: ["press"],
    medium: "still",
    purpose: "생성 결과와 담당자 검토 필요성을 함께 보여 준다",
    transitionReason: "결과가 확정 문안이 아니라는 점을 전체 흐름으로 정리한다",
    action: "결과 화면을 유지한다",
    focus: "제목, 본문, SNS 요약",
    narration: "보도자료 초안을 먼저 확인합니다. 같은 입력에서 나온 SNS 요약도 함께 있습니다. 사실과 표현은 담당자가 검토합니다.",
    subtitle: "초안과 SNS 요약을 담당자가 검토합니다",
    evidence: "결과 화면에 제목, 본문, SNS 요약이 보인다",
    observe: "SNS 요약",
    minHoldMs: 3600,
    postPauseMs: 500,
  },
  {
    id: "news-input",
    tracks: ["news"],
    medium: "motion",
    purpose: "뉴스 분석의 근거가 되는 기사 원문과 범위를 보여 준다",
    transitionReason: "입력 기사가 어떻게 정리되는지 보기 위해 분석 실행으로 전환한다",
    action: "뉴스 분석 탭에 기사 원문을 넣는다",
    focus: "기사 입력칸",
    narration: "기사 원문 세 건을 넣습니다. 서울정책신문, 시민경제, 지역미래의 제목과 본문이 분석 재료입니다.",
    subtitle: "기사 원문 세 건을 입력합니다",
    evidence: "기사 입력칸에 언론사와 제목, 본문을 넣는다",
    observe: "서울정책신문",
    minHoldMs: 2800,
    postPauseMs: 450,
  },
  {
    id: "news-analyze",
    tracks: ["news"],
    medium: "motion",
    purpose: "사용자 동작과 분석 결과가 나타나는 시점을 연결한다",
    transitionReason: "분석 결과의 의미와 검토 범위를 읽기 위해 결과 화면으로 전환한다",
    action: "분석 버튼을 누른다",
    focus: "분석 버튼과 결과 표시",
    narration: "분석을 누릅니다. 기사 원문이 핵심 이슈와 자동 보고서로 정리되는 화면을 확인합니다.",
    subtitle: "분석을 누르면 이슈와 보고서가 나타납니다",
    evidence: "분석 버튼 뒤 자동 보고서가 표시된다",
    observe: "자동 보고서",
    minHoldMs: 2400,
    postPauseMs: 400,
  },
  {
    id: "news-output",
    tracks: ["news"],
    medium: "still",
    purpose: "자동 보고서의 용도와 원문 대조 필요성을 보여 준다",
    transitionReason: "분석에 사용한 기사 범위를 과장 없이 정리하기 위해 전환한다",
    action: "분석 결과를 유지한다",
    focus: "자동 보고서",
    narration: "자동 보고서에 기사들의 초점이 정리됩니다. 보도 방향의 판단은 담당자가 원문과 맞춰 확인합니다.",
    subtitle: "보고서의 초점을 원문과 맞춰 확인합니다",
    evidence: "결과 화면에 자동 보고서가 보인다",
    observe: "자동 보고서",
    minHoldMs: 3600,
    postPauseMs: 500,
  },
  {
    id: "article-focus",
    tracks: ["news"],
    medium: "insert",
    purpose: "분석 입력이 기사 세 건이라는 사실만 명확히 정리한다",
    transitionReason: "건수와 효과를 혼동하지 않도록 전체 절차와 검토 책임으로 전환한다",
    action: "입력 기사 세 건을 막대로 보여 준다",
    focus: "언론사 세 곳",
    narration: "방금 넣은 기사는 세 건입니다. 막대는 건수를 세는 표시이고, 효과나 점수를 뜻하지 않습니다.",
    subtitle: "입력 기사 세 건을 언론사별로 보여 줍니다",
    evidence: "데모 입력의 언론사 세 곳",
    observe: "서울정책신문",
    minHoldMs: 3000,
    postPauseMs: 400,
    insert: articleChart,
  },
  {
    id: "youtube-input",
    tracks: ["youtube"],
    medium: "motion",
    purpose: "대본과 게시 패키지의 근거가 되는 정책자료를 보여 준다",
    transitionReason: "입력 자료가 초안으로 바뀌는 과정을 보기 위해 실행 장면으로 전환한다",
    action: "유튜브 제작 탭에 정책자료를 넣는다",
    focus: "정책자료 텍스트",
    narration: "정책자료 텍스트를 넣습니다. 이 문장이 대본과 게시 패키지 초안의 재료입니다.",
    subtitle: "정책자료를 유튜브 제작에 넣습니다",
    evidence: "정책자료 텍스트 입력칸",
    observe: "청년 지역정착",
    minHoldMs: 2800,
    postPauseMs: 450,
  },
  {
    id: "youtube-generate",
    tracks: ["youtube"],
    medium: "motion",
    purpose: "사용자 동작과 게시 패키지가 나타나는 시점을 연결한다",
    transitionReason: "생성된 게시 제목과 설명을 읽기 위해 결과 화면으로 전환한다",
    action: "생성 버튼을 누른다",
    focus: "생성 버튼과 게시 패키지",
    narration: "생성을 누릅니다. 정책자료가 영상 대본과 유튜브 게시 패키지 초안으로 바뀌는 화면을 확인합니다.",
    subtitle: "생성을 누르면 게시 패키지 초안이 나타납니다",
    evidence: "생성 버튼 뒤 YouTube 게시 패키지가 표시된다",
    observe: "YouTube 게시 패키지",
    minHoldMs: 2400,
    postPauseMs: 400,
  },
  {
    id: "youtube-output",
    tracks: ["youtube"],
    medium: "still",
    purpose: "게시 패키지의 용도와 공개 전 검토 필요성을 보여 준다",
    transitionReason: "초안이 확정본이 아니라는 점을 전체 흐름으로 정리한다",
    action: "게시 패키지를 유지한다",
    focus: "게시 패키지",
    narration: "게시 제목과 설명 초안을 확인합니다. 공개 전에 표현과 근거는 담당자가 검토합니다.",
    subtitle: "게시 패키지 초안을 담당자가 검토합니다",
    evidence: "결과 화면에 YouTube 게시 패키지가 보인다",
    observe: "YouTube 게시 패키지",
    minHoldMs: 3600,
    postPauseMs: 500,
  },
  {
    id: "flow-diagram",
    tracks: "shared",
    medium: "insert",
    purpose: "입력부터 담당자 검토까지의 책임 있는 사용 흐름을 요약한다",
    transitionReason: "영상의 핵심 절차와 검토 책임을 확인하고 마친다",
    action: "입력, 실행, 결과, 검토 순서를 도식으로 보여 준다",
    focus: "검토 단계",
    narration: "흐름은 입력, 실행, 결과, 담당자 검토 순서입니다. 화면에 나온 초안이 곧 확정 문안은 아닙니다.",
    subtitle: "입력부터 담당자 검토까지의 순서입니다",
    evidence: "입력, 실행, 결과, 검토 순서",
    observe: "담당자 검토",
    minHoldMs: 3000,
    postPauseMs: 450,
    insert: flowCard,
  },
];

const screenById = new Map(screens.map((screen) => [screen.id, screen]));
export const SCREEN_IDS = screens.map((screen) => screen.id);

function screenSupportsTrack(screen: ScreenDef, track: VideoTrack) {
  return screen.tracks === "shared" || screen.tracks.includes(track);
}

const requiredScreens: Record<VideoTrack, string[]> = {
  press: ["press-input", "press-generate", "press-output"],
  news: ["news-input", "news-analyze", "news-output"],
  youtube: ["youtube-input", "youtube-generate", "youtube-output"],
};

const localOrder: Record<VideoTrack, string[]> = {
  press: ["feature-summary", "press-input", "press-generate", "press-output", "flow-diagram"],
  news: ["feature-summary", "news-input", "news-analyze", "news-output", "article-focus", "flow-diagram"],
  youtube: ["feature-summary", "youtube-input", "youtube-generate", "youtube-output", "flow-diagram"],
};

function summaryCard(track: VideoTrack): InsertCard {
  const rows = [
    ["press", "보도자료 작성기", "정책명, 사업내용, 예산, 대상, 기대효과를 입력하면 초안과 SNS 요약이 표시된다"],
    ["news", "뉴스 분석기", "기사 원문을 이슈와 자동 보고서로 정리한다"],
    ["youtube", "유튜브 제작", "정책자료에서 대본과 게시 패키지 초안을 만든다"],
  ].map(([id, label, value]) => ({ label, value, emphasis: id === track }));
  return {
    kind: "table",
    title: "기능 요약",
    caption: "강조한 행이 이번 영상에서 실제 화면으로 이어집니다.",
    rows,
  };
}

function articleOutlets(articles: string) {
  return [...articles.matchAll(/^언론사:\s*(.+)$/gm)].map((match) => match[1].trim());
}

function articleChart(): InsertCard {
  return {
    kind: "chart",
    title: "데모 입력에 들어 있는 기사",
    caption: "막대 하나는 입력 기사 1건이다. 효과, 점수, 인과를 나타내지 않는다.",
    rows: articleOutlets(videoFixtures.newsArticles).map((label) => ({ label, value: "1" })),
  };
}

function flowCard(track: VideoTrack): InsertCard {
  const result =
    track === "news" ? "이슈와 자동 보고서" : track === "youtube" ? "대본과 게시 패키지 초안" : "보도자료 초안과 SNS 요약";
  return {
    kind: "diagram",
    title: "제작 흐름",
    caption: "결과 초안은 담당자 검토 전입니다.",
    rows: [
      { label: "입력", value: "화면의 입력칸" },
      { label: "실행", value: track === "news" ? "분석" : "생성" },
      { label: "결과", value: result },
      { label: "검토", value: "담당자 검토" },
    ],
  };
}

export function hasForbiddenClaim(value: string) {
  return FORBIDDEN_CLAIM.test(value);
}

export function trackForBrief(brief: string): VideoTrack {
  const marks = [
    { track: "press" as const, at: brief.indexOf("보도자료") },
    { track: "news" as const, at: brief.search(/뉴스|모니터링/) },
    { track: "youtube" as const, at: brief.search(/유튜브|쇼츠/) },
  ]
    .filter((mark) => mark.at >= 0)
    .sort((left, right) => left.at - right.at);
  return marks[0]?.track ?? "press";
}

function materialize(screen: ScreenDef, track: VideoTrack, draft?: BeatDraft): VideoBeat {
  const narration = draft?.narration?.trim() && !hasForbiddenClaim(draft.narration) ? draft.narration.trim() : screen.narration;
  const subtitle = draft?.subtitle?.trim() && !hasForbiddenClaim(draft.subtitle) ? draft.subtitle.trim() : screen.subtitle;
  const viewerTakeaway =
    draft?.viewerTakeaway?.trim() && !hasForbiddenClaim(draft.viewerTakeaway)
      ? draft.viewerTakeaway.trim()
      : draft?.point?.trim() && !hasForbiddenClaim(draft.point)
        ? draft.point.trim()
        : screen.subtitle;
  const purpose = draft?.purpose?.trim() && !hasForbiddenClaim(draft.purpose) ? draft.purpose.trim() : screen.purpose;
  const screenAction = draft?.action?.trim() || screen.action;
  const transitionReason =
    draft?.transitionReason?.trim() && !hasForbiddenClaim(draft.transitionReason)
      ? draft.transitionReason.trim()
      : screen.transitionReason;
  const estimatedNarrationMs = estimateNarrationMs(narration, videoPresets[track].voice.speakingRate);
  const minScreenTimeMs = Math.max(screen.minHoldMs, estimatedNarrationMs + screen.postPauseMs);
  return {
    id: screen.id,
    screenId: screen.id,
    medium: screen.medium,
    purpose,
    viewerTakeaway,
    screenAction,
    transitionReason,
    minScreenTimeMs,
    estimatedNarrationMs,
    action: screenAction,
    focus: draft?.focus?.trim() || screen.focus,
    point: viewerTakeaway,
    narration,
    subtitle,
    minHoldMs: minScreenTimeMs,
    postPauseMs: screen.postPauseMs,
    evidence: screen.evidence,
    observe: screen.observe,
    insert: screen.insert?.(track),
  };
}

function normalizeManifestBrief(brief: string | ManifestBrief): ManifestBrief {
  if (typeof brief !== "string") return brief;
  return {
    purpose: brief,
    targetAudience: "홍보 담당자",
    track: trackForBrief(brief),
  };
}

export function estimateNarrationMs(text: string, speakingRate = 1) {
  const compact = text.replace(/\s+/g, "").replace(/[^\p{L}\p{N}]/gu, "");
  const latinWords = text.match(/[A-Za-z0-9]+/g)?.length ?? 0;
  const units = Math.max(1, compact.length + latinWords * 1.5);
  const unitsPerSecond = 4.4 * Math.max(0.5, speakingRate);
  return Math.max(1_200, Math.ceil((units / unitsPerSecond) * 1_000));
}

export function contentManifestIssues(manifest: BeatManifest) {
  const issues: string[] = [];
  for (const beat of manifest.beats) {
    const required = [beat.purpose, beat.viewerTakeaway, beat.evidence, beat.screenAction, beat.narration, beat.subtitle, beat.transitionReason];
    if (required.some((value) => !value.trim())) issues.push(`${beat.id}: 콘텐츠 계약 필드가 비어 있습니다.`);
    if (beat.minScreenTimeMs < beat.estimatedNarrationMs) issues.push(`${beat.id}: 화면 시간이 예상 발화 시간보다 짧습니다.`);
    if (beat.subtitle.length > 80) issues.push(`${beat.id}: 자막이 80자를 초과합니다.`);
    if (hasForbiddenClaim(`${beat.purpose} ${beat.viewerTakeaway} ${beat.narration} ${beat.subtitle} ${beat.transitionReason}`)) {
      issues.push(`${beat.id}: 화면 근거와 맞지 않는 생성 주장이 있습니다.`);
    }
  }
  return issues;
}

function beatsFor(track: VideoTrack, ids: string[], drafts?: BeatDraft[]) {
  const seen = new Set<string>();
  const beats: VideoBeat[] = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    const screen = screenById.get(id);
    if (!screen || !screenSupportsTrack(screen, track)) continue;
    seen.add(id);
    beats.push(materialize(screen, track, drafts?.find((draft) => draft.screenId === id)));
  }
  return beats;
}

export function createManifest(input: {
  brief: string | ManifestBrief;
  mode: "gpt" | "local";
  model: string;
  summary: string;
  viewerPromise: string;
  drafts?: BeatDraft[];
}): { manifest: BeatManifest; source: "model" | "local"; note?: string } {
  const brief = normalizeManifestBrief(input.brief);
  const track = brief.track;
  const localIds = localOrder[track];
  const draftedIds = (input.drafts ?? []).map((draft) => draft.screenId);
  const drafted = beatsFor(track, draftedIds, input.drafts);
  const required = requiredScreens[track];
  const actionOrder = required.every((id, index) => {
    const at = drafted.findIndex((beat) => beat.screenId === id);
    const previous = index === 0 ? -1 : drafted.findIndex((beat) => beat.screenId === required[index - 1]);
    return at > previous;
  });
  const modelAccepted =
    drafted.length >= 4 &&
    drafted.length <= 7 &&
    actionOrder &&
    drafted.every((beat) => !hasForbiddenClaim(beat.narration) && !hasForbiddenClaim(beat.subtitle));
  const beats = modelAccepted ? drafted : beatsFor(track, localIds);
  const source = modelAccepted ? "model" : "local";
  const estimatedSec = Math.round(beats.reduce((total, beat) => total + beat.minScreenTimeMs, 0) / 100) / 10;
  return {
    source,
    note:
      input.drafts && !modelAccepted
        ? "모델이 고른 장면이 허용된 화면과 맞지 않아 브리프의 기본 장면을 사용했습니다."
        : undefined,
    manifest: {
      version: "2.0",
      title: track === "news" ? "뉴스 분석 데모" : track === "youtube" ? "유튜브 제작 데모" : "보도자료 작성 데모",
      audience: brief.targetAudience,
      purpose: brief.purpose,
      track,
      model: input.model,
      mode: input.mode,
      summary: input.summary,
      viewerPromise: input.viewerPromise,
      timing: {
        targetSec: brief.targetDurationSec ?? videoPresets[track].durationSec.target,
        minSec: videoPresets[track].durationSec.min,
        maxSec: videoPresets[track].durationSec.max,
        estimatedSec,
      },
      runtime: runtimeTools,
      preset: videoPresets[track],
      beats,
      fixtures: videoFixtures,
    },
  };
}

export function buildPlanningDossier(input: string | ManifestBrief) {
  const brief = normalizeManifestBrief(input);
  const track = brief.track;
  const preset = videoPresets[track];
  const eligibleScreens = screens.filter((screen) => screenSupportsTrack(screen, track));
  const screenIds = eligibleScreens.map((screen) => screen.id);
  const sceneBlocks = eligibleScreens.map((screen) => {
    const card = screen.insert?.(track);
    const cardLines = card
      ? [`카드: ${card.title}`, card.caption, ...card.rows.map((row) => `- ${row.label}: ${row.value}`)]
      : [];
    return [
      `화면 ${screen.id} (${screen.medium})`,
      `일어날 일: ${screen.action}`,
      `시선: ${screen.focus}`,
      `화면에 나타나는 글자: ${screen.observe}`,
      `근거: ${screen.evidence}`,
      `기본 요지: ${screen.subtitle}`,
      `장면 목적: ${screen.purpose}`,
      `다음 장면 전환 이유: ${screen.transitionReason}`,
      `기본 내레이션: ${screen.narration}`,
      ...cardLines,
    ].join("\n");
  });
  const text = [
    "1차 기획이다. 목적, 길이와 대략의 내용은 브리프와 이 영상 종류의 기본값으로 판단한다.",
    `목적: ${brief.purpose}`,
    `대상 시청자: ${brief.targetAudience}`,
    brief.outline ? `요청 개요: ${brief.outline}` : "",
    `영상 종류: ${preset.label}`,
    `목표 길이: ${preset.durationSec.target}초, 범위 ${preset.durationSec.min}~${preset.durationSec.max}초`,
    `방법: ${preset.method}`,
    `자막: ${preset.subtitle.position}, 글자 크기 ${preset.subtitle.fontSize}, 아래 여백 ${preset.subtitle.marginV}`,
    `음성: ${preset.voice.voice}, 속도 ${preset.voice.speakingRate}`,
    `기본 원칙: ${preset.principles.join(" / ")}`,
    "앱이 지금 가진 자료와 도구다. 수집 지시는 자유롭게 한다. 없는 것은 앱이 없음이라고 보고한다.",
    `가진 자료: ${preset.materialsOnHand.join(", ")}`,
    preset.tools.map((tool) => `도구 ${tool.id}: ${tool.description}`).join("\n"),
    "입력 예시와 다른 종류의 화면 자료도 함께 있다.",
    JSON.stringify(videoFixtures, null, 2),
    ...sceneBlocks,
  ].filter(Boolean).join("\n\n");
  return { track, screenIds, preset, text };
}

export function catalogPrompt() {
  return buildPlanningDossier("보도자료 초안을 보여주는 영상").text;
}

export function buildReviewRecord(manifest: BeatManifest, marks: CaptureMark[], probe?: ReviewProbe) {
  const appBeats = manifest.beats.filter((beat) => beat.medium !== "insert");
  const missing = appBeats.filter((beat) => {
    const mark = marks.find((item) => item.beatId === beat.id);
    return !mark?.observedText.includes(beat.observe);
  });
  const forbidden = manifest.beats.filter(
    (beat) => hasForbiddenClaim(beat.narration) || hasForbiddenClaim(beat.subtitle),
  );
  const geometryOk = !probe || (probe.hasAudio && probe.width === 1920 && probe.height === 1080);
  return {
    version: "2.0" as const,
    runtime: manifest.runtime,
    ready: missing.length === 0 && forbidden.length === 0 && geometryOk,
    missingBeatIds: missing.map((beat) => beat.id),
    forbiddenBeatIds: forbidden.map((beat) => beat.id),
    frames: marks.map((mark) => ({
      beatId: mark.beatId,
      atMs: Math.round((mark.startedAtMs + mark.endedAtMs) / 2),
      screenshot: mark.screenshot,
      observedText: mark.observedText,
    })),
    probe: probe ?? null,
  };
}
