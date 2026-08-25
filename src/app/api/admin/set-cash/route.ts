import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireTeacher } from "@/lib/session";
import { logAdminAction } from "@/lib/gameData";

export async function POST(req: Request) {
  const teacher = await requireTeacher();
  if (!teacher) return NextResponse.json({ error: "Teachers only" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const playerId = body?.playerId as string | undefined;
  const cash = Number(body?.cash);

  if (!playerId || !Number.isInteger(cash) || cash < 0) {
    return NextResponse.json({ error: "Cash must be a whole number, zero or more" }, { status: 400 });
  }

  const { data: player, error: fetchError } = await supabaseAdmin
    .from("players")
    .select("name, cash")
    .eq("id", playerId)
    .single();
  if (fetchError || !player) return NextResponse.json({ error: "Player not found" }, { status: 404 });

  const { error } = await supabaseAdmin.from("players").update({ cash }).eq("id", playerId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminAction(teacher.id, teacher.name, `Set ${player.name}'s cash from $${player.cash} to $${cash}`);

  return NextResponse.json({ ok: true });
}
