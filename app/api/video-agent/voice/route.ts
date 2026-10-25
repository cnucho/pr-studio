import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { NextResponse, type NextRequest } from "next/server";
import { videoAccessStatus, videoOperator } from "@/lib/video-access";

export const runtime = "nodejs";
export const maxDuration = 60;

const run = promisify(execFile);

export async function POST(request: NextRequest) {
  let directory: string | undefined;
  try {
    await videoOperator(request);
    const body = (await request.json()) as { text?: string };
    const text = body.text?.trim() ?? "";
    if (!text || text.length > 1200) {
      return NextResponse.json({ ok: false, error: "음성 원고는 1~1200자로 입력해 주세요." }, { status: 400 });
    }
    directory = await mkdtemp(path.join(os.tmpdir(), "pr-studio-voice-"));
    const input = path.join(directory, "input.txt");
    const output = path.join(directory, "preview.wav");
    await writeFile(input, text, "utf8");
    await run("node", [path.join(process.cwd(), "scripts", "synthesize-speech.mjs"), "--input", input, "--output", output], {
      cwd: process.cwd(),
      timeout: 50000,
      env: { ...process.env, PR_STUDIO_TTS_PROVIDER: "google", PR_STUDIO_TTS_LANGUAGE: "ko" },
    });
    const audio = await readFile(output);
    return new Response(new Uint8Array(audio), {
      headers: { "Content-Type": "audio/wav", "Content-Length": String(audio.byteLength), "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: videoAccessStatus(error) === 500 ? "Google 음성을 생성하지 못했습니다." : error instanceof Error ? error.message : "접근이 거부됐습니다." }, { status: videoAccessStatus(error) });
  } finally {
    if (directory) await rm(directory, { recursive: true, force: true }).catch(() => {});
  }
}
