import { type NextRequest } from "next/server";
import { withUser } from "@/lib/video-production/http";
import { createProject } from "@/lib/video-production/repository";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as { title?: string };
  return withUser(request, (userId) => createProject(userId, body.title ?? ""));
}
