import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { normalizeProbeEvidence } from "./ffprobe";
import {
  HD_LANDSCAPE_PROFILE,
  HD_VERTICAL_PROFILE,
  productionProfileForDimensions,
} from "./production-profile";
import {
  assertTransition,
  canTransition,
  isRetryable,
  retryDelaySeconds,
  shouldFallbackToLocal,
  validateApproval,
} from "./lifecycle";
import {
  canApproveProject,
  canReadProject,
  canWriteProject,
  sanitizeDownloadFilename,
  storagePathBelongsToRender,
} from "./policy";

const owner = "user-a";
const viewerGrant = [{ userId: "user-b", role: "viewer" as const }];
const operatorGrant = [{ userId: "user-b", role: "operator" as const }];

describe("authorization", () => {
  it("rejects unauthenticated reads", () => expect(canReadProject(null, owner)).toBe(false));
  it("allows owner reads", () => expect(canReadProject(owner, owner)).toBe(true));
  it("allows explicitly granted reads", () =>
    expect(canReadProject("user-b", owner, viewerGrant)).toBe(true));
  it("rejects cross-project reads", () => expect(canReadProject("user-b", owner)).toBe(false));
  it("rejects viewer writes", () => expect(canWriteProject("user-b", owner, viewerGrant)).toBe(false));
  it("allows operator writes", () => expect(canWriteProject("user-b", owner, operatorGrant)).toBe(true));
  it("rejects unauthorized approval", () => expect(canApproveProject("user-b", owner)).toBe(false));
});

describe("media-delivery", () => {
  const projectId = "11111111-1111-4111-8111-111111111111";
  const renderId = "22222222-2222-4222-8222-222222222222";
  it("accepts a render-owned object path", () =>
    expect(storagePathBelongsToRender(`${projectId}/${renderId}/output.mp4`, projectId, renderId)).toBe(
      true,
    ));
  it("rejects another render path", () =>
    expect(
      storagePathBelongsToRender(
        `${projectId}/33333333-3333-4333-8333-333333333333/output.mp4`,
        projectId,
        renderId,
      ),
    ).toBe(false));
  it("rejects traversal", () =>
    expect(storagePathBelongsToRender(`${projectId}/${renderId}/../secret`, projectId, renderId)).toBe(
      false,
    ));
  it("sanitizes filenames", () => expect(sanitizeDownloadFilename('../bad:"name')).toBe("..-bad--name.mp4"));
});

describe("orchestration", () => {
  it("allows the canonical cloud lifecycle", () => {
    expect(canTransition("queued", "preparing")).toBe(true);
    expect(canTransition("preparing", "rendering")).toBe(true);
    expect(canTransition("rendering", "validating")).toBe(true);
    expect(canTransition("validating", "awaiting_approval")).toBe(true);
  });
  it("rejects skipping validation", () => expect(() => assertTransition("rendering", "approved")).toThrow());
  it("keeps terminal approval terminal", () => expect(canTransition("approved", "rejected")).toBe(false));
});

describe("retry", () => {
  it("uses bounded exponential delay", () => {
    expect(retryDelaySeconds(1)).toBe(15);
    expect(retryDelaySeconds(2)).toBe(30);
    expect(retryDelaySeconds(99)).toBe(300);
  });
  it("rejects invalid attempts", () => expect(() => retryDelaySeconds(0)).toThrow());
  it("retries transient provider failures", () => expect(isRetryable("transient_provider")).toBe(true));
  it("does not retry authentication failures", () => expect(isRetryable("provider_auth")).toBe(false));
});

describe("fallback", () => {
  it("allows exhausted transient cloud failure to fall back", () =>
    expect(shouldFallbackToLocal("transient_provider", true)).toBe(true));
  it("does not fall back before cloud retry exhaustion", () =>
    expect(shouldFallbackToLocal("transient_provider", false)).toBe(false));
  for (const category of [
    "provider_auth",
    "invalid_project",
    "missing_template",
    "asset_license",
    "output_validation",
    "uncertain_completion",
    "local_failure",
  ] as const) {
    it(`prohibits fallback for ${category}`, () =>
      expect(shouldFallbackToLocal(category, true)).toBe(false));
  }
});

