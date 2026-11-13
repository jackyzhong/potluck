// Formatting for the Glow <Money> component (docs/05 "Formatting").
//
// Money is integer cents everywhere; this is the one place it becomes text.
// Pure, so it is unit tested without rendering anything.

/** U+2212 MINUS SIGN. A hyphen-minus ("-") is the wrong glyph for amounts: it is
 *  narrower than "+" and doesn't line up in a column of tabular numerals. */
export const MINUS = "−";

export type MoneyFormatOptions = {
  /** ISO code. Defaults to CAD, the app's default currency. */
  currency?: string;
  /** Put "+" before positive amounts. Negative amounts always get the minus sign. */
  signed?: boolean;
  /** No currency symbol, two decimals, always signed: "+28.79" (hero chips). */
  compact?: boolean;
};

export type MoneyTone = "positive" | "negative" | "neutral" | "auto";

// One formatter per (currency, style) pair; Intl.NumberFormat is slow to build.
const formatters = new Map<string, Intl.NumberFormat>();

function formatter(currency: string, compact: boolean): Intl.NumberFormat {
  const key = `${currency}|${compact ? "c" : "f"}`;
  let f = formatters.get(key);
  if (!f) {
    // en-US prints CAD as "CA$1,175.90", which keeps currencies unambiguous when
    // they are mixed. en-CA would print "$1,175.90".
    f = compact
      ? new Intl.NumberFormat("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        })
      : new Intl.NumberFormat("en-US", { style: "currency", currency });
    formatters.set(key, f);
  }
  return f;
}

/** How many minor units make one major unit: 100 for CAD, 1 for JPY. */
function minorUnitScale(currency: string): number {
  const digits = formatter(currency, false).resolvedOptions().maximumFractionDigits ?? 2;
  return 10 ** digits;
}

/**
 * Integer cents to display text.
 *
 *   formatMoney(117590)                      "CA$1,175.90"
 *   formatMoney(-1250)                       "−CA$12.50"
 *   formatMoney(9145, { signed: true })      "+CA$91.45"
 *   formatMoney(2879, { compact: true })     "+28.79"
 *   formatMoney(-1638, { compact: true })    "−16.38"
 *
 * Zero never carries a sign. Throws a RangeError for anything that isn't an
 * integer: a fractional amount means a calculation upstream went wrong, and
 * hiding it by rounding would put the group's totals out of step.
 */
export function formatMoney(cents: number, options: MoneyFormatOptions = {}): string {
  if (!Number.isSafeInteger(cents)) {
    throw new RangeError(`Money must be a whole number of cents, got ${cents}`);
  }
  const { currency = "CAD", signed = false, compact = false } = options;

  const body = formatter(currency, compact).format(Math.abs(cents) / minorUnitScale(currency));
  if (cents < 0) return MINUS + body;
  if (cents > 0 && (signed || compact)) return "+" + body;
  return body;
}

/** The colour role for an amount. `auto` follows the sign: owed to you, you owe, nothing. */
export function moneyTone(cents: number, tone: MoneyTone): "positive" | "negative" | "neutral" {
  if (tone !== "auto") return tone;
  return cents > 0 ? "positive" : cents < 0 ? "negative" : "neutral";
}
