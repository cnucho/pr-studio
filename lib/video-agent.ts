import { spawn } from "node:child_process";
import { stat } from "node:fs/promises";
import path from "node:path";

export type VideoAgentMode = "gpt" | "local";

export type VideoAgentPlanStep = {
  title: string;
  detail: string;
  tool: "plan" | "capture" | "render" | "verify";
};

export type VideoAgentPlan = {
  mode: VideoAgentMode;
  model: string;
  summary: string;
  viewerPromise: string;
  steps: VideoAgentPlanStep[];
  qualityChecks: string[];
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
    title: "제작 의도 정리",
    detail: "PR Studio의 현재 데모 흐름을 일반 사용자에게 바로 이해되는 YouTube 설명 영상으로 구성합니다.",
    tool: "plan",
  },
  {
    title: "앱 화면 캡처",
    detail: "영상 스튜디오와 각 홍보 도구의 입력/출력 상태를 실제 브라우저에서 캡처합니다.",
    tool: "capture",
  },
  {
    title: "내레이션과 자막 렌더링",
    detail: "캡처 화면, 한국어 음성, 하단 자막을 1080p MP4로 조립합니다.",
    tool: "render",
  },
  {
    title: "결과 검증",
    detail: "ffprobe로 해상도, 길이, 파일 크기를 확인하고 다운로드 가능한 링크를 반환합니다.",
    tool: "verify",
  },
];

const agentSchema = {
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
  },
  required: ["summary", "viewerPromise", "steps", "qualityChecks"],
};

function trimLog(value: string, maxLength = 1400) {
  const clean = value.trim();
  if (clean.length <= maxLength) return clean;
  return `...${clean.slice(clean.length - maxLength)}`;
}

function fallbackPlan(note?: string): VideoAgentPlan {
  return {
    mode: "local",
    model: "local-planner",
    summary: "PR Studio의 실제 화면과 생성 결과를 캡처해 YouTube용 데모 영상으로 렌더링합니다.",
    viewerPromise: "홍보담당자가 앱 안에서 기획, 제작, 검증까지 끝낼 수 있음을 보여줍니다.",
    steps: fallbackPlanSteps,
    qualityChecks: ["PR Studio 브랜드 표시", "실제 앱 화면 캡처", "1080p MP4 검증", "다운로드 링크 제공"],
    note,
  };
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

async function createGptPlan(brief: string): Promise<VideoAgentPlan> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return fallbackPlan("OPENAI_API_KEY가 없어 로컬 플래너로 실행했습니다.");
  }

  const model = process.env.OPENAI_MODEL ?? "gpt-5.5";
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
              "You are the in-app PR Studio production agent. Return a concise Korean JSON plan for creating a YouTube demo video. You may only use these tools: plan, capture, render, verify.",
          },
          {
            role: "user",
            content: brief,
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "pr_studio_video_agent_plan",
            strict: true,
            schema: agentSchema,
          },
        },
      }),
    });
  } catch (error) {
    return fallbackPlan(
      `GPT 플래너 연결 실패: ${error instanceof Error ? error.message : "알 수 없는 오류"}`,
    );
  }

  const data = (await response.json().catch(() => ({}))) as unknown;
  if (!response.ok) {
    const message =
      typeof data === "object" && data && "error" in data
        ? JSON.stringify((data as { error: unknown }).error)
        : response.statusText;
    return fallbackPlan(`GPT 플래너 요청 실패: ${message}`);
  }

  const text = extractResponseText(data);
  if (!text) {
    return fallbackPlan("GPT 플래너가 빈 응답을 반환해 로컬 플래너로 실행했습니다.");
  }

  try {
    const parsed = JSON.parse(text) as Omit<VideoAgentPlan, "mode" | "model">;
    return {
      mode: "gpt",
      model,
      summary: parsed.summary,
      viewerPromise: parsed.viewerPromise,
      steps: parsed.steps,
      qualityChecks: parsed.qualityChecks,
    };
  } catch {
    return fallbackPlan("GPT 플래너 응답을 JSON으로 해석하지 못해 로컬 플래너로 실행했습니다.");
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
  const plan = await createGptPlan(brief);
  const runSteps: VideoAgentRunStep[] = [];
  const env = {
    ...process.env,
    PR_STRATEGY_APP_URL: appUrl,
  };

  const capture = await runAgentStep("화면 캡처", "node", ["scripts/capture-storyboard.mjs"], env);
  runSteps.push(capture);
  ensureCompleted(capture);

  const render = await runAgentStep("MP4 렌더링", "node", ["scripts/render-video.mjs"], env);
  runSteps.push(render);
  ensureCompleted(render);

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
