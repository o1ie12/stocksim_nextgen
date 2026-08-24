import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { setSessionCookie } from "@/lib/session";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const role = body?.role as "player" | "teacher" | undefined;
  const id = body?.id as string | undefined;
  const pin = body?.pin as string | undefined;

  if (!role || !id || !pin || !/^\d{4}$/.test(pin)) {
    return NextResponse.json({ error: "Missing or invalid fields" }, { status: 400 });
  }

  const table = role === "teacher" ? "teachers" : "players";
  const { data: row, error } = await supabaseAdmin
    .from(table)
    .select("id, name, pin_hash")
    .eq("id", id)
    .maybeSingle();

  if (error || !row) {
    return NextResponse.json({ error: "Login failed" }, { status: 401 });
  }

  const ok = await bcrypt.compare(pin, row.pin_hash);
  if (!ok) {
    return NextResponse.json({ error: "Incorrect PIN" }, { status: 401 });
  }

  await setSessionCookie({ id: row.id, role, name: row.name });
  return NextResponse.json({ ok: true, role, name: row.name });
}
