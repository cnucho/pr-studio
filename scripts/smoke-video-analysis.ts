import path from "node:path";
import { analyzeVideoFile } from "../lib/video-analysis";
import { collectPlanningOrders } from "../lib/video-collection";

async function main() {
  const sourceVideoPath = process.env.PR_STUDIO_ANALYSIS_SOURCE;
  const allowedRoot = process.env.PR_STUDIO_ANALYSIS_ROOT;
  if (!sourceVideoPath || !allowedRoot) throw new Error("PR_STUDIO_ANALYSIS_SOURCE와 PR_STUDIO_ANALYSIS_ROOT가 필요합니다.");
  const analysis = await analyzeVideoFile({ sourceVideoPath, allowedRoot, workDir: path.resolve(allowedRoot) });
  const reports = await collectPlanningOrders(
    [{ instruction: "기존 영상의 내용, 길이와 대표 화면을 확인해 주세요.", capabilityId: "video-analysis" }],
    {
      track: "press",
      sourceVideoPath,
      analysisWorkDir: path.resolve(allowedRoot),
      allowedSourceRoot: path.resolve(allowedRoot),
    },
  );
  console.log(JSON.stringify({
    durationSec: analysis.durationSec,
    width: analysis.width,
    height: analysis.height,
    hasAudio: analysis.hasAudio,
    size: analysis.size,
    transcriptChars: analysis.transcript.length,
    transcript: analysis.transcript,
    framePaths: analysis.framePaths,
    collectionReport: reports[0],
  }, null, 2));
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
