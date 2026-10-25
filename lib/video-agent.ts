import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { buildPlanningDossier, contentManifestIssues, createManifest, trackForBrief, type BeatDraft, type BeatManifest } from "./video-beats";
import { videoArtifactPaths } from "./video-artifacts";
import {
  blockedContentReview,
  collectionOrderSchema,
  contentReviewSchema,
  contentReadyForProduction,
  legacyBrief,
  videoBriefSchema,
  type CollectionOrder,
  type CollectionReport,
  type ContentReview,
  type PlanningDecision,
  type VideoBrief,
} from "./video-planning";

export type VideoAgentMode = "gpt" | "local";

export type VideoAgentPlanStep = {
  title: string;
  detail: string;
  tool: "plan" | "capture" | "render" | "verify";
};

export type VideoAgentPlan = {
  mode: VideoAgentMode;
  model: string;
  pipeline: "2.0";
  round: 1 | 2 | 3;
  summary: string;
  viewerPromise: string;
  steps: VideoAgentPlanStep[];
  qualityChecks: string[];
  beats: BeatDraft[];
  collectionOrders: CollectionOrder[];
  collectionReports: CollectionReport[];
  contentReview: ContentReview;
  decision: PlanningDecision;
  productionReady: boolean;
  manifest?: BeatManifest;
  note?: string;
};

export type VideoAgentRunStep = {
  title: string;
  command: string;
  status: "completed" | "failed";
  durationMs: number;
  output: string;
};

export type VideoAgentVideo = {
  path: string;
  storagePath?: string;
  downloadUrl: string;
  width: number;
  height: number;
  duration: number;
  size: number;
  generatedAt: string;
};

export type VideoAgentProducedResult = {
  outcome: "produced";
  plan: VideoAgentPlan;
  runSteps: VideoAgentRunStep[];
  video: VideoAgentVideo;
};

export type VideoAgentPlanningResult = {
  outcome: "plan_exhausted";
  plan: VideoAgentPlan;
  runSteps: VideoAgentRunStep[];
  video?: never;
};

export type VideoAgentResult = VideoAgentProducedResult | VideoAgentPlanningResult;

type CommandResult = {
  status: "completed" | "failed";
  durationMs: number;
  stdout: string;
  stderr: string;
};

const root = process.cwd();

const fallbackPlanSteps: VideoAgentPlanStep[] = [
  {
    title: "Beat 확정",
    detail: "브리프와 허용된 화면만으로 장면 순서, 요지, 자막을 정합니다.",
    tool: "plan",
  },
  {
    title: "동작 녹화",
    detail: "Railway 워커의 Chromium이 입력과 실행을 녹화하고 화면 글자를 남깁니다.",
    tool: "capture",
  },
  {
    title: "음성·카드 합성",
    detail: "표와 도식 카드, 동작 구간, 문장별 Google 음성을 FFmpeg로 조립합니다.",
    tool: "render",
  },
  {
    title: "프레임 검토",
    detail: "워커 안의 FFmpeg와 Tesseract가 해상도, 오디오, 화면 글자를 확인합니다.",
    tool: "verify",
  },
];

const planningResponseSchema = z
  .object({
    summary: z.string().trim().min(1).max(500),
    viewerPromise: z.string().trim().min(1).max(500),
    steps: z
      .array(
        z
          .object({
            title: z.string().trim().min(1).max(100),
            detail: z.string().trim().min(1).max(500),
            tool: z.enum(["plan", "capture", "render", "verify"]),
          })
          .strict(),
      )
      .min(4)
      .max(6),
    qualityChecks: z.array(z.string().trim().min(1).max(300)).min(3).max(5),
    beats: z
      .array(
        z
          .object({
            screenId: z.string().trim().min(1).max(100),
            purpose: z.string().trim().min(1).max(500),
            viewerTakeaway: z.string().trim().min(1).max(500),
            action: z.string().trim().min(1).max(300),
            focus: z.string().trim().min(1).max(300),
            narration: z.string().trim().min(1).max(1_000),
            subtitle: z.string().trim().min(1).max(80),
            transitionReason: z.string().trim().min(1).max(500),
          })
          .strict(),
      )
      .min(4)
      .max(7),
    collectionOrders: z.array(collectionOrderSchema).max(8),
    contentReview: contentReviewSchema,
    decision: z.enum(["collect", "produce"]),
  })
  .strict();

const contentCriterionSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    status: { type: "string", enum: ["pass", "revise"] },
    rationale: { type: "string", minLength: 1, maxLength: 500 },
  },
  required: ["status", "rationale"],
};

function planningSchema(screenIds: string[]) {
  return {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: {
      type: "string",
      minLength: 1,
      maxLength: 500,
      description: "One sentence explaining the video production plan.",
    },
    viewerPromise: {
      type: "string",
      minLength: 1,
      maxLength: 500,
      description: "The concrete promise this video should make to viewers.",
    },
    steps: {
      type: "array",
      minItems: 4,
      maxItems: 6,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string", minLength: 1, maxLength: 100 },
          detail: { type: "string", minLength: 1, maxLength: 500 },
          tool: {
            type: "string",
            enum: ["plan", "capture", "render", "verify"],
          },
        },
        required: ["title", "detail", "tool"],
      },
    },
    qualityChecks: {
      type: "array",
      minItems: 3,
      maxItems: 5,
      items: { type: "string", minLength: 1, maxLength: 300 },
    },
    beats: {
      type: "array",
      minItems: 4,
      maxItems: 7,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          screenId: { type: "string", enum: screenIds },
          purpose: { type: "string", minLength: 1, maxLength: 500, description: "Why this scene is necessary for the video purpose." },
          viewerTakeaway: { type: "string", minLength: 1, maxLength: 500, description: "What the viewer should understand from this scene." },
          action: { type: "string", minLength: 1, maxLength: 300 },
          focus: { type: "string", minLength: 1, maxLength: 300 },
          narration: { type: "string", minLength: 1, maxLength: 1_000 },
          subtitle: { type: "string", minLength: 1, maxLength: 80 },
          transitionReason: { type: "string", minLength: 1, maxLength: 500, description: "Why the next scene follows this one." },
        },
        required: ["screenId", "purpose", "viewerTakeaway", "action", "focus", "narration", "subtitle", "transitionReason"],
      },
    },
    collectionOrders: {
      type: "array",
      maxItems: 8,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          instruction: { type: "string", minLength: 1, maxLength: 500 },
          capabilityId: {
            type: "string",
            enum: ["fixture", "screen-observation", "preset", "card", "video-analysis", "unknown"],
          },
        },
        required: ["instruction", "capabilityId"],
      },
    },
    contentReview: {
      type: "object",
      additionalProperties: false,
      properties: {
        objectiveFit: contentCriterionSchema,
        audienceFit: contentCriterionSchema,
        narrativeLogic: contentCriterionSchema,
        evidenceFit: contentCriterionSchema,
        narrationNaturalness: contentCriterionSchema,
        subtitleFit: contentCriterionSchema,
        visualFit: contentCriterionSchema,
        readyToProduce: { type: "boolean" },
        blockingIssues: {
          type: "array",
          maxItems: 8,
          items: { type: "string", minLength: 1, maxLength: 500 },
        },
      },
      required: [
        "objectiveFit",
        "audienceFit",
        "narrativeLogic",
        "evidenceFit",
        "narrationNaturalness",
        "subtitleFit",
        "visualFit",
        "readyToProduce",
        "blockingIssues",
      ],
    },
    decision: {
      type: "string",
      enum: ["collect", "produce"],
    },
  },
  required: ["summary", "viewerPromise", "steps", "qualityChecks", "beats", "collectionOrders", "contentReview", "decision"],
  };
}

function trimLog(value: string, maxLength = 1400) {
  const clean = value.trim();
  if (clean.length <= maxLength) return clean;
  return `...${clean.slice(clean.length - maxLength)}`;
}

