export interface StockRow {
  id: string;
  key: string;
  name: string;
  personality: string;
  color: string;
  sort_order: number;
  starting_price: number;
  current_price: number;
  sector: string;
  description: string;
}

export interface PlayerRow {
  id: string;
  name: string;
  pin: string;
  cash: number;
  created_at: string;
}

export interface TeacherRow {
  id: string;
  name: string;
  pin: string;
}

export interface HoldingRow {
  id: string;
  player_id: string;
  stock_id: string;
  shares: number;
}

export interface PriceHistoryRow {
  id: string;
  stock_id: string;
  week_number: number;
  price: number;
  recorded_at: string;
}

export interface NewsLogRow {
  id: string;
  week_number: number;
  stock_id: string | null;
  headline: string;
  created_at: string;
}

export interface MarketStateRow {
  id: number;
  current_week: number;
  dip_stock_id: string | null;
  hype_stock_id: string | null;
  novamed_event: "spike" | "flop" | null;
  updated_at: string;
}

export interface TransactionRow {
  id: string;
  player_id: string;
  stock_id: string;
  action: "buy" | "sell";
  shares: number;
  price: number;
  reasoning: string | null;
  week_number: number;
  created_at: string;
}

export interface NewsHintRow {
  id: string;
  news_log_id: string | null;
  stock_id: string;
  direction: "up" | "down";
  scenario_key: string;
  planted_week: number;
  consumed_at: string | null;
}

export interface AdminActionRow {
  id: string;
  teacher_id: string | null;
  teacher_name: string | null;
  description: string;
  created_at: string;
}
