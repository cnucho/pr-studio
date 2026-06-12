export type PressInput = {
  policyName: string;
  business: string;
  budget: string;
  audience: string;
  expectedEffect: string;
  tone?: "공식" | "생활밀착" | "디지털";
};

export type PressOutput = {
  headline: string;
  subhead: string;
  lead: string;
  body: string[];
  quote: string;
  snsSummary: string;
  hashtags: string[];
  mediaPitch: string[];
};

export type NewsArticle = {
  outlet: string;
  title: string;
  body: string;
};

export type IssueSummary = {
  keyword: string;
  mentions: number;
  angle: string;
};

export type OutletDifference = {
  outlet: string;
  tone: "긍정" | "중립" | "부정";
  score: number;
  topTerms: string[];
  frame: string;
};

export type NewsAnalysisOutput = {
  articleCount: number;
  coreIssues: IssueSummary[];
  sentiment: {
    positive: number;
    neutral: number;
    negative: number;
    score: number;
    label: "긍정 우세" | "중립" | "부정 우세";
  };
  outletDifferences: OutletDifference[];
  report: string;
};

export type YoutubeInput = {
  policyText: string;
  audience: string;
  durationMinutes: string;
};

export type ScriptBeat = {
  timecode: string;
  narration: string;
  visual: string;
  caption: string;
};

export type YoutubeOutput = {
  videoTitle: string;
  hook: string;
  script: ScriptBeat[];
  shorts: string[];
  thumbnails: string[];
  blog: {
    title: string;
    paragraphs: string[];
  };
  production: {
    metadataTitle: string;
    description: string;
    tags: string[];
    subtitleFiles: string[];
    recordingChecklist: string[];
  };
};

const positiveWords = [
  "확대",
  "개선",
  "지원",
  "성장",
  "효과",
  "편의",
  "안전",
  "성과",
  "강화",
  "해소",
  "혁신",
  "선도",
  "혜택",
  "절감",
];

const negativeWords = [
  "우려",
  "논란",
  "비판",
  "부족",
  "지연",
  "불편",
  "갈등",
  "위험",
  "축소",
  "실패",
  "부담",
  "혼란",
  "반발",
  "낭비",
];

const stopWords = new Set([
  "그리고",
  "그러나",
  "이번",
  "대한",
  "통해",
  "있는",
  "없는",
  "위해",
  "관련",
  "정책",
  "사업",
  "정부",
  "지역",
  "시민",
  "기자",
  "보도",
  "자료",
  "분석",
  "제공",
  "추진",
  "계획",
  "대상",
  "예정",
  "오늘",
  "올해",
  "확인",
]);

function clean(input: string | undefined, fallback: string) {
  const value = input?.trim();
  return value && value.length > 0 ? value : fallback;
}

function sentenceCase(value: string) {
  const trimmed = value.trim();
  return trimmed.endsWith(".") || trimmed.endsWith("다") ? trimmed : `${trimmed}`;
}

function extractKeywords(text: string, max = 6) {
  const counts = new Map<string, number>();
  const words = text
    .replace(/[^\p{Script=Hangul}a-zA-Z0-9\s]/gu, " ")
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length >= 2 && !stopWords.has(word));

  for (const word of words) {
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ko"))
    .slice(0, max)
    .map(([word]) => word);
}

function toSlug(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^0-9a-z가-힣]+/gi, "-")
      .replace(/^-+|-+$/g, "") || "policy-pr-video"
  );
}

function scoreText(text: string) {
  const positive = positiveWords.reduce(
    (total, word) => total + (text.includes(word) ? 1 : 0),
    0,
  );
  const negative = negativeWords.reduce(
    (total, word) => total + (text.includes(word) ? 1 : 0),
    0,
  );
  return positive - negative;
}

function toneFromScore(score: number): "긍정" | "중립" | "부정" {
  if (score > 0) return "긍정";
  if (score < 0) return "부정";
  return "중립";
}

