// Pure helpers for the payment panel (T15, T31): amount parsing, validation,
// timestamps, title wording, live balance impact, and pairwise remaining balance.

import type { PairBalance } from "./ledger.ts";

/** Digits after the point for a currency. CAD, USD and EUR are 2; JPY would be 0. */
export function currencyDecimals(code: string): number {
  const digits = new Intl.NumberFormat("en-US", { style: "currency", currency: code }).resolvedOptions()
    .maximumFractionDigits;
  return digits ?? 2;
}

/**
 * What was typed in the amount field, as integer cents. Null when it isn't a
 * positive amount: empty, negative, letters, or more decimals than the currency has.
 * "1,250.5" and "12." are fine; the minus sign never is.
 */
export function parsePaymentAmountCents(input: string, decimals = 2): number | null {
  const text = input.trim().replace(/,/g, "");
  if (!/^\d*\.?\d*$/.test(text) || text === "" || text === ".") return null;
  const [whole, frac = ""] = text.split(".");
  if (frac.length > decimals) return null;
  const cents = Number(whole || "0") * 10 ** decimals + Number(frac.padEnd(decimals, "0") || "0");
  return Number.isSafeInteger(cents) && cents > 0 ? cents : null;
}

/** Integer cents to the text an input shows: 1250 to "12.50". */
export function centsToInput(cents: number, decimals = 2): string {
  return (cents / 10 ** decimals).toFixed(decimals);
}

export type PaymentDraft = { payerId: string; payeeId: string; amount: string };

/** The first thing wrong with the form, in docs/06's voice, or null when it can be saved. */
export function paymentProblem(draft: PaymentDraft, decimals = 2): string | null {
  if (!draft.payerId || !draft.payeeId) return "Choose who paid and who received it.";
  if (draft.payerId === draft.payeeId) return "Pick two different people.";
  if (parsePaymentAmountCents(draft.amount, decimals) === null) return "Enter an amount greater than zero.";
  return null;
}

/** `YYYY-MM-DD` of a timestamp in the viewer's own time zone, for `<input type="date">`. */
export function dateInputValue(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * The timestamp to save for the date field. Untouched keeps the original
 * moment (an edit must not shift the time of day); a changed date keeps the
 * original time of day on the new day, and "today" on a new payment is now.
 */
export function paymentCreatedAt(dateValue: string, original: string | null, now: Date = new Date()): string {
  const base = original ? new Date(original) : now;
  if (original && dateInputValue(base) === dateValue) return base.toISOString();
  const [y, m, d] = dateValue.split("-").map(Number);
  const out = new Date(base);
  out.setFullYear(y, m - 1, d);
  return out.toISOString();
}

/** "Theo paid you", "You paid Lena", "Lena paid Marco" (docs/06 "Ledger"). */
export function paymentTitle(payer: { name: string; isViewer: boolean }, payee: { name: string; isViewer: boolean }): string {
  if (payee.isViewer) return `${payer.name} paid you`;
  if (payer.isViewer) return `You paid ${payee.name}`;
  return `${payer.name} paid ${payee.name}`;
}

export type PaymentImpactSummary =
  | { kind: "paid"; cents: number }
  | { kind: "received"; cents: number }
  | { kind: "third_party"; cents: number };

/** Viewer balance effect of a draft payment (Board 33 / 36). */
export function paymentImpact(input: {
  payerId: string;
  payeeId: string;
  amountCents: number | null;
  viewerId: string | null;
}): PaymentImpactSummary | null {
  const { payerId, payeeId, amountCents, viewerId } = input;
  if (!viewerId || !payerId || !payeeId || payerId === payeeId || amountCents === null || amountCents <= 0) {
    return null;
  }
  if (payerId === viewerId) return { kind: "paid", cents: amountCents };
  if (payeeId === viewerId) return { kind: "received", cents: amountCents };
  return { kind: "third_party", cents: amountCents };
}

/** Remaining net balance between viewer and `counterpartyId` (+ = they owe viewer). */
export function paymentPairRemaining(pairs: readonly PairBalance[], counterpartyId: string): number {
  return pairs.find((p) => p.memberId === counterpartyId)?.cents ?? 0;
}
