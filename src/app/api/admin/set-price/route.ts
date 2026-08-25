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

  if (!stockId || !Number.isInteger(price) || price <= 0) {
    return NextResponse.json({ error: "Price must be a positive whole number" }, { status: 400 });
  }

  const { data: stock, error: fetchError } = await supabaseAdmin
    .from("stocks")
    .select("name, current_price")
    .eq("id", stockId)
    .single();
  if (fetchError || !stock) return NextResponse.json({ error: "Stock not found" }, { status: 404 });

  const { error } = await supabaseAdmin.from("stocks").update({ current_price: price }).eq("id", stockId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminAction(
    teacher.id,
    teacher.name,
    `Set ${stock.name} price from $${stock.current_price} to $${price}`
  );

  return NextResponse.json({ ok: true });
}
