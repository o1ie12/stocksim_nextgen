import { NextResponse } from "next/server";
import { getStocksWithHistory } from "@/lib/gameData";

// Public (no session required): just prices/changes for the scrolling ticker
// tape shown on every page, including the login screen before sign-in.
export async function GET() {
  try {
    const { stocks } = await getStocksWithHistory();
    return NextResponse.json({
      stocks: stocks.map((s) => ({
        key: s.key,
        name: s.name,
        currentPrice: s.currentPrice,
        pctChangeRecent: s.pctChangeRecent,
        dollarChangeRecent: s.dollarChangeRecent,
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
