import type { NextRequest } from "next/server";
import { AuthenticationError, authenticatedUser } from "./video-production/auth";

export class VideoAccessError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export function allowedVideoEmail(email: string | undefined, configured: string) {
  if (!email) return false;
  return configured.split(",").some((entry) => entry.trim().toLowerCase() === email.toLowerCase());
}

export async function videoOperator(request: NextRequest) {
  const user = await authenticatedUser(request);
  const allowed = process.env.VIDEO_AGENT_ALLOWED_EMAILS ?? "";
  if (!allowed.trim()) throw new VideoAccessError("영상 생성 운영자가 설정되지 않았습니다.", 503);
  if (!allowedVideoEmail(user.email, allowed)) {
    throw new VideoAccessError("영상 생성 권한이 없습니다.", 403);
  }
  return user;
}

export function videoAccessStatus(error: unknown) {
  if (error instanceof AuthenticationError) return 401;
  if (error instanceof VideoAccessError) return error.status;
  return 500;
}
