"use client";

import { formatMoney } from "@/src/lib/glow/money";
import { Money } from "./Money";
import { useGlowData, useViewer } from "./ViewerProvider";

const card =
  "flex min-w-0 flex-[1_1_280px] flex-col justify-center gap-2.5 rounded-card bg-surface px-4 py-3.5 shadow-card sm:gap-3 sm:rounded-hero sm:p-5";

/**
 * "So far" (D10): what the group has spent, the viewer's share of it, and how
 * much of that they paid. The bar has two parts: the share the viewer covered,
 * then either what they fronted beyond it, or, when they paid less than their
 * share, the part of their share still to cover (hatched). Numbers come from
 * `useGlowData().forViewer.share`.
 */
export function ShareOfSpendCard() {
  const { status, viewerId } = useViewer();
  const { currency, forViewer } = useGlowData();

  if (status === "loading" || !viewerId || !forViewer) {
    return (
      <section aria-label="Spending so far" aria-busy={status === "loading"} className={card}>
        <h2 className="m-0 text-[length:var(--text-card-title)] font-extrabold">So far</h2>
        <div className="h-2.5 rounded-[5px] bg-bar-track sm:h-3 sm:rounded-md" />
        {status === "loading" ? null : (
          <span className="text-[length:var(--text-meta)] text-text-muted">
            Choose who&apos;s viewing to see your share.
          </span>
        )}
      </section>
    );
  }

  const { groupSpentCents, yourShareCents, youPaidCents, bar } = forViewer.share;
  const stillToCover = yourShareCents > youPaidCents;
  const label = `You paid ${formatMoney(youPaidCents, { currency })} of the group's ${formatMoney(groupSpentCents, { currency })}; your share is ${formatMoney(yourShareCents, { currency })}${
    stillToCover ? `, and ${formatMoney(yourShareCents - youPaidCents, { currency })} of it is still to cover` : ""
  }`;

  return (
    <section aria-labelledby="share-title" className={card}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 sm:flex-col sm:items-start sm:justify-start sm:gap-0.5">
        <h2 id="share-title" className="m-0 text-[length:var(--text-card-title)] font-extrabold">
          So far
        </h2>
        <span className="text-[length:var(--text-meta)] tabular-nums text-text-muted">
          Group spent <Money cents={groupSpentCents} currency={currency} />
        </span>
      </div>
      <div
        role="img"
        aria-label={label}
        className="flex h-2.5 overflow-hidden rounded-[5px] bg-bar-track sm:h-3 sm:rounded-md"
      >
        <div className="bg-bar-share" style={{ width: `${bar.sharePct}%` }} />
        <div className="bg-bar-extra" style={{ width: `${bar.extraPct}%` }} />
        <div
          style={{
            width: `${bar.shortfallPct}%`,
            backgroundImage:
              "repeating-linear-gradient(135deg, var(--bar-share) 0 2px, transparent 2px 5px)"
          }}
        />
      </div>
      <div className="flex flex-wrap justify-between gap-x-3 gap-y-1 text-[length:var(--text-meta)] font-medium tabular-nums">
        <span>
          Your share <Money cents={yourShareCents} currency={currency} />
        </span>
        <span className={stillToCover ? "text-text-secondary" : "text-positive"}>
          You paid <Money cents={youPaidCents} currency={currency} />
        </span>
      </div>
    </section>
  );
}
