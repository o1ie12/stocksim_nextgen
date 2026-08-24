import { NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getSession } from "@/lib/session";

function randomPin(): string {
  return crypto.randomInt(0, 10000).toString().padStart(4, "0");
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "teacher") {
    return NextResponse.json({ error: "Only teachers can reset a PIN" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const playerId = body?.playerId as string | undefined;
  if (!playerId) {
    return NextResponse.json({ error: "Missing playerId" }, { status: 400 });
  }

  const pin = randomPin();

  const { data, error } = await supabaseAdmin
    .from("players")
    .update({ pin })
    .eq("id", playerId)
    .select("name")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Player not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, name: data.name, pin });
}
