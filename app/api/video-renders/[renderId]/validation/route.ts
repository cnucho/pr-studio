import { type NextRequest } from "next/server";
import { withUser } from "@/lib/video-production/http";
import { readValidation } from "@/lib/video-production/repository";

export async function GET(request: NextRequest, context: { params: Promise<{ renderId: string }> }) {
  const { renderId } = await context.params;
  return withUser(request, (userId) => readValidation(userId, renderId));
}
