"use client";

import type { CSSProperties } from "react";
import { heroCopy, heroScale } from "@/src/lib/glow/hero";
import { formatMoney } from "@/src/lib/glow/money";
import { Money } from "./Money";
import { StatTiles } from "./StatTiles";
import { useGlowData, useViewer } from "./ViewerProvider";

export type BalancesHeroProps = {
  /** The desktop sub-line from the plan: "Alvin and Angus pay you once debts are simplified". */
  planLine: string;
};

// Same card as the Activity hero, with the tiles on the right (docs/01 "Balances").
const shell =
  "min-w-0 rounded-hero [background:var(--gradient-glow-compact)] px-4 pb-4 pt-5 text-on-glow shadow-glow sm:[background:var(--gradient-glow)] sm:p-5";
const inner = "flex flex-col gap-3.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-6 sm:gap-y-4";

/**
 * The Balances hero: the viewer's net and the three tiles that add up to it.
 * Until the viewer is known it says nothing about "you".
 */
export function BalancesHero({ planLine }: BalancesHeroProps) {
  const { status, viewerId } = useViewer();
  const { currency, totals } = useGlowData();

  if (status === "loading") {
    return (
      <section aria-busy="true" aria-label="Your balance" className={shell}>
        <div className="flex min-h-[110px] flex-col gap-2 px-1 sm:px-0">
          <span className="h-4 w-24 rounded-md bg-on-glow-tile" />
          <span className="h-12 w-52 max-w-full rounded-lg bg-on-glow-tile" />
        </div>
      </section>
    );
  }

  const mine = viewerId ? totals[viewerId] : undefined;
  if (!viewerId || !mine) {
    return (
      <section aria-label="Your balance" className={shell}>
        <div className="flex min-h-[110px] flex-col justify-center gap-0.5 px-1 sm:px-0">
          <span className="text-[length:var(--text-body)] font-semibold">Choose who&apos;s viewing</span>
          <span className="text-[length:var(--text-meta)]">Pick a person to see who owes whom.</span>
        </div>
      </section>
    );
  }

  const copy = heroCopy({ netCents: mine.net, owesYou: [], youOwe: [], everyoneElse: 0 });
  const scale = heroScale(formatMoney(Math.abs(mine.net), { currency }));

  return (
    <section aria-labelledby="balances-hero-label" className={shell}>
      <div className={inner}>
        <div className="flex min-w-0 flex-col gap-0.5 px-1 sm:flex-[1_1_280px] sm:px-0">
          <span id="balances-hero-label" className="text-[length:var(--text-body)] font-semibold">
            {copy.label}
          </span>
          {copy.showAmount ? (
            <span
              style={{ "--hs": scale } as CSSProperties}
              className="block text-[length:calc(var(--text-hero-phone)*var(--hs))] font-extrabold leading-[1.05] tracking-[var(--tracking-hero)] tabular-nums sm:text-[length:calc(var(--text-hero)*var(--hs))]"
            >
              <Money cents={Math.abs(mine.net)} currency={currency} />
            </span>
          ) : null}
          {planLine ? (
            <span className="text-[length:var(--text-meta)] max-sm:hidden">{planLine}</span>
          ) : null}
        </div>
        <div className="min-w-0 sm:flex-[2_1_420px]">
          <StatTiles totals={mine} currency={currency} />
        </div>
      </div>
    </section>
  );
}
