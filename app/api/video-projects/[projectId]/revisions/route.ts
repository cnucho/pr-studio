import { type NextRequest } from "next/server";
import { withUser } from "@/lib/video-production/http";
import { createRevision, listRevisions } from "@/lib/video-production/repository";

export async function GET(request: NextRequest, context: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await context.params;
  return withUser(request, (userId) => listRevisions(userId, projectId));
}

export async function POST(request: NextRequest, context: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await context.params;
  const body: unknown = await request.json();
  return withUser(request, (userId) => createRevision(userId, projectId, body));
}
