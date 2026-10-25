import { describe, expect, it } from "vitest";
import { videoArtifactPaths } from "./video-artifacts";

describe("video artifact isolation", () => {
  it("gives concurrent jobs non-overlapping paths", () => {
    const first = videoArtifactPaths("D:/app", "11111111-1111-4111-8111-111111111111");
    const second = videoArtifactPaths("D:/app", "22222222-2222-4222-8222-222222222222");

    expect(first.workDir).not.toBe(second.workDir);
    expect(first.manifestPath).not.toBe(second.manifestPath);
    expect(first.finalVideoPath).not.toBe(second.finalVideoPath);
    expect(first.reviewPath).not.toBe(second.reviewPath);
  });

  it("rejects traversal and arbitrary artifact identifiers", () => {
    expect(() => videoArtifactPaths("D:/app", "../shared")).toThrow("Invalid video artifact ID");
    expect(() => videoArtifactPaths("D:/app", "job-one")).toThrow("Invalid video artifact ID");
  });
});
