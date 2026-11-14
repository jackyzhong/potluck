// Row types for the tables the ledger page reads. They lived in the old
// ExpenseModal until the Glow redesign replaced it (T21).

export type SplitMode = "equal" | "exact" | "percent" | "shares";

export type Expense = {
  id: string;
  ledger_id: string;
  payer_id: string;
  description: string | null;
  amount_cents: number;
  original_currency: string;
  created_at: string;
  /** How it was split (T04). Null on rows saved before Glow; they reopen in Exact. */
  split_mode?: SplitMode | null;
  /** The member who added it (T04). Null on rows saved before Glow. */
  created_by?: string | null;
};

export type Split = {
  id?: string;
  expense_id: string;
  user_id: string;
  amount_cents: number;
  /** The percent or share count typed for this person; null for equal and exact (T04). */
  weight?: number | null;
};
