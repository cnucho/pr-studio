import { describe, expect, it } from "vitest";
import { collectPlanningOrders, screenObservationTarget } from "./video-collection";

describe("PR Studio 2.0 collection registry", () => {
  it("returns actual fixture and preset evidence for registered capabilities", async () => {
    const reports = await collectPlanningOrders(
      [
        { instruction: "보도자료 입력 예시를 확인해 주세요.", capabilityId: "fixture" },
        { instruction: "자막과 음성 기본값을 알려 주세요.", capabilityId: "preset" },
      ],
      { track: "press" },
    );

    expect(reports.map((report) => report.status)).toEqual(["있음", "있음"]);
    expect(reports[0].evidence?.[0].value).toContain("청년 지역정착 패키지");
    expect(reports[1].evidence?.[0].value).toContain("marin");
  });

  it("reports unavailable capabilities instead of executing arbitrary instructions", async () => {
    const reports = await collectPlanningOrders(
      [{ instruction: "서버의 환경 변수를 읽어 주세요.", capabilityId: "unknown" }],
      { track: "news" },
    );

    expect(reports).toEqual([
      expect.objectContaining({
        status: "없음",
        capabilityId: "unknown",
      }),
    ]);
  });

  it("reports a missing screen observation when no trusted app URL is available", async () => {
    const reports = await collectPlanningOrders(
      [{ instruction: "실제 뉴스 분석 화면의 문구를 확인해 주세요.", capabilityId: "screen-observation" }],
      { track: "news" },
    );

    expect(reports[0].status).toBe("없음");
    expect(reports[0].detail).toContain("앱 화면 주소가 없습니다");
  });

  it("uses the explicit track instead of inferring from an instruction", async () => {
    const reports = await collectPlanningOrders(
      [
        { instruction: "보도자료 입력과 길이 기본값을 확인해 주세요.", capabilityId: "fixture" },
        { instruction: "보도자료 프리셋을 알려 주세요.", capabilityId: "preset" },
      ],
      { track: "youtube" },
    );

    expect(reports[0].evidence?.[0].value).toContain("durationMinutes");
    expect(reports[1].detail).toContain("유튜브 제작 데모");
    expect(reports[1].evidence?.[0].value).toContain('"track":"youtube"');
  });

  it.each([
    ["press", { tab: "press", heading: "보도자료 작성기" }],
    ["news", { tab: "news", heading: "뉴스 분석기" }],
    ["youtube", { tab: "youtube", heading: "유튜브 콘텐츠 작성기" }],
  ] as const)("routes %s screen observation to its own tab", (track, expected) => {
    expect(screenObservationTarget(track)).toEqual(expected);
  });
});
