"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Bot,
  BrainCircuit,
  CheckCircle2,
  ChevronRight,
  Clapperboard,
  Code2,
  ClipboardCheck,
  Download,
  FileText,
  Gauge,
  KeyRound,
  Languages,
  Loader2,
  Megaphone,
  MessageSquareText,
  Newspaper,
  Pause,
  Play,
  Radio,
  Search,
  Share2,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Upload,
  Users,
  Volume2,
  WandSparkles,
  Youtube,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  analyzeNews,
  createPressRelease,
  createYoutubeKit,
  createWritingKit,
  type NewsAnalysisOutput,
  type PressInput,
  type PressOutput,
  type WritingInput,
  type WritingOutput,
  type YoutubeInput,
  type YoutubeOutput,
} from "@/lib/engines";

type TabKey =
  | "film"
  | "press"
  | "news"
  | "youtube"
  | "writing"
  | "targeting"
  | "performance";

type ApiResponse<T> = {
  ok: boolean;
  output: T;
  error?: string;
};

const samplePressInput: PressInput = {
  policyName: "청년 지역정착 패키지",
  business: "지역 기업 일자리 연계, 월 최대 30만 원 주거비 지원, 생활 기반 상담 통합 제공",
  budget: "120억 원",
  audience: "만 19세부터 34세까지의 지역 청년",
  expectedEffect: "초기 정착 비용을 낮추고 지역 기업의 인재 확보를 지원",
  tone: "공식",
};

const sampleArticles = `언론사: 서울정책신문
제목: 청년 지역정착 패키지 확대, 현장 기대감 커져
청년 주거비 지원과 지역 기업 일자리 연계가 강화되며 현장에서는 정책 효과에 대한 기대가 커지고 있다. 담당 부서는 신청 절차를 간소화해 시민 편의를 높이겠다고 밝혔다.
---
언론사: 시민경제
제목: 120억 예산 집행 기준 놓고 형평성 우려
일부 시민단체는 지원 대상 선정 기준이 부족하면 예산 부담과 형평성 논란이 생길 수 있다고 지적했다. 세부 지표 공개가 필요하다는 목소리도 나왔다.
---
언론사: 지역미래
제목: 지역 기업 인재 확보에 청년 정책 효과 기대
지역 기업들은 청년 정착 지원이 인력난 해소에 도움이 될 것으로 보고 있다. 다만 상담 창구와 사후 관리 강화가 함께 필요하다는 의견도 제시됐다.`;

const sampleYoutubeInput: YoutubeInput = {
  policyText:
    "청년 지역정착 패키지는 지역 기업 일자리 연계, 주거비 지원, 생활 기반 상담을 통합 제공하는 정책이다. 총 120억 원을 투입해 청년의 초기 정착 비용을 낮추고 지역 기업의 인재 확보를 돕는다. 정책의 핵심은 신청 절차 간소화, 대상자 맞춤 안내, 성과 지표 공개다.",
  audience: "일반 시민과 정책 관심층",
  durationMinutes: "6",
};

const sampleWritingInput: WritingInput = {
  sourceText:
    "청년 지역정착 패키지는 지역 기업 일자리 연계, 주거비 지원, 생활 기반 상담을 통합 제공하는 정책이다. 총 120억 원을 투입해 청년의 초기 정착 비용을 낮추고 지역 기업의 인재 확보를 돕는다. 신청 절차 간소화와 대상자 맞춤 안내가 핵심이며, 성과 지표 공개를 통해 정책 신뢰를 높인다.",
  audience: "정책 담당자, 기자, 일반 시민",
  purpose: "AI 검색 친화 정책 설명문과 내부 검토 보고서 초안",
  evidenceNotes: "R1 보도자료 초안, R2 예산 설명자료, R3 지역 기업 의견, R4 청년 정착 통계",
};

const demoPress = createPressRelease(samplePressInput);
const demoNews = analyzeNews(sampleArticles);
const demoYoutube = createYoutubeKit(sampleYoutubeInput);
const demoWriting = createWritingKit(sampleWritingInput);

const tabs = [
  { key: "film" as const, label: "영상 스튜디오", icon: Clapperboard },
  { key: "press" as const, label: "보도자료", icon: FileText },
  { key: "news" as const, label: "뉴스 분석", icon: Newspaper },
  { key: "youtube" as const, label: "유튜브 제작", icon: Youtube },
  { key: "writing" as const, label: "AI 글쓰기", icon: BookOpen },
  { key: "targeting" as const, label: "타겟팅 전략", icon: Target },
  { key: "performance" as const, label: "성과 수집", icon: Gauge },
];

type Objective = "reach" | "trust" | "action";

type CitizenProfile = {
  id: string;
  name: string;
  badge: string;
  awareness: number;
  trust: number;
  barrier: number;
  readiness: number;
  description: string;
  massMessage: string;
  strategy: string;
  tailoredMessage: string;
  proof: string;
  nextAction: string;
  risk: string;
};

type VideoMetricRow = {
  id: string;
  title: string;
  views: number;
  likes: number;
  comments: number;
  collectedAt: string;
};

const objectiveLabels: Record<Objective, string> = {
  reach: "인지 확대",
  trust: "신뢰 회복",
  action: "신청 전환",
};

const citizenProfiles: CitizenProfile[] = [
  {
    id: "skeptic",
    name: "검증 요구형",
    badge: "불신",
    awareness: 78,
    trust: 34,
    barrier: 44,
    readiness: 48,
    description: "제도는 알고 있지만 선정 기준과 예산 집행의 공정성을 확인하고 싶어 합니다.",
    massMessage: "청년 지역정착 패키지를 통해 더 많은 청년에게 지원을 제공합니다.",
    strategy: "근거제공 전략",
    tailoredMessage: "선정 기준, 이의신청 절차, 예산 집행 현황을 먼저 공개해 정책 신뢰를 회복합니다.",
    proof: "선정표, 예산 집행률, 사후 점검 지표",
    nextAction: "기준표 확인 후 대상 여부 자가진단",
    risk: "홍보 문구만 반복하면 불신이 더 커질 수 있음",
  },
  {
    id: "unaware",
    name: "정보 부족형",
    badge: "미인지",
    awareness: 22,
    trust: 62,
    barrier: 57,
    readiness: 36,
    description: "정책 자체를 잘 모르고, 자신이 대상자인지도 아직 판단하지 못합니다.",
    massMessage: "청년 지역정착 패키지 신청이 시작되었습니다.",
    strategy: "대상안내 전략",
    tailoredMessage: "나이, 거주지, 취업 상태처럼 바로 판단 가능한 조건부터 보여 줍니다.",
    proof: "대상 조건 3문항, 신청 가능 사례, 가까운 상담 창구",
    nextAction: "30초 대상 확인",
    risk: "제도 설명이 길면 첫 화면에서 이탈할 가능성 높음",
  },
  {
    id: "busy",
    name: "행동 장벽형",
    badge: "시간 부족",
    awareness: 67,
    trust: 58,
    barrier: 81,
    readiness: 42,
    description: "필요성은 이해하지만 서류, 이동, 상담 시간 때문에 신청을 미루고 있습니다.",
    massMessage: "주거비와 일자리 연계를 한 번에 지원합니다.",
    strategy: "장벽제거 전략",
    tailoredMessage: "준비 서류, 예상 소요 시간, 모바일 신청 가능 여부를 한 화면에서 정리합니다.",
    proof: "신청 단계별 소요 시간, 서류 체크리스트, 야간 상담 일정",
    nextAction: "서류 체크리스트 저장",
    risk: "혜택만 강조하면 실무 부담이 해소되지 않음",
  },
  {
    id: "ready",
    name: "전환 임박형",
    badge: "신청 직전",
    awareness: 84,
    trust: 76,
    barrier: 28,
    readiness: 86,
    description: "대상 가능성이 높고 신뢰도도 높아 마지막 행동 제안이 필요한 상태입니다.",
    massMessage: "지역 정착을 위한 지원을 지금 신청하세요.",
    strategy: "전환촉진 전략",
    tailoredMessage: "마감일, 신청 링크, 문의 채널을 반복 노출해 바로 행동하도록 돕습니다.",
    proof: "마감 일정, 접수 완료 사례, 문의 응답 시간",
    nextAction: "신청 페이지 열기",
    risk: "근거 설명을 길게 반복하면 전환 타이밍을 놓칠 수 있음",
  },
];

const sampleVideoRows: VideoMetricRow[] = [
  {
    id: "sample-policy-01",
    title: "청년 지역정착 패키지, 이 부분만 보세요",
    views: 24850,
    likes: 842,
    comments: 96,
    collectedAt: "2026-06-12 17:00",
  },
  {
    id: "sample-policy-02",
    title: "정책자료 20쪽을 6분 영상으로",
    views: 13840,
    likes: 391,
    comments: 44,
    collectedAt: "2026-06-12 17:00",
  },
  {
    id: "sample-policy-03",
    title: "주거비 지원, 누가 받을까?",
    views: 31620,
    likes: 1240,
    comments: 151,
    collectedAt: "2026-06-12 17:00",
  },
];

