// The composer's split form as plain data (T14): what each mode's inputs hold,
// how that turns into cents, how a stored expense reopens, and how one mode's
// numbers carry over when the tab changes. No React, so it is unit tested.
//
// This file never divides money itself. Every cents figure comes from T03's
// `splitAmounts` (largest remainder for Percent and Shares, D6; ledger order
// for Equally, D5). Percent is held in whole hundredths of a percent (40% is
// 4000) so "sum is exactly 100" is an integer comparison, not a float one.

import { parseAmountCents } from "./composer.ts";
import { splitAmounts, splitByWeight, splitEqually, type SplitCents } from "./split.ts";

export type SplitMode = "equal" | "exact" | "percent" | "shares";
export const SPLIT_MODE_VALUES: readonly SplitMode[] = ["equal", "exact", "percent", "shares"];

/** The most one person can be given in the Shares stepper. A sanity cap, not a rule. */
export const MAX_SHARES = 999;
/** 100.00%, in hundredths. */
export const WHOLE_PERCENT = 10000;

/** What every mode's inputs hold. Text is kept as typed so "33." survives a keystroke. */
export type SplitForm = {
  mode: SplitMode;
  /** Equally: who is in. */
  included: string[];
  /** Exact: amount text per member. Missing or blank means 0. */
  exact: Record<string, string>;
  /** Percent: percentage text per member. */
  percent: Record<string, string>;
  /** Shares: whole shares per member. Missing means 0. */
  shares: Record<string, number>;
};

/** One saved split row (`splits`), as the form sends it to `saveExpense`. */
export type StoredSplit = { userId: string; amountCents: number; weight: number | null };

// ---------- typing ----------

/**
 * What an amount input keeps from what was typed or pasted: digits and one
 * decimal point, with no more decimals than the currency has. "CA$ 1,045.505"
 * becomes "1045.50". The rest is dropped as it is typed, so the field can never
 * hold something that isn't an amount.
 */
export function sanitizeDecimalInput(text: string, decimals: number): string {
  let out = "";
  let seenDot = false;
  let fraction = 0;
  for (const ch of text) {
    if (ch >= "0" && ch <= "9") {
      if (seenDot) {
        if (fraction >= decimals) continue;
        fraction++;
      }
      out += ch;
    } else if (ch === "." && !seenDot && decimals > 0) {
      seenDot = true;
      out += ch;
    }
  }
  return out;
}

/** Percentages take two decimals (33.33). */
export const sanitizePercentInput = (text: string) => sanitizeDecimalInput(text, 2);

/** Typed percentage to hundredths of a percent, or null when blank or unusable. "33.33" is 3333. */
export function parseHundredths(text: string): number | null {
  return parseAmountCents(text, 2);
}

/** 4000 is "40", 3333 is "33.33", 1250 is "12.5". */
export function formatPercent(hundredths: number): string {
  const whole = Math.trunc(hundredths / 100);
  const frac = Math.abs(hundredths % 100);
  if (frac === 0) return String(whole);
  const digits = String(frac).padStart(2, "0").replace(/0$/, "");
  return `${whole}.${digits}`;
}

/** Whole shares from typed text, clamped to 0 to MAX_SHARES. Blank is 0. */
export function parseShares(text: string): number {
  const n = Number(text.replace(/\D/g, ""));
  return Number.isFinite(n) ? Math.min(MAX_SHARES, n) : 0;
}

// ---------- reading the form ----------

/** Amount text to the minor units it means, or null for blank or unusable text. */
function centsOf(text: string | undefined, decimals: number): number | null {
  return text === undefined || text.trim() === "" ? null : parseAmountCents(text, decimals);
}

/** Exact: cents per member who has an amount above zero. */
export function exactCents(form: SplitForm, decimals: number): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [id, text] of Object.entries(form.exact)) {
    const cents = centsOf(text, decimals);
    if (cents !== null && cents > 0) out[id] = cents;
  }
  return out;
}

/** Percent: hundredths of a percent per member who has more than zero. */
export function percentHundredths(form: SplitForm): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [id, text] of Object.entries(form.percent)) {
    const h = centsOf(text, 2);
    if (h !== null && h > 0) out[id] = h;
  }
  return out;
}

/** Shares: whole shares per member who has at least one. */
export function positiveShares(form: SplitForm): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [id, n] of Object.entries(form.shares)) if (n > 0) out[id] = n;
  return out;
}

const sum = (values: Record<string, number>) => Object.values(values).reduce((a, b) => a + b, 0);

/** The single number each mode's validity turns on. */
export function splitTotals(form: SplitForm, decimals: number) {
  return {
    includedCount: form.included.length,
    exactSum: sum(exactCents(form, decimals)),
    percentSum: sum(percentHundredths(form)),
    shareTotal: sum(positiveShares(form))
  };
}

// A stand-in member for the part of 100% nobody has been given yet. It never
// leaves this file.
const UNASSIGNED = "\u0000unassigned";

