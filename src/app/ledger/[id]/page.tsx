// src/app/ledger/[id]/page.tsx
import { db } from "@/src/lib/server/supabase";
import { isUuid } from "@/src/lib/validation";
import { notFound } from "next/navigation";
import { Split } from "./ExpenseModal";
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

export default async function LedgerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const tab = typeof sp.tab === 'string' ? sp.tab : 'activity';

  // Anything that is not a UUID cannot be a ledger; don't send it to the database.
  if (!isUuid(id)) {
    return notFound();
  }

  // Fetch ledger
  const { data: ledger, error: ledgerError } = await db
    .from("ledgers")
    .select("*")
    .eq("id", id)
    .single();

  if (ledgerError || !ledger) {
    return notFound();
  }

  // Fetch users
  const { data: users } = await db
    .from("users")
    .select("*")
    .eq("ledger_id", id)
    .order("created_at", { ascending: true });

  // Fetch expenses
  const { data: expenses } = await db
    .from("expenses")
    .select("*")
    .eq("ledger_id", id)
    .order("created_at", { ascending: false });

  // Fetch payments (settlements between members)
  const { data: payments } = await db
    .from("payments")
    .select("*")
    .eq("ledger_id", id)
    .order("created_at", { ascending: false });

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
      <FilterProvider>
      <GroupFrame
        ledgerId={ledger.id}
        title={ledger.title}
        emoji={ledger.emoji || "🍲"}
        baseCurrency={baseCurrency}
        users={initialUsers}
        tab={tab === "balances" ? "balances" : "activity"}
        // toolbar: T10 · panel: T11 · summary: T08 · ledger: T09
        summary={
          tab === "balances" ? undefined : (
            <>
              <FilteredHero />
              <ShareOfSpendCard />
            </>
          )
        }
        panel={tab === "balances" ? undefined : <RightPanel />}
        // ledger: T09. Both layouts are in the DOM; CSS shows one (phone below 640px).
        ledger={
          tab === "balances" ? undefined : (
            <>
              <div className="max-sm:hidden">
                <LedgerTable />
              </div>
              <div className="sm:hidden">
                <LedgerList />
              </div>
            </>
          )
        }
        // toolbar: T10. Hidden below 640px by the frame (D20).
        toolbar={tab === "balances" ? undefined : <ActivityToolbar />}
        // balances: T16. The tab mounts its own right panel (Mark paid, expense details).
        balances={
          tab === "balances" ? (
            <BalancesTab ledgerId={ledger.id} simplified={ledger.simplify_debts ?? true} />
          ) : undefined
        }
      />
      </FilterProvider>
    </ViewerProvider>
  );
}
