// Viewer-relative numbers for the Glow UI: everything the hero, the ledger, the
// chips and the share bar show, computed from one group's rows.
//
// Pure functions over the app's row types. No React, no database. Money is
// integer cents end to end; formatting happens at render.
//
// Sign convention, used everywhere: positive means others owe the viewer more.
//
// All amounts are taken at par (1:1), the way the app treats currencies today
// (PLAN D8: multi-currency is out of scope).
//
// `memberOrder` is the ledger's member ids in ledger order (users.created_at
// ascending). Include archived members: they stay in history and in the
// totals, and leaving one out would break the sum-to-zero checks.

import type { Expense, Split } from "@/src/lib/types";
import { getMemberBreakdown, type Payment } from "../balances.ts";

export type { Expense, Split, Payment };

/** One group's rows, as the ledger page loads them. */
export type GroupData = {
  memberOrder: string[];
  expenses: Expense[];
  splits: Split[];
  payments: Payment[];
};

/** Everything the ledger knows about one money event, oldest-first. */
export type LedgerEvent =
  | { kind: "expense"; expense: Expense; shares: Record<string, number> }
  | { kind: "payment"; payment: Payment };

// ---------- events ----------

// Chronological, with the id as the tie-break so the order never flickers.
// Timestamps are compared as instants rather than as strings, because
// Postgres writes "+00:00" or fractional seconds that don't sort like "Z".
function byTimeThenId(
  a: { created_at: string; id: string },
  b: { created_at: string; id: string }
): number {
  const diff = Date.parse(a.created_at) - Date.parse(b.created_at);
  if (diff !== 0 && !Number.isNaN(diff)) return diff;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/** A member's cents on each expense, summing any duplicate rows. */
function sharesByExpense(splits: Split[]): Map<string, Record<string, number>> {
  const byExpense = new Map<string, Record<string, number>>();
  for (const split of splits) {
    let shares = byExpense.get(split.expense_id);
    if (!shares) {
      shares = {};
      byExpense.set(split.expense_id, shares);
    }
    shares[split.user_id] = (shares[split.user_id] ?? 0) + split.amount_cents;
  }
  return byExpense;
}

/** All expenses and payments as one chronological list, oldest first. */
export function events(data: Pick<GroupData, "expenses" | "splits" | "payments">): LedgerEvent[] {
  const shares = sharesByExpense(data.splits);
  const all = [
    ...data.expenses.map((expense): LedgerEvent => ({
      kind: "expense",
      expense,
      shares: shares.get(expense.id) ?? {}
    })),
    ...data.payments.map((payment): LedgerEvent => ({ kind: "payment", payment }))
  ];
  const row = (ev: LedgerEvent) => (ev.kind === "expense" ? ev.expense : ev.payment);
  return all.sort((a, b) => byTimeThenId(row(a), row(b)));
}

// ---------- impact ----------

/**
 * Effect of one event on the viewer's net position (positive = others owe the
 * viewer more).
 *   expense: (viewer paid ? total : 0) - (viewer's split ?? 0)
 *   payment: +amount if the viewer sent it, -amount if the viewer received it
 * Returns null when the viewer is not involved.
 */
export function impact(ev: LedgerEvent, viewerId: string): number | null {
  if (ev.kind === "expense") {
    const paidIt = ev.expense.payer_id === viewerId;
    const inSplit = viewerId in ev.shares;
    if (!paidIt && !inSplit) return null;
    return (paidIt ? ev.expense.amount_cents : 0) - (ev.shares[viewerId] ?? 0);
  }
  if (ev.payment.payer_id === viewerId) return ev.payment.amount_cents;
  if (ev.payment.payee_id === viewerId) return -ev.payment.amount_cents;
  return null;
}

// ---------- per-member totals (Balances tab, viewer menu) ----------

export type MemberTotals = {
  paid: number;
  share: number;
  sent: number;
  received: number;
  net: number;
};

/**
 * paid, share, sent, received and net for every member, in `memberOrder`.
 * net = paid - share + sent - received, and nets sum to 0 across a group.
 * Reuses the app's `getMemberBreakdown`, so these figures are the ones the
 * Balances list already shows.
 */
export function memberTotals(data: GroupData): Record<string, MemberTotals> {
  const out: Record<string, MemberTotals> = {};
  for (const id of data.memberOrder) {
    const b = getMemberBreakdown(id, data.expenses, data.splits, data.payments, {});
    out[id] = {
      paid: b.paidTotalCents,
      share: b.owedTotalCents,
      sent: b.paymentsMadeTotalCents,
      received: b.paymentsReceivedTotalCents,
      net: b.netCents
    };
  }
  return out;
}

// ---------- viewer ledger (Activity tab) ----------

export type LedgerRow = {
  id: string;
  kind: "expense" | "payment";
  createdAt: string;
  /** The expense description. Null for payments. */
  title: string | null;
  payerId: string;
  /** Who received the payment. Null for expenses. */
  payeeId: string | null;
  note: string | null;
  totalCents: number;
  involved: boolean;
  /** The viewer's signed impact, or null when not involved (counts as 0). */
  impactCents: number | null;
  /** The viewer's running balance after this row. */
  balanceAfterCents: number;
};

/**
 * Every row newest first, with the viewer's impact and running balance after
 * it. Always pass the full history: the running balance must never be computed
 * over a filtered list. The first row's balance equals the viewer's net.
 */
export function viewerLedger(data: GroupData, viewerId: string): LedgerRow[] {
  let balance = 0;
  const rows = events(data).map((ev): LedgerRow => {
    const imp = impact(ev, viewerId);
    balance += imp ?? 0;
    if (ev.kind === "expense") {
      const e = ev.expense;
      return {
        id: e.id,
        kind: "expense",
        createdAt: e.created_at,
        title: e.description,
        payerId: e.payer_id,
        payeeId: null,
        note: null,
        totalCents: e.amount_cents,
        involved: imp !== null,
        impactCents: imp,
        balanceAfterCents: balance
      };
    }
    const p = ev.payment;
    return {
      id: p.id,
      kind: "payment",
      createdAt: p.created_at,
      title: null,
      payerId: p.payer_id,
      payeeId: p.payee_id,
      note: p.note,
      totalCents: p.amount_cents,
      involved: imp !== null,
      impactCents: imp,
      balanceAfterCents: balance
    };
  });
  return rows.reverse();
}

// ---------- pairwise chips (hero card) ----------

export type PairBalance = {
  memberId: string;
  /** Positive: this member owes the viewer. Negative: the viewer owes them. */
  cents: number;
};

/**
 * Net between the viewer and each other member, before any simplification.
 * Sorted largest first; ties keep ledger order. The values sum to the viewer's
 * net. Includes members who are square (0): use `visibleChips` for the hero.
 */
export function pairwise(data: GroupData, viewerId: string): PairBalance[] {
  const out = new Map<string, number>();
  for (const id of data.memberOrder) if (id !== viewerId) out.set(id, 0);
  const add = (id: string, cents: number) => out.set(id, (out.get(id) ?? 0) + cents);

  for (const ev of events(data)) {
    if (ev.kind === "expense") {
      const { expense, shares } = ev;
      if (expense.payer_id === viewerId) {
        for (const [id, cents] of Object.entries(shares)) if (id !== viewerId) add(id, cents);
      } else if (viewerId in shares) {
        add(expense.payer_id, -shares[viewerId]);
      }
    } else {
      const { payment } = ev;
      if (payment.payee_id === viewerId) add(payment.payer_id, -payment.amount_cents);
      if (payment.payer_id === viewerId) add(payment.payee_id, payment.amount_cents);
    }
  }

  // Array.prototype.sort is stable, so equal values stay in ledger order.
  return [...out].map(([memberId, cents]) => ({ memberId, cents })).sort((a, b) => b.cents - a.cents);
}

/** The chips the hero draws: members who are square with the viewer are hidden (D11). */
export function visibleChips(pairs: PairBalance[]): PairBalance[] {
  return pairs.filter((p) => p.cents !== 0);
}

export type HeroCounts = {
  /** Members who owe the viewer, in chip order. */
  owesYou: string[];
  /** Members the viewer owes, in chip order. */
  youOwe: string[];
  /** Members square with the viewer. */
  square: string[];
};

/**
 * The counts behind the hero sub-line ("4 people owe you · you owe Stephen").
 * Returns ids, not words: the copy lives with the hero (docs/06 "Hero").
 */
export function heroCounts(pairs: PairBalance[]): HeroCounts {
  return {
    owesYou: pairs.filter((p) => p.cents > 0).map((p) => p.memberId),
    youOwe: pairs.filter((p) => p.cents < 0).map((p) => p.memberId),
    square: pairs.filter((p) => p.cents === 0).map((p) => p.memberId)
  };
}

// ---------- share of spend ("So far" card) ----------

export type ShareOfSpend = {
  groupSpentCents: number;
  yourShareCents: number;
  youPaidCents: number;
  /** Bar segments as a percentage of the group's spend, to one decimal. */
  bar: {
    /** min(share, paid): the part of your share you covered. */
    sharePct: number;
    /** max(paid - share, 0): money you fronted for others. */
    extraPct: number;
    /** max(share - paid, 0): the part of your share still to cover. */
    shortfallPct: number;
  };
};

/** Payments are excluded from the group's spend. */
export function shareOfSpend(data: GroupData, viewerId: string): ShareOfSpend {
  const groupSpentCents = data.expenses.reduce((sum, e) => sum + e.amount_cents, 0);
  const t = memberTotals(data)[viewerId] ?? { paid: 0, share: 0, sent: 0, received: 0, net: 0 };
  const pct = (cents: number) =>
    groupSpentCents === 0 ? 0 : +((100 * cents) / groupSpentCents).toFixed(1);
  return {
    groupSpentCents,
    yourShareCents: t.share,
    youPaidCents: t.paid,
    bar: {
      sharePct: pct(Math.min(t.share, t.paid)),
      extraPct: pct(Math.max(t.paid - t.share, 0)),
      shortfallPct: pct(Math.max(t.share - t.paid, 0))
    }
  };
}

// ---------- composer impact line ----------

export type ComposerImpact = {
  /** Signed cents the expense would add to the viewer's balance. */
  cents: number;
  /** "owed": You'll be owed {x} more. "owe": You'll owe {x} more. "none": no change. */
  kind: "owed" | "owe" | "none";
  involved: boolean;
};

/**
 * The same formula as an expense's impact, computed live from the form:
 * (payer is viewer ? amount : 0) - (viewer's split ?? 0).
 * `shares` is the form's cents per member (from `splitAmounts`); leave out
 * members who aren't included.
 */
export function composerImpact(input: {
  viewerId: string;
  payerId: string;
  amountCents: number;
  shares: Record<string, number>;
}): ComposerImpact {
  const { viewerId, payerId, amountCents, shares } = input;
  const involved = payerId === viewerId || viewerId in shares;
  const cents = involved
    ? (payerId === viewerId ? amountCents : 0) - (shares[viewerId] ?? 0)
    : 0;
  return { cents, kind: cents > 0 ? "owed" : cents < 0 ? "owe" : "none", involved };
}
