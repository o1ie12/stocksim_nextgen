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
  price: number;
  recorded_at: string;
}

export interface NewsLogRow {
  id: string;
  stock_id: string | null;
  headline: string;
  created_at: string;
}

export interface TransactionRow {
  id: string;
  player_id: string;
  stock_id: string;
  action: "buy" | "sell";
  shares: number;
  price: number;
  reasoning: string | null;
  created_at: string;
}

export interface AdminActionRow {
  id: string;
  teacher_id: string | null;
  teacher_name: string | null;
  description: string;
  created_at: string;
}
