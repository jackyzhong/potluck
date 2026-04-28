// src/app/ledger/[id]/page.tsx
import { supabase } from "@/src/lib/supabase";
import { notFound } from "next/navigation";
import ActionMenu from "./ActionMenu";

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

  // Fetch initial users
  const { data: initialUsers } = await supabase
    .from("users")
    .select("*")
    .eq("ledger_id", id)
    .order("created_at", { ascending: true });

  return (
    <div className="min-h-screen bg-zinc-50 p-6 relative">
      <header className="max-w-2xl mx-auto py-8">
        <div className="text-4xl mb-2">{ledger.emoji || "🍲"}</div>
        <h1 className="text-3xl font-bold text-zinc-900">{ledger.title}</h1>
        <p className="text-zinc-500">Share this link to invite others</p>
      </header>

      <main className="max-w-2xl mx-auto bg-white rounded-3xl shadow-sm p-6">
        <div className="text-center py-20 text-zinc-400">
          No expenses yet. Start by adding one!
        </div>
      </main>

      {/* Pass ledgerId and initialUsers to the client component */}
      <ActionMenu ledgerId={ledger.id} initialUsers={initialUsers || []} />
    </div>
  );
}