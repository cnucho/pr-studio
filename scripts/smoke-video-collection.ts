import { collectPlanningOrders } from "../lib/video-collection";

async function main() {
  const appUrl = process.env.PR_STUDIO_CAPTURE_URL ?? "http://127.0.0.1:3016";
  const reports = await collectPlanningOrders(
    [
      {
        instruction: "실제 보도자료 화면 문구를 확인해 주세요.",
        capabilityId: "screen-observation",
      },
    ],
    { brief: "보도자료 작성 흐름", appUrl },
  );

  console.log(JSON.stringify(reports, null, 2));
  if (reports.some((report) => report.status !== "있음")) process.exitCode = 1;
}

void main();
