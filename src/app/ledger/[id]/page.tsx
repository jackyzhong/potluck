// src/app/ledger/[id]/page.tsx
import { db } from "@/src/lib/server/supabase";
import { isUuid } from "@/src/lib/validation";
import { notFound } from "next/navigation";
import ExpenseCard from "./ExpenseCard";
import PaymentCard from "./PaymentCard";
import { Expense, Split } from "./ExpenseModal";
import { Payment } from "@/src/lib/balances";
import GroupFrame from "./GroupFrame";
import BalancesView from "./BalancesView";
import { getExchangeRates } from "@/src/lib/balances";
import { ViewerProvider } from "@/src/components/glow/ViewerProvider";
import { RightPanel } from "@/src/components/glow/RightPanel";

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
      <GroupFrame
        ledgerId={ledger.id}
        title={ledger.title}
        emoji={ledger.emoji || "🍲"}
        baseCurrency={baseCurrency}
        users={initialUsers}
        tab={tab === "balances" ? "balances" : "activity"}
        // summary: T08 (hero, share card) · toolbar: T10
        panel={tab === "balances" ? undefined : <RightPanel />}
        // ledger: T09 replaces the card list below with LedgerTable / LedgerList
        ledger={
          tab === "balances" ? undefined : (
            <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
              {activity.length === 0 ? (
                <div className="rounded-3xl bg-surface p-6 py-20 text-center text-text-muted shadow-card">
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
            </div>
          )
        }
        // balances: T16 replaces BalancesView
        balances={
          tab === "balances" ? (
            <div className="mx-auto w-full max-w-2xl">
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
            </div>
          ) : undefined
        }
      />
    </ViewerProvider>
  );
}
