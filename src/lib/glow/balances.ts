// Numbers and wording for the Balances tab (docs/01 "Balances", docs/05
// "Settle-up plan" and "Everyone breakdown", docs/06 "Balances").
//
// Pure functions over the T03 layer and the app's existing settlement
// algorithms (`getSimplifiedDebts`, `getUnsimplifiedDebts`, `getMemberBreakdown`
// in src/lib/balances.ts). Nothing here re-derives a balance. Money is integer
// cents; formatting happens at render, through <Money>.
//
// Amounts are taken at par (1:1), as everywhere in the Glow layer (PLAN D8).

import { getMemberBreakdown, getSimplifiedDebts, getUnsimplifiedDebts } from "../balances.ts";
import { joinNames } from "./composer.ts";
import { memberTotals, type GroupData, type MemberTotals } from "./ledger.ts";

// ---------- hero tiles ----------

export type StatTilesModel = {
  /** What the viewer fronted. */
  paidCents: number;
  /** Their share, as a negative amount. */
  shareCents: number;
  /**
   * Payments, signed so the three tiles add up to the net. Normally negative
   * (money that came back to the viewer). Positive when the viewer has paid
   * more than they received, and then the tile reads "You've paid back".
   */
  paymentsCents: number;
  paymentsKind: "paidBack" | "youPaidBack";
};

/** docs/05: You paid = paid, Your share = -share, Paid back = sent - received. They sum to net. */
export function statTiles(t: MemberTotals): StatTilesModel {
  const paymentsCents = t.sent - t.received;
  return {
    paidCents: t.paid,
    shareCents: -t.share,
    paymentsCents,
    paymentsKind: paymentsCents > 0 ? "youPaidBack" : "paidBack"
  };
}

/** The three tiles added together. Equals `t.net`; the tests pin that. */
export function statTilesTotal(tiles: StatTilesModel): number {
  return tiles.paidCents + tiles.shareCents + tiles.paymentsCents;
}

// ---------- settle-up plan ----------

export type SettleTransfer = {
  fromId: string;
  toId: string;
  amountCents: number;
};

export type SettlePlan = {
  /** Every transfer in the plan, largest first. */
  transfers: SettleTransfer[];
  /** Transfers where the viewer pays or receives. Empty with no viewer. */
  involving: SettleTransfer[];
  /** Everything else. With no viewer, every transfer. */
  rest: SettleTransfer[];
};

/**
 * The plan for the group's current Simplify setting: the minimised plan when
 * `simplified`, the plain pairwise debts otherwise. Largest amount first within
 * each section, with the algorithm's own order breaking ties.
 */
export function settlePlan(data: GroupData, simplified: boolean, viewerId: string | null): SettlePlan {
  const { expenses, splits, payments } = data;
  const debts = simplified
    ? getSimplifiedDebts(expenses, splits, payments, {})
    : getUnsimplifiedDebts(expenses, splits, payments, {});
  // Array.prototype.sort is stable.
  const transfers = debts
    .map((d): SettleTransfer => ({ fromId: d.debtorId, toId: d.creditorId, amountCents: d.amountCents }))
    .sort((a, b) => b.amountCents - a.amountCents);
  const mine = (t: SettleTransfer) => viewerId !== null && (t.fromId === viewerId || t.toId === viewerId);
  return {
    transfers,
    involving: transfers.filter(mine),
    rest: transfers.filter((t) => !mine(t))
  };
}

/** "5 payments clear the whole group" (docs/06). */
export function planSubtitle(count: number): string {
  if (count === 0) return "Everyone's square.";
  if (count === 1) return "One payment clears the whole group";
  return `${count} payments clear the whole group`;
}

/** D1: shown while Simplify is on, so the plan and the Activity chips can differ without confusing anyone. */
export const SIMPLIFIED_CAPTION = "Simplified: fewer payments, same totals";

/** "Alvin pays you", "You pay Stephen", "Jonah pays Stephen". */
export function transferText(t: SettleTransfer, viewerId: string | null, nameOf: (id: string) => string): string {
  if (viewerId !== null && t.toId === viewerId) return `${nameOf(t.fromId)} pays you`;
  if (viewerId !== null && t.fromId === viewerId) return `You pay ${nameOf(t.toId)}`;
  return `${nameOf(t.fromId)} pays ${nameOf(t.toId)}`;
}

/**
 * The desktop hero's sub-line: "Alvin and Angus pay you once debts are
 * simplified" (docs/06). Empty when the viewer is in no transfer. With Simplify
 * off the plan isn't simplified, so the closing words are dropped.
 */
