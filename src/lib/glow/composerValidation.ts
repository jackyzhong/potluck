// Per-mode validation for the composer (docs/04 "Validation per mode", wording
// from docs/06 "Composer"). Pure: it takes the one number each mode turns on
// and says whether Save is allowed, what the Save button reads when it isn't,
// and what the status strip shows. The strip's right-hand side is either the
// viewer's impact line (the component draws it) or a "CA$44.50 of CA$64.50".

import { formatPercent, WHOLE_PERCENT } from "./composerSplit.ts";

/** What each mode's validity turns on. */
export type SplitCheckInput =
  | { mode: "equal"; includedCount: number }
  | { mode: "exact"; sumCents: number }
  | { mode: "percent"; sumHundredths: number }
  | { mode: "shares"; totalShares: number };

export type StripDetail = { kind: "impact" } | { kind: "text"; text: string } | null;

export type SplitCheck = {
  /** False means Save is blocked. */
  canSave: boolean;
  /** The Save button's label while blocked (docs/04: "the blocked Save button states its reason"). Null when valid. */
  blockedLabel: string | null;
  /** The status strip, or null to hide it (no amount yet). */
  strip: { tone: "positive" | "warning"; message: string; detail: StripDetail } | null;
};

export type CheckArgs = {
  /** The typed amount in minor units, or null when it is blank or unusable. */
  amountCents: number | null;
  split: SplitCheckInput;
  /** "CA$20.00" for 2000. The component passes `formatMoney` for the expense's currency. */
  format: (cents: number) => string;
};

/**
 * - No amount (blank, zero or unusable): the strip is hidden and Save reads
 *   "Enter an amount", whatever the mode.
 * - Equally: valid with one or more people in. None: "Pick at least one person".
 * - Exact: valid when the entries add up to the amount to the cent.
 * - Percent: valid when the percentages add up to exactly 100.
 * - Shares: valid when the shares add up to at least 1.
 */
export function checkSplit({ amountCents, split, format }: CheckArgs): SplitCheck {
  if (amountCents === null || amountCents <= 0) {
    return { canSave: false, blockedLabel: "Enter an amount", strip: null };
  }
  const ok = (message: string): SplitCheck => ({
    canSave: true,
    blockedLabel: null,
    strip: { tone: "positive", message, detail: { kind: "impact" } }
  });

  switch (split.mode) {
    case "equal":
      if (split.includedCount < 1) {
        return {
          canSave: false,
          blockedLabel: "Pick at least one person",
          strip: { tone: "warning", message: "Pick at least one person", detail: null }
        };
      }
      return ok("Fully assigned");

    case "exact": {
      const diff = amountCents - split.sumCents;
      if (diff === 0) return ok("Fully assigned");
      const detail: StripDetail = { kind: "text", text: `${format(split.sumCents)} of ${format(amountCents)}` };
      return diff > 0
        ? {
            canSave: false,
            blockedLabel: `Assign ${format(diff)} more to save`,
            strip: { tone: "warning", message: `${format(diff)} left to assign`, detail }
          }
        : {
            canSave: false,
            blockedLabel: `Remove ${format(-diff)} to save`,
            strip: { tone: "warning", message: `${format(-diff)} too much`, detail }
          };
    }

    case "percent": {
      const diff = WHOLE_PERCENT - split.sumHundredths;
      if (diff === 0) return ok("100% assigned");
      const detail: StripDetail = { kind: "text", text: `${formatPercent(split.sumHundredths)}% of 100%` };
      return {
        canSave: false,
        blockedLabel: "Make it add up to 100%",
        strip: {
          tone: "warning",
          message: diff > 0 ? `${formatPercent(diff)}% left to assign` : `${formatPercent(-diff)}% too much`,
          detail
        }
      };
    }

    case "shares":
      if (split.totalShares < 1) {
        return {
          canSave: false,
          blockedLabel: "Add at least one share",
          strip: { tone: "warning", message: "Add at least one share", detail: null }
        };
      }
      return ok("Fully assigned");
  }
}
