import { describe, expect, it } from "vitest";
import { productionFailurePolicy } from "./video-production-failure";

describe("productionFailurePolicy", () => {
  it("retries capture and render infrastructure failures as jobs", () => {
    expect(productionFailurePolicy("동작 녹화", 1)).toBe("retry-job");
    expect(productionFailurePolicy("MP4 렌더링", 1)).toBe("retry-job");
  });

  it("retries OCR infrastructure against the same video only", () => {
    expect(productionFailurePolicy("프레임 검토", 3)).toBe("retry-review");
  });

  it("makes deterministic final review failures terminal", () => {
    expect(productionFailurePolicy("프레임 검토", 2)).toBe("fail-final");
    expect(productionFailurePolicy("프레임 검토", 1)).toBe("fail-final");
  });
});
