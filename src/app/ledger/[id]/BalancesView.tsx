"use client";

import { useState, useMemo } from "react";
import { Expense, Split } from "./ExpenseModal";
import { getNetBalances, getSimplifiedDebts, getUnsimplifiedDebts } from "@/src/lib/balances";
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

  const simplifiedDebts = useMemo(
    () => getSimplifiedDebts(expenses, splits, exchangeRates),
    [expenses, splits, exchangeRates]
  );

  const unsimplifiedDebts = useMemo(
    () => getUnsimplifiedDebts(expenses, splits, exchangeRates),
    [expenses, splits, exchangeRates]
  );

  const debts = isSimplified ? simplifiedDebts : unsimplifiedDebts;
  const transfersSaved = unsimplifiedDebts.length - simplifiedDebts.length;

  // Each member's overall position, biggest creditor first. Members who were
  // never involved in an expense still appear, so the roster stays complete.
  const netPositions = useMemo(() => {
    const balances = getNetBalances(expenses, splits, exchangeRates);
    return Array.from(userMap.entries())
      .map(([userId, name]) => ({ userId, name, net: balances[userId] || 0 }))
      .sort((a, b) => b.net - a.net);
  }, [expenses, splits, exchangeRates, userMap]);

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

        {/* Per-person net position — what each member is up or down overall */}
        {netPositions.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-zinc-900 mb-3 uppercase tracking-wider">
              Overall
            </h3>
            <div className="flex flex-col gap-2">
              {netPositions.map(({ userId, name, net }) => (
                <div key={userId} className="flex items-center justify-between px-1 py-1.5">
                  <span className="font-medium text-zinc-900">{name}</span>
                  {net === 0 ? (
                    <span className="text-sm text-zinc-400">settled up</span>
                  ) : (
                    <span className="text-sm">
                      <span className="text-zinc-500">{net > 0 ? "gets back" : "owes"} </span>
                      <span className={`font-bold ${net > 0 ? "text-emerald-600" : "text-red-600"}`}>
                        {formatCurrency(Math.abs(net), baseCurrency)}
                      </span>
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="border-t border-zinc-100 pt-5">
          <h3 className="text-sm font-semibold text-zinc-900 mb-3 uppercase tracking-wider">
            {debts.length === 0 ? "Transfers" : `Transfers (${debts.length})`}
          </h3>

          {isSimplified && (
            <div className="bg-blue-50 text-blue-700 text-sm p-3 rounded-xl mb-4">
              {transfersSaved > 0 ? (
                <>
                  <strong>Simplified debts enabled!</strong> Reduced {unsimplifiedDebts.length} transfers
                  to {simplifiedDebts.length} — {transfersSaved} fewer payment{transfersSaved === 1 ? "" : "s"} to make.
                </>
              ) : (
                <>
                  <strong>Simplified debts enabled!</strong> This group already settles up in the fewest
                  possible transfers, so nothing changed.
                </>
              )}
            </div>
          )}

          <div className="flex flex-col gap-3">
            {debts.length === 0 ? (
              <div className="text-center py-10 text-zinc-400">
                {expenses.length === 0
                  ? "No expenses yet. Add one to see who owes what."
                  : "Everyone is settled up!"}
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
    </div>
  );
}
