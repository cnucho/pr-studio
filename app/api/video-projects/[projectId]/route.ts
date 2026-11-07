import { type NextRequest } from "next/server";
import { withUser } from "@/lib/video-production/http";
import { readProject } from "@/lib/video-production/repository";

export async function GET(request: NextRequest, context: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await context.params;
  return withUser(request, (userId) => readProject(userId, projectId));
}
