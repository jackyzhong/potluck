// src/app/ledger/[id]/page.tsx
import { supabase } from "@/src/lib/supabase";
import { notFound } from "next/navigation";
import ActionMenu from "./ActionMenu";
import { formatCurrency } from "@/src/lib/currencies";

import ExpenseCard from "./ExpenseCard";
import { Split } from "./ExpenseModal";
import LedgerTabs from "./LedgerTabs";
import BalancesView from "./BalancesView";
import { getExchangeRates } from "@/src/lib/balances";

export default async function LedgerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const tab = typeof sp.tab === 'string' ? sp.tab : 'expenses';

  // Fetch ledger
  const { data: ledger, error: ledgerError } = await supabase
    .from("ledgers")
    .select("*")
    .eq("id", id)
    .single();

  if (ledgerError || !ledger) {
    return notFound();
  }

  // Fetch users
  const { data: users } = await supabase
    .from("users")
    .select("*")
    .eq("ledger_id", id)
    .order("created_at", { ascending: true });

  // Fetch expenses
  const { data: expenses } = await supabase
    .from("expenses")
    .select("*")
    .eq("ledger_id", id)
    .order("created_at", { ascending: false });

  const initialUsers = users || [];
  const ledgerExpenses = expenses || [];

  let allSplits: Split[] = [];
  if (ledgerExpenses.length > 0) {
    const expenseIds = ledgerExpenses.map(e => e.id);
    const { data: splits } = await supabase
      .from("splits")
      .select("*")
      .in("expense_id", expenseIds);
    if (splits) {
      allSplits = splits;
    }
  }

  // Create a quick lookup map for user names
  const userMap = new Map(initialUsers.map(u => [u.id, u.name]));
  const baseCurrency = ledger.base_currency || "CAD";

  // Get unique currencies used
  const currenciesUsed = Array.from(new Set(ledgerExpenses.map(e => e.original_currency)));
  const exchangeRates = await getExchangeRates(baseCurrency, currenciesUsed);

  return (
    <div className="min-h-screen bg-zinc-50 p-6 relative pb-32">
      <header className="max-w-2xl mx-auto py-8">
        <div className="text-4xl mb-2">{ledger.emoji || "🍲"}</div>
        <h1 className="text-3xl font-bold text-zinc-900">{ledger.title}</h1>
        <p className="text-zinc-500">Don't lose the link to this page! Share the link to invite others.</p>
      </header>

      <main className="max-w-2xl mx-auto flex flex-col gap-4">
        <LedgerTabs />

        {tab === "balances" ? (
          <BalancesView 
            expenses={ledgerExpenses}
            splits={allSplits}
            userMap={userMap}
            baseCurrency={baseCurrency}
            exchangeRates={exchangeRates}
          />
        ) : (
          <>
            {ledgerExpenses.length === 0 ? (
              <div className="bg-white rounded-3xl shadow-sm p-6 text-center py-20 text-zinc-400">
                No expenses yet. Start by adding one!
              </div>
            ) : (
              ledgerExpenses.map((expense) => {
                const expenseSplits = allSplits.filter(s => s.expense_id === expense.id);
                return (
                  <ExpenseCard
                    key={expense.id}
                    expense={expense}
                    splits={expenseSplits}
                    users={initialUsers}
                    userMap={userMap}
                    ledgerId={ledger.id}
                    baseCurrency={baseCurrency}
                  />
                );
              })
            )}
          </>
        )}
      </main>

      <ActionMenu 
        ledgerId={ledger.id} 
        initialUsers={initialUsers} 
        baseCurrency={baseCurrency} 
      />
    </div>
  );
}