import { NextResponse } from "next/server";
import { analyzeNews } from "@/lib/engines";

export async function POST(request: Request) {
  const input = (await request.json()) as { articles?: string };

  return NextResponse.json({
    ok: true,
    output: analyzeNews(input.articles ?? ""),
  });
}
