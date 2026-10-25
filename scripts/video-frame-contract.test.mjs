import { describe, expect, it } from "vitest";
import {
  CAPTURE_VIEWPORT,
  OBSERVATION_SAFE_AREA,
  boxInside,
  cropObservationBox,
  finalReviewExitCode,
  mapObservationBox,
  motionSourceRange,
  observationMatches,
  verificationSampleOffsets,
} from "./video-frame-contract.mjs";

describe("video frame verification contract", () => {
  it("rejects observation boxes that are outside the safe recording area", () => {
    expect(boxInside({ x: 120, y: 160, width: 400, height: 80 })).toBe(true);
    expect(boxInside({ x: 120, y: 900, width: 400, height: 80 })).toBe(false);
    expect(boxInside({ x: -1, y: 160, width: 400, height: 80 })).toBe(false);
    expect(OBSERVATION_SAFE_AREA.height).toBeLessThan(CAPTURE_VIEWPORT.height);
  });

  it("maps output boxes through the renderer scale and center crop", () => {
    const mapped = mapObservationBox(
      { x: 960, y: 540, width: 300, height: 60 },
      { medium: "still", screenId: "youtube-output" },
    );
    expect(mapped).toEqual({ x: 960, y: 540, width: 320, height: 64 });
    expect(cropObservationBox(mapped)).toEqual({ x: 924, y: 516, width: 392, height: 112 });
  });

  it("does not clamp an original box that is outside the final frame", () => {
    expect(cropObservationBox({ x: 1900, y: 100, width: 80, height: 40 })).toBeNull();
  });

  it("requires adjacent matches for motion but one stable match for stills", () => {
    expect(observationMatches([true, false, true], { medium: "motion" })).toBe(false);
    expect(observationMatches([false, true, true], { medium: "motion" })).toBe(true);
    expect(observationMatches([false, true], { medium: "still" })).toBe(true);
  });

  it("samples motion after the recorded stable start", () => {
    const samples = verificationSampleOffsets(
      { durationSec: 8, verification: { stableStartSec: 2.2 } },
      { medium: "motion" },
    );
    expect(samples).toHaveLength(3);
    expect(samples[0]).toBeGreaterThan(2.2);
    expect(samples[1]).toBeGreaterThan(samples[0]);
    expect(samples[2]).toBeGreaterThanOrEqual(samples[1]);
  });

  it("ends motion before the stable window and next beat boundary", () => {
    const range = motionSourceRange(
      { startedAtMs: 1000, stableToMs: 2400, endedAtMs: 2500 },
      2420,
    );
    expect(range).toEqual({ startMs: 800, endMs: 2380, durationSec: 1.58 });
    expect(range.endMs).toBeLessThan(2420);
    expect(range.endMs).toBeLessThanOrEqual(2400);
  });

  it("rejects an invalid motion source interval", () => {
    expect(motionSourceRange({ startedAtMs: 1000, stableToMs: 850, endedAtMs: 900 }, 920)).toBeNull();
  });

  it("classifies frame extraction failures as review infrastructure failures", () => {
    expect(finalReviewExitCode({ ready: false, ocrStatus: "checked", frameExtractionErrorCount: 1 })).toBe(3);
    expect(finalReviewExitCode({ ready: false, ocrStatus: "checked", frameExtractionErrorCount: 0 })).toBe(2);
    expect(finalReviewExitCode({ ready: true, ocrStatus: "checked", frameExtractionErrorCount: 0 })).toBe(0);
  });
});
