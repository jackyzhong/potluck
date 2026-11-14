import { statTiles } from "@/src/lib/glow/balances";
import type { MemberTotals } from "@/src/lib/glow/ledger";
import { Money } from "./Money";

export type StatTilesProps = {
  /** The viewer's paid / share / sent / received / net (`useGlowData().totals[viewerId]`). */
  totals: MemberTotals;
  currency: string;
};

const tile =
  "flex min-w-0 flex-col gap-0.5 rounded-tile bg-on-glow-tile p-2.5 sm:rounded-chip sm:px-4 sm:py-3.5";
const label = "text-[length:var(--text-small)] sm:text-[length:var(--text-meta)]";
const value =
  "text-[length:15px] font-bold tabular-nums sm:text-[length:22px] sm:font-extrabold";

/**
 * Three tiles on the gradient: You paid, Your share (negative), Paid back
 * (negative), which add up to the hero amount. If the viewer has sent more than
 * they received, the third tile reads "You've paid back" with a positive amount,
 * so the sum still holds (docs/05 "Net balance").
 */
export function StatTiles({ totals, currency }: StatTilesProps) {
  const t = statTiles(totals);
  return (
    <dl className="m-0 grid grid-cols-3 gap-1.5 sm:grid-cols-[repeat(auto-fit,minmax(min(130px,100%),1fr))] sm:gap-2">
      <div className={tile}>
        <dt className={label}>You paid</dt>
        <dd className={`m-0 ${value}`}>
          <Money cents={t.paidCents} currency={currency} />
        </dd>
      </div>
      <div className={tile}>
        <dt className={label}>Your share</dt>
        <dd className={`m-0 ${value}`}>
          <Money cents={t.shareCents} currency={currency} />
        </dd>
      </div>
      <div className={tile}>
        <dt className={label}>
          {t.paymentsKind === "youPaidBack" ? (
            "You've paid back"
          ) : (
            <>
              <span className="sm:hidden">Paid back</span>
              <span className="max-sm:hidden">Already paid back to you</span>
            </>
          )}
        </dt>
        <dd className={`m-0 ${value}`}>
          <Money cents={t.paymentsCents} currency={currency} signed={t.paymentsKind === "youPaidBack"} />
        </dd>
      </div>
    </dl>
  );
}
