// Pure helpers for the payment panel (T15): reading the amount field, checking
// the form, and the date field. No React, no router.

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
export function parseAmountCents(input: string, decimals = 2): number | null {
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
  if (parseAmountCents(draft.amount, decimals) === null) return "Enter an amount greater than zero.";
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
export function createdAtFor(dateValue: string, original: string | null, now: Date = new Date()): string {
  const base = original ? new Date(original) : now;
  if (original && dateInputValue(base) === dateValue) return base.toISOString();
  const [y, m, d] = dateValue.split("-").map(Number);
  const out = new Date(base);
  out.setFullYear(y, m - 1, d);
  return out.toISOString();
}

/** "Matthew paid you", "You paid Alvin", "Alvin paid Angus" (docs/06 "Ledger"). */
export function paymentTitle(payer: { name: string; isViewer: boolean }, payee: { name: string; isViewer: boolean }): string {
  if (payee.isViewer) return `${payer.name} paid you`;
  if (payer.isViewer) return `You paid ${payee.name}`;
  return `${payer.name} paid ${payee.name}`;
}