export function createPressRelease(input: PressInput): PressOutput {
  const policyName = clean(input.policyName, "청년 지역정착 패키지");
  const business = clean(
    input.business,
    "지역 기업 일자리 연계, 주거비 지원, 생활 기반 상담을 통합 제공",
  );
  const budget = clean(input.budget, "120억 원");
  const audience = clean(input.audience, "지역 청년과 초기 경력자");
  const expectedEffect = clean(
    input.expectedEffect,
    "정착 초기 비용을 낮추고 지역 기업의 인재 확보를 지원",
  );
  const tone = input.tone ?? "공식";
  const keywords = extractKeywords(
    `${policyName} ${business} ${audience} ${expectedEffect}`,
    4,
  );
  const verb = tone === "디지털" ? "스마트하게 지원" : "본격 추진";
  const headline = `${policyName}, ${audience} 위한 ${verb}`;
  const subhead = `${budget} 규모로 ${sentenceCase(expectedEffect)}하는 생활밀착형 정책`;
  const lead = `${policyName}은 ${audience}이 체감할 수 있는 변화를 만들기 위해 마련된 정책입니다. 핵심 사업은 ${business}이며, 총 ${budget}을 투입해 현장 수요에 맞춘 지원을 단계적으로 제공합니다.`;

  return {
    headline,
    subhead,
    lead,
    body: [
      `첫째, 정책의 진입 장벽을 낮춥니다. 신청과 상담, 지원 안내를 하나의 흐름으로 연결해 ${audience}이 필요한 정보를 빠르게 찾을 수 있도록 구성했습니다.`,
      `둘째, 집행 과정의 투명성을 높입니다. ${budget} 예산은 대상별 수요와 성과 지표에 따라 배분되며, 추진 현황은 정기적으로 공개됩니다.`,
      `셋째, 홍보와 현장 대응을 함께 설계했습니다. 정책 설명자료, SNS 요약, 질의응답 문안을 함께 배포해 시민과 언론의 이해도를 높입니다.`,
    ],
    quote: `"${policyName}은 단순한 지원사업이 아니라 ${audience}의 실제 문제를 해결하기 위한 실행 체계입니다. 앞으로도 현장의 목소리를 반영해 정책 효과를 높이겠습니다."`,
    snsSummary: `${policyName}이 시작됩니다. ${business}. ${budget} 규모로 ${audience}에게 필요한 변화를 만들겠습니다.`,
    hashtags: [
      "#정책홍보",
      `#${policyName.replace(/\s+/g, "")}`,
      ...keywords.slice(0, 3).map((keyword) => `#${keyword.replace(/\s+/g, "")}`),
    ],
    mediaPitch: [
      `${audience} 관점에서 체감 포인트를 먼저 제시`,
      `${budget} 예산의 쓰임과 성과 지표를 함께 설명`,
      `정책 담당자 인터뷰와 현장 사례를 후속 보도로 연결`,
    ],
  };
}

export function parseArticles(raw: string): NewsArticle[] {
  const blocks = raw
    .split(/\n\s*---+\s*\n/g)
    .map((block) => block.trim())
    .filter(Boolean);

  return blocks.map((block, index) => {
    const lines = block.split(/\n+/).map((line) => line.trim()).filter(Boolean);
    const outletLine = lines.find((line) => /^언론사\s*[:：]/.test(line));
    const titleLine = lines.find((line) => /^제목\s*[:：]/.test(line));
    const outlet = outletLine
      ? outletLine.replace(/^언론사\s*[:：]\s*/, "")
      : `언론사 ${index + 1}`;
    const title = titleLine
      ? titleLine.replace(/^제목\s*[:：]\s*/, "")
      : lines[0] ?? `기사 ${index + 1}`;
    const body = lines
      .filter((line) => line !== outletLine && line !== titleLine)
      .join(" ");

    return {
      outlet,
      title,
      body: body || title,
    };
  });
}