function finishPlan(
  brief: VideoBrief,
  base: Omit<VideoAgentPlan, "pipeline" | "manifest" | "note" | "productionReady" | "beats">,
  drafts?: BeatDraft[],
  note?: string,
): VideoAgentPlan {
  const beats = drafts ?? [];
  if (base.decision !== "produce" || !contentReadyForProduction(base.contentReview)) {
    return {
      ...base,
      pipeline: "2.0",
      beats,
      productionReady: false,
      note,
    };
  }

  const result = createManifest({
    brief,
    mode: base.mode,
    model: base.model,
    summary: base.summary,
    viewerPromise: base.viewerPromise,
    drafts,
  });
  const manifestIssues = contentManifestIssues(result.manifest);
  const productionReady = base.mode === "gpt" && result.source === "model" && manifestIssues.length === 0;
  const combined = [
    note,
    result.note,
    manifestIssues.length > 0 ? `콘텐츠 매니페스트 문제: ${manifestIssues.join(" ")}` : undefined,
    productionReady ? undefined : "기획 장면이 콘텐츠 제작 조건을 충족하지 않아 제작을 보류했습니다.",
  ].filter(Boolean).join(" ");
  return {
    ...base,
    pipeline: "2.0",
    beats,
    productionReady,
    manifest: productionReady ? result.manifest : undefined,
    note: combined || undefined,
  };
}

function fallbackPlan(
  brief: VideoBrief,
  note?: string,
  round: 1 | 2 | 3 = 1,
  collectionReports: CollectionReport[] = [],
): VideoAgentPlan {
  return finishPlan(
    brief,
    {
      mode: "local",
      model: "local-planner",
      round,
      summary: "PR Studio의 실제 화면과 생성 결과를 캡처해 YouTube용 데모 영상으로 렌더링합니다.",
      viewerPromise: "홍보담당자가 입력, 실행, 결과를 같은 장면에서 확인할 수 있음을 보여줍니다.",
      steps: fallbackPlanSteps,
      qualityChecks: ["허용된 화면만 사용", "1920x1080과 오디오", "화면에서 확인한 문구", "규칙 기반 기능을 모델 생성으로 설명하지 않음"],
      collectionOrders: [],
      collectionReports,
      contentReview: blockedContentReview(note ?? "기획 모델의 검토가 완료되지 않았습니다."),
      decision: "collect",
    },
    undefined,
    note,
  );
}

function extractResponseText(data: unknown) {
  if (!data || typeof data !== "object") return "";

  const response = data as {
    output_text?: string;
    output?: Array<{
      content?: Array<{
        text?: string;
        type?: string;
      }>;
    }>;
  };

  if (typeof response.output_text === "string") {
    return response.output_text;
  }

  return (
    response.output
      ?.flatMap((item) => item.content ?? [])
      .map((content) => content.text ?? "")
      .join("")
      .trim() ?? ""
  );
}

export type VideoPlanningContext = {
  round?: 1 | 2 | 3;
  previousPlans?: VideoAgentPlan[];
  collectionReports?: CollectionReport[];
};

function normalizePlanningBrief(input: string | VideoBrief) {
  return typeof input === "string"
    ? legacyBrief(input, trackForBrief(input))
    : videoBriefSchema.parse(input);
}

