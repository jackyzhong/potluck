// Test helper: turns docs/potluck-glow-redesign/fixtures/veld-2026.json (the
// fixture's own shape, with splits written as a mode spec) into the app's row
// types, so the tests exercise the real functions on real-shaped data.
//
// Only the tests import this file.

import { readFileSync } from "node:fs";

import type { Expense, GroupData, Payment, Split } from "./ledger.ts";
import { splitAmounts, type SplitSpec } from "./split.ts";

const FIXTURES = new URL("../../../docs/potluck-glow-redesign/fixtures/", import.meta.url);

type FixtureSplit =
  | { mode: "equal"; participants: string[] }
  | { mode: "percent" | "shares"; weights: Record<string, number> }
  | { mode: "exact"; amounts: Record<string, number> };

export type Fixture = {
  users: { id: string; name: string; created_at: string }[];
  expenses: (Omit<Expense, "ledger_id"> & { split: FixtureSplit })[];
  payments: (Omit<Payment, "ledger_id">)[];
  _composer_examples: {
    equal: { amount_cents: number; participants: string[]; payer_id: string };
    exact_in_progress: { amount_cents: number; entered: Record<string, number>; blank: string[] };
    percent: { amount_cents: number; percent: Record<string, number> };
  };
};

export function loadJson<T>(name: string): T {
  return JSON.parse(readFileSync(new URL(name, FIXTURES), "utf8")) as T;
}

export function loadFixture(): Fixture {
  return loadJson<Fixture>("veld-2026.json");
}

/** Expand the fixture's split specs into `splits` rows and rebuild the row types. */
export function toGroupData(fixture: Fixture): GroupData {
  const ledger_id = "ledger-veld-2026";
  // Ledger order = users.created_at ascending, which is the fixture's order.
  const memberOrder = [...fixture.users]
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map((u) => u.id);

  const expenses: Expense[] = [];
  const splits: Split[] = [];
  for (const { split, ...e } of fixture.expenses) {
    expenses.push({ ...e, ledger_id });
    const cents = splitAmounts(e.amount_cents, split as SplitSpec, memberOrder);
    for (const [user_id, amount_cents] of Object.entries(cents)) {
      splits.push({ id: `${e.id}:${user_id}`, expense_id: e.id, user_id, amount_cents });
    }
  }
  const payments: Payment[] = fixture.payments.map((p) => ({ ...p, ledger_id }));
  return { memberOrder, expenses, splits, payments };
}

// "CA$1,175.90"; negatives use a true minus before the currency ("−CA$12.50").
// Same formatting as fixtures/reference.mjs, so expected.json compares as text.
const cad = new Intl.NumberFormat("en-US", { style: "currency", currency: "CAD" });
export function money(cents: number, { signed = false } = {}): string {
  const s = cad.format(Math.abs(cents) / 100);
  if (cents < 0) return "−" + s;
  return signed && cents > 0 ? "+" + s : s;
}

/** Compact hero-chip text: "+28.79" / "−16.38". */
export function chipText(cents: number): string {
  return (cents >= 0 ? "+" : "−") + (Math.abs(cents) / 100).toFixed(2);
}
