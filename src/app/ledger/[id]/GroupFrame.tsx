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
import { PhoneActionBar } from "@/src/components/glow/PhoneActionBar";
import { ShortcutFooter } from "@/src/components/glow/ShortcutFooter";
import ExpenseModal from "./ExpenseModal";
import PaymentModal from "./PaymentModal";
import UserManagementModal from "./UserManagementModal";

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

type Modal = "expense" | "payment" | "members" | null;

export default function GroupFrame({
  ledgerId,
  title,
  emoji,
  baseCurrency,
  users,
  tab,
  summary,
  toolbar,
  ledger,
  panel,
  balances
}: GroupFrameProps) {
  const [modal, setModal] = useState<Modal>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const close = () => setModal(null);

  return (
    <div className="flex min-h-dvh flex-col bg-bg pb-[calc(88px+env(safe-area-inset-bottom))] text-text sm:pb-0">
      <GroupHeader
        ledgerId={ledgerId}
        title={title}
        emoji={emoji}
        onAddPayment={() => setModal("payment")}
        onAddExpense={() => setModal("expense")}
        viewerMenu={{
          open: viewerOpen,
          onOpenChange: setViewerOpen,
          onManageMembers: () => setModal("members")
        }}
      />

      {tab === "balances" ? (
        <main className="px-4 pb-4 pt-1 sm:px-6">{balances}</main>
      ) : (
        <main className="flex flex-col">
          {summary ? (
            <div data-slot="summary" className="flex flex-wrap gap-4 px-4 pt-1 sm:px-6">
              {summary}
            </div>
          ) : null}
          {toolbar ? (
            <div
              data-slot="toolbar"
              className="flex flex-wrap items-center gap-3 px-6 pb-3 pt-4 max-sm:hidden"
            >
              {toolbar}
            </div>
          ) : null}
          <div
            data-slot="content"
            className={`flex flex-wrap items-start gap-4 px-4 pb-4 sm:px-6 ${summary || toolbar ? "pt-4" : "pt-1"}`}
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
        </main>
      )}

      <div className="mt-auto">
        <ShortcutFooter tab={tab} />
      </div>

      <PhoneActionBar
        hidden={viewerOpen || modal !== null}
        onAddPayment={() => setModal("payment")}
        onAddExpense={() => setModal("expense")}
      />

      {/* The old modals, until T13 (expense) and T15 (payment) replace them. */}
      <UserManagementModal
        isOpen={modal === "members"}
        onClose={close}
        ledgerId={ledgerId}
        users={users}
      />
      <ExpenseModal
        isOpen={modal === "expense"}
        onClose={close}
        ledgerId={ledgerId}
        users={users}
        baseCurrency={baseCurrency}
      />
      {modal === "payment" && (
        <PaymentModal
          onClose={close}
          ledgerId={ledgerId}
          users={users}
          baseCurrency={baseCurrency}
        />
      )}
    </div>
  );
}
