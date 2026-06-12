import { NextResponse } from "next/server";
import { createYoutubeKit, type YoutubeInput } from "@/lib/engines";

export async function POST(request: Request) {
  const input = (await request.json()) as YoutubeInput;

  return NextResponse.json({
    ok: true,
    output: createYoutubeKit(input),
  });
}
