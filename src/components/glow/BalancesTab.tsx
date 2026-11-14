"use client";

// The whole Balances tab: the hero with its tiles, the settle-up plan and the
// breakdown of everyone. Fill GroupFrame's `balances` slot with this.
//
// The tab also mounts the right panel. Mark paid opens the Add payment panel,
// and an itemised expense opens its details, so the panel has to exist here as
// it does on Activity. It takes no room while it is closed.

import { useCallback, useMemo } from "react";
import { planHeroLine, settlePlan } from "@/src/lib/glow/balances";
import { BalancesHero } from "./BalancesHero";
import { EveryoneBreakdown } from "./EveryoneBreakdown";
import { RightPanel } from "./RightPanel";
import { SettleUpPlan } from "./SettleUpPlan";
import { useRegisterSimplifyToggle } from "./simplifyShortcut";
import { useSimplifyDebts } from "./useSimplifyDebts";
import { usePanelState } from "./usePanel";
import { useGlowData, useViewer } from "./ViewerProvider";

export type BalancesTabProps = {
  ledgerId: string;
  /** `ledgers.simplify_debts` as the server read it. */
  simplified: boolean;
};

export function BalancesTab({ ledgerId, simplified: savedSimplified }: BalancesTabProps) {
  const { viewerId, members } = useViewer();
  const { data } = useGlowData();
  const { simplified, saving, error, set } = useSimplifyDebts(ledgerId, savedSimplified);

  // The D key (T17). Like a click on the switch, it does nothing while a save is in flight.
  const toggleSimplify = useCallback(() => {
    if (!saving) set(!simplified);
  }, [saving, set, simplified]);
  useRegisterSimplifyToggle(toggleSimplify);

  const plan = useMemo(() => settlePlan(data, simplified, viewerId), [data, simplified, viewerId]);
  const nameOf = (id: string) => members.find((m) => m.id === id)?.name ?? "Someone";
  const planLine = planHeroLine(plan, viewerId, nameOf, simplified);

  return (
    <div className="flex flex-wrap items-start gap-4">
      <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-4 max-sm:mt-3">
        <BalancesHero planLine={planLine} />
        <div className="flex flex-wrap items-start gap-4">
          <SettleUpPlan
            plan={plan}
            simplified={simplified}
            onSimplifiedChange={set}
            saving={saving}
            error={error}
          />
          <EveryoneBreakdown />
        </div>
      </div>
      <BalancesPanel />
    </div>
  );
}

/** The panel's slot: out of the layout while closed, so the cards keep the full width. */
function BalancesPanel() {
  const { state } = usePanelState();
  return (
    <div
      data-slot="panel"
      className={state.kind === "empty" ? "hidden" : "min-w-0 flex-[1_1_300px]"}
    >
      <RightPanel />
    </div>
  );
}
