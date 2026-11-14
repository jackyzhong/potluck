// Matching rules for the Activity filters and search (docs/04 "Filtering and
// search"). Pure functions over the viewer's ledger rows. Filtering only hides
// rows: it never recomputes `balanceAfterCents`, so call it after `viewerLedger`.

import type { GroupData, LedgerRow } from "./ledger.ts";

export type FilterKind = "all" | "expenses" | "payments" | "involving";

export type LedgerFilter = {
  kind: FilterKind;
  /** The "with {name}" filter: rows where both the viewer and this member are involved. */
  personId: string | null;
  /** Raw search text. */
  query: string;
};

export const NO_FILTER: LedgerFilter = { kind: "all", personId: null, query: "" };

export function isFiltering(f: LedgerFilter): boolean {
  return f.kind !== "all" || f.personId !== null || f.query.trim() !== "";
}

/** Who took part in each row: the payer and every split member, or sender and receiver. */
export function participantsByRow(
  data: Pick<GroupData, "expenses" | "splits" | "payments">
): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  for (const e of data.expenses) out.set(e.id, new Set([e.payer_id]));
  for (const s of data.splits) out.get(s.expense_id)?.add(s.user_id);
  for (const p of data.payments) out.set(p.id, new Set([p.payer_id, p.payee_id]));
  return out;
}

// "$109", "CA$109.74", "€5": a currency prefix, then the number.
const CURRENCY_PREFIX = /^(?:[a-z]{1,3}\s*)?[$€£¥]\s*/i;

/** The digits a query asks for ("109", "109.7"), or null when it isn't an amount. */
export function amountQuery(query: string): string | null {
  const q = query.trim().replace(CURRENCY_PREFIX, "").replace(/,/g, "");
  return /^\d+(\.\d{0,2})?$/.test(q) ? q : null;
}

/** "109.74", the way a person would type a total. */
export function amountText(cents: number): string {
  const abs = Math.abs(cents);
  return `${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

export type MatchContext = {
  /** Member id to display name. */
  names: ReadonlyMap<string, string>;
};

/**
 * Case-insensitive search over the description, the payer and payee names, the
 * payment note and the total. An amount query matches from the start of the
 * total, so `109`, `$109` and `109.74` all find CA$109.74, while `74` doesn't.
 */
export function matchesQuery(row: LedgerRow, query: string, ctx: MatchContext): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const fields = [
    row.title,
    row.note,
    ctx.names.get(row.payerId),
    row.payeeId ? ctx.names.get(row.payeeId) : null
  ];
  if (fields.some((f) => f && f.toLowerCase().includes(q))) return true;
  const amount = amountQuery(query);
  return amount !== null && amountText(row.totalCents).startsWith(amount);
}

export type FilterContext = MatchContext & {
  /** From `participantsByRow`. */
  participants: ReadonlyMap<string, ReadonlySet<string>>;
};

/** The rows that pass every active filter, in their original order and with their own balances. */
export function filterLedger(rows: LedgerRow[], filter: LedgerFilter, ctx: FilterContext): LedgerRow[] {
  if (!isFiltering(filter)) return rows;
  return rows.filter((row) => {
    if (filter.kind === "expenses" && row.kind !== "expense") return false;
    if (filter.kind === "payments" && row.kind !== "payment") return false;
    if (filter.kind === "involving" && !row.involved) return false;
    if (filter.personId && !(row.involved && ctx.participants.get(row.id)?.has(filter.personId))) return false;
    return matchesQuery(row, filter.query, ctx);
  });
}

/**
 * What survives a viewer change: search and "with {name}" clear, the kind goes
 * back to All, but "Involving me" stays on and re-applies to the new viewer.
 */
export function resetForViewerChange(f: LedgerFilter): LedgerFilter {
  return f.kind === "involving" ? { ...NO_FILTER, kind: "involving" } : NO_FILTER;
}
