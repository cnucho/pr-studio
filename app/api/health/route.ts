import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "pr-studio-web",
    execution: process.env.VIDEO_AGENT_EXECUTION ?? "auto",
    capabilities: {
      openai: Boolean(process.env.OPENAI_API_KEY),
      supabase: Boolean(process.env.SUPABASE_URL && (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)),
      chromium: Boolean(process.env.CHROME_PATH || process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH),
    },
  });
}
