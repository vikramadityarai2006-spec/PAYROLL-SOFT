import { NextResponse } from "next/server";
import { checkPassword, startSession } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let password = "";
  try {
    const body = await req.json();
    password = String(body?.password ?? "");
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  if (!checkPassword(password)) {
    // Do not reveal which part failed; never log the attempted password.
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  await startSession();
  return NextResponse.json({ ok: true });
}