function profileScore(profile: CitizenProfile, objective: Objective) {
  if (objective === "reach") {
    return Math.round((100 - profile.awareness) * 0.58 + profile.readiness * 0.22 + profile.trust * 0.2);
  }
  if (objective === "trust") {
    return Math.round((100 - profile.trust) * 0.62 + profile.awareness * 0.2 + profile.readiness * 0.18);
  }
  return Math.round(profile.readiness * 0.58 + (100 - profile.barrier) * 0.26 + profile.trust * 0.16);
}

function engagementRate(row: VideoMetricRow) {
  if (!row.views) return 0;
  return ((row.likes + row.comments) / row.views) * 100;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("ko-KR").format(value);
}

function parseVideoIds(value: string) {
  return value
    .split(/[\s,]+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const watch = part.match(/[?&]v=([a-zA-Z0-9_-]{6,})/);
      const short = part.match(/youtu\.be\/([a-zA-Z0-9_-]{6,})/);
      const shorts = part.match(/shorts\/([a-zA-Z0-9_-]{6,})/);
      return watch?.[1] ?? short?.[1] ?? shorts?.[1] ?? part.replace(/[^a-zA-Z0-9_-]/g, "");
    })
    .filter((id, index, ids) => id.length >= 6 && ids.indexOf(id) === index);
}

const sceneDurationMs = 7200;

const scenes = [
  {
    eyebrow: "Scene 1",
    title: "AI 시대 홍보담당자는 왜 앱을 만들어야 하는가",
    narration:
      "과거에는 홍보 업무를 앱으로 만들려면 개발 의뢰부터 시작해야 했습니다. 기획하고, 설명하고, 기다리는 시간이 필요했습니다.",
    visual: <LegacyPipeline />,
  },
  {
    eyebrow: "Scene 2",
    title: "홍보업무는 너무 전문적입니다",
    narration:
      "문제는 홍보 업무가 너무 전문적이라는 점입니다. 정책홍보, 보도자료, 언론 모니터링, 민원 분석, 기자 응대는 현장 맥락을 알아야 제대로 작동합니다.",
    visual: <SpecializedWork />,
  },
  {
    eyebrow: "Scene 3",
    title: "작은 시장의 업무는 제품이 되기 어렵습니다",
    narration:
      "시장 규모가 작은 업무는 개발회사가 제품을 만들기 어렵습니다. 수백만 사용자의 앱과 수백 명이 쓰는 정책홍보 앱은 완전히 다른 시장입니다.",
    visual: <MarketComparison />,
  },
  {
    eyebrow: "Demo 1",
    title: "보도자료 작성기",
    narration:
      "하지만 이제 홍보담당자는 직접 필요한 앱을 만들 수 있습니다. 정책명, 사업내용, 예산, 대상, 기대효과를 넣으면 보도자료와 SNS 요약이 바로 생성됩니다.",
    visual: <PressMini output={demoPress} />,
  },
  {
    eyebrow: "Demo 2",
    title: "뉴스 분석기",
    narration:
      "여러 개의 기사 본문을 넣으면 핵심 이슈, 긍정과 부정 흐름, 언론사별 차이, 자동 보고서까지 한 번에 정리됩니다.",
    visual: <NewsMini output={demoNews} />,
  },
  {
    eyebrow: "Demo 3",
    title: "유튜브 콘텐츠 작성기",
    narration:
      "정책자료를 넣으면 영상 대본, 쇼츠 문안, 썸네일 문구, 블로그 글이 함께 만들어집니다. 하나의 자료가 여러 채널의 콘텐츠로 바뀝니다.",
    visual: <YoutubeMini output={demoYoutube} />,
  },
  {
    eyebrow: "Demo 4",
    title: "AI 친화 글쓰기 설계",
    narration:
      "정책자료를 AI 검색과 보고서 검토에 맞게 다시 구조화합니다. 답변 우선형, 근거 순회형, 주의점 우선형, FAQ 의미망형 중 어떤 프레임이 적합한지 제안합니다.",
    visual: <WritingMini output={demoWriting} />,
  },
  {
    eyebrow: "Demo 5",
    title: "상태 기반 마이크로타겟팅",
    narration:
      "같은 정책 대상자라도 실제 상태는 다릅니다. 정보 부족, 불신, 행동 장벽에 따라 메시지와 근거, 다음 행동을 다르게 설계해야 합니다.",
    visual: <TargetingMini />,
  },
  {
    eyebrow: "Demo 6",
    title: "성과가 다음 메시지를 바꿉니다",
    narration:
      "유튜브 공개 성과지표를 수집해 어떤 제목, 썸네일, 메시지 약속이 반응을 만들었는지 비교하고 다음 실험으로 연결합니다.",
    visual: <PerformanceMini />,
  },
  {
    eyebrow: "Scene 10",
    title: "경쟁의 축이 바뀝니다",
    narration:
      "앞으로의 경쟁은 홍보전문가 대 개발자가 아닙니다. AI를 활용하는 홍보전문가와 그렇지 않은 홍보전문가의 경쟁입니다.",
    visual: <FutureFlow />,
  },
  {
    eyebrow: "Scene 11",
    title: "홍보용 AI를 만드는 홍보담당자",
    narration:
      "이제 역할이 바뀝니다. 보도자료를 작성하는 홍보담당자에서, 홍보용 AI를 만드는 홍보담당자로. 이 변화가 새로운 기준이 됩니다.",
    visual: <FinalMessage />,
  },
];

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

async function postJson<T>(url: string, payload: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = (await response.json()) as ApiResponse<T>;
  if (!response.ok || !data.ok) {
    throw new Error(data.error ?? "처리에 실패했습니다.");
  }
  return data.output;
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabKey>("film");

  return (
    <main className="min-h-screen px-5 py-5 text-ink md:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
        <header className="flex flex-col gap-4 rounded-lg border border-line bg-white px-5 py-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-ink text-white">
              <BrainCircuit className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cobalt">
                PR Studio | 홍보물제작소
              </p>
              <h1 className="text-xl font-semibold tracking-normal md:text-2xl">
                콘텐츠 생성, AI 글쓰기, 타겟팅 전략, 성과 학습을 하나의 흐름으로
              </h1>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-medium">
            <span className="rounded-full border border-line px-3 py-1.5">
              1080p 16:9
            </span>
            <span className="rounded-full border border-line px-3 py-1.5">
              TTS
            </span>
            <span className="rounded-full border border-line px-3 py-1.5">
              자동 자막
            </span>
            <span className="rounded-full border border-line px-3 py-1.5">
              실제 입력-출력
            </span>
            <span className="rounded-full border border-line px-3 py-1.5">
              전략-성과 루프
            </span>
          </div>
        </header>

        <nav className="grid gap-2 rounded-lg border border-line bg-white p-2 shadow-sm sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={cx(
                  "focus-ring flex h-12 items-center justify-center gap-2 rounded-md px-3 text-sm font-semibold transition",
                  active
                    ? "bg-ink text-white"
                    : "text-ink/70 hover:bg-paper hover:text-ink",
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>

        <AnimatePresence mode="wait">
          <motion.section
            key={activeTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.24, ease: "easeOut" }}
          >
            {activeTab === "film" && <FilmStudio />}
            {activeTab === "press" && <PressReleaseTool />}
            {activeTab === "news" && <NewsAnalyzerTool />}
            {activeTab === "youtube" && <YoutubeContentTool />}
            {activeTab === "writing" && <WritingKitTool />}
            {activeTab === "targeting" && <MicroTargetingTool />}
            {activeTab === "performance" && <PerformanceCollectorTool />}
          </motion.section>
        </AnimatePresence>
      </div>
    </main>
  );
}

