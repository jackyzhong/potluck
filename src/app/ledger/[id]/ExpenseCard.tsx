"use client";

import { useState } from "react";
import { formatCurrency } from "@/src/lib/currencies";
import { Expense, Split } from "./ExpenseModal";
import ExpenseDetailsModal from "./ExpenseDetailsModal";

type User = {
  id: string;
  name: string;
  is_placeholder: boolean;
};

interface ExpenseCardProps {
  expense: Expense;
  splits: Split[];
  users: User[];
  userMap: Map<string, string>;
  ledgerId: string;
  baseCurrency: string;
}

export default function ExpenseCard({
  expense,
  splits,
  users,
  userMap,
  ledgerId,
  baseCurrency
}: ExpenseCardProps) {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsDetailsOpen(true)}
        className="w-full text-left bg-white rounded-3xl shadow-sm p-5 flex items-center justify-between border border-zinc-100 cursor-pointer hover:bg-zinc-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 transition-colors"
      >
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
      </button>

      <ExpenseDetailsModal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        expense={expense}
        splits={splits}
        users={users}
        userMap={userMap}
        ledgerId={ledgerId}
        baseCurrency={baseCurrency}
      />
    </>
  );
}
