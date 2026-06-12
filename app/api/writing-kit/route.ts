import { NextResponse } from "next/server";
import { createWritingKit, type WritingInput } from "@/lib/engines";

export async function POST(request: Request) {
  const input = (await request.json()) as WritingInput;

  return NextResponse.json({
    ok: true,
    output: createWritingKit(input),
  });
}