function FilmStudio() {
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(false);
  const scene = scenes[active];

  useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(() => {
      setActive((current) => (current + 1) % scenes.length);
    }, sceneDurationMs);

    return () => window.clearTimeout(timer);
  }, [active, playing]);

  useEffect(() => {
    return () => {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  function speakCurrentScene() {
    if (!("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(scene.narration);
    utterance.lang = "ko-KR";
    utterance.rate = 1.02;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
      <section className="rounded-lg border border-line bg-white p-4 shadow-studio">
        <div className="stage-aspect relative overflow-hidden rounded-lg border border-line bg-[#fbfaf6]">
          <div className="absolute left-5 top-5 z-20 flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold shadow-sm">
            <Clapperboard className="h-3.5 w-3.5 text-cobalt" />
            YouTube Demo Sequence
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              className="absolute inset-0 flex flex-col px-8 pb-32 pt-8 md:px-10 md:pb-36 md:pt-10"
              initial={{ opacity: 0, scale: 0.985 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.015 }}
              transition={{ duration: 0.42, ease: "easeOut" }}
            >
              <div className="mb-5 mt-8 max-w-3xl">
                <p className="text-sm font-bold uppercase tracking-[0.14em] text-coral">
                  {scene.eyebrow}
                </p>
                <h2 className="mt-2 text-3xl font-semibold tracking-normal text-ink md:text-5xl">
                  {scene.title}
                </h2>
              </div>
              <div className="min-h-0 flex-1">{scene.visual}</div>
            </motion.div>
          </AnimatePresence>
          <div className="caption-glass absolute bottom-0 left-0 right-0 z-20 px-6 py-4 text-white">
            <div className="mb-3 h-1 overflow-hidden rounded-full bg-white/18">
              <motion.div
                key={active}
                className="h-full bg-white"
                initial={{ width: "0%" }}
                animate={{ width: playing ? "100%" : "24%" }}
                transition={{
                  duration: playing ? sceneDurationMs / 1000 : 0.4,
                  ease: "linear",
                }}
              />
            </div>
            <p className="text-base font-medium leading-relaxed md:text-lg">
              {scene.narration}
            </p>
          </div>
        </div>
      </section>

      <aside className="rounded-lg border border-line bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">장면 컨트롤</h2>
          <span className="text-sm font-semibold text-cobalt">
            {active + 1}/{scenes.length}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setPlaying((value) => !value)}
            className="focus-ring flex h-11 items-center justify-center rounded-md bg-ink text-white transition hover:bg-ink/90"
            aria-label={playing ? "일시정지" : "재생"}
          >
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={speakCurrentScene}
            className="focus-ring flex h-11 items-center justify-center rounded-md border border-line text-ink transition hover:bg-paper"
            aria-label="TTS 재생"
          >
            <Volume2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setActive((current) => (current + 1) % scenes.length)}
            className="focus-ring flex h-11 items-center justify-center rounded-md border border-line text-ink transition hover:bg-paper"
            aria-label="다음 장면"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 flex flex-col gap-2">
          {scenes.map((item, index) => (
            <button
              key={item.title}
              type="button"
              onClick={() => setActive(index)}
              className={cx(
                "focus-ring flex items-center gap-3 rounded-md border px-3 py-3 text-left transition",
                active === index
                  ? "border-ink bg-ink text-white"
                  : "border-line hover:bg-paper",
              )}
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/14 text-xs font-bold">
                {index + 1}
              </span>
              <span className="text-sm font-semibold">{item.title}</span>
            </button>
          ))}
        </div>
      </aside>
    </div>
  );
}

function PressReleaseTool() {
  const [form, setForm] = useState<PressInput>(samplePressInput);
  const [output, setOutput] = useState<PressOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function generate() {
    setLoading(true);
    setError("");
    try {
      const result = await postJson<PressOutput>("/api/press-release", form);
      setOutput(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "처리에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ToolShell
      title="보도자료 작성기"
      eyebrow="Demo 1"
      icon={<FileText className="h-5 w-5" />}
      action={
        <button
          type="button"
          onClick={generate}
          disabled={loading}
          className="focus-ring flex h-11 items-center gap-2 rounded-md bg-cobalt px-4 text-sm font-semibold text-white transition hover:bg-cobalt/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <WandSparkles className="h-4 w-4" />}
          생성
        </button>
      }
    >
      <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
        <section className="rounded-lg border border-line bg-white p-4">
          <div className="grid gap-4">
            <Field
              label="정책명"
              value={form.policyName}
              onChange={(value) => setForm({ ...form, policyName: value })}
            />
            <TextArea
              label="사업내용"
              value={form.business}
              rows={4}
              onChange={(value) => setForm({ ...form, business: value })}
            />
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
              <Field
                label="예산"
                value={form.budget}
                onChange={(value) => setForm({ ...form, budget: value })}
              />
              <Field
                label="대상"
                value={form.audience}
                onChange={(value) => setForm({ ...form, audience: value })}
              />
            </div>
            <TextArea
              label="기대효과"
              value={form.expectedEffect}
              rows={3}
              onChange={(value) => setForm({ ...form, expectedEffect: value })}
            />
            <label className="grid gap-2 text-sm font-semibold">
              톤
              <select
                value={form.tone}
                onChange={(event) =>
                  setForm({
                    ...form,
                    tone: event.target.value as PressInput["tone"],
                  })
                }
                className="focus-ring h-11 rounded-md border border-line bg-white px-3 text-sm"
              >
                <option>공식</option>
                <option>생활밀착</option>
                <option>디지털</option>
              </select>
            </label>
          </div>
        </section>

        <ResultPanel empty={!output} error={error}>
          {output && <PressReleaseResult output={output} />}
        </ResultPanel>
      </div>
    </ToolShell>
  );
}

function NewsAnalyzerTool() {
  const [articles, setArticles] = useState(sampleArticles);
  const [output, setOutput] = useState<NewsAnalysisOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function generate() {
    setLoading(true);
    setError("");
    try {
      const result = await postJson<NewsAnalysisOutput>("/api/news-analysis", {
        articles,
      });
      setOutput(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "처리에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ToolShell
      title="뉴스 분석기"
      eyebrow="Demo 2"
      icon={<Newspaper className="h-5 w-5" />}
      action={
        <button
          type="button"
          onClick={generate}
          disabled={loading}
          className="focus-ring flex h-11 items-center gap-2 rounded-md bg-mint px-4 text-sm font-semibold text-white transition hover:bg-mint/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          분석
        </button>
      }
    >
      <div className="grid gap-5 xl:grid-cols-[460px_1fr]">
        <section className="rounded-lg border border-line bg-white p-4">
          <TextArea
            label="기사 입력"
            value={articles}
            rows={18}
            onChange={setArticles}
          />
        </section>
        <ResultPanel empty={!output} error={error}>
          {output && <NewsAnalysisResult output={output} />}
        </ResultPanel>
      </div>
    </ToolShell>
  );
}

function YoutubeContentTool() {
  const [form, setForm] = useState<YoutubeInput>(sampleYoutubeInput);
  const [output, setOutput] = useState<YoutubeOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState("");
  const [fileStatus, setFileStatus] = useState("");

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setFileStatus("");
    setError("");

    if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
      setExtracting(true);
      try {
        const body = new FormData();
        body.append("file", file);
        const response = await fetch("/api/extract-pdf", {
          method: "POST",
          body,
        });
        const data = (await response.json()) as {
          ok: boolean;
          text?: string;
          filename?: string;
          pages?: number;
          error?: string;
        };
        if (!response.ok || !data.ok || !data.text) {
          throw new Error(data.error ?? "PDF 텍스트 추출에 실패했습니다.");
        }
        setForm((current) => ({ ...current, policyText: data.text ?? "" }));
        setFileStatus(`${data.filename} · ${data.pages}쪽 추출 완료`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "PDF 처리에 실패했습니다.");
      } finally {
        setExtracting(false);
      }
      return;
    }

    const text = await file.text();
    setForm((current) => ({ ...current, policyText: text }));
    setFileStatus(`${file.name} 불러오기 완료`);
  }

  async function generate() {
    setLoading(true);
    setError("");
    try {
      const result = await postJson<YoutubeOutput>("/api/youtube-kit", form);
      setOutput(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "처리에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ToolShell
      title="유튜브 콘텐츠 작성기"
      eyebrow="Demo 3"
      icon={<Youtube className="h-5 w-5" />}
      action={
        <button
          type="button"
          onClick={generate}
          disabled={loading || extracting}
          className="focus-ring flex h-11 items-center gap-2 rounded-md bg-coral px-4 text-sm font-semibold text-white transition hover:bg-coral/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          생성
        </button>
      }
    >
      <div className="grid gap-5 xl:grid-cols-[460px_1fr]">
        <section className="rounded-lg border border-line bg-white p-4">
          <div className="grid gap-4">
            <label className="focus-ring flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-cobalt/45 bg-cobalt/5 px-4 py-4 text-sm font-semibold text-cobalt transition hover:bg-cobalt/10">
              {extracting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              정책자료 PDF 업로드
              <input
                type="file"
                accept=".pdf,.txt,.md"
                className="sr-only"
                onChange={(event) => handleFile(event.target.files?.[0])}
              />
            </label>
            {fileStatus && (
              <p className="rounded-md bg-mint/10 px-3 py-2 text-sm font-semibold text-mint">
                {fileStatus}
              </p>
            )}
            <TextArea
              label="정책자료 텍스트"
              value={form.policyText}
              rows={13}
              onChange={(value) => setForm({ ...form, policyText: value })}
            />
            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="대상"
                value={form.audience}
                onChange={(value) => setForm({ ...form, audience: value })}
              />
              <Field
                label="영상 길이"
                value={form.durationMinutes}
                onChange={(value) =>
                  setForm({ ...form, durationMinutes: value })
                }
              />
            </div>
          </div>
        </section>
        <ResultPanel empty={!output} error={error}>
          {output && <YoutubeResult output={output} />}
        </ResultPanel>
      </div>
    </ToolShell>
  );
}

function WritingKitTool() {
  const [form, setForm] = useState<WritingInput>(sampleWritingInput);
  const [output, setOutput] = useState<WritingOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function generate() {
    setLoading(true);
    setError("");
    try {
      const result = await postJson<WritingOutput>("/api/writing-kit", form);
      setOutput(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "처리에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ToolShell
      title="AI 친화 글쓰기 설계"
      eyebrow="Report & GEO Writer"
      icon={<BookOpen className="h-5 w-5" />}
      action={
        <button
          type="button"
          onClick={generate}
          disabled={loading}
          className="focus-ring flex h-11 items-center gap-2 rounded-md bg-cobalt px-4 text-sm font-semibold text-white transition hover:bg-cobalt/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <WandSparkles className="h-4 w-4" />}
          설계
        </button>
      }
    >
      <div className="grid gap-5 xl:grid-cols-[460px_1fr]">
        <section className="rounded-lg border border-line bg-white p-4">
          <div className="grid gap-4">
            <TextArea
              label="정책/홍보 자료"
              value={form.sourceText}
              rows={11}
              onChange={(value) => setForm({ ...form, sourceText: value })}
            />
            <Field
              label="독자"
              value={form.audience}
              onChange={(value) => setForm({ ...form, audience: value })}
            />
            <Field
              label="목적"
              value={form.purpose}
              onChange={(value) => setForm({ ...form, purpose: value })}
            />
            <TextArea
              label="출처/근거 메모"
              value={form.evidenceNotes}
              rows={4}
              onChange={(value) => setForm({ ...form, evidenceNotes: value })}
            />
          </div>
        </section>
        <ResultPanel empty={!output} error={error}>
          {output && <WritingResult output={output} />}
        </ResultPanel>
      </div>
    </ToolShell>
  );
}

function MicroTargetingTool() {
  const [selectedId, setSelectedId] = useState(citizenProfiles[0].id);
  const [objective, setObjective] = useState<Objective>("trust");
  const selected = citizenProfiles.find((profile) => profile.id === selectedId) ?? citizenProfiles[0];
  const bestProfile = [...citizenProfiles].sort(
    (a, b) => profileScore(b, objective) - profileScore(a, objective),
  )[0];
  const massScore = Math.max(
    24,
    Math.min(72, Math.round((selected.awareness + selected.trust + selected.readiness) / 3 - selected.barrier * 0.15)),
  );
  const microScore = Math.min(96, Math.max(48, profileScore(selected, objective) + 36));

  return (
    <ToolShell
      title="상태 기반 마이크로타겟팅"
      eyebrow="Strategy Lab"
      icon={<Target className="h-5 w-5" />}
      action={
        <div className="flex flex-wrap gap-2">
          {(Object.keys(objectiveLabels) as Objective[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setObjective(key)}
              className={cx(
                "focus-ring h-10 rounded-md px-3 text-sm font-semibold transition",
                objective === key ? "bg-ink text-white" : "border border-line bg-white hover:bg-paper",
              )}
            >
              {objectiveLabels[key]}
            </button>
          ))}
        </div>
      }
    >
      <div className="grid gap-5 xl:grid-cols-[380px_1fr]">
        <section className="rounded-lg border border-line bg-white p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold">
            <Users className="h-4 w-4 text-cobalt" />
            시민 상태
          </div>
          <div className="grid gap-3">
            {citizenProfiles.map((profile) => {
              const active = selected.id === profile.id;

              return (
                <button
                  key={profile.id}
                  type="button"
                  onClick={() => setSelectedId(profile.id)}
                  className={cx(
                    "focus-ring rounded-md border p-3 text-left transition",
                    active ? "border-cobalt bg-cobalt/5" : "border-line bg-white hover:bg-paper",
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-base font-semibold">{profile.name}</span>
                    <span className="rounded-full bg-paper px-2 py-1 text-xs font-bold text-ink/70">
                      {profile.badge}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-medium leading-relaxed text-ink/62">
                    {profile.description}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        <section className="grid gap-4">
          <div className="grid gap-3 md:grid-cols-4">
            <Metric label="인지도" value={`${selected.awareness}%`} tone="cobalt" />
            <Metric label="신뢰도" value={`${selected.trust}%`} tone="mint" />
            <Metric label="장벽" value={`${selected.barrier}%`} tone="coral" />
            <Metric label="준비도" value={`${selected.readiness}%`} tone="ink" />
          </div>

          <article className="rounded-lg border border-line bg-white p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-cobalt">
                  {objectiveLabels[objective]}
                </p>
                <h3 className="mt-2 text-3xl font-semibold tracking-normal">
                  {selected.strategy}
                </h3>
              </div>
              <div className="rounded-md bg-ink px-3 py-2 text-right text-white">
                <p className="text-xs font-bold text-white/60">우선 추천</p>
                <p className="text-sm font-semibold">{bestProfile.name}</p>
              </div>
            </div>
            <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr]">
              <div className="rounded-lg border border-line p-4">
                <p className="text-sm font-bold text-ink/50">대량홍보</p>
                <p className="mt-3 text-sm font-semibold leading-relaxed">
                  {selected.massMessage}
                </p>
                <div className="mt-4 h-3 overflow-hidden rounded-full bg-paper">
                  <div className="h-full rounded-full bg-amber" style={{ width: `${massScore}%` }} />
                </div>
                <p className="mt-2 text-sm font-bold">{massScore} 적합도</p>
              </div>
              <div className="rounded-lg border border-cobalt bg-cobalt/5 p-4">
                <p className="text-sm font-bold text-cobalt">마이크로타겟팅</p>
                <p className="mt-3 text-sm font-semibold leading-relaxed">
                  {selected.tailoredMessage}
                </p>
                <div className="mt-4 h-3 overflow-hidden rounded-full bg-white">
                  <div className="h-full rounded-full bg-cobalt" style={{ width: `${microScore}%` }} />
                </div>
                <p className="mt-2 text-sm font-bold">{microScore} 적합도</p>
              </div>
            </div>
          </article>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-lg border border-line bg-white p-4">
              <div className="flex items-center gap-2 text-sm font-bold">
                <ShieldCheck className="h-4 w-4 text-mint" />
                필요한 근거
              </div>
              <p className="mt-3 text-sm font-medium leading-relaxed text-ink/70">
                {selected.proof}
              </p>
            </div>
            <div className="rounded-lg border border-line bg-white p-4">
              <div className="flex items-center gap-2 text-sm font-bold">
                <Sparkles className="h-4 w-4 text-coral" />
                다음 행동
              </div>
              <p className="mt-3 text-sm font-medium leading-relaxed text-ink/70">
                {selected.nextAction}
              </p>
            </div>
            <div className="rounded-lg border border-line bg-white p-4">
              <div className="flex items-center gap-2 text-sm font-bold">
                <MessageSquareText className="h-4 w-4 text-amber" />
                주의점
              </div>
              <p className="mt-3 text-sm font-medium leading-relaxed text-ink/70">
                {selected.risk}
              </p>
            </div>
          </div>
        </section>
      </div>
    </ToolShell>
  );
}

function PerformanceCollectorTool() {
  const [campaignName, setCampaignName] = useState("청년 지역정착 패키지 홍보 캠페인");
  const [apiKey, setApiKey] = useState("");
  const [videoIds, setVideoIds] = useState("https://www.youtube.com/watch?v=VIDEO_ID");
  const [rows, setRows] = useState<VideoMetricRow[]>(sampleVideoRows);
  const [status, setStatus] = useState("샘플 데이터로 성과 수집 흐름을 표시했습니다.");
  const [loading, setLoading] = useState(false);

  const totalViews = rows.reduce((total, row) => total + row.views, 0);
  const totalEngagements = rows.reduce((total, row) => total + row.likes + row.comments, 0);
  const averageRate =
    rows.length > 0
      ? rows.reduce((total, row) => total + engagementRate(row), 0) / rows.length
      : 0;
  const topRow = [...rows].sort((a, b) => b.views - a.views)[0];

  async function collectFromApi() {
    const ids = parseVideoIds(videoIds);

    if (!apiKey.trim()) {
      setStatus("YouTube Data API Key가 필요합니다. 키가 없으면 샘플 데이터로 흐름을 확인할 수 있습니다.");
      return;
    }
    if (ids.length === 0) {
      setStatus("수집할 YouTube 영상 ID 또는 URL을 입력하세요.");
      return;
    }

    setLoading(true);
    setStatus(`YouTube Data API에서 ${ids.length}개 영상의 공개 지표를 수집하는 중입니다.`);
    try {
      const params = new URLSearchParams({
        part: "snippet,statistics",
        id: ids.join(","),
        key: apiKey.trim(),
      });
      const response = await fetch(`https://www.googleapis.com/youtube/v3/videos?${params.toString()}`);
      const data = (await response.json()) as {
        items?: Array<{
          id: string;
          snippet?: { title?: string };
          statistics?: {
            viewCount?: string;
            likeCount?: string;
            commentCount?: string;
          };
        }>;
        error?: { message?: string };
      };

      if (!response.ok || data.error) {
        throw new Error(data.error?.message ?? "YouTube API 요청에 실패했습니다.");
      }

      const collectedAt = new Date().toLocaleString("ko-KR", { hour12: false });
      const nextRows = (data.items ?? []).map((item) => ({
        id: item.id,
        title: item.snippet?.title ?? item.id,
        views: Number(item.statistics?.viewCount ?? 0),
        likes: Number(item.statistics?.likeCount ?? 0),
        comments: Number(item.statistics?.commentCount ?? 0),
        collectedAt,
      }));

      setRows(nextRows);
      setStatus(`${nextRows.length}개 영상의 공개 성과지표를 수집했습니다.`);
    } catch (error) {
      setStatus(error instanceof Error ? `수집 실패: ${error.message}` : "수집에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  function loadSample() {
    setRows(sampleVideoRows);
    setStatus("샘플 데이터로 성과 수집 흐름을 표시했습니다.");
  }

  function downloadCsv() {
    if (rows.length === 0) return;
    const csvValue = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
    const csv = [
      ["campaign", "video_id", "title", "views", "likes", "comments", "engagement_rate", "collected_at"]
        .map(csvValue)
        .join(","),
      ...rows.map((row) =>
        [
          campaignName,
          row.id,
          row.title,
          row.views,
          row.likes,
          row.comments,
          `${engagementRate(row).toFixed(2)}%`,
          row.collectedAt,
        ]
          .map(csvValue)
          .join(","),
      ),
    ].join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "youtube_campaign_metrics.csv";
    link.click();
    URL.revokeObjectURL(url);
    setStatus("CSV 파일을 생성했습니다.");
  }

  return (
    <ToolShell
      title="YouTube 성과 수집기"
      eyebrow="Learning Loop"
      icon={<Gauge className="h-5 w-5" />}
      action={
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={loadSample}
            className="focus-ring flex h-11 items-center gap-2 rounded-md border border-line bg-white px-4 text-sm font-semibold transition hover:bg-paper"
          >
            <TrendingUp className="h-4 w-4" />
            샘플
          </button>
          <button
            type="button"
            onClick={collectFromApi}
            disabled={loading}
            className="focus-ring flex h-11 items-center gap-2 rounded-md bg-ink px-4 text-sm font-semibold text-white transition hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
            API로 수집
          </button>
          <button
            type="button"
            onClick={downloadCsv}
            disabled={rows.length === 0}
            className="focus-ring flex h-11 items-center gap-2 rounded-md bg-cobalt px-4 text-sm font-semibold text-white transition hover:bg-cobalt/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Download className="h-4 w-4" />
            CSV
          </button>
        </div>
      }
    >
      <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
        <section className="rounded-lg border border-line bg-white p-4">
          <div className="grid gap-4">
            <Field label="캠페인명" value={campaignName} onChange={setCampaignName} />
            <label className="grid gap-2 text-sm font-semibold">
              YouTube Data API Key
              <input
                type="password"
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                placeholder="AIza..."
                autoComplete="off"
                className="focus-ring h-11 rounded-md border border-line bg-white px-3 text-sm font-medium"
              />
            </label>
            <TextArea
              label="YouTube 영상 URL 또는 ID"
              value={videoIds}
              rows={8}
              onChange={setVideoIds}
            />
            <p className="rounded-md bg-paper px-3 py-2 text-sm font-semibold text-ink/68">
              {status}
            </p>
          </div>
        </section>

        <section className="grid gap-4 rounded-lg border border-line bg-white p-4">
          <div className="grid gap-3 md:grid-cols-4">
            <Metric label="총 조회수" value={formatNumber(totalViews)} tone="cobalt" />
            <Metric label="총 반응" value={formatNumber(totalEngagements)} tone="mint" />
            <Metric label="평균 반응률" value={`${averageRate.toFixed(2)}%`} tone="coral" />
            <Metric label="수집 영상" value={`${rows.length}개`} tone="ink" />
          </div>

          <div className="overflow-hidden rounded-lg border border-line">
            <div className="grid grid-cols-[1.3fr_0.6fr_0.6fr_0.6fr_0.7fr] bg-paper px-3 py-2 text-xs font-bold text-ink/64">
              <span>영상</span>
              <span>조회수</span>
              <span>좋아요</span>
              <span>댓글</span>
              <span>반응률</span>
            </div>
            {rows.map((row) => (
              <div
                key={row.id}
                className="grid grid-cols-[1.3fr_0.6fr_0.6fr_0.6fr_0.7fr] border-t border-line px-3 py-3 text-sm"
              >
                <span className="font-semibold leading-snug">{row.title}</span>
                <span>{formatNumber(row.views)}</span>
                <span>{formatNumber(row.likes)}</span>
                <span>{formatNumber(row.comments)}</span>
                <span className="font-bold text-cobalt">{engagementRate(row).toFixed(2)}%</span>
              </div>
            ))}
          </div>

          {topRow && (
            <div className="rounded-lg border border-line bg-ink p-4 text-white">
              <div className="flex items-center gap-2 text-sm font-bold">
                <TrendingUp className="h-4 w-4" />
                다음 메시지 실험
              </div>
              <p className="mt-3 text-sm font-medium leading-relaxed text-white/82">
                {`조회수 기준 최상위 콘텐츠는 "${topRow.title}"입니다. 다음 배포에서는 이 제목 구조와 썸네일 약속을 다른 시민 상태별 메시지와 비교 실험할 수 있습니다.`}
              </p>
            </div>
          )}
        </section>
      </div>
    </ToolShell>
  );
}

function ToolShell({
  title,
  eyebrow,
  icon,
  action,
  children,
}: {
  title: string;
  eyebrow: string;
  icon: React.ReactNode;
  action: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-line bg-paper p-4 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 rounded-lg border border-line bg-white px-4 py-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-md bg-ink text-white">
            {icon}
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-cobalt">
              {eyebrow}
            </p>
            <h2 className="text-2xl font-semibold tracking-normal">{title}</h2>
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold">
      {label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="focus-ring h-11 rounded-md border border-line bg-white px-3 text-sm font-medium"
      />
    </label>
  );
}

function TextArea({
  label,
  value,
  rows,
  onChange,
}: {
  label: string;
  value: string;
  rows: number;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold">
      {label}
      <textarea
        value={value}
        rows={rows}
        onChange={(event) => onChange(event.target.value)}
        className="focus-ring rounded-md border border-line bg-white px-3 py-3 text-sm font-medium leading-relaxed"
      />
    </label>
  );
}

function ResultPanel({
  empty,
  error,
  children,
}: {
  empty: boolean;
  error: string;
  children: React.ReactNode;
}) {
  return (
    <section className="min-h-[520px] rounded-lg border border-line bg-white p-4">
      {error && (
        <div className="mb-4 rounded-md border border-coral/30 bg-coral/10 px-3 py-2 text-sm font-semibold text-coral">
          {error}
        </div>
      )}
      {empty ? (
        <div className="flex min-h-[470px] flex-col items-center justify-center rounded-md border border-dashed border-line bg-paper text-center">
          <Bot className="h-10 w-10 text-cobalt" />
          <p className="mt-3 text-lg font-semibold">결과 대기 중</p>
          <p className="mt-1 text-sm font-medium text-ink/58">
            입력값을 바꾼 뒤 생성 버튼을 누르세요.
          </p>
        </div>
      ) : (
        children
      )}
    </section>
  );
}

function PressReleaseResult({ output }: { output: PressOutput }) {
  return (
    <div className="grid gap-4">
      <article className="rounded-lg border border-line p-5">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-cobalt">
          보도자료
        </p>
        <h3 className="mt-2 text-3xl font-semibold leading-tight tracking-normal">
          {output.headline}
        </h3>
        <p className="mt-2 text-base font-semibold text-ink/70">{output.subhead}</p>
        <p className="mt-5 text-base font-medium leading-relaxed">{output.lead}</p>
        <div className="mt-4 grid gap-3">
          {output.body.map((paragraph) => (
            <p key={paragraph} className="text-sm leading-relaxed text-ink/78">
              {paragraph}
            </p>
          ))}
        </div>
        <blockquote className="mt-5 border-l-4 border-cobalt bg-cobalt/5 px-4 py-3 text-sm font-semibold leading-relaxed">
          {output.quote}
        </blockquote>
      </article>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-line p-4">
          <div className="flex items-center gap-2 text-sm font-bold">
            <Share2 className="h-4 w-4 text-coral" />
            SNS 요약
          </div>
          <p className="mt-3 text-sm leading-relaxed text-ink/78">
            {output.snsSummary}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {output.hashtags.map((tag) => (
              <span key={tag} className="rounded-full bg-paper px-3 py-1 text-xs font-bold">
                {tag}
              </span>
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-line p-4">
          <div className="flex items-center gap-2 text-sm font-bold">
            <Radio className="h-4 w-4 text-mint" />
            언론 대응 포인트
          </div>
          <div className="mt-3 grid gap-2">
            {output.mediaPitch.map((item) => (
              <div key={item} className="flex items-start gap-2 text-sm font-medium">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-mint" />
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function NewsAnalysisResult({ output }: { output: NewsAnalysisOutput }) {
  const total = Math.max(output.articleCount, 1);

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 md:grid-cols-4">
        <Metric label="기사 수" value={`${output.articleCount}건`} tone="ink" />
        <Metric label="분석 정서" value={output.sentiment.label} tone="mint" />
        <Metric label="긍정" value={`${output.sentiment.positive}건`} tone="cobalt" />
        <Metric label="부정" value={`${output.sentiment.negative}건`} tone="coral" />
      </div>
      <div className="rounded-lg border border-line p-4">
        <h3 className="text-sm font-bold">긍정·중립·부정 분포</h3>
        <div className="mt-4 grid gap-3">
          <SentimentBar label="긍정" value={output.sentiment.positive} total={total} color="bg-mint" />
          <SentimentBar label="중립" value={output.sentiment.neutral} total={total} color="bg-amber" />
          <SentimentBar label="부정" value={output.sentiment.negative} total={total} color="bg-coral" />
        </div>
      </div>
      <div className="rounded-lg border border-line p-4">
        <h3 className="text-sm font-bold">핵심 이슈</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {output.coreIssues.map((issue) => (
            <div key={issue.keyword} className="rounded-md bg-paper p-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-lg font-semibold">{issue.keyword}</span>
                <span className="rounded-full bg-white px-2 py-1 text-xs font-bold">
                  {issue.mentions}회
                </span>
              </div>
              <p className="mt-2 text-sm font-medium leading-relaxed text-ink/68">
                {issue.angle}
              </p>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-lg border border-line p-4">
        <h3 className="text-sm font-bold">언론사별 차이</h3>
        <div className="mt-3 overflow-hidden rounded-md border border-line">
          <div className="grid grid-cols-[1fr_96px_1.3fr] bg-paper px-3 py-2 text-xs font-bold text-ink/68">
            <span>언론사</span>
            <span>정서</span>
            <span>프레임</span>
          </div>
          {output.outletDifferences.map((item) => (
            <div
              key={item.outlet}
              className="grid grid-cols-[1fr_96px_1.3fr] border-t border-line px-3 py-3 text-sm"
            >
              <span className="font-semibold">{item.outlet}</span>
              <span
                className={cx(
                  "w-fit rounded-full px-2 py-1 text-xs font-bold",
                  item.tone === "긍정" && "bg-mint/10 text-mint",
                  item.tone === "부정" && "bg-coral/10 text-coral",
                  item.tone === "중립" && "bg-amber/10 text-amber",
                )}
              >
                {item.tone}
              </span>
              <span className="font-medium text-ink/72">{item.frame}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-lg border border-line bg-ink p-4 text-white">
        <div className="flex items-center gap-2 text-sm font-bold">
          <MessageSquareText className="h-4 w-4" />
          자동 보고서
        </div>
        <p className="mt-3 text-sm font-medium leading-relaxed text-white/82">
          {output.report}
        </p>
      </div>
    </div>
  );
}

function WritingResult({ output }: { output: WritingOutput }) {
  return (
    <div className="grid gap-4">
      <article className="rounded-lg border border-line p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-cobalt">
              Recommended Frame
            </p>
            <h3 className="mt-2 text-3xl font-semibold leading-tight tracking-normal">
              {output.recommendedFrame}
            </h3>
          </div>
          <span className="w-fit rounded-md bg-cobalt/10 px-3 py-2 text-sm font-bold text-cobalt">
            {output.title}
          </span>
        </div>
        <p className="mt-4 text-sm font-medium leading-relaxed text-ink/72">
          {output.summary}
        </p>
      </article>

      <div className="grid gap-3 md:grid-cols-2">
        {output.frames.map((frame) => (
          <div key={frame.id} className="rounded-lg border border-line p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-bold">
                <Languages className="h-4 w-4 text-cobalt" />
                {frame.label}
              </div>
              <span className="rounded-full bg-paper px-2 py-1 text-xs font-bold">
                {frame.fit} 적합도
              </span>
            </div>
            <p className="mt-3 text-sm font-medium leading-relaxed text-ink/68">
              {frame.useWhen}
            </p>
            <div className="mt-3 grid gap-2">
              {frame.outline.map((item) => (
                <p key={item} className="rounded-md bg-paper px-3 py-2 text-sm font-semibold">
                  {item}
                </p>
              ))}
            </div>
          </div>
        ))}
      </div>

      <article className="rounded-lg border border-line p-5">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-mint">
          Draft Structure
        </p>
        <h3 className="mt-2 text-2xl font-semibold leading-tight">
          {output.draft.headline}
        </h3>
        <p className="mt-3 text-sm font-medium leading-relaxed text-ink/72">
          {output.draft.lead}
        </p>
        <div className="mt-4 grid gap-3">
          {output.draft.sections.map((section) => (
            <div key={section.heading} className="rounded-md border border-line p-3">
              <h4 className="text-sm font-bold">{section.heading}</h4>
              <p className="mt-2 text-sm font-medium leading-relaxed text-ink/70">
                {section.body}
              </p>
            </div>
          ))}
        </div>
      </article>

      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-lg border border-line p-4">
          <div className="flex items-center gap-2 text-sm font-bold">
            <MessageSquareText className="h-4 w-4 text-coral" />
            FAQ 의미망
          </div>
          <div className="mt-3 grid gap-3">
            {output.faq.map((item) => (
              <div key={item.question} className="rounded-md bg-paper p-3">
                <p className="text-sm font-bold">{item.question}</p>
                <p className="mt-2 text-sm font-medium leading-relaxed text-ink/68">
                  {item.answer}
                </p>
              </div>
            ))}
          </div>
        </div>
        <div className="grid gap-4">
          <AssetList
            title="검증 체크리스트"
            items={output.verificationChecklist}
            icon={<ClipboardCheck className="h-4 w-4 text-mint" />}
          />
          <AssetList
            title="출처 경고"
            items={output.sourceWarnings}
            icon={<ShieldCheck className="h-4 w-4 text-amber" />}
          />
        </div>
      </div>

      <article className="rounded-lg border border-ink bg-ink p-5 text-white">
        <div className="flex items-center gap-2 text-sm font-bold">
          <BookOpen className="h-4 w-4" />
          ReportDesk / gWriter Handoff
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-md bg-white/10 p-3">
            <p className="text-xs font-bold text-white/60">Brief</p>
            <p className="mt-2 text-sm font-medium leading-relaxed text-white/82">
              {output.handoff.reportDeskBrief}
            </p>
          </div>
          <div className="rounded-md bg-white/10 p-3">
            <p className="text-xs font-bold text-white/60">Verification Mode</p>
            <p className="mt-2 text-sm font-semibold">{output.handoff.gWriterMode}</p>
            <p className="mt-2 text-sm font-medium leading-relaxed text-white/82">
              {output.handoff.exportGate}
            </p>
          </div>
          <div className="rounded-md bg-white/10 p-3">
            <p className="text-xs font-bold text-white/60">Source Packet</p>
            <div className="mt-2 grid gap-2">
              {output.handoff.sourcePacket.map((item) => (
                <p key={item} className="text-sm font-medium leading-relaxed text-white/82">
                  {item}
                </p>
              ))}
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}

function YoutubeResult({ output }: { output: YoutubeOutput }) {
  return (
    <div className="grid gap-4">
      <article className="rounded-lg border border-line p-5">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-coral">
          Video Script
        </p>
        <h3 className="mt-2 text-3xl font-semibold leading-tight tracking-normal">
          {output.videoTitle}
        </h3>
        <p className="mt-3 rounded-md bg-coral/10 px-3 py-2 text-sm font-semibold text-coral">
          {output.hook}
        </p>
        <div className="mt-4 grid gap-3">
          {output.script.map((beat) => (
            <div key={beat.timecode} className="rounded-md border border-line p-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-bold text-cobalt">{beat.timecode}</span>
                <span className="rounded-full bg-paper px-2 py-1 text-xs font-bold">
                  {beat.caption}
                </span>
              </div>
              <p className="mt-2 text-sm font-medium leading-relaxed">
                {beat.narration}
              </p>
              <p className="mt-2 text-xs font-semibold text-ink/55">{beat.visual}</p>
            </div>
          ))}
        </div>
      </article>
      <div className="grid gap-4 md:grid-cols-3">
        <AssetList title="쇼츠 문안" items={output.shorts} icon={<Youtube className="h-4 w-4 text-coral" />} />
        <AssetList title="썸네일 문구" items={output.thumbnails} icon={<Sparkles className="h-4 w-4 text-amber" />} />
        <div className="rounded-lg border border-line p-4">
          <div className="flex items-center gap-2 text-sm font-bold">
            <FileText className="h-4 w-4 text-cobalt" />
            블로그 글
          </div>
          <h4 className="mt-3 text-base font-semibold">{output.blog.title}</h4>
          <div className="mt-3 grid gap-2">
            {output.blog.paragraphs.map((paragraph) => (
              <p key={paragraph} className="text-sm leading-relaxed text-ink/72">
                {paragraph}
              </p>
            ))}
          </div>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-lg border border-line p-4">
          <div className="flex items-center gap-2 text-sm font-bold">
            <Youtube className="h-4 w-4 text-coral" />
            YouTube 게시 패키지
          </div>
          <h4 className="mt-3 text-xl font-semibold leading-tight">
            {output.production.metadataTitle}
          </h4>
          <p className="mt-3 text-sm font-medium leading-relaxed text-ink/72">
            {output.production.description}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {output.production.tags.map((tag) => (
              <span key={tag} className="rounded-full bg-paper px-3 py-1 text-xs font-bold">
                #{tag.replace(/^#/, "")}
              </span>
            ))}
          </div>
        </article>
        <div className="grid gap-4">
          <AssetList
            title="자막/원고 파일명"
            items={output.production.subtitleFiles}
            icon={<FileText className="h-4 w-4 text-cobalt" />}
          />
          <AssetList
            title="녹화 체크리스트"
            items={output.production.recordingChecklist}
            icon={<CheckCircle2 className="h-4 w-4 text-mint" />}
          />
        </div>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "ink" | "mint" | "cobalt" | "coral";
}) {
  const colors = {
    ink: "bg-ink text-white",
    mint: "bg-mint text-white",
    cobalt: "bg-cobalt text-white",
    coral: "bg-coral text-white",
  };

  return (
    <div className={cx("rounded-lg p-4", colors[tone])}>
      <p className="text-xs font-bold uppercase tracking-[0.12em] opacity-75">
        {label}
      </p>
      <p className="mt-2 text-xl font-semibold">{value}</p>
    </div>
  );
}

function SentimentBar({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const percent = Math.round((value / total) * 100);

  return (
    <div className="grid grid-cols-[64px_1fr_48px] items-center gap-3 text-sm font-semibold">
      <span>{label}</span>
      <div className="h-3 overflow-hidden rounded-full bg-paper">
        <div className={cx("h-full rounded-full", color)} style={{ width: `${percent}%` }} />
      </div>
      <span className="text-right">{percent}%</span>
    </div>
  );
}

function AssetList({
  title,
  items,
  icon,
}: {
  title: string;
  items: string[];
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-line p-4">
      <div className="flex items-center gap-2 text-sm font-bold">
        {icon}
        {title}
      </div>
      <div className="mt-3 grid gap-2">
        {items.map((item) => (
          <p key={item} className="rounded-md bg-paper px-3 py-2 text-sm font-semibold">
            {item}
          </p>
        ))}
      </div>
    </div>
  );
}

function LegacyPipeline() {
  const steps = ["홍보업무", "개발 의뢰", "수개월 개발", "사용"];

  return (
    <div className="flex h-full items-center justify-center">
      <div className="grid w-full max-w-5xl grid-cols-1 items-center gap-3 md:grid-cols-[1fr_48px_1fr_48px_1fr_48px_1fr]">
        {steps.map((step, index) => (
          <div key={step} className="contents">
            <motion.div
              className="flex h-28 items-center justify-center rounded-lg border border-line bg-white text-xl font-semibold shadow-sm"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.15 }}
            >
              {step}
            </motion.div>
            {index < steps.length - 1 && (
              <motion.div
                className="hidden justify-center text-ink/45 md:flex"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.15 + 0.12 }}
              >
                <ArrowRight className="h-7 w-7" />
              </motion.div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function SpecializedWork() {
  const items = [
    { label: "정책홍보", icon: Megaphone, color: "text-cobalt" },
    { label: "보도자료", icon: FileText, color: "text-coral" },
    { label: "언론모니터링", icon: Search, color: "text-mint" },
    { label: "민원분석", icon: BarChart3, color: "text-amber" },
    { label: "기자응대", icon: Radio, color: "text-cobalt" },
  ];

  return (
    <div className="grid h-full place-items-center">
      <div className="grid w-full max-w-4xl grid-cols-2 gap-4 md:grid-cols-5">
        {items.map((item, index) => {
          const Icon = item.icon;

          return (
            <motion.div
              key={item.label}
              className="flex aspect-square flex-col items-center justify-center gap-3 rounded-lg border border-line bg-white shadow-sm"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.11 }}
            >
              <Icon className={cx("h-9 w-9", item.color)} />
              <span className="text-lg font-semibold">{item.label}</span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function MarketComparison() {
  return (
    <div className="grid h-full items-center gap-5 md:grid-cols-2">
      <motion.div
        className="rounded-lg border border-line bg-white p-7 shadow-sm"
        initial={{ opacity: 0, x: -24 }}
        animate={{ opacity: 1, x: 0 }}
      >
        <div className="flex items-center gap-3">
          <Users className="h-8 w-8 text-cobalt" />
          <h3 className="text-3xl font-semibold">대중앱</h3>
        </div>
        <div className="mt-8 h-8 rounded-full bg-cobalt" />
        <p className="mt-4 text-5xl font-semibold">수백만</p>
        <p className="mt-1 text-lg font-semibold text-ink/58">사용자 시장</p>
      </motion.div>
      <motion.div
        className="rounded-lg border border-line bg-white p-7 shadow-sm"
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
      >
        <div className="flex items-center gap-3">
          <Megaphone className="h-8 w-8 text-coral" />
          <h3 className="text-3xl font-semibold">정책홍보 앱</h3>
        </div>
        <div className="mt-8 h-8 rounded-full bg-coral/18">
          <div className="h-full w-[18%] rounded-full bg-coral" />
        </div>
        <p className="mt-4 text-5xl font-semibold">수백</p>
        <p className="mt-1 text-lg font-semibold text-ink/58">전문 사용자 시장</p>
      </motion.div>
    </div>
  );
}

function PressMini({ output }: { output: PressOutput }) {
  return (
    <div className="grid h-full items-start gap-4 md:grid-cols-[0.8fr_1.2fr]">
      <div className="rounded-lg border border-line bg-white p-4 shadow-sm">
        <div className="grid grid-cols-2 gap-2">
          {["정책명", "사업내용", "예산", "대상", "기대효과"].map((item, index) => (
            <motion.div
              key={item}
              className="rounded-md border border-line px-3 py-2 text-sm font-semibold"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.08 }}
            >
              {item}
            </motion.div>
          ))}
        </div>
        <div className="mt-3 flex h-9 items-center justify-center rounded-md bg-cobalt text-sm font-bold text-white">
          생성
        </div>
      </div>
      <motion.article
        className="rounded-lg border border-line bg-white p-5 shadow-sm"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
      >
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-cobalt">
          Output
        </p>
        <h3 className="mt-2 text-2xl font-semibold leading-tight">{output.headline}</h3>
        <p className="mt-3 text-sm font-semibold text-ink/68">{output.subhead}</p>
      </motion.article>
    </div>
  );
}

function NewsMini({ output }: { output: NewsAnalysisOutput }) {
  return (
    <div className="grid h-full items-center gap-4 md:grid-cols-[1fr_1fr]">
      <motion.div
        className="rounded-lg border border-line bg-white p-5 shadow-sm"
        initial={{ opacity: 0, x: -18 }}
        animate={{ opacity: 1, x: 0 }}
      >
        <h3 className="text-xl font-semibold">핵심 이슈</h3>
        <div className="mt-4 grid gap-3">
          {output.coreIssues.slice(0, 4).map((issue, index) => (
            <div key={issue.keyword} className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-cobalt/10 text-sm font-bold text-cobalt">
                {index + 1}
              </span>
              <div className="h-3 rounded-full bg-cobalt" style={{ width: `${72 - index * 10}%` }} />
              <span className="w-24 text-sm font-semibold">{issue.keyword}</span>
            </div>
          ))}
        </div>
      </motion.div>
      <motion.div
        className="rounded-lg border border-line bg-white p-5 shadow-sm"
        initial={{ opacity: 0, x: 18 }}
        animate={{ opacity: 1, x: 0 }}
      >
        <h3 className="text-xl font-semibold">언론사별 차이</h3>
        <div className="mt-4 grid gap-3">
          {output.outletDifferences.map((item) => (
            <div key={item.outlet} className="rounded-md bg-paper p-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold">{item.outlet}</span>
                <span className="rounded-full bg-white px-2 py-1 text-xs font-bold">
                  {item.tone}
                </span>
              </div>
              <p className="mt-2 text-sm font-medium text-ink/62">{item.frame}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

function YoutubeMini({ output }: { output: YoutubeOutput }) {
  return (
    <div className="grid h-full items-center gap-4 md:grid-cols-[1.1fr_0.9fr]">
      <motion.div
        className="rounded-lg border border-line bg-white p-5 shadow-sm"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <p className="text-sm font-bold text-coral">영상 대본</p>
        <h3 className="mt-2 text-3xl font-semibold">{output.videoTitle}</h3>
        <div className="mt-4 grid gap-2">
          {output.script.slice(0, 4).map((beat) => (
            <div key={beat.timecode} className="grid grid-cols-[96px_1fr] gap-3 rounded-md border border-line px-3 py-2 text-sm">
              <span className="font-bold text-cobalt">{beat.timecode}</span>
              <span className="font-medium text-ink/68">{beat.caption}</span>
            </div>
          ))}
        </div>
      </motion.div>
      <motion.div
        className="rounded-lg border border-line bg-white p-5 shadow-sm"
        initial={{ opacity: 0, y: -18 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <p className="text-sm font-bold text-coral">콘텐츠 패키지</p>
        <div className="mt-4 grid gap-3">
          {["쇼츠 문안", "썸네일 문구", "블로그 글"].map((item, index) => (
            <div key={item} className="flex items-center gap-3 rounded-md bg-paper px-3 py-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-coral text-sm font-bold text-white">
                {index + 1}
              </span>
              <span className="font-semibold">{item}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

function WritingMini({ output }: { output: WritingOutput }) {
  return (
    <div className="grid h-full items-center gap-4 md:grid-cols-[0.9fr_1.1fr]">
      <motion.div
        className="rounded-lg border border-line bg-white p-5 shadow-sm"
        initial={{ opacity: 0, x: -18 }}
        animate={{ opacity: 1, x: 0 }}
      >
        <p className="text-sm font-bold text-cobalt">추천 글쓰기 프레임</p>
        <h3 className="mt-2 text-3xl font-semibold">{output.recommendedFrame}</h3>
        <div className="mt-4 grid gap-2">
          {output.frames.slice(0, 3).map((frame) => (
            <div key={frame.id} className="grid grid-cols-[1fr_52px] items-center gap-3 rounded-md bg-paper px-3 py-2">
              <span className="text-sm font-semibold">{frame.label}</span>
              <span className="text-right text-sm font-bold text-cobalt">{frame.fit}</span>
            </div>
          ))}
        </div>
      </motion.div>
      <motion.div
        className="rounded-lg border border-line bg-white p-5 shadow-sm"
        initial={{ opacity: 0, x: 18 }}
        animate={{ opacity: 1, x: 0 }}
      >
        <p className="text-sm font-bold text-mint">검증형 초안 구조</p>
        <h3 className="mt-2 text-2xl font-semibold leading-tight">{output.draft.headline}</h3>
        <div className="mt-4 grid gap-3">
          {["FAQ 의미망", "출처 경고", "gWriter handoff"].map((item, index) => (
            <div key={item} className="flex items-center gap-3 rounded-md bg-paper px-3 py-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-mint text-sm font-bold text-white">
                {index + 1}
              </span>
              <span className="font-semibold">{item}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

function TargetingMini() {
  const profile = citizenProfiles[0];

  return (
    <div className="grid h-full items-center gap-4 md:grid-cols-[0.9fr_1.1fr]">
      <motion.div
        className="rounded-lg border border-line bg-white p-5 shadow-sm"
        initial={{ opacity: 0, x: -18 }}
        animate={{ opacity: 1, x: 0 }}
      >
        <p className="text-sm font-bold text-cobalt">시민 상태</p>
        <h3 className="mt-2 text-3xl font-semibold">{profile.name}</h3>
        <div className="mt-5 grid gap-3">
          {[
            ["인지도", profile.awareness],
            ["신뢰도", profile.trust],
            ["장벽", profile.barrier],
          ].map(([label, value]) => (
            <div key={label} className="grid grid-cols-[72px_1fr_44px] items-center gap-3 text-sm font-semibold">
              <span>{label}</span>
              <div className="h-3 overflow-hidden rounded-full bg-paper">
                <div className="h-full rounded-full bg-cobalt" style={{ width: `${value}%` }} />
              </div>
              <span className="text-right">{value}%</span>
            </div>
          ))}
        </div>
      </motion.div>
      <motion.div
        className="rounded-lg border border-cobalt bg-cobalt/5 p-5 shadow-sm"
        initial={{ opacity: 0, x: 18 }}
        animate={{ opacity: 1, x: 0 }}
      >
        <p className="text-sm font-bold text-cobalt">맞춤 메시지 전략</p>
        <h3 className="mt-2 text-3xl font-semibold">{profile.strategy}</h3>
        <p className="mt-4 text-base font-semibold leading-relaxed text-ink/72">
          {profile.tailoredMessage}
        </p>
      </motion.div>
    </div>
  );
}

function PerformanceMini() {
  return (
    <div className="grid h-full items-center gap-4 md:grid-cols-[1fr_1fr]">
      <motion.div
        className="rounded-lg border border-line bg-white p-5 shadow-sm"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <p className="text-sm font-bold text-mint">YouTube 성과</p>
        <div className="mt-4 grid gap-3">
          {sampleVideoRows.map((row, index) => (
            <div key={row.id} className="rounded-md bg-paper p-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-bold">{row.title}</span>
                <span className="rounded-full bg-white px-2 py-1 text-xs font-bold">
                  {formatNumber(row.views)}
                </span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                <div
                  className="h-full rounded-full bg-mint"
                  style={{ width: `${88 - index * 18}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </motion.div>
      <motion.div
        className="rounded-lg border border-ink bg-ink p-5 text-white shadow-sm"
        initial={{ opacity: 0, y: -18 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <p className="text-sm font-bold text-white/60">학습 루프</p>
        <div className="mt-5 grid gap-3">
          {["성과 수집", "메시지 비교", "다음 실험"].map((item, index) => (
            <div key={item} className="flex items-center gap-3 rounded-md bg-white/10 px-3 py-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-sm font-bold text-ink">
                {index + 1}
              </span>
              <span className="font-semibold">{item}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

function FutureFlow() {
  return (
    <div className="grid h-full items-center gap-5 md:grid-cols-2">
      <motion.div
        className="rounded-lg border border-line bg-white p-7 shadow-sm"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <p className="text-sm font-bold text-ink/50">과거</p>
        <div className="mt-8 flex items-center justify-between gap-4">
          <Node icon={<Megaphone className="h-6 w-6" />} label="홍보담당자" />
          <ArrowRight className="h-7 w-7 text-ink/35" />
          <Node icon={<Code2 className="h-6 w-6" />} label="개발자" />
        </div>
      </motion.div>
      <motion.div
        className="rounded-lg border border-ink bg-ink p-7 text-white shadow-sm"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18 }}
      >
        <p className="text-sm font-bold text-white/60">미래</p>
        <div className="mt-8 flex items-center justify-between gap-4">
          <Node dark icon={<Megaphone className="h-6 w-6" />} label="홍보담당자" />
          <ArrowRight className="h-7 w-7 text-white/45" />
          <Node dark icon={<Bot className="h-6 w-6" />} label="AI" />
          <ArrowRight className="h-7 w-7 text-white/45" />
          <Node dark icon={<Sparkles className="h-6 w-6" />} label="앱" />
        </div>
      </motion.div>
    </div>
  );
}

function FinalMessage() {
  return (
    <div className="flex h-full items-center justify-center">
      <motion.div
        className="max-w-5xl text-center"
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <p className="text-3xl font-semibold text-ink/45 md:text-5xl">
          보도자료를 작성하는 홍보담당자에서
        </p>
        <p className="mt-6 text-5xl font-semibold tracking-normal text-ink md:text-7xl">
          홍보용 AI를 만드는 홍보담당자로
        </p>
      </motion.div>
    </div>
  );
}

function Node({
  icon,
  label,
  dark = false,
}: {
  icon: React.ReactNode;
  label: string;
  dark?: boolean;
}) {
  return (
    <div
      className={cx(
        "flex min-h-28 flex-1 flex-col items-center justify-center gap-3 rounded-lg border px-3 text-center",
        dark ? "border-white/20 bg-white/10" : "border-line bg-paper",
      )}
    >
      {icon}
      <span className="text-lg font-semibold">{label}</span>
    </div>
  );
}
