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
  const expectedShares = Number(body?.expectedShares);

  if (!playerId || !stockId || !Number.isInteger(shares) || shares < 0 || !Number.isInteger(expectedShares)) {
    return NextResponse.json({ error: "Shares must be a whole number, zero or more" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin.rpc("admin_set_holding", {
    p_player_id: playerId,
    p_stock_id: stockId,
    p_expected_shares: expectedShares,
    p_new_shares: shares,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  if (!data.ok) {
    return NextResponse.json(
      {
        error: `${data.playerName}'s ${data.stockName} holding is now ${data.currentValue} shares — someone else changed it.`,
        conflict: true,
        currentValue: data.currentValue,
      },
      { status: 409 }
    );
  }

  await logAdminAction(
    teacher.id,
    teacher.name,
    `Set ${data.playerName}'s ${data.stockName} holding from ${expectedShares} to ${shares} shares`
  );

  return NextResponse.json({ ok: true });
}