export function analyzeNews(raw: string): NewsAnalysisOutput {
  const articles = parseArticles(
    clean(
      raw,
      "언론사: 서울정책신문\n제목: 청년 지역정착 패키지 확대\n청년 주거비 지원과 일자리 연계가 강화되며 현장에서는 기대가 커지고 있다.\n---\n언론사: 시민경제\n제목: 예산 집행 기준 논란\n일부에서는 예산 부담과 형평성 우려도 제기된다.",
    ),
  );
  const fullText = articles.map((article) => `${article.title} ${article.body}`).join(" ");
  const keywords = extractKeywords(fullText, 5);
  const differences = articles.map((article) => {
    const text = `${article.title} ${article.body}`;
    const score = scoreText(text);
    const topTerms = extractKeywords(text, 3);
    const tone = toneFromScore(score);

    return {
      outlet: article.outlet,
      tone,
      score,
      topTerms,
      frame:
        tone === "긍정"
          ? "정책 효과와 수혜자 체감에 초점"
          : tone === "부정"
            ? "예산, 형평성, 집행 리스크에 초점"
            : "사실 전달과 추진 일정에 초점",
    };
  });
  const positive = differences.filter((item) => item.tone === "긍정").length;
  const negative = differences.filter((item) => item.tone === "부정").length;
  const neutral = differences.length - positive - negative;
  const score = differences.reduce((total, item) => total + item.score, 0);
  const label =
    score > 0 ? "긍정 우세" : score < 0 ? "부정 우세" : "중립";

  return {
    articleCount: articles.length,
    coreIssues: keywords.map((keyword, index) => ({
      keyword,
      mentions: fullText.split(keyword).length - 1,
      angle:
        index === 0
          ? "보도 전반에서 가장 반복되는 중심 의제"
          : index === 1
            ? "후속 질의응답에서 대비해야 할 보조 의제"
            : "SNS와 브리핑 자료에 반영할 세부 포인트",
    })),
    sentiment: {
      positive,
      neutral,
      negative,
      score,
      label,
    },
    outletDifferences: differences,
    report: `총 ${articles.length}건의 기사를 분석한 결과, 보도 프레임은 '${keywords[0] ?? "정책"}'을 중심으로 형성되어 있습니다. 전체 정서는 ${label}이며, 긍정 보도는 수혜자 체감과 지원 효과를, 부정 보도는 예산 부담과 집행 기준을 강조합니다. 다음 브리핑에서는 ${keywords.slice(0, 3).join(", ")}에 대한 근거 자료와 예상 질의응답을 먼저 준비하는 것이 좋습니다.`,
  };
}