export async function createVideoAgentPlan(
  inputBrief: string | VideoBrief,
  context: VideoPlanningContext = {},
): Promise<VideoAgentPlan> {
  const brief = normalizePlanningBrief(inputBrief);
  const round = context.round ?? 1;
  const collectionReports = context.collectionReports ?? [];
  const fallback = (note: string) => fallbackPlan(brief, note, round, collectionReports);
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return fallback("OPENAI_API_KEY가 없어 콘텐츠 기획을 완료하지 못했습니다.");
  }

  const model = process.env.OPENAI_MODEL ?? "gpt-5.5";
  const dossier = buildPlanningDossier(brief);
  const previousPlans = (context.previousPlans ?? []).map((plan) => ({
    round: plan.round,
    summary: plan.summary,
    viewerPromise: plan.viewerPromise,
    decision: plan.decision,
    blockingIssues: plan.contentReview.blockingIssues,
    collectionOrders: plan.collectionOrders,
  }));
  const planningInput = [
    dossier.text,
    `현재 기획 회차: ${round}/3`,
    previousPlans.length > 0 ? `이전 기획 요약:\n${JSON.stringify(previousPlans, null, 2)}` : "",
    collectionReports.length > 0 ? `누적 수집 보고(중복 제거·문자 예산 적용):\n${JSON.stringify(collectionReports, null, 2)}` : "",
    round === 3
      ? "이번은 마지막 기획 회차다. decision은 기존 계약대로 produce 또는 collect만 사용한다. 현재 누적 증거로 준비되었으면 produce를, 부족하면 collect와 실제 차단 항목을 반환한다. 이번 회차 뒤에는 새 수집을 실행하지 않는다."
      : "",
  ].filter(Boolean).join("\n\n");
  let response: Response;

  try {
    response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        input: [
          {
            role: "system",
            content:
              "너는 PR Studio의 콘텐츠 중심 영상 기획자다. 화려함보다 목적과 대상에 맞는 내용, 자연스러운 내레이션, 간결한 자막, 설명과 화면의 일치를 우선한다. 한국어 JSON만 반환한다. 각 장면에 목적, 시청자가 이해할 내용, 실제 화면 동작, 다음 장면으로 넘어가는 이유를 구체적으로 쓴다. 자막은 내레이션 전체를 복사하지 말고 핵심만 80자 이내로 쓴다. 각 품질 항목을 엄격하게 점검하고 미해결 문제가 있으면 collect를 선택한다. 수집 지시는 자유로운 문장으로 쓰되 실행 가능한 capabilityId를 함께 고른다. 제작 전에는 콘텐츠 계획, 실제 앱 입력·결과 증거, 카드·음성·자막 capability와 preset을 판단한다. 실제 카드 이미지, 합성 음성, 적용 자막과 최종 MP4는 produce 뒤 제작·검토 단계에서 확인하므로 아직 존재하지 않는 최종 산출물을 제작 전 차단 조건으로 요구하지 않는다. 모든 제작 전 품질 항목이 통과하고 blockingIssues가 없을 때만 readyToProduce와 decision을 produce로 정한다.",
          },
          {
            role: "user",
            content: planningInput,
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "pr_studio_video_content_plan",
            strict: true,
            schema: planningSchema(dossier.screenIds),
          },
        },
        max_output_tokens: 5_000,
      }),
    });
  } catch (error) {
    return fallback(`GPT 플래너 연결 실패: ${error instanceof Error ? error.message : "알 수 없는 오류"}`);
  }

  const data = (await response.json().catch(() => ({}))) as unknown;
  if (!response.ok) {
    const message =
      typeof data === "object" && data && "error" in data
        ? JSON.stringify((data as { error: unknown }).error)
        : response.statusText;
    return fallback(`GPT 플래너 요청 실패: ${message}`);
  }

  const text = extractResponseText(data);
  if (!text) {
    return fallback("GPT 플래너가 빈 응답을 반환해 콘텐츠 기획을 완료하지 못했습니다.");
  }

  try {
    const parsed = planningResponseSchema.parse(JSON.parse(text));
    return finishPlan(
      brief,
      {
        mode: "gpt",
        model,
        round,
        summary: parsed.summary,
        viewerPromise: parsed.viewerPromise,
        steps: parsed.steps,
        qualityChecks: parsed.qualityChecks,
        collectionOrders: parsed.collectionOrders,
        collectionReports,
        contentReview: parsed.contentReview,
        decision: parsed.decision,
      },
      parsed.beats,
    );
  } catch {
    return fallback("GPT 플래너 응답이 콘텐츠 기획 계약을 충족하지 않았습니다.");
  }
}

function runCommand(command: string, args: string[], env: NodeJS.ProcessEnv): Promise<CommandResult> {
  const startedAt = Date.now();

  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: root,
      env,
      shell: false,
      windowsHide: true,
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
    });

    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });

    child.on("error", (error) => {
      stderr += `\n${error.message}`;
    });

    child.on("close", (code) => {
      resolve({
        status: code === 0 ? "completed" : "failed",
        durationMs: Date.now() - startedAt,
        stdout,
        stderr,
      });
    });
  });
}

async function runAgentStep(
  title: string,
  command: string,
  args: string[],
  env: NodeJS.ProcessEnv,
): Promise<VideoAgentRunStep> {
  const result = await runCommand(command, args, env);
  const output = trimLog([result.stdout, result.stderr].filter(Boolean).join("\n"));

  return {
    title,
    command: [command, ...args].join(" "),
    status: result.status,
    durationMs: result.durationMs,
    output,
  };
}

function ensureCompleted(step: VideoAgentRunStep) {
  if (step.status === "failed") {
    throw new Error(`${step.title} 실패: ${step.output || step.command}`);
  }
}

export async function runVideoAgent({
  brief,
  appUrl,
}: {
  brief: string | VideoBrief;
  appUrl: string;
}): Promise<VideoAgentResult> {
  const plan = await createVideoAgentPlan(brief);
  if (!plan.productionReady || !plan.manifest) {
    const reason = plan.contentReview.blockingIssues.join(" ") || "콘텐츠 기획이 제작 준비 조건을 통과하지 않았습니다.";
    throw new Error(`영상 제작 보류: ${reason}`);
  }
  const runSteps: VideoAgentRunStep[] = [];
  const env = {
    ...process.env,
    PR_STRATEGY_APP_URL: appUrl,
  };

  const runId = randomUUID();
  const { workDir, manifestPath, finalVideoPath, reviewPath } = videoArtifactPaths(root, `inline-${runId}`);
  await mkdir(path.dirname(finalVideoPath), { recursive: true });
  await writeFile(manifestPath, JSON.stringify(plan.manifest, null, 2));

  const capture = await runAgentStep(
    "동작 녹화",
    "node",
    ["scripts/capture-video-v2.mjs", "--manifest", manifestPath, "--work-dir", workDir],
    env,
  );
  runSteps.push(capture);
  ensureCompleted(capture);

  const render = await runAgentStep(
    "MP4 렌더링",
    "node",
    ["scripts/render-video-v2.mjs", "--manifest", manifestPath, "--work-dir", workDir, "--output", finalVideoPath],
    env,
  );
  runSteps.push(render);
  ensureCompleted(render);

  const review = await runAgentStep(
    "프레임 검토",
    "node",
    ["scripts/review-video-v2.mjs", "--manifest", manifestPath, "--work-dir", workDir, "--video", finalVideoPath, "--review", reviewPath],
    env,
  );
  runSteps.push(review);
  ensureCompleted(review);

  const verify = await runAgentStep(
    "영상 검증",
    "ffprobe",
    [
      "-v",
      "error",
      "-select_streams",
      "v:0",
      "-show_entries",
      "stream=width,height:format=duration,size",
      "-of",
      "json",
      finalVideoPath,
    ],
    env,
  );
  runSteps.push(verify);
  ensureCompleted(verify);

  const metadata = JSON.parse(verify.output) as {
    streams?: Array<{ width?: number; height?: number }>;
    format?: { duration?: string; size?: string };
  };
  const file = await stat(finalVideoPath);

  return {
    outcome: "produced",
    plan,
    runSteps,
    video: {
      path: finalVideoPath,
      downloadUrl: `/api/video-agent/file?runId=${encodeURIComponent(runId)}`,
      width: metadata.streams?.[0]?.width ?? 0,
      height: metadata.streams?.[0]?.height ?? 0,
      duration: Number(metadata.format?.duration ?? 0),
      size: Number(metadata.format?.size ?? file.size),
      generatedAt: file.mtime.toISOString(),
    },
  };
}
