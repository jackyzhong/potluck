// src/app/ledger/[id]/GroupFrame.tsx
"use client";

// The Glow page frame: header, tabs, the slots below, the phone action bar and
// the shortcut footer. It owns the open/closed state of the three old modals
// (Add expense, Add payment, Manage members) until T13 and T15 replace the first
// two.
//
// SLOTS. The server page fills these props; each later task fills one and
// touches nothing else here.
//
//   summary   T08  hero + share-of-spend card. Wrapped in a flex-wrap row with a
//                  16px gap, so give the hero `flex: 3 1 560px` and the share
//                  card `flex: 1 1 280px` (board 03).
//   toolbar   T10  search + filter chips. Hidden on a phone (D20).
//   ledger    T09  the ledger table / list. Wrapper is `flex: 999 1 560px`.
//   panel     T11  the right panel. Wrapper is `flex: 1 1 300px`; T11 decides what
//                  shows at each width (inline, drawer, sheet). Leave it out and the
//                  ledger takes the full width.
//   balances  T16  the whole Balances tab.
//
// `summary`, `toolbar`, `ledger` and `panel` show on the Activity tab,
// `balances` on the Balances tab. The page passes only the tab it rendered.

import { useState, type ReactNode } from "react";
import { GroupHeader } from "@/src/components/glow/GroupHeader";
import { useFilters } from "@/src/components/glow/FilterProvider";
import { PhoneActionBar } from "@/src/components/glow/PhoneActionBar";
import { ShortcutFooter } from "@/src/components/glow/ShortcutFooter";
import { usePanelNav } from "@/src/components/glow/usePanel";
import { useOpenPayment } from "@/src/components/glow/paymentPrefill";
import { useShortcuts } from "@/src/components/glow/useShortcuts";
import { useViewer } from "@/src/components/glow/ViewerProvider";

type User = {
  id: string;
  name: string;
  is_placeholder: boolean;
  archived_at?: string | null;
};

export type GroupFrameProps = {
  ledgerId: string;
  title: string;
  emoji: string;
  baseCurrency: string;
  users: User[];
  /** The tab the server rendered (from ?tab=). */
  tab: "activity" | "balances";
  summary?: ReactNode;
  toolbar?: ReactNode;
  ledger?: ReactNode;
  panel?: ReactNode;
  balances?: ReactNode;
};

export default function GroupFrame({
  ledgerId,
  title,
  emoji,
  tab,
  summary,
  toolbar,
  ledger,
  panel,
  balances
}: GroupFrameProps) {
  const [viewerOpen, setViewerOpen] = useState(false);
  const { promptOpen, dismissPrompt } = useViewer();
  const effectiveViewerOpen = viewerOpen || promptOpen;
  const handleViewerOpenChange = (next: boolean) => {
    if (!next && promptOpen) dismissPrompt();
    setViewerOpen(next);
  };
  // Add expense and Manage members open the right panel, not old modals.
  const { openAdd, openMembers } = usePanelNav();
  const openPayment = useOpenPayment(); // Add payment and P open the right panel (T15)
  const { filter } = useFilters();
  const filteringPhone =
    filter.query.trim() !== "" || filter.kind !== "all" || filter.personId !== null;
  useShortcuts({ tab, viewerMenuOpen: effectiveViewerOpen, setViewerMenuOpen: handleViewerOpenChange }); // T17

  return (
    <div className="flex min-h-dvh flex-col bg-bg pb-[calc(88px+env(safe-area-inset-bottom))] text-text sm:pb-0">
      <GroupHeader
        ledgerId={ledgerId}
        title={title}
        emoji={emoji}
        onAddPayment={() => openPayment()}
        onAddExpense={openAdd}
        viewerMenu={{
          open: effectiveViewerOpen,
          onOpenChange: handleViewerOpenChange,
          promptMode: promptOpen && !viewerOpen,
          onManageMembers: openMembers
        }}
      />

      {tab === "balances" ? (
        <main className="px-4 pb-4 pt-1 sm:px-6">
          <div role="tabpanel" aria-label="Balances">
            {balances}
          </div>
        </main>
      ) : (
        <main>
          <div role="tabpanel" aria-label="Activity" className="flex flex-col">
          {summary ? (
            <div
              data-slot="summary"
              className={`flex flex-wrap gap-4 px-4 pt-1 sm:px-6 ${filteringPhone ? "max-sm:hidden" : ""}`}
            >
              {summary}
            </div>
          ) : null}
          {toolbar ? (
            <div
              data-slot="toolbar"
              className="flex flex-col gap-2 pt-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3 sm:px-6 sm:pb-3 sm:pt-4"
            >
              {toolbar}
            </div>
          ) : null}
          <div
            data-slot="content"
            className={`flex flex-wrap items-start gap-4 px-4 pb-4 sm:px-6 ${
              filteringPhone ? "pt-2 sm:pt-4" : summary || toolbar ? "pt-4" : "pt-1"
            }`}
          >
            <div data-slot="ledger" className="min-w-0 flex-[999_1_560px]">
              {ledger}
            </div>
            {panel ? (
              <div data-slot="panel" className="min-w-0 flex-[1_1_300px]">
                {panel}
              </div>
            ) : null}
          </div>
          </div>
        </main>
      )}

      <div className="mt-auto">
        <ShortcutFooter tab={tab} />
      </div>

      <PhoneActionBar
        hidden={effectiveViewerOpen}
        onAddPayment={() => openPayment()}
        onAddExpense={openAdd}
      />
    </div>
  );
}
