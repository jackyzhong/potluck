// src/app/ledger/[id]/page.tsx
import { db } from "@/src/lib/server/supabase";
import { isUuid } from "@/src/lib/validation";
import { notFound } from "next/navigation";
import type { Split } from "@/src/lib/types";
import GroupFrame from "./GroupFrame";
import { ViewerProvider } from "@/src/components/glow/ViewerProvider";
import { LedgerList } from "@/src/components/glow/LedgerList";
import { LedgerTable } from "@/src/components/glow/LedgerTable";
import { FilteredHero } from "@/src/components/glow/FilteredHero";
import { FilterProvider } from "@/src/components/glow/FilterProvider";
import { ActivityToolbar } from "@/src/components/glow/ActivityToolbar";
import { ShareOfSpendCard } from "@/src/components/glow/ShareOfSpendCard";
import { RightPanel } from "@/src/components/glow/RightPanel";
import { BalancesTab } from "@/src/components/glow/BalancesTab";
import { ToastProvider } from "@/src/components/glow/ToastProvider";

export default async function LedgerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Anything that is not a UUID cannot be a ledger; don't send it to the database.
  if (!isUuid(id)) {
    return notFound();
  }

  // One round trip for the ledger and its rows, then one for the splits, which
  // need the expense ids. Sequential awaits made every page load pay for five.
  const [
    { data: ledger, error: ledgerError },
    { data: users },
    { data: expenses },
    { data: payments },
  ] = await Promise.all([
    db.from("ledgers").select("*").eq("id", id).single(),
    db.from("users").select("*").eq("ledger_id", id).order("created_at", { ascending: true }),
    db.from("expenses").select("*").eq("ledger_id", id).order("created_at", { ascending: false }),
    // Payments are settlements between members.
    db.from("payments").select("*").eq("ledger_id", id).order("created_at", { ascending: false }),
  ]);

  if (ledgerError || !ledger) {
    return notFound();
  }

  const initialUsers = users || [];
  const ledgerExpenses = expenses || [];
  const ledgerPayments = payments || [];

  let allSplits: Split[] = [];
  if (ledgerExpenses.length > 0) {
    const expenseIds = ledgerExpenses.map(e => e.id);
    const { data: splits } = await db
      .from("splits")
      .select("*")
      .in("expense_id", expenseIds);
    if (splits) {
      allSplits = splits;
    }
  }

  const baseCurrency = ledger.base_currency || "CAD";

  return (
    <ViewerProvider
      ledgerId={ledger.id}
      currency={baseCurrency}
      users={initialUsers}
      expenses={ledgerExpenses}
      splits={allSplits}
      payments={ledgerPayments}
    >
      {/* T07 built the frame. Each slot below is filled by a later task; until
          then it holds today's content, narrowed so it stays readable. */}
      <ToastProvider>
      <FilterProvider>
      <GroupFrame
        ledgerId={ledger.id}
        title={ledger.title}
        emoji={ledger.emoji || "🍲"}
        baseCurrency={baseCurrency}
        users={initialUsers}
        // toolbar: T10 · panel: T11 · summary: T08 · ledger: T09
        summary={
          <>
            <FilteredHero />
            <ShareOfSpendCard />
          </>
        }
        panel={<RightPanel />}
        // ledger: T09. Both layouts are in the DOM; CSS shows one (phone below 640px).
        ledger={
          <>
            <div className="max-sm:hidden">
              <LedgerTable />
            </div>
            <div className="sm:hidden">
              <LedgerList />
            </div>
          </>
        }
        // toolbar: T10. Hidden below 640px by the frame (D20).
        toolbar={<ActivityToolbar />}
        // balances: T16. The tab mounts its own right panel (Mark paid, expense details).
        balances={<BalancesTab ledgerId={ledger.id} simplified={ledger.simplify_debts ?? true} />}
      />
      </FilterProvider>
      </ToastProvider>
    </ViewerProvider>
  );
}
