import { type NextRequest } from "next/server";
import { withUser } from "@/lib/video-production/http";
import { readRevision } from "@/lib/video-production/repository";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ projectId: string; revision: string }> },
) {
  const { projectId, revision } = await context.params;
  return withUser(request, (userId) => readRevision(userId, projectId, Number(revision)));
}
