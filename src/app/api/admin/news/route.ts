import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireTeacher } from "@/lib/session";
import { logAdminAction } from "@/lib/gameData";

export async function POST(req: Request) {
  const teacher = await requireTeacher();
  if (!teacher) return NextResponse.json({ error: "Teachers only" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const weekNumber = Number(body?.weekNumber);
  const headline = typeof body?.headline === "string" ? body.headline.trim() : "";
  const stockId = (body?.stockId as string | null) ?? null;

  if (!Number.isInteger(weekNumber) || weekNumber < 1 || !headline) {
    return NextResponse.json({ error: "Need a valid week number and a headline" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("news_log")
    .insert({ week_number: weekNumber, stock_id: stockId, headline });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminAction(teacher.id, teacher.name, `Added news headline for week ${weekNumber}: "${headline}"`);

  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request) {
  const teacher = await requireTeacher();
  if (!teacher) return NextResponse.json({ error: "Teachers only" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const id = body?.id as string | undefined;
  const headline = typeof body?.headline === "string" ? body.headline.trim() : "";

  if (!id || !headline) {
    return NextResponse.json({ error: "Need an id and a headline" }, { status: 400 });
  }

  const { data: existing } = await supabaseAdmin.from("news_log").select("headline").eq("id", id).single();

  const { error } = await supabaseAdmin.from("news_log").update({ headline }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminAction(
    teacher.id,
    teacher.name,
    `Edited news headline from "${existing?.headline ?? "?"}" to "${headline}"`
  );

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const teacher = await requireTeacher();
  if (!teacher) return NextResponse.json({ error: "Teachers only" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const { data: existing } = await supabaseAdmin.from("news_log").select("headline").eq("id", id).single();

  const { error } = await supabaseAdmin.from("news_log").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminAction(teacher.id, teacher.name, `Deleted news headline: "${existing?.headline ?? "?"}"`);

  return NextResponse.json({ ok: true });
}
