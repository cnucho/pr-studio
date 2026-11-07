import { type NextRequest } from "next/server";
import { withUser } from "@/lib/video-production/http";
import { submitRender } from "@/lib/video-production/repository";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    projectId: string;
    revision: number;
    provider: "creatomate" | "local";
  };
  return withUser(request, (userId) =>
    submitRender(userId, body.projectId, body.revision, body.provider),
  );
}