describe("approval", () => {
  it("approves only awaiting output", () =>
    expect(validateApproval("awaiting_approval", "approved")).toEqual({
      decision: "approved",
      reason: null,
    }));
  it("requires a rejection reason", () =>
    expect(() => validateApproval("awaiting_approval", "rejected", " ")).toThrow(/reason/));
  it("rejects review of an unvalidated render", () =>
    expect(() => validateApproval("rendering", "approved")).toThrow(/awaiting_approval/));
});

describe("ffprobe-validation", () => {
  const expected = {
    width: 1920,
    height: 1080,
    duration: 10,
    frameRate: 30,
    narrationRequired: true,
  };
  const validProbe = {
    format: { duration: "10", format_name: "mov,mp4", size: "1000" },
    streams: [
      { codec_type: "video", codec_name: "h264", width: 1920, height: 1080, avg_frame_rate: "30/1" },
      { codec_type: "audio", codec_name: "aac" },
    ],
  };
  it("persists complete normalized evidence", () => {
    const evidence = normalizeProbeEvidence(validProbe, "abc", expected);
    expect(evidence.validation.passed).toBe(true);
    expect(evidence.videoCodec).toBe("h264");
    expect(evidence.audioCodec).toBe("aac");
    expect(evidence.frameRate).toBe(30);
  });
  it("rejects corrupt media without video", () => {
    const evidence = normalizeProbeEvidence({ format: { size: "1", duration: "10" }, streams: [] }, "x", expected);
    expect(evidence.validation.passed).toBe(false);
    expect(evidence.decodable).toBe(false);
  });
  it("rejects missing narration audio", () => {
    const evidence = normalizeProbeEvidence(
      { ...validProbe, streams: [validProbe.streams[0]] },
      "x",
      expected,
    );
    expect(evidence.validation.passed).toBe(false);
  });
  it("rejects wrong dimensions", () => {
    const evidence = normalizeProbeEvidence(
      { ...validProbe, streams: [{ ...validProbe.streams[0], width: 1280 }, validProbe.streams[1]] },
      "x",
      expected,
    );
    expect(evidence.validation.passed).toBe(false);
  });
  it("rejects duration outside tolerance", () => {
    const evidence = normalizeProbeEvidence(
      { ...validProbe, format: { ...validProbe.format, duration: "20" } },
      "x",
      expected,
    );
    expect(evidence.validation.passed).toBe(false);
  });
  it("enforces the HD landscape production contract", () => {
    expect(HD_LANDSCAPE_PROFILE).toMatchObject({ width: 1920, height: 1080, frameRate: 30 });
    expect(productionProfileForDimensions(1920, 1080).videoCodec).toBe("h264");
  });
  it("represents the HD vertical production contract", () => {
    expect(HD_VERTICAL_PROFILE).toMatchObject({ width: 1080, height: 1920, frameRate: 30 });
  });
  it("rejects unsupported production dimensions", () => {
    expect(() => productionProfileForDimensions(480, 270)).toThrow(/Unsupported/);
  });
  it("rejects wrong production codecs", () => {
    const evidence = normalizeProbeEvidence(
      { ...validProbe, streams: [{ ...validProbe.streams[0], codec_name: "vp9" }, validProbe.streams[1]] },
      "x",
      { ...expected, videoCodec: "h264", audioCodec: "aac", allowedContainers: ["mp4", "mov"] },
    );
    expect(evidence.validation.passed).toBe(false);
    expect(evidence.validation.checks.find((check) => check.name === "video-codec")?.passed).toBe(false);
  });
  it("rejects wrong production frame rate", () => {
    const evidence = normalizeProbeEvidence(
      { ...validProbe, streams: [{ ...validProbe.streams[0], avg_frame_rate: "60/1" }, validProbe.streams[1]] },
      "x",
      expected,
    );
    expect(evidence.validation.passed).toBe(false);
  });
});

describe("migration", () => {
  it("declares immutable revision triggers and Model A access", async () => {
    const sql = await readFile(
      new URL("../../supabase/migrations/202607220003_phase1b_closure.sql", import.meta.url),
      "utf8",
    );
    expect(sql).toContain("video project revisions are immutable");
    expect(sql).toContain("video approval history is append-only");
    expect(sql).toContain("from anon, authenticated");
  });
  it("declares the complete render lifecycle constraint", async () => {
    const sql = await readFile(
      new URL("../../supabase/migrations/202607220003_phase1b_closure.sql", import.meta.url),
      "utf8",
    );
    expect(sql).toContain("awaiting_approval");
    expect(sql).toContain("video_render_jobs_progress_check");
  });
});
