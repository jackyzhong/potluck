"use client";

import { useState, useMemo } from "react";
import { Expense, Split } from "./ExpenseModal";
import { getSimplifiedDebts, getUnsimplifiedDebts } from "@/src/lib/balances";
import { formatCurrency } from "@/src/lib/currencies";

interface BalancesViewProps {
  expenses: Expense[];
  splits: Split[];
  userMap: Map<string, string>;
  baseCurrency: string;
  exchangeRates: Record<string, number>;
}

export default function BalancesView({
  expenses,
  splits,
  userMap,
  baseCurrency,
  exchangeRates
}: BalancesViewProps) {
  const [isSimplified, setIsSimplified] = useState(false);

  const debts = useMemo(() => {
    if (isSimplified) {
      return getSimplifiedDebts(expenses, splits, exchangeRates);
    } else {
      return getUnsimplifiedDebts(expenses, splits, exchangeRates);
    }
  }, [expenses, splits, isSimplified, exchangeRates]);

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-white rounded-3xl shadow-sm p-6 border border-zinc-100 mb-2">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-zinc-900">Balances</h2>
            <p className="text-sm text-zinc-500">How much people owe each other</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-zinc-700">Simplify Debts</span>
            <button
              onClick={() => setIsSimplified(!isSimplified)}
              className={`w-12 h-6 rounded-full transition-colors relative flex items-center ${
                isSimplified ? "bg-zinc-900" : "bg-zinc-300"
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full absolute transition-transform ${
                  isSimplified ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>

        {isSimplified && (
          <div className="bg-blue-50 text-blue-700 text-sm p-3 rounded-xl mb-6">
            <strong>Simplified debts enabled!</strong> We've reorganized transfers to settle everyone up using the fewest possible transactions.
          </div>
        )}

        <div className="flex flex-col gap-3">
          {debts.length === 0 ? (
            <div className="text-center py-10 text-zinc-400">
              No debts yet. Everyone is settled up!
            </div>
          ) : (
            debts.map((debt, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-zinc-50 rounded-xl border border-zinc-100">
                <div className="flex flex-col">
                  <span className="font-semibold text-zinc-900">
                    {userMap.get(debt.debtorId) || "Unknown"} <span className="text-zinc-400 font-normal">owes</span> {userMap.get(debt.creditorId) || "Unknown"}
                  </span>
                </div>
                <div className="font-bold text-lg text-zinc-900">
                  {formatCurrency(debt.amountCents, baseCurrency)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
