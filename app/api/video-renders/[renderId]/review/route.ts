import { type NextRequest } from "next/server";
import { withUser } from "@/lib/video-production/http";
import { reviewRender } from "@/lib/video-production/repository";

export async function POST(request: NextRequest, context: { params: Promise<{ renderId: string }> }) {
  const { renderId } = await context.params;
  const body = (await request.json()) as { decision: "approved" | "rejected"; reason?: string };
  return withUser(request, (userId) => reviewRender(userId, renderId, body.decision, body.reason));
}
