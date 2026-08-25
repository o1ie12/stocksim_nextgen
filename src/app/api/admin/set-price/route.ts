import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireTeacher } from "@/lib/session";
import { logAdminAction } from "@/lib/gameData";

export async function POST(req: Request) {
  const teacher = await requireTeacher();
  if (!teacher) return NextResponse.json({ error: "Teachers only" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const stockId = body?.stockId as string | undefined;
  const price = Number(body?.price);
  const expectedPrice = Number(body?.expectedPrice);

  if (!stockId || !Number.isInteger(price) || price <= 0 || !Number.isInteger(expectedPrice)) {
    return NextResponse.json({ error: "Price must be a positive whole number" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin.rpc("admin_set_price", {
    p_stock_id: stockId,
    p_expected_price: expectedPrice,
    p_new_price: price,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  if (!data.ok) {
    return NextResponse.json(
      { error: `${data.name} is now $${data.currentValue} — someone else changed it.`, conflict: true, currentValue: data.currentValue },
      { status: 409 }
    );
  }

  await logAdminAction(teacher.id, teacher.name, `Set ${data.name} price from $${expectedPrice} to $${price}`);

  return NextResponse.json({ ok: true });
}
