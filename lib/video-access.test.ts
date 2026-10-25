import { describe, expect, it } from "vitest";
import { allowedVideoEmail } from "./video-access";
import { videoJobOwnedBy } from "./video-jobs";

describe("video agent access", () => {
  it("accepts only configured operator emails, regardless of case", () => {
    expect(allowedVideoEmail("Editor@Example.com", "other@example.com, editor@example.com")).toBe(true);
    expect(allowedVideoEmail("outsider@example.com", "editor@example.com")).toBe(false);
    expect(allowedVideoEmail(undefined, "editor@example.com")).toBe(false);
  });

  it("requires the job's server-bound owner for reads and downloads", () => {
    expect(videoJobOwnedBy({ ownerId: "user-a" }, undefined, "user-a")).toBe(true);
    expect(videoJobOwnedBy({ ownerId: "user-a" }, undefined, "user-b")).toBe(false);
    expect(videoJobOwnedBy({}, { ownerId: "user-a" }, "user-a")).toBe(true);
    expect(videoJobOwnedBy({}, {}, "user-a")).toBe(false);
  });
});