export function createYoutubeKit(input: YoutubeInput): YoutubeOutput {
  const policyText = clean(
    input.policyText,
    "청년 지역정착 패키지는 지역 기업 일자리 연계, 주거비 지원, 생활 기반 상담을 통합 제공하는 정책이다. 총 120억 원을 투입해 청년의 초기 정착 비용을 낮추고 지역 기업의 인재 확보를 돕는다.",
  );
  const audience = clean(input.audience, "일반 시민과 정책 관심층");
  const duration = clean(input.durationMinutes, "6");
  const keywords = extractKeywords(policyText, 5);
  const core = keywords[0] ?? "정책";
  const second = keywords[1] ?? "지원";
  const third = keywords[2] ?? "효과";

  return {
    videoTitle: `${core} 정책, ${duration}분 만에 이해하기`,
    hook: `"왜 이 정책이 지금 필요한가?"라는 질문에서 시작해 ${audience}이 바로 이해할 수 있는 사례로 연결합니다.`,
    script: [
      {
        timecode: "00:00-00:35",
        narration: `오늘은 ${core} 정책을 복잡한 행정 용어가 아니라 시민의 하루 관점에서 설명해 보겠습니다.`,
        visual: "정책 자료 PDF가 화면에 들어오고 핵심 문장이 자동으로 하이라이트됨",
        caption: `${core} 정책, 시민의 하루로 이해하기`,
      },
      {
        timecode: "00:35-01:40",
        narration: `이 정책의 핵심은 ${second}입니다. 필요한 정보를 따로 찾지 않아도 한 번에 연결되도록 설계됐습니다.`,
        visual: "지원 대상, 신청 흐름, 담당 기관이 3단계 타임라인으로 정리됨",
        caption: `핵심은 ${second}`,
      },
      {
        timecode: "01:40-03:20",
        narration: `예산과 대상은 정책 신뢰를 좌우합니다. 자료에서 확인되는 주요 근거를 먼저 보여드리겠습니다.`,
        visual: "예산, 대상, 기대효과가 숫자 카드와 체크리스트로 전환됨",
        caption: "숫자와 근거로 신뢰 확보",
      },
      {
        timecode: "03:20-05:10",
        narration: `${third}는 단기간에 끝나는 홍보 문구가 아니라 현장에서 확인해야 할 성과 지표입니다.`,
        visual: "민원, 언론 보도, SNS 반응이 하나의 대시보드로 집계됨",
        caption: `${third}는 성과 지표로 추적`,
      },
      {
        timecode: "05:10-06:00",
        narration: `마지막으로 시민이 지금 해야 할 행동을 정리합니다. 확인할 것, 신청할 것, 문의할 곳만 남기겠습니다.`,
        visual: "마지막 화면에 신청 링크, 문의 채널, 핵심 문구가 정리됨",
        caption: "확인할 것만 남기는 마무리",
      },
    ],
    shorts: [
      `${core} 정책, 한 문장으로 말하면? ${second}를 더 쉽게 연결하는 정책입니다.`,
      `정책자료 PDF를 넣으면 영상 대본, 쇼츠 문안, 썸네일 문구까지 한 번에 정리됩니다.`,
      `${audience}이 궁금해할 질문부터 답하면 정책 홍보는 훨씬 쉬워집니다.`,
    ],
    thumbnails: [
      `${core}, 이 부분만 보세요`,
      `정책자료 20쪽을 6분 영상으로`,
      `${second} 지원, 누가 받을까?`,
    ],
    blog: {
      title: `${core} 정책 쉽게 이해하기: 대상, 내용, 기대효과`,
      paragraphs: [
        `${core} 정책은 ${audience}이 정책의 필요성과 신청 흐름을 빠르게 이해하도록 설계되어야 합니다.`,
        `핵심 내용은 ${second}이며, 홍보 콘텐츠에서는 지원 대상과 이용 절차를 먼저 보여주는 것이 효과적입니다.`,
        `마지막으로 ${third}를 측정할 수 있는 지표를 제시하면 보도자료, 영상, 블로그가 같은 메시지로 연결됩니다.`,
      ],
    },
    production: {
      metadataTitle: `${core} 정책 쉽게 이해하기 | ${duration}분 정책홍보 영상`,
      description: `${core} 정책의 필요성, 대상, 신청 흐름, 기대효과를 ${audience} 관점에서 정리한 영상입니다. 보도자료, 쇼츠, 블로그, 성과 측정까지 같은 메시지로 연결하는 홍보 패키지로 활용할 수 있습니다.`,
      tags: [core, second, third, "정책홍보", "유튜브홍보", "쇼츠", "보도자료"].filter(Boolean),
      subtitleFiles: [
        `${toSlug(core)}-policy-pr-demo-YYYY-MM-DD.srt`,
        `${toSlug(core)}-policy-pr-demo-YYYY-MM-DD.vtt`,
        `${toSlug(core)}-policy-pr-demo-YYYY-MM-DD-transcript.md`,
      ],
      recordingChecklist: [
        "1920x1080 기준으로 녹화하고 브라우저 확대는 100~110% 사이로 유지",
        "비공개 API 키, 내부 문서, 개인 정보가 화면에 나오지 않는지 확인",
        "각 클릭과 화면 전환은 자막이 읽힐 만큼 충분히 유지",
        "음성 녹음 후 대본을 맞추기보다 실제 클릭 흐름을 먼저 녹화한 뒤 내레이션 작성",
      ],
    },
  };
}