/**
 * The cents each member would be charged, for display beside the inputs and
 * for the impact line. When the form is valid this is exactly what is saved.
 *
 * - Percent under 100: the shares are worked out against the whole 100%, so a
 *   40% row reads 40% of the total, and the unassigned part stays unassigned.
 * - Percent over 100: nothing sensible to show, so nothing is shown.
 */
export function formCents(
  totalCents: number,
  form: SplitForm,
  decimals: number,
  memberOrder: string[]
): SplitCents {
  switch (form.mode) {
    case "equal":
      return splitAmounts(totalCents, { mode: "equal", participants: form.included }, memberOrder);
    case "exact":
      return splitAmounts(totalCents, { mode: "exact", amounts: exactCents(form, decimals) }, memberOrder);
    case "shares":
      return splitAmounts(totalCents, { mode: "shares", weights: positiveShares(form) }, memberOrder);
    case "percent": {
      const h = percentHundredths(form);
      const total = sum(h);
      if (total > WHOLE_PERCENT) return {};
      const weights: Record<string, number> = {};
      for (const [id, v] of Object.entries(h)) weights[id] = v / 100;
      if (total < WHOLE_PERCENT) weights[UNASSIGNED] = (WHOLE_PERCENT - total) / 100;
      const cents = splitAmounts(totalCents, { mode: "percent", weights }, memberOrder);
      delete cents[UNASSIGNED];
      return cents;
    }
  }
}

/**
 * The rows `saveExpense` takes, for a valid form: one per member who owes
 * something, with `weight` set for Percent and Shares only. Cents come from
 * `formCents`, so they always add up to the total when the form is valid.
 */
export function formToSplits(
  totalCents: number,
  form: SplitForm,
  decimals: number,
  memberOrder: string[]
): StoredSplit[] {
  const cents = formCents(totalCents, form, decimals, memberOrder);
  const weights: Record<string, number> =
    form.mode === "percent"
      ? Object.fromEntries(Object.entries(percentHundredths(form)).map(([id, h]) => [id, h / 100]))
      : form.mode === "shares"
        ? positiveShares(form)
        : {};
  const weighted = form.mode === "percent" || form.mode === "shares";
  return Object.entries(cents)
    .filter(([id]) => (form.mode === "equal" ? form.included.includes(id) : true))
    .map(([userId, amountCents]) => ({
      userId,
      amountCents,
      weight: weighted ? (weights[userId] ?? 0) : null
    }));
}

// ---------- opening a form ----------

/** A new expense: Equally, everyone in, the other tabs not opened yet. */
export function emptyForm(everyoneIds: string[]): SplitForm {
  return { mode: "equal", included: [...everyoneIds], exact: {}, percent: {}, shares: {} };
}

export type StoredRow = { userId: string; amountCents: number; weight?: number | string | null };

/**
 * An existing expense, as the form it was entered with (D13). The stored mode
 * reopens with its stored numbers: Percent with the percentages typed, Shares
 * with the share counts, Exact with the amounts. A row from before split modes
 * were stored (mode null) opens in Exact, which always reproduces the saved
 * cents. A weighted mode with a missing weight can't be reopened as itself, so
 * it falls back to Exact too rather than invent numbers.
 *
 * `opened` is the mode that holds real numbers; the others start empty and are
 * filled from it if the person switches to them (see `seedForMode`).
 */
export function reopenSplit(
  splitMode: string | null | undefined,
  rows: StoredRow[],
  decimals: number
): SplitForm {
  const ids = rows.map((r) => r.userId);
  const weights = rows.map((r) => (r.weight === null || r.weight === undefined ? null : Number(r.weight)));
  const weightsUsable = weights.every((w) => w !== null && Number.isFinite(w) && (w as number) >= 0);

  let mode: SplitMode = "exact";
  if (splitMode === "equal") mode = "equal";
  else if ((splitMode === "percent" || splitMode === "shares") && weightsUsable) mode = splitMode;

  const form: SplitForm = { mode, included: ids, exact: {}, percent: {}, shares: {} };
  const scale = 10 ** decimals;
  rows.forEach((r, i) => {
    if (mode === "exact") form.exact[r.userId] = (r.amountCents / scale).toFixed(decimals);
    if (mode === "percent") form.percent[r.userId] = formatPercent(Math.round((weights[i] as number) * 100));
    if (mode === "shares") form.shares[r.userId] = Math.round(weights[i] as number);
  });
  return form;
}

// ---------- carrying numbers across tabs ----------

/** Who counts, and how much, in the mode being left (the weights to carry over). */
function departingWeights(form: SplitForm, decimals: number): Record<string, number> {
  switch (form.mode) {
    case "equal":
      return Object.fromEntries(form.included.map((id) => [id, 1]));
    case "exact":
      return exactCents(form, decimals);
    case "percent":
      return percentHundredths(form);
    case "shares":
      return positiveShares(form);
  }
}

/**
 * The starting numbers for a tab that hasn't been touched, taken from the tab
 * being left (docs/03: "Never silently drop input"). Equally to Exact fills each
 * included person's equal share; Exact to Percent converts to percentages; and
 * so on. A tab the person has typed in keeps its own numbers and is never
 * seeded again.
 *
 * Returns only the field for `target`; merge it into the form.
 */
