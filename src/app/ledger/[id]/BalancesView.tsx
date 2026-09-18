"use client";

import { useMemo, useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/src/lib/supabase";
import { Expense, Split } from "./ExpenseModal";
import { BreakdownRow, Payment, PaymentRow, getMemberBreakdown, getNetBalances, getSimplifiedDebts, getUnsimplifiedDebts } from "@/src/lib/balances";
import { formatCurrency } from "@/src/lib/currencies";
import ExpenseDetailsModal from "./ExpenseDetailsModal";

type User = {
  id: string;
  name: string;
  is_placeholder: boolean;
};

const formatDay = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });

function BreakdownLine({
  row,
  baseCurrency,
  onOpen
}: {
  row: BreakdownRow;
  baseCurrency: string;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full flex justify-between items-baseline gap-3 py-1 px-1 -mx-1 text-sm text-left rounded hover:bg-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 transition-colors"
    >
      <span className="text-zinc-600 truncate">
        <span className="underline decoration-zinc-300 underline-offset-2">
          {row.description || "Untitled Expense"}
        </span>
        <span className="text-zinc-400"> · {formatDay(row.createdAt)}</span>
      </span>
      <span className="text-zinc-900 whitespace-nowrap">
        {formatCurrency(row.amountCents, baseCurrency)}
      </span>
    </button>
  );
}

function PaymentLine({
  row,
  direction,
  name,
  baseCurrency
}: {
  row: PaymentRow;
  direction: "to" | "from";
  name: string;
  baseCurrency: string;
}) {
  return (
    <div className="flex justify-between items-baseline gap-3 py-1 text-sm">
      <span className="text-zinc-600 truncate">
        {direction === "to" ? "To " : "From "}
        {name}
        {row.note ? ` · ${row.note}` : ""}
        <span className="text-zinc-400"> · {formatDay(row.createdAt)}</span>
      </span>
      <span className="text-zinc-900 whitespace-nowrap">
        {formatCurrency(row.amountCents, baseCurrency)}
      </span>
    </div>
  );
}

interface BalancesViewProps {
  ledgerId: string;
  expenses: Expense[];
  splits: Split[];
  payments: Payment[];
  users: User[];
  userMap: Map<string, string>;
  baseCurrency: string;
  exchangeRates: Record<string, number>;
  isSimplified: boolean;
}

