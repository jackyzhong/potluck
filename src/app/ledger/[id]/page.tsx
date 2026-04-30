// src/app/ledger/[id]/page.tsx
import { supabase } from "@/src/lib/supabase";
import { notFound } from "next/navigation";
import ActionMenu from "./ActionMenu";
import { formatCurrency } from "@/src/lib/currencies";

export default async function LedgerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

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

  // Create a quick lookup map for user names
  const userMap = new Map(initialUsers.map(u => [u.id, u.name]));

  return (
    <div className="min-h-screen bg-zinc-50 p-6 relative pb-32">
      <header className="max-w-2xl mx-auto py-8">
        <div className="text-4xl mb-2">{ledger.emoji || "🍲"}</div>
        <h1 className="text-3xl font-bold text-zinc-900">{ledger.title}</h1>
        <p className="text-zinc-500">Don't lose the link to this page! Share the link to invite others.</p>
      </header>

      <main className="max-w-2xl mx-auto flex flex-col gap-4">
        {ledgerExpenses.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-sm p-6 text-center py-20 text-zinc-400">
            No expenses yet. Start by adding one!
          </div>
        ) : (
          ledgerExpenses.map((expense) => (
            <div key={expense.id} className="bg-white rounded-3xl shadow-sm p-5 flex items-center justify-between border border-zinc-100">
              <div className="flex flex-col">
                <span className="font-semibold text-zinc-900">
                  {expense.description || "Untitled Expense"}
                </span>
                <span className="text-sm text-zinc-500">
                  Paid by {userMap.get(expense.payer_id) || "Unknown"}
                </span>
              </div>
              <div className="text-right">
                <span className="font-bold text-zinc-900 block text-lg">
                  {formatCurrency(expense.amount_cents, expense.original_currency)}
                </span>
                <span className="text-xs text-zinc-400">
                  {new Date(expense.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
              </div>
            </div>
          ))
        )}
      </main>

      <ActionMenu 
        ledgerId={ledger.id} 
        initialUsers={initialUsers} 
        baseCurrency={ledger.base_currency || "CAD"} 
      />
    </div>
  );
}