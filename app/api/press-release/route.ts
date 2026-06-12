import { NextResponse } from "next/server";
import { createPressRelease, type PressInput } from "@/lib/engines";

export async function POST(request: Request) {
  const input = (await request.json()) as PressInput;

  return NextResponse.json({
    ok: true,
    output: createPressRelease(input),
  });
}
