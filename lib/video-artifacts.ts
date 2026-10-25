import path from "node:path";

const ARTIFACT_ID = /^(?:inline-)?[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

export type VideoArtifactPaths = ReturnType<typeof videoArtifactPaths>;

export function videoArtifactPaths(root: string, artifactId: string) {
  if (!ARTIFACT_ID.test(artifactId)) throw new Error("Invalid video artifact ID.");
  const workDir = path.join(root, "video-assets", "jobs", artifactId);
  return {
    artifactId,
    workDir,
    manifestPath: path.join(workDir, "manifest.json"),
    finalVideoPath: path.join(workDir, "output", "pr-studio-final.mp4"),
    reviewPath: path.join(workDir, "review.json"),
  };
}
