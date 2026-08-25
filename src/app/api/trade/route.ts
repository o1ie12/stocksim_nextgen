import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getSession } from "@/lib/session";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "player") {
    return NextResponse.json({ error: "Not logged in as a player" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const stockId = body?.stockId as string | undefined;
  const action = body?.action as "buy" | "sell" | undefined;
  const shares = Number(body?.shares);
  const reasoning = typeof body?.reasoning === "string" ? body.reasoning.trim().slice(0, 500) : null;

  if (!stockId || (action !== "buy" && action !== "sell") || !Number.isInteger(shares) || shares <= 0) {
    return NextResponse.json({ error: "Invalid trade request" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin.rpc("execute_trade", {
    p_player_id: session.id,
    p_stock_id: stockId,
    p_action: action,
    p_shares: shares,
    p_reasoning: reasoning || null,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, result: data });
}
