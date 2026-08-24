import { NextResponse } from "next/server";
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
    .select("id, name, pin")
    .eq("id", id)
    .maybeSingle();

  if (error || !row || row.pin !== pin) {
    return NextResponse.json({ error: "Incorrect PIN" }, { status: 401 });
  }

  await setSessionCookie({ id: row.id, role, name: row.name });
  return NextResponse.json({ ok: true, role, name: row.name });
}
