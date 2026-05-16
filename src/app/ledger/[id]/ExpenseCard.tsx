"use client";

import { useState } from "react";
import { formatCurrency } from "@/src/lib/currencies";
import ExpenseModal, { Expense, Split } from "./ExpenseModal";

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
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const handleEditClick = () => {
    setIsViewModalOpen(false);
    setIsEditModalOpen(true);
  };

  return (
    <>
      <div 
        onClick={() => setIsViewModalOpen(true)}
        className="bg-white rounded-3xl shadow-sm p-5 flex items-center justify-between border border-zinc-100 cursor-pointer hover:bg-zinc-50 transition-colors"
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
      </div>

      {/* View Modal */}
      {isViewModalOpen && (
        <div className="fixed inset-0 bg-black/20 z-40 flex flex-col justify-end p-4">
          <div className="bg-white w-full max-w-md mx-auto rounded-3xl p-6 shadow-xl relative max-h-[85vh] overflow-y-auto">
            <button
              onClick={() => setIsViewModalOpen(false)}
              className="absolute top-6 right-6 text-zinc-400 hover:text-zinc-900"
            >
              ✕
            </button>

            <h3 className="text-xl font-bold mb-2 text-zinc-900">Expense Details</h3>
            
            <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-100 mb-6 mt-4">
              <div className="text-sm text-zinc-500 mb-1">Description</div>
              <div className="font-medium text-zinc-900 mb-4">{expense.description || "Untitled Expense"}</div>
              
              <div className="text-sm text-zinc-500 mb-1">Paid by</div>
              <div className="font-medium text-zinc-900 mb-4">{userMap.get(expense.payer_id) || "Unknown"}</div>
              
              <div className="text-sm text-zinc-500 mb-1">Total Amount</div>
              <div className="font-bold text-lg text-zinc-900 mb-1">
                {formatCurrency(expense.amount_cents, expense.original_currency)}
              </div>
              <div className="text-xs text-zinc-400">
                {new Date(expense.created_at).toLocaleString()}
              </div>
            </div>

            <h4 className="font-semibold text-zinc-900 mb-3">Splits</h4>
            <div className="flex flex-col gap-2 mb-8 max-h-60 overflow-y-auto pr-2">
              {splits.length === 0 ? (
                <div className="text-zinc-500 text-sm italic">No splits found.</div>
              ) : (
                splits.map((split) => (
                  <div key={split.id || split.user_id} className="flex justify-between items-center p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                    <span className="font-medium text-zinc-900">{userMap.get(split.user_id) || "Unknown"}</span>
                    <span className="font-semibold text-zinc-900">{formatCurrency(split.amount_cents, expense.original_currency)}</span>
                  </div>
                ))
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="flex-1 py-4 font-medium text-zinc-500 hover:bg-zinc-50 rounded-xl border border-zinc-200 transition-colors"
              >
                Close
              </button>
              <button
                onClick={handleEditClick}
                className="flex-[2] py-4 font-medium bg-zinc-900 text-white rounded-xl transition-colors"
              >
                Edit Expense
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      <ExpenseModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        ledgerId={ledgerId}
        users={users}
        baseCurrency={baseCurrency}
        existingExpense={expense}
        existingSplits={splits}
      />
    </>
  );
}
