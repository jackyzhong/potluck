// src/app/ledger/[id]/page.tsx
import { supabase } from "@/src/lib/supabase";
import { notFound } from "next/navigation";
import ActionMenu from "./ActionMenu";
import { formatCurrency } from "@/src/lib/currencies";

import ExpenseCard from "./ExpenseCard";
import PaymentCard from "./PaymentCard";
import { Expense, Split } from "./ExpenseModal";
import { Payment } from "@/src/lib/balances";
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
  const tab = typeof sp.tab === 'string' ? sp.tab : 'activity';

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

  // Fetch payments (settlements between members)
  const { data: payments } = await supabase
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

  // Index the splits once rather than rescanning them for every expense card.
  const splitsByExpense = new Map<string, Split[]>();
  for (const split of allSplits) {
    const bucket = splitsByExpense.get(split.expense_id);
    if (bucket) bucket.push(split);
    else splitsByExpense.set(split.expense_id, [split]);
  }
  const baseCurrency = ledger.base_currency || "CAD";

  // Get unique currencies used
  // Expenses and settlements share one chronological history: a payment only
  // makes sense next to the expenses it is paying off.
  type ActivityItem =
    | { kind: "expense"; id: string; createdAt: string; expense: Expense; splits: Split[] }
    | { kind: "payment"; id: string; createdAt: string; payment: Payment };

  const activity: ActivityItem[] = [
    ...ledgerExpenses.map((expense): ActivityItem => ({
      kind: "expense",
      id: expense.id,
      createdAt: expense.created_at,
      expense,
      splits: splitsByExpense.get(expense.id) ?? []
    })),
    ...ledgerPayments.map((payment): ActivityItem => ({
      kind: "payment",
      id: payment.id,
      createdAt: payment.created_at,
      payment
    }))
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const currenciesUsed = Array.from(new Set([
    ...ledgerExpenses.map(e => e.original_currency),
    ...ledgerPayments.map(p => p.original_currency)
  ]));
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
            ledgerId={ledger.id}
            expenses={ledgerExpenses}
            splits={allSplits}
            payments={ledgerPayments}
            users={initialUsers}
            userMap={userMap}
            baseCurrency={baseCurrency}
            exchangeRates={exchangeRates}
            isSimplified={ledger.simplify_debts ?? true}
          />
        ) : (
          <>
            {activity.length === 0 ? (
              <div className="bg-white rounded-3xl shadow-sm p-6 text-center py-20 text-zinc-400">
                Nothing here yet. Start by adding an expense!
              </div>
            ) : (
              activity.map((item) =>
                item.kind === "expense" ? (
                  <ExpenseCard
                    key={item.id}
                    expense={item.expense}
                    splits={item.splits}
                    users={initialUsers}
                    userMap={userMap}
                    ledgerId={ledger.id}
                    baseCurrency={baseCurrency}
                  />
                ) : (
                  <PaymentCard
                    key={item.id}
                    payment={item.payment}
                    users={initialUsers}
                    userMap={userMap}
                    ledgerId={ledger.id}
                    baseCurrency={baseCurrency}
                  />
                )
              )
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