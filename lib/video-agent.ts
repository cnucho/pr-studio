import { spawn } from "node:child_process";
import { mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildPlanningDossier, createManifest, type BeatDraft, type BeatManifest } from "@/lib/video-beats";

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
  summary: string;
  viewerPromise: string;
  steps: VideoAgentPlanStep[];
  qualityChecks: string[];
  manifest: BeatManifest;
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
  downloadUrl: string;
  width: number;
  height: number;
  duration: number;
  size: number;
  generatedAt: string;
};

export type VideoAgentResult = {
  plan: VideoAgentPlan;
  runSteps: VideoAgentRunStep[];
  video: VideoAgentVideo;
};

type CommandResult = {
  status: "completed" | "failed";
  durationMs: number;
  stdout: string;
  stderr: string;
};

const root = process.cwd();
const finalVideoPath = path.join(root, "out", "pr-studio-final.mp4");

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

function planningSchema(screenIds: string[]) {
  return {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: {
      type: "string",
      description: "One sentence explaining the video production plan.",
    },
    viewerPromise: {
      type: "string",
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
          title: { type: "string" },
          detail: { type: "string" },
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
      items: { type: "string" },
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
          action: { type: "string" },
          focus: { type: "string" },
          point: { type: "string", description: "What the viewer should understand from this scene." },
          narration: { type: "string" },
          subtitle: { type: "string" },
        },
        required: ["screenId", "action", "focus", "point", "narration", "subtitle"],
      },
    },
    collectionOrders: {
      type: "array",
      items: { type: "string" },
    },
    decision: {
      type: "string",
      enum: ["collect", "produce"],
    },
  },
  required: ["summary", "viewerPromise", "steps", "qualityChecks", "beats", "collectionOrders", "decision"],
  };
}

function trimLog(value: string, maxLength = 1400) {
  const clean = value.trim();
  if (clean.length <= maxLength) return clean;
  return `...${clean.slice(clean.length - maxLength)}`;
}

function finishPlan(
  brief: string,
  base: Omit<VideoAgentPlan, "pipeline" | "manifest" | "note">,
  drafts?: BeatDraft[],
  note?: string,
): VideoAgentPlan {
  const result = createManifest({
    brief,
    mode: base.mode,
    model: base.model,
    summary: base.summary,
    viewerPromise: base.viewerPromise,
    drafts,
  });
  const combined = [note, result.note].filter(Boolean).join(" ");
  return {
    ...base,
    pipeline: "2.0",
    manifest: result.manifest,
    note: combined || undefined,
  };
}

function fallbackPlan(brief: string, note?: string): VideoAgentPlan {
  return finishPlan(
    brief,
    {
      mode: "local",
      model: "local-planner",
      summary: "PR Studio의 실제 화면과 생성 결과를 캡처해 YouTube용 데모 영상으로 렌더링합니다.",
      viewerPromise: "홍보담당자가 입력, 실행, 결과를 같은 장면에서 확인할 수 있음을 보여줍니다.",
      steps: fallbackPlanSteps,
      qualityChecks: ["허용된 화면만 사용", "1920x1080과 오디오", "화면에서 확인한 문구", "규칙 기반 기능을 모델 생성으로 설명하지 않음"],
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

export async function createVideoAgentPlan(brief: string): Promise<VideoAgentPlan> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return fallbackPlan(brief, "OPENAI_API_KEY가 없어 로컬 플래너로 실행했습니다.");
  }

  const model = process.env.OPENAI_MODEL ?? "gpt-5.5";
  const dossier = buildPlanningDossier(brief);
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
              "너는 PR Studio의 영상 내용 기획자다. 한국어 JSON만 반환한다. 1차에서는 브리프와 영상 종류 기본값으로 목적, 길이, 장면 윤곽을 정한다. 수집 지시는 문장 그대로 적고, 앱에 없으면 없음으로 돌아온다. decision이 produce일 때만 촬영한다.",
          },
          {
            role: "user",
            content: dossier.text,
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
      }),
    });
  } catch (error) {
    return fallbackPlan(
      brief,
      `GPT 플래너 연결 실패: ${error instanceof Error ? error.message : "알 수 없는 오류"}`,
    );
  }

  const data = (await response.json().catch(() => ({}))) as unknown;
  if (!response.ok) {
    const message =
      typeof data === "object" && data && "error" in data
        ? JSON.stringify((data as { error: unknown }).error)
        : response.statusText;
    return fallbackPlan(brief, `GPT 플래너 요청 실패: ${message}`);
  }

  const text = extractResponseText(data);
  if (!text) {
    return fallbackPlan(brief, "GPT 플래너가 빈 응답을 반환해 로컬 플래너로 실행했습니다.");
  }

  try {
    const parsed = JSON.parse(text) as Omit<VideoAgentPlan, "mode" | "model" | "pipeline" | "manifest"> & {
      beats?: BeatDraft[];
    };
    return finishPlan(
      brief,
      {
        mode: "gpt",
        model,
        summary: parsed.summary,
        viewerPromise: parsed.viewerPromise,
        steps: parsed.steps,
        qualityChecks: parsed.qualityChecks,
      },
      parsed.beats,
    );
  } catch {
    return fallbackPlan(brief, "GPT 플래너 응답을 JSON으로 해석하지 못해 로컬 플래너로 실행했습니다.");
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
  brief: string;
  appUrl: string;
}): Promise<VideoAgentResult> {
  const plan = await createVideoAgentPlan(brief);
  const runSteps: VideoAgentRunStep[] = [];
  const env = {
    ...process.env,
    PR_STRATEGY_APP_URL: appUrl,
  };

  const manifestPath = path.join(root, "video-assets", "v2", "manifest.json");
  await mkdir(path.dirname(manifestPath), { recursive: true });
  await writeFile(manifestPath, JSON.stringify(plan.manifest, null, 2));

  const capture = await runAgentStep(
    "동작 녹화",
    "node",
    ["scripts/capture-video-v2.mjs", "--manifest", manifestPath],
    env,
  );
  runSteps.push(capture);
  ensureCompleted(capture);

  const render = await runAgentStep(
    "MP4 렌더링",
    "node",
    ["scripts/render-video-v2.mjs", "--manifest", manifestPath],
    env,
  );
  runSteps.push(render);
  ensureCompleted(render);

  const review = await runAgentStep(
    "프레임 검토",
    "node",
    ["scripts/review-video-v2.mjs", "--manifest", manifestPath, "--video", finalVideoPath],
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
    plan,
    runSteps,
    video: {
      path: finalVideoPath,
      downloadUrl: "/api/video-agent/file",
      width: metadata.streams?.[0]?.width ?? 0,
      height: metadata.streams?.[0]?.height ?? 0,
      duration: Number(metadata.format?.duration ?? 0),
      size: Number(metadata.format?.size ?? file.size),
      generatedAt: file.mtime.toISOString(),
    },
  };
}