export default function BalancesView({
  ledgerId,
  expenses,
  splits,
  payments,
  users,
  userMap,
  baseCurrency,
  exchangeRates,
  isSimplified: savedSimplified
}: BalancesViewProps) {
  const router = useRouter();
  const [isSaving, startSaving] = useTransition();

  // The setting belongs to the ledger, not to whoever is looking at it, so a
  // toggle here changes what the whole group sees. Show the new value while
  // the write is in flight; React restores the saved one if it never lands.
  const [isSimplified, showSimplified] = useOptimistic(savedSimplified);

  const handleToggle = () => {
    const next = !isSimplified;
    startSaving(async () => {
      showSimplified(next);

      const { data, error } = await supabase
        .from("ledgers")
        .update({ simplify_debts: next })
        .eq("id", ledgerId)
        .select("id");

      if (error || !data?.length) {
        console.error("Failed to save the Simplify Debts setting:", error);
        alert("Couldn't save that for the group. Please try again.");
        return;
      }

      router.refresh();
    });
  };

  const simplifiedDebts = useMemo(
    () => getSimplifiedDebts(expenses, splits, payments, exchangeRates),
    [expenses, splits, payments, exchangeRates]
  );

  const unsimplifiedDebts = useMemo(
    () => getUnsimplifiedDebts(expenses, splits, payments, exchangeRates),
    [expenses, splits, payments, exchangeRates]
  );

  const debts = isSimplified ? simplifiedDebts : unsimplifiedDebts;
  const transfersSaved = unsimplifiedDebts.length - simplifiedDebts.length;

  // Each member's overall position, biggest creditor first. Members who were
  // never involved in an expense still appear, so the roster stays complete.
  const netPositions = useMemo(() => {
    const balances = getNetBalances(expenses, splits, payments, exchangeRates);
    return Array.from(userMap.entries())
      .map(([userId, name]) => ({ userId, name, net: balances[userId] || 0 }))
      .sort((a, b) => b.net - a.net);
  }, [expenses, splits, payments, exchangeRates, userMap]);

  const [openMemberId, setOpenMemberId] = useState<string | null>(null);

  // Only the open member's rows are worth building, and they cost one pass.
  const openBreakdown = useMemo(
    () => (openMemberId ? getMemberBreakdown(openMemberId, expenses, splits, payments, exchangeRates) : null),
    [openMemberId, expenses, splits, payments, exchangeRates]
  );

  // The details modal hosts the edit flow, so the selected expense outlives
  // the modal being dismissed — clearing it here would unmount the editor the
  // moment "Edit Expense" tries to open it.
  const [detailExpenseId, setDetailExpenseId] = useState<string | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const detailExpense = useMemo(
    () => expenses.find((e) => e.id === detailExpenseId) ?? null,
    [detailExpenseId, expenses]
  );
  const detailSplits = useMemo(
    () => splits.filter((s) => s.expense_id === detailExpenseId),
    [detailExpenseId, splits]
  );

  const openDetails = (expenseId: string) => {
    setDetailExpenseId(expenseId);
    setIsDetailsOpen(true);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-white rounded-3xl shadow-sm p-6 border border-zinc-100 mb-2">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-zinc-900">Balances</h2>
            <p className="text-sm text-zinc-500">How much people owe each other</p>
          </div>
          <div className="flex items-center gap-2">
            <span id="simplify-debts-label" className="text-sm font-medium text-zinc-700">Simplify Debts</span>
            <button
              type="button"
              role="switch"
              aria-checked={isSimplified}
              aria-labelledby="simplify-debts-label"
              onClick={handleToggle}
              disabled={isSaving}
              className={`w-12 h-6 rounded-full transition-colors relative flex items-center disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 ${
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
              {netPositions.map(({ userId, name, net }) => {
                const isOpen = openMemberId === userId;
                const rows = isOpen ? openBreakdown : null;
                const hasRows =
                  !!rows &&
                  (rows.paid.length > 0 ||
                    rows.owed.length > 0 ||
                    rows.paymentsMade.length > 0 ||
                    rows.paymentsReceived.length > 0);

                return (
                  <div key={userId}>
                    <button
                      type="button"
                      onClick={() => setOpenMemberId(isOpen ? null : userId)}
                      aria-expanded={isOpen}
                      aria-controls={`breakdown-${userId}`}
                      className="w-full flex items-center justify-between gap-3 px-1 py-1.5 rounded-lg text-left hover:bg-zinc-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 transition-colors"
                    >
                      <span className="font-medium text-zinc-900 flex items-center gap-1.5">
                        <span
                          aria-hidden="true"
                          className={`text-[10px] text-zinc-400 transition-transform ${isOpen ? "rotate-90" : ""}`}
                        >
                          ▶
                        </span>
                        {name}
                      </span>
                      {net === 0 ? (
                        <span className="text-sm text-zinc-400">settled up</span>
                      ) : (
                        <span className="text-sm whitespace-nowrap">
                          <span className="text-zinc-500">{net > 0 ? "gets back" : "owes"} </span>
                          <span className={`font-bold ${net > 0 ? "text-emerald-600" : "text-red-600"}`}>
                            {formatCurrency(Math.abs(net), baseCurrency)}
                          </span>
                        </span>
                      )}
                    </button>

                    {isOpen && rows && (
                      <div
                        id={`breakdown-${userId}`}
                        className="ml-2 mt-1 mb-2 pl-3 border-l-2 border-zinc-200"
                      >
                        {!hasRows ? (
                          <p className="text-sm text-zinc-400 py-2">Not part of any expenses yet.</p>
                        ) : (
                          <>
                            <div className="max-h-64 overflow-y-auto pr-1">
                              {rows.paid.length > 0 && (
                                <>
                                  <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mt-2 mb-1">
                                    Paid for the group
                                  </div>
                                  {rows.paid.map((row) => (
                                    <BreakdownLine
                                      key={`paid-${row.expenseId}`}
                                      row={row}
                                      baseCurrency={baseCurrency}
                                      onOpen={() => openDetails(row.expenseId)}
                                    />
                                  ))}
                                </>
                              )}

                              {rows.paymentsMade.length > 0 && (
                                <>
                                  <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mt-3 mb-1">
                                    Payments made
                                  </div>
                                  {rows.paymentsMade.map((row) => (
                                    <PaymentLine
                                      key={`made-${row.id}`}
                                      row={row}
                                      direction="to"
                                      name={userMap.get(row.counterpartyId) || "Unknown"}
                                      baseCurrency={baseCurrency}
                                    />
                                  ))}
                                </>
                              )}

                              {rows.owed.length > 0 && (
                                <>
                                  <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mt-3 mb-1">
                                    Their share
                                  </div>
                                  {rows.owed.map((row) => (
                                    <BreakdownLine
                                      key={`owed-${row.expenseId}`}
                                      row={row}
                                      baseCurrency={baseCurrency}
                                      onOpen={() => openDetails(row.expenseId)}
                                    />
                                  ))}
                                </>
                              )}

                              {rows.paymentsReceived.length > 0 && (
                                <>
                                  <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mt-3 mb-1">
                                    Payments received
                                  </div>
                                  {rows.paymentsReceived.map((row) => (
                                    <PaymentLine
                                      key={`received-${row.id}`}
                                      row={row}
                                      direction="from"
                                      name={userMap.get(row.counterpartyId) || "Unknown"}
                                      baseCurrency={baseCurrency}
                                    />
                                  ))}
                                </>
                              )}
                            </div>

                            <div className="border-t border-zinc-200 mt-2 pt-2 text-sm flex flex-col gap-1">
                              <div className="flex justify-between gap-3">
                                <span className="text-zinc-500">Total paid</span>
                                <span className="text-zinc-900 whitespace-nowrap">
                                  {formatCurrency(rows.paidTotalCents, baseCurrency)}
                                </span>
                              </div>
                              {rows.paymentsMadeTotalCents > 0 && (
                                <div className="flex justify-between gap-3">
                                  <span className="text-zinc-500">Payments made</span>
                                  <span className="text-zinc-900 whitespace-nowrap">
                                    {formatCurrency(rows.paymentsMadeTotalCents, baseCurrency)}
                                  </span>
                                </div>
                              )}
                              <div className="flex justify-between gap-3">
                                <span className="text-zinc-500">Total share</span>
                                <span className="text-zinc-900 whitespace-nowrap">
                                  {rows.owedTotalCents > 0 ? "−" : ""}
                                  {formatCurrency(rows.owedTotalCents, baseCurrency)}
                                </span>
                              </div>
                              {rows.paymentsReceivedTotalCents > 0 && (
                                <div className="flex justify-between gap-3">
                                  <span className="text-zinc-500">Payments received</span>
                                  <span className="text-zinc-900 whitespace-nowrap">
                                    −{formatCurrency(rows.paymentsReceivedTotalCents, baseCurrency)}
                                  </span>
                                </div>
                              )}
                              <div className="flex justify-between gap-3 font-semibold border-t border-zinc-100 pt-1">
                                <span className="text-zinc-900">Net</span>
                                <span
                                  className={`whitespace-nowrap ${
                                    rows.netCents > 0
                                      ? "text-emerald-600"
                                      : rows.netCents < 0
                                        ? "text-red-600"
                                        : "text-zinc-500"
                                  }`}
                                >
                                  {rows.netCents < 0 ? "−" : ""}
                                  {formatCurrency(Math.abs(rows.netCents), baseCurrency)}
                                </span>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="border-t border-zinc-100 pt-5">
          <h3 className="text-sm font-semibold text-zinc-900 mb-3 uppercase tracking-wider">
            {debts.length === 0 ? "Transfers" : `Transfers (${debts.length})`}
          </h3>

          {/* Only worth saying when simplifying would actually save someone a
              payment — otherwise the toggle has nothing to offer. */}
          {!isSimplified && transfersSaved > 0 && (
            <div className="bg-blue-50 text-blue-700 text-sm p-3 rounded-xl mb-4">
              <strong>Turn on Simplify Debts</strong> to settle up in {simplifiedDebts.length}{" "}
              transfer{simplifiedDebts.length === 1 ? "" : "s"} instead of {unsimplifiedDebts.length} —{" "}
              {transfersSaved} fewer payment{transfersSaved === 1 ? "" : "s"} to make.
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

      {detailExpense && (
        <ExpenseDetailsModal
          isOpen={isDetailsOpen}
          onClose={() => setIsDetailsOpen(false)}
          expense={detailExpense}
          splits={detailSplits}
          users={users}
          userMap={userMap}
          ledgerId={ledgerId}
          baseCurrency={baseCurrency}
        />
      )}
    </div>
  );
}
