import { NextResponse, type NextRequest } from "next/server";
import { AuthenticationError, authenticatedUser } from "./auth";
import { NotFoundError } from "./repository";

export async function withUser<T>(
  request: NextRequest,
  operation: (userId: string) => Promise<T>,
) {
  try {
    const user = await authenticatedUser(request);
    return NextResponse.json({ ok: true, data: await operation(user.id) });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 401 });
    }
    if (error instanceof NotFoundError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 404 });
    }
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Request failed" },
      { status: 400 },
    );
  }
}
