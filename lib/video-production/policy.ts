export type ProjectRole = "owner" | "operator" | "viewer";
export type ProjectGrant = { userId: string; role: ProjectRole };

export function canReadProject(userId: string | null, ownerId: string, grants: ProjectGrant[] = []) {
  if (!userId) return false;
  return userId === ownerId || grants.some((grant) => grant.userId === userId);
}

export function canWriteProject(userId: string | null, ownerId: string, grants: ProjectGrant[] = []) {
  if (!userId) return false;
  return (
    userId === ownerId ||
    grants.some(
      (grant) => grant.userId === userId && (grant.role === "owner" || grant.role === "operator"),
    )
  );
}

export function canApproveProject(userId: string | null, ownerId: string, grants: ProjectGrant[] = []) {
  return canWriteProject(userId, ownerId, grants);
}

export function storagePathBelongsToRender(
  storagePath: string,
  projectId: string,
  renderId: string,
) {
  const safeId = /^[0-9a-f-]{36}$/i;
  if (!safeId.test(projectId) || !safeId.test(renderId)) return false;
  return storagePath.startsWith(`${projectId}/${renderId}/`) && !storagePath.includes("..");
}

export function sanitizeDownloadFilename(value: string) {
  const cleaned = value
    .normalize("NFKC")
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
  return `${cleaned || "video"}.mp4`;
}
