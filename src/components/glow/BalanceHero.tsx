"use client";

import { heroCopy, heroScale } from "@/src/lib/glow/hero";
import { formatMoney } from "@/src/lib/glow/money";
import { Money } from "./Money";
import { PersonChips } from "./PersonChips";
import { useGlowData, useViewer } from "./ViewerProvider";

export type BalanceHeroProps = {
  /** Called with a member's id when their chip is pressed. T10 wires this to the "with {name}" filter; until then it does nothing. */
  onSelectPerson?: (memberId: string) => void;
  /** The member the ledger is filtered to, if any (T10). */
  selectedPersonId?: string | null;
};

// The gradient card, sized as the first item of the Activity summary row
// (docs/01 "Summary row": flex 3 1 560px).
const shell =
  "min-w-0 flex-[3_1_560px] rounded-hero [background:var(--gradient-glow-compact)] px-4 pb-3.5 pt-5 text-on-glow shadow-glow sm:[background:var(--gradient-glow)] sm:p-5";
const inner = "flex flex-wrap items-center gap-x-6 gap-y-4";

/**
 * The Activity hero: how the group stands with the viewer, and who owes whom.
 * Every number comes from `useGlowData().forViewer`; nothing is recomputed here.
 *
 * Until the viewer is known (the saved choice isn't read yet, or nobody has been
 * picked) it says nothing about "you".
 */
export function BalanceHero({ onSelectPerson, selectedPersonId }: BalanceHeroProps) {
  const { status, viewerId, members } = useViewer();
  const { currency, totals, forViewer } = useGlowData();

  if (status === "loading") {
    return (
      <section aria-busy="true" aria-label="Group balance" className={shell}>
        <div className={inner}>
          <div className="flex min-h-[110px] flex-[1_1_240px] flex-col gap-2 px-1 sm:px-0">
            <span className="h-4 w-24 rounded-md bg-on-glow-tile" />
            <span className="h-12 w-52 max-w-full rounded-lg bg-on-glow-tile" />
          </div>
        </div>
      </section>
    );
  }

  if (!viewerId || !forViewer) {
    return (
      <section aria-label="Group balance" className={shell}>
        <div className={inner}>
          <div className="flex min-h-[110px] flex-[1_1_240px] flex-col justify-center gap-0.5 px-1 sm:px-0">
            <span className="text-[length:var(--text-body)] font-semibold">Choose who&apos;s viewing</span>
            <span className="text-[length:var(--text-meta)]">
              Pick a person to see who owes whom.
            </span>
          </div>
        </div>
      </section>
    );
  }

  const netCents = totals[viewerId]?.net ?? 0;
  const nameOf = new Map(members.map((m) => [m.id, m.name]));
  const names = (ids: string[]) => ids.map((id) => nameOf.get(id) ?? "");
  const chipIds = new Set(forViewer.chips.map((c) => c.memberId));
  // "Everyone else": the other members, except archived ones the viewer is square with.
  const everyoneElse = members.filter(
    (m) => m.id !== viewerId && (!m.archived_at || chipIds.has(m.id))
  ).length;

  const copy = heroCopy({
    netCents,
    owesYou: names(forViewer.counts.owesYou),
    youOwe: names(forViewer.counts.youOwe),
    everyoneElse
  });

  // Large amounts shrink so they stay on one line (docs/07: past 9 characters).
  const scale = heroScale(formatMoney(Math.abs(netCents), { currency }));

  return (
    <section aria-labelledby="hero-label" className={shell}>
      <div className={inner}>
        <div className="flex min-w-0 flex-[1_1_240px] flex-col gap-0.5 px-1 sm:px-0">
          <span id="hero-label" className="text-[length:var(--text-body)] font-semibold">
            {copy.label}
          </span>
          {copy.showAmount ? (
            <span
              style={{ "--hs": scale } as React.CSSProperties}
              className="block text-[length:calc(var(--text-hero-phone)*var(--hs))] font-extrabold leading-[1.05] tracking-[var(--tracking-hero)] tabular-nums sm:text-[length:calc(var(--text-hero)*var(--hs))]"
            >
              <Money cents={Math.abs(netCents)} currency={currency} />
            </span>
          ) : null}
          {copy.subline ? (
            <span className="text-[length:var(--text-meta)]">{copy.subline}</span>
          ) : null}
        </div>
        {forViewer.chips.length > 0 ? (
          <div className="min-w-0 flex-[2_1_360px]">
            <PersonChips
              chips={forViewer.chips}
              members={members}
              currency={currency}
              onSelect={onSelectPerson}
              selectedId={selectedPersonId}
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}
