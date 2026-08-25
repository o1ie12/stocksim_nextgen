import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireTeacher } from "@/lib/session";
import { logAdminAction } from "@/lib/gameData";

export async function POST(req: Request) {
  const teacher = await requireTeacher();
  if (!teacher) return NextResponse.json({ error: "Teachers only" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const playerId = body?.playerId as string | undefined;
  const stockId = body?.stockId as string | undefined;
  const shares = Number(body?.shares);

  if (!playerId || !stockId || !Number.isInteger(shares) || shares < 0) {
    return NextResponse.json({ error: "Shares must be a whole number, zero or more" }, { status: 400 });
  }

  const [{ data: player }, { data: stock }, { data: existing }] = await Promise.all([
    supabaseAdmin.from("players").select("name").eq("id", playerId).single(),
    supabaseAdmin.from("stocks").select("name").eq("id", stockId).single(),
    supabaseAdmin.from("holdings").select("shares").eq("player_id", playerId).eq("stock_id", stockId).maybeSingle(),
  ]);

  if (!player) return NextResponse.json({ error: "Player not found" }, { status: 404 });
  if (!stock) return NextResponse.json({ error: "Stock not found" }, { status: 404 });

  const { error } = await supabaseAdmin
    .from("holdings")
    .upsert({ player_id: playerId, stock_id: stockId, shares }, { onConflict: "player_id,stock_id" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminAction(
    teacher.id,
    teacher.name,
    `Set ${player.name}'s ${stock.name} holding from ${existing?.shares ?? 0} to ${shares} shares`
  );

  return NextResponse.json({ ok: true });
}
