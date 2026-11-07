import { NextResponse, type NextRequest } from "next/server";
import { AuthenticationError, authenticatedUser } from "@/lib/video-production/auth";
import { downloadRender, NotFoundError } from "@/lib/video-production/repository";

export async function GET(request: NextRequest, context: { params: Promise<{ renderId: string }> }) {
  try {
    const user = await authenticatedUser(request);
    const { renderId } = await context.params;
    const output = await downloadRender(user.id, renderId);
    return new Response(output.bytes, {
      headers: {
        "Content-Type": output.contentType,
        "Content-Length": String(output.bytes.byteLength),
        "Content-Disposition": `inline; filename="${output.filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    const status = error instanceof AuthenticationError ? 401 : error instanceof NotFoundError ? 404 : 400;
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Download failed" },
      { status },
    );
  }
}