export function seedForMode(
  target: Exclude<SplitMode, "equal">,
  form: SplitForm,
  opts: { totalCents: number | null; decimals: number; memberOrder: string[]; everyoneIds: string[] }
): Partial<Pick<SplitForm, "exact" | "percent" | "shares">> {
  const { totalCents, decimals, memberOrder, everyoneIds } = opts;
  const weights = departingWeights(form, decimals);
  const hasWeights = Object.keys(weights).length > 0;

  if (target === "shares") {
    // 1 each for whoever was in; nobody yet means everyone (D17: default 1).
    const ids = hasWeights ? Object.keys(weights) : everyoneIds;
    return { shares: Object.fromEntries(ids.map((id) => [id, 1])) };
  }

  if (target === "percent") {
    if (!hasWeights) return { percent: {} };
    // 10000 hundredths shared by the same largest-remainder rule as the money,
    // so the percentages add up to exactly 100.
    const h =
      form.mode === "equal"
        ? splitEqually(WHOLE_PERCENT, form.included, memberOrder)
        : splitByWeight(WHOLE_PERCENT, weights, memberOrder);
    return { percent: Object.fromEntries(Object.entries(h).map(([id, v]) => [id, formatPercent(v)])) };
  }

  // exact: the cents the tab being left works out to, when there's an amount.
  if (totalCents === null || totalCents <= 0) return { exact: {} };
  const cents = formCents(totalCents, form, decimals, memberOrder);
  const scale = 10 ** decimals;
  return {
    exact: Object.fromEntries(
      Object.entries(cents)
        .filter(([, c]) => c > 0)
        .map(([id, c]) => [id, (c / scale).toFixed(decimals)])
    )
  };
}

// ---------- the "Split across the blank rows" helper ----------

/** Rows with nothing typed in them. */
export function blankExactIds(form: SplitForm, ids: string[]): string[] {
  return ids.filter((id) => (form.exact[id] ?? "").trim() === "");
}

/**
 * Fill for the blank rows: `remainingCents` shared equally among them, extra
 * cents to the first in ledger order (the same rule as Equally, D5).
 */
export function blankRowFill(
  remainingCents: number,
  blankIds: string[],
  memberOrder: string[]
): SplitCents {
  if (remainingCents <= 0 || blankIds.length === 0) return {};
  return splitEqually(remainingCents, blankIds, memberOrder);
}

/** docs/06: "Split CA$20.00 across the 3 blank rows", or "Put CA$20.00 in the blank row" for one. */
export function blankRowsLabel(remainingFormatted: string, blankCount: number): string {
  return blankCount === 1
    ? `Put ${remainingFormatted} in the blank row`
    : `Split ${remainingFormatted} across the ${blankCount} blank rows`;
}

/** The form with only these members' numbers kept (others are not in the group any more). */
export function restrictForm(form: SplitForm, ids: string[]): SplitForm {
  const keep = new Set(ids);
  const pick = <T,>(r: Record<string, T>) => Object.fromEntries(Object.entries(r).filter(([id]) => keep.has(id)));
  return {
    mode: form.mode,
    included: form.included.filter((id) => keep.has(id)),
    exact: pick(form.exact),
    percent: pick(form.percent),
    shares: pick(form.shares)
  };
}

// ---------- noticing that a save has reached the screen ----------

/** What a save wrote, to tell when the refreshed rows show it. */
export type SaveSnapshot = {
  amountCents: number;
  payerId: string;
  description: string | null;
  splitMode: SplitMode;
  /** "YYYY-MM-DD" the expense is dated. */
  day: string;
  splits: StoredSplit[];
};

type ShownExpense = {
  amount_cents: number;
  payer_id: string;
  description: string | null;
  split_mode?: string | null;
  created_at: string;
};
type ShownSplit = { user_id: string; amount_cents: number; weight?: number | string | null };

/**
 * True once the rows on screen match what an edit saved. After `router.refresh()`
 * the old rows are still shown until the new ones arrive, and the panel must not
 * move before then (T12's refresh trap). Compares the money, the payer, the mode,
 * the weights and the day; the description only trimmed, as the server stores it.
 */
export function rowsShowSave(
  expense: ShownExpense | undefined,
  splits: ShownSplit[],
  saved: SaveSnapshot,
  dayOf: (iso: string) => string
): boolean {
  if (!expense) return false;
  if (expense.amount_cents !== saved.amountCents || expense.payer_id !== saved.payerId) return false;
  if ((expense.split_mode ?? null) !== saved.splitMode) return false;
  if ((expense.description ?? "").trim() !== (saved.description ?? "").trim()) return false;
  if (dayOf(expense.created_at) !== saved.day) return false;
  if (splits.length !== saved.splits.length) return false;
  const shown = new Map(splits.map((s) => [s.user_id, s]));
  return saved.splits.every((want) => {
    const row = shown.get(want.userId);
    if (!row || row.amount_cents !== want.amountCents) return false;
    const weight = row.weight === null || row.weight === undefined ? null : Number(row.weight);
    return weight === want.weight;
  });
}
