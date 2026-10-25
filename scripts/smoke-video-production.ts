import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { videoArtifactPaths } from "../lib/video-artifacts";
import { contentManifestIssues, createManifest } from "../lib/video-beats";
import { resolveBinary } from "../lib/video-runtime";

function run(command: string, args: string[], env = process.env) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env,
    encoding: "utf8",
    shell: false,
    windowsHide: true,
  });
  if (result.status !== 0) {
    throw new Error([result.stdout, result.stderr].filter(Boolean).join("\n") || `${command} failed`);
  }
  return result.stdout.trim();
}

async function main() {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY가 필요합니다.");
  const artifact = videoArtifactPaths(process.cwd(), randomUUID());
  const { manifest } = createManifest({
    brief: {
      purpose: "신규 홍보 담당자가 보도자료 작성기의 입력, 실행, 결과와 검토 책임을 이해하게 한다.",
      targetAudience: "신규 홍보 담당자",
      track: "press",
      targetDurationSec: 60,
    },
    mode: "local",
    model: "stage-5-acceptance",
    summary: "실제 보도자료 화면으로 입력부터 담당자 검토까지 설명한다.",
    viewerPromise: "입력 자료가 초안이 되는 과정과 최종 검토 책임을 이해할 수 있다.",
  });
  const issues = contentManifestIssues(manifest);
  if (issues.length > 0) throw new Error(issues.join("\n"));

  await mkdir(path.dirname(artifact.finalVideoPath), { recursive: true });
  await writeFile(artifact.manifestPath, JSON.stringify(manifest, null, 2), "utf8");
  const env = {
    ...process.env,
    PR_STRATEGY_APP_URL: process.env.PR_STUDIO_CAPTURE_URL ?? "http://127.0.0.1:3016",
  };
  run(process.execPath, ["scripts/capture-video-v2.mjs", "--manifest", artifact.manifestPath, "--work-dir", artifact.workDir], env);
  run(process.execPath, ["scripts/render-video-v2.mjs", "--manifest", artifact.manifestPath, "--work-dir", artifact.workDir, "--output", artifact.finalVideoPath], env);
  run(process.execPath, ["scripts/review-video-v2.mjs", "--manifest", artifact.manifestPath, "--work-dir", artifact.workDir, "--video", artifact.finalVideoPath, "--review", artifact.reviewPath], env);

  const probe = JSON.parse(run(resolveBinary("ffprobe"), [
    "-v", "error", "-show_entries", "stream=codec_type,width,height:format=duration,size", "-of", "json", artifact.finalVideoPath,
  ]));
  const review = JSON.parse(await readFile(artifact.reviewPath, "utf8"));
  const file = await stat(artifact.finalVideoPath);
  console.log(JSON.stringify({ artifact, fileSize: file.size, probe, review }, null, 2));
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
