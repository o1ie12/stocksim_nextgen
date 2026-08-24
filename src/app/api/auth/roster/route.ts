import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Public (no session required): just names + ids, used to populate the
// login screen's player/teacher pickers. No PINs or other data exposed.
export async function GET() {
  try {
    const [players, teachers] = await Promise.all([
      supabaseAdmin.from("players").select("id, name").order("name"),
      supabaseAdmin.from("teachers").select("id, name").order("name"),
    ]);

    if (players.error) return NextResponse.json({ error: players.error.message }, { status: 500 });
    if (teachers.error) return NextResponse.json({ error: teachers.error.message }, { status: 500 });

    return NextResponse.json({ players: players.data, teachers: teachers.data });
  } catch (err) {
    // Most commonly: Supabase env vars aren't set in this deployment.
    const message = err instanceof Error ? err.message : "Unknown server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
