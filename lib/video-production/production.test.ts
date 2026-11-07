import { describe, expect, it } from "vitest";
import { CreatomateRenderer, toCreatomateRequest } from "./creatomate";
import { parseVideoProject, VIDEO_PROJECT_SCHEMA_VERSION } from "./schema";
import { validateOutputMetadata } from "./validation";

const base = {
  schemaVersion: VIDEO_PROJECT_SCHEMA_VERSION,
  id: "p1",
  revision: 1,
  title: "Demo",
  description: "",
  owner: "owner",
  sourceBrief: "brief",
  status: "draft",
  approvalState: "unreviewed",
  createdAt: "2026-07-22T00:00:00.000Z",
  updatedAt: "2026-07-22T00:00:00.000Z",
  format: {
    kind: "tutorial",
    width: 1920,
    height: 1080,
    aspectRatio: "16:9",
    frameRate: 30,
    targetDuration: 10,
    outputFormat: "mp4",
    language: "ko",
    safeArea: { top: 40, right: 40, bottom: 40, left: 40 },
  },
  scenes: [
    {
      id: "s1",
      order: 0,
      start: 0,
      duration: 10,
      narrationIds: [],
      captionTrackIds: [],
      onScreenText: [{ text: "Hello" }],
      assetIds: [],
      bRollAssetIds: [],
      providerOverrides: {},
    },
  ],
  narration: [],
  captionTracks: [],
  brand: { logoAssetIds: [], fonts: [], colors: [], layoutRefs: [] },
  assets: [],
  thumbnails: [],
  youtube: {
    title: "Demo",
    description: "",
    tags: [],
    language: "ko",
    privacy: "private",
    captionTrackIds: [],
    audience: "unspecified",
  },
  providerConfig: { creatomateTemplateId: "tpl" },
} as const;

describe("VideoProject", () => {
  it("parses a valid fixture", () => {
    expect(parseVideoProject(base).revision).toBe(1);
  });

  it("rejects future versions", () => {
    expect(() => parseVideoProject({ ...base, schemaVersion: 99 })).toThrow(/future/);
  });

  it("rejects overlap", () => {
    expect(() =>
      parseVideoProject({
        ...base,
        scenes: [...base.scenes, { ...base.scenes[0], id: "s2", order: 1, start: 5 }],
      }),
    ).toThrow();
  });

  it("defaults unknown asset licensing", () => {
    const project = parseVideoProject({
      ...base,
      assets: [{ id: "a", type: "image", uri: "x", source: "upload", createdAt: base.createdAt }],
    });
    expect(project.assets[0].licenseStatus).toBe("unknown");
  });
});

describe("Creatomate", () => {
  it("maps a canonical timeline", () => {
    const request = toCreatomateRequest(parseVideoProject(base));
    expect(request.template_id).toBe("tpl");
    expect(request.modifications.Timeline[0].text).toBe("Hello");
  });

  it("requires a template for template-based rendering", () => {
    expect(() =>
      toCreatomateRequest(parseVideoProject({ ...base, providerConfig: {} })),
    ).toThrow(/template ID/);
  });

  it("normalizes success", () => {
    const result = new CreatomateRenderer("x").normalizeWebhook({
      id: "r",
      status: "succeeded",
      url: "u",
    });
    expect(result.state).toBe("completed");
  });

  it("normalizes documented pending statuses", () => {
    const renderer = new CreatomateRenderer("x");
    expect(renderer.normalizeWebhook({ id: "r", status: "planned" }).state).toBe("queued");
    expect(renderer.normalizeWebhook({ id: "r", status: "transcribing" }).state).toBe(
      "preparing",
    );
  });

  it("rejects malformed provider payloads", () => {
    expect(() =>
      new CreatomateRenderer("x").normalizeWebhook({ status: "succeeded" }),
    ).toThrow(/missing an ID/);
  });
});

describe("validation", () => {
  const expected = {
    width: 1920,
    height: 1080,
    duration: 10,
    frameRate: 30,
    narrationRequired: true,
  };

  it("accepts valid output", () => {
    expect(
      validateOutputMetadata(
        {
          size: 1,
          width: 1920,
          height: 1080,
          duration: 10,
          frameRate: 30,
          hasAudio: true,
          decodable: true,
        },
        expected,
      ).passed,
    ).toBe(true);
  });

  it("rejects missing audio and wrong resolution", () => {
    expect(
      validateOutputMetadata(
        { size: 1, width: 1, height: 1, duration: 10, hasAudio: false },
        expected,
      ).passed,
    ).toBe(false);
  });

  it("rejects zero bytes", () => {
    expect(
      validateOutputMetadata(
        { size: 0, width: 1920, height: 1080, duration: 10 },
        { ...expected, narrationRequired: false },
      ).passed,
    ).toBe(false);
  });
});
