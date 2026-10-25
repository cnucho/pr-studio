import { describe, expect, it } from "vitest";
import { VIDEO_ANALYSIS_LIMITS, sourcePathAllowed } from "./video-analysis";

describe("existing MP4 analysis safety", () => {
  it("accepts only MP4 files below the allowed work root", () => {
    expect(sourcePathAllowed("D:/jobs/one/source/input.mp4", "D:/jobs/one")).toBe(true);
    expect(sourcePathAllowed("D:/jobs/two/input.mp4", "D:/jobs/one")).toBe(false);
    expect(sourcePathAllowed("D:/jobs/one/source/input.mov", "D:/jobs/one")).toBe(false);
    expect(sourcePathAllowed("https://example.com/video.mp4", "D:/jobs/one")).toBe(false);
  });

  it("keeps bounded analysis limits", () => {
    expect(VIDEO_ANALYSIS_LIMITS.maxBytes).toBe(25 * 1024 * 1024);
    expect(VIDEO_ANALYSIS_LIMITS.maxDurationSec).toBe(600);
    expect(VIDEO_ANALYSIS_LIMITS.maxTranscriptChars).toBe(20_000);
  });
});
