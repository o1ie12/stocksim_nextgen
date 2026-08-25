import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireTeacher } from "@/lib/session";
import { logAdminAction } from "@/lib/gameData";

export async function POST(req: Request) {
  const teacher = await requireTeacher();
  if (!teacher) return NextResponse.json({ error: "Teachers only" }, { status: 401 });

  const body = await req.json().catch(() => null);
  // Defense in depth: the UI already requires typing RESET before this
  // fires, but a server-side check means a client bug can't skip it.
  if (body?.confirmText !== "RESET") {
    return NextResponse.json({ error: 'Type "RESET" to confirm' }, { status: 400 });
  }

  const { error } = await supabaseAdmin.rpc("reset_game");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminAction(teacher.id, teacher.name, "Reset the entire game to Week 1");

  return NextResponse.json({ ok: true });
}
