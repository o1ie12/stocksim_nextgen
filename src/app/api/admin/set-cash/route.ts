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
  const expectedCash = Number(body?.expectedCash);

  if (!playerId || !Number.isInteger(cash) || cash < 0 || !Number.isInteger(expectedCash)) {
    return NextResponse.json({ error: "Cash must be a whole number, zero or more" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin.rpc("admin_set_cash", {
    p_player_id: playerId,
    p_expected_cash: expectedCash,
    p_new_cash: cash,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  if (!data.ok) {
    return NextResponse.json(
      { error: `${data.name}'s cash is now $${data.currentValue} — someone else changed it.`, conflict: true, currentValue: data.currentValue },
      { status: 409 }
    );
  }

  await logAdminAction(teacher.id, teacher.name, `Set ${data.name}'s cash from $${expectedCash} to $${cash}`);

  return NextResponse.json({ ok: true });
}