export function planHeroLine(
  plan: SettlePlan,
  viewerId: string | null,
  nameOf: (id: string) => string,
  simplified: boolean
): string {
  if (viewerId === null) return "";
  const unique = (ids: string[]) => [...new Set(ids)].map(nameOf);
  const payers = unique(plan.involving.filter((t) => t.toId === viewerId).map((t) => t.fromId));
  const payees = unique(plan.involving.filter((t) => t.fromId === viewerId).map((t) => t.toId));
  const parts = [
    payers.length ? `${joinNames(payers)} ${payers.length === 1 ? "pays" : "pay"} you` : "",
    payees.length ? `You pay ${joinNames(payees)}` : ""
  ].filter(Boolean);
  if (parts.length === 0) return "";
  return parts.join(" · ") + (simplified ? " once debts are simplified" : "");
}

// ---------- everyone ----------

export type EveryoneRow = {
  memberId: string;
  paidCents: number;
  shareCents: number;
  sentCents: number;
  receivedCents: number;
  /** sent - received: what the payments column adds to the net. */
  paymentsCents: number;
  netCents: number;
  /** "back": gets back, "owes", "square": settled up. */
  netKind: "back" | "owes" | "square";
};

/**
 * One row per member, biggest net first, ties in ledger order (docs/05).
 * Archived members stay while their net isn't zero.
 */
export function everyoneRows(
  data: GroupData,
  archivedIds: ReadonlySet<string> = new Set()
): EveryoneRow[] {
  const totals = memberTotals(data);
  return data.memberOrder
    .filter((id) => !archivedIds.has(id) || (totals[id]?.net ?? 0) !== 0)
    .map((id): EveryoneRow => {
      const t = totals[id];
      return {
        memberId: id,
        paidCents: t.paid,
        shareCents: t.share,
        sentCents: t.sent,
        receivedCents: t.received,
        paymentsCents: t.sent - t.received,
        netCents: t.net,
        netKind: t.net > 0 ? "back" : t.net < 0 ? "owes" : "square"
      };
    })
    .sort((a, b) => b.netCents - a.netCents);
}

/** The net label: "gets back" / "owes" (viewer: "get back" / "owe"), or "settled up". */
export function netLabel(kind: EveryoneRow["netKind"], isViewer: boolean): string {
  if (kind === "square") return "settled up";
  if (kind === "back") return isViewer ? "get back" : "gets back";
  return isViewer ? "owe" : "owes";
}

/** The payments cell: "received X", "sent X" (either or both), or "none". */
export function paymentsCell(row: Pick<EveryoneRow, "sentCents" | "receivedCents">): {
  kind: "received" | "sent";
  cents: number;
}[] {
  const cells: { kind: "received" | "sent"; cents: number }[] = [];
  if (row.receivedCents > 0) cells.push({ kind: "received", cents: row.receivedCents });
  if (row.sentCents > 0) cells.push({ kind: "sent", cents: row.sentCents });
  return cells;
}

export type BreakdownLine = {
  expenseId: string;
  description: string;
  createdAt: string;
  cents: number;
};

export type MemberLines = {
  /** Expenses the member paid for, newest first. */
  paid: BreakdownLine[];
  /** Splits they hold, newest first. */
  share: BreakdownLine[];
  /** Distinct expenses across both lists ("Show 5 expenses"). */
  expenseCount: number;
};

/** The itemised lines behind one member's row, from the existing `getMemberBreakdown`. */
export function memberLines(data: GroupData, memberId: string): MemberLines {
  const b = getMemberBreakdown(memberId, data.expenses, data.splits, data.payments, {});
  const line = (r: { expenseId: string; description: string | null; createdAt: string; amountCents: number }): BreakdownLine => ({
    expenseId: r.expenseId,
    description: r.description?.trim() || "Untitled expense",
    createdAt: r.createdAt,
    cents: r.amountCents
  });
  const paid = b.paid.map(line);
  const share = b.owed.map(line);
  const ids = new Set([...paid, ...share].map((l) => l.expenseId));
  return { paid, share, expenseCount: ids.size };
}

/** "Show 5 expenses" (docs/06). */
export function showExpensesLabel(count: number, open: boolean): string {
  if (open) return "Hide expenses";
  return count === 1 ? "Show 1 expense" : `Show ${count} expenses`;
}

const SAME_YEAR = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
const OTHER_YEAR = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

/** "Sep 18", or "Sep 18, 2025" in another year (docs/05 "Formatting"). */
export function lineDate(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return (d.getFullYear() === now.getFullYear() ? SAME_YEAR : OTHER_YEAR).format(d);
}
