import { NextResponse } from "next/server";
import { requireTeacher } from "@/lib/session";
import { getPlayerTransactions } from "@/lib/gameData";
import { toCsv } from "@/lib/csv";

export async function GET(req: Request) {
  const teacher = await requireTeacher();
  if (!teacher) return NextResponse.json({ error: "Teachers only" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const playerId = searchParams.get("playerId");
  const playerName = searchParams.get("playerName") ?? "player";
  if (!playerId) return NextResponse.json({ error: "Missing playerId" }, { status: 400 });

  const transactions = await getPlayerTransactions(playerId);

  const csv = toCsv(
    transactions.map((t) => ({
      week: t.weekNumber,
      date: t.createdAt,
      stock: t.stockName,
      action: t.action,
      shares: t.shares,
      price: t.price,
      total: t.price * t.shares,
      reasoning: t.reasoning ?? "",
    }))
  );

  const safeName = playerName.replace(/[^a-z0-9]+/gi, "_");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${safeName}_trades.csv"`,
    },
  });
}
