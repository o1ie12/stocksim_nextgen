// Seeds/updates the Supabase project from scripts/roster.json.
// Safe to re-run: existing accounts (matched by name) are left untouched,
// so adding a student later is just adding a name to roster.json and
// re-running this script — no code change needed.
import fs from "fs";
import path from "path";
import crypto from "crypto";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { STOCKS_META } from "../src/lib/stocksMeta";

dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}
const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

function randomPin(): string {
  return crypto.randomInt(0, 10000).toString().padStart(4, "0");
}

async function seedAccounts(
  table: "players" | "teachers",
  names: string[],
  newCreds: { table: string; name: string; pin: string }[]
) {
  const { data: existing, error } = await supabase.from(table).select("id, name, pin");
  if (error) throw error;
  const existingByName = new Map((existing ?? []).map((r) => [r.name, r]));

  const toInsert: { name: string; pin: string }[] = [];
  for (const name of names) {
    if (existingByName.has(name)) continue;
    const pin = randomPin();
    toInsert.push({ name, pin });
    newCreds.push({ table, name, pin });
  }

  if (toInsert.length > 0) {
    const { error: insertError } = await supabase.from(table).insert(toInsert);
    if (insertError) throw insertError;
  }

  // Backfill any existing row that doesn't have a PIN yet (e.g. accounts
  // created before PINs were stored directly).
  let backfilled = 0;
  for (const row of existing ?? []) {
    if (row.pin) continue;
    const pin = randomPin();
    const { error: updateError } = await supabase.from(table).update({ pin }).eq("id", row.id);
    if (updateError) throw updateError;
    newCreds.push({ table, name: row.name, pin });
    backfilled++;
  }

  console.log(
    `${table}: ${(existing ?? []).length - backfilled} already had a PIN, ${backfilled} backfilled, ${toInsert.length} newly created.`
  );
}

async function seedStocks() {
  const { data: existing, error } = await supabase.from("stocks").select("key");
  if (error) throw error;
  const existingKeys = new Set((existing ?? []).map((r) => r.key));

  const toInsert = STOCKS_META.filter((s) => !existingKeys.has(s.key)).map((s) => ({
    key: s.key,
    name: s.name,
    personality: s.personality,
    color: s.color,
    sort_order: s.sortOrder,
    starting_price: s.startingPrice,
    current_price: s.startingPrice,
  }));

  if (toInsert.length > 0) {
    const { error: insertError } = await supabase.from("stocks").insert(toInsert);
    if (insertError) throw insertError;
  }
  console.log(`stocks: ${existingKeys.size} existing, ${toInsert.length} newly created.`);
}

async function seedMarketStateAndHistory() {
  const { data: ms, error: msError } = await supabase
    .from("market_state")
    .select("id")
    .eq("id", 1)
    .maybeSingle();
  if (msError) throw msError;

  if (!ms) {
    const { error } = await supabase.from("market_state").insert({ id: 1, current_week: 1 });
    if (error) throw error;
    console.log("market_state: initialized at week 1.");
  } else {
    console.log("market_state: already initialized, left as-is.");
  }

  const { data: stocks, error: stocksError } = await supabase
    .from("stocks")
    .select("id, starting_price");
  if (stocksError) throw stocksError;

  const { data: existingHistory, error: historyError } = await supabase
    .from("price_history")
    .select("stock_id")
    .eq("week_number", 1);
  if (historyError) throw historyError;
  const existingHistoryStockIds = new Set((existingHistory ?? []).map((r) => r.stock_id));

  const historyToInsert = (stocks ?? [])
    .filter((s) => !existingHistoryStockIds.has(s.id))
    .map((s) => ({ stock_id: s.id, week_number: 1, price: s.starting_price }));

  if (historyToInsert.length > 0) {
    const { error } = await supabase.from("price_history").insert(historyToInsert);
    if (error) throw error;
  }
  console.log(`price_history (week 1): ${historyToInsert.length} rows created.`);

  const { data: existingNews, error: newsError } = await supabase
    .from("news_log")
    .select("id")
    .eq("week_number", 1)
    .is("stock_id", null);
  if (newsError) throw newsError;

  if (!existingNews || existingNews.length === 0) {
    const { error } = await supabase.from("news_log").insert({
      week_number: 1,
      stock_id: null,
      headline: "Market opens! 10 companies are live for trading.",
    });
    if (error) throw error;
    console.log("news_log: week 1 IPO headline created.");
  } else {
    console.log("news_log: week 1 headline already present, left as-is.");
  }
}

async function main() {
  const rosterPath = path.join(__dirname, "roster.json");
  const roster = JSON.parse(fs.readFileSync(rosterPath, "utf8")) as {
    teachers: string[];
    students: string[];
  };

  const newCreds: { table: string; name: string; pin: string }[] = [];

  await seedAccounts("teachers", roster.teachers, newCreds);
  await seedAccounts("players", roster.students, newCreds);
  await seedStocks();
  await seedMarketStateAndHistory();

  if (newCreds.length > 0) {
    const lines = ["Newly created logins (PINs only ever shown once — store this securely):", ""];
    for (const c of newCreds) {
      lines.push(`  [${c.table}] ${c.name}: ${c.pin}`);
    }
    const out = lines.join("\n") + "\n";
    console.log("\n" + out);
    const outPath = path.join(__dirname, "roster-credentials.txt");
    fs.writeFileSync(outPath, out);
    console.log(`Also saved to ${outPath} (gitignored — delete once you've distributed PINs).`);
  } else {
    console.log("\nNo new accounts created this run.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
