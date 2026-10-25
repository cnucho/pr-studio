import type { RenderRequest, RenderResult, Renderer } from "./renderer";
import type { VideoProject } from "./schema";

const creatomateStatuses: Record<string, RenderResult["state"]> = {
  planned: "queued",
  waiting: "queued",
  transcribing: "preparing",
  rendering: "rendering",
  succeeded: "completed",
  failed: "failed",
};

export function toCreatomateRequest(project: VideoProject, webhookUrl?: string) {
  const templateId = String(
    project.providerConfig.creatomateTemplateId ?? process.env.CREATOMATE_TEMPLATE_ID ?? "",
  ).trim();

  if (!templateId) {
    throw new Error("A Creatomate template ID is required for template-based rendering.");
  }

  return {
    template_id: templateId,
    output_format: project.format.outputFormat,
    width: project.format.width,
    height: project.format.height,
    webhook_url: webhookUrl,
    metadata: JSON.stringify({ projectId: project.id, revision: project.revision }),
    modifications: {
      Timeline: project.scenes.map((scene) => ({
        id: scene.id,
        time: scene.start,
        duration: scene.duration,
        text: scene.onScreenText.map((item) => item.text).join("\n"),
        assets: scene.assetIds,
      })),
    },
  };
}

function normalize(value: unknown): RenderResult {
  if (!value || typeof value !== "object") {
    throw new Error("Creatomate returned an invalid render payload.");
  }

  const payload = value as Record<string, unknown>;
  if (typeof payload.id !== "string" || !payload.id.trim()) {
    throw new Error("Creatomate render payload is missing an ID.");
  }
  if (typeof payload.status !== "string" || !creatomateStatuses[payload.status]) {
    throw new Error(`Unsupported Creatomate render status: ${String(payload.status)}`);
  }

  return {
    providerJobId: payload.id,
    state: creatomateStatuses[payload.status],
    outputUrl: typeof payload.url === "string" ? payload.url : undefined,
    progress: payload.status === "succeeded" ? 100 : undefined,
    raw: payload,
  };
}

export class CreatomateRenderer implements Renderer {
  readonly name = "creatomate";

  constructor(private key = process.env.CREATOMATE_API_KEY ?? "") {}

  validateConfiguration() {
    if (!this.key) throw new Error("CREATOMATE_API_KEY is required");
  }

  private async call(url: string, init?: RequestInit) {
    this.validateConfiguration();
    const response = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.key}`,
        "Content-Type": "application/json",
        ...init?.headers,
      },
    });
    const body = (await response.json()) as Record<string, unknown>;
    if (!response.ok) {
      throw Object.assign(
        new Error(
          typeof body.error_message === "string"
            ? body.error_message
            : `Creatomate HTTP ${response.status}`,
        ),
        { status: response.status, detail: body },
      );
    }
    return body;
  }

  async createRender(request: RenderRequest) {
    const body = await this.call("https://api.creatomate.com/v2/renders", {
      method: "POST",
      body: JSON.stringify(toCreatomateRequest(request.project, request.webhookUrl)),
    });
    return normalize(Array.isArray(body) ? body[0] : body);
  }

  async getRenderStatus(id: string) {
    return normalize(
      await this.call(`https://api.creatomate.com/v2/renders/${encodeURIComponent(id)}`),
    );
  }

  async cancelRender(id: string) {
    void id;
    throw new Error("Creatomate cancellation is not supported by the public adapter");
  }

  normalizeWebhook(payload: unknown) {
    return normalize(payload);
  }

  async estimateCost(project: VideoProject) {
    return project.format.targetDuration / 60;
  }
}
