"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/src/lib/supabase";
import { CURRENCY_LIST, CURRENCIES } from "@/src/lib/currencies";
import { useModalKeyboard } from "@/src/lib/useModalKeyboard";

type User = {
  id: string;
  name: string;
  is_placeholder: boolean;
};

export type Expense = {
  id: string;
  ledger_id: string;
  payer_id: string;
  description: string | null;
  amount_cents: number;
  original_currency: string;
  created_at: string;
};

export type Split = {
  id?: string;
  expense_id: string;
  user_id: string;
  amount_cents: number;
};

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  ledgerId: string;
  users: User[];
  baseCurrency: string;
  existingExpense?: Expense;
  existingSplits?: Split[];
}

export default function ExpenseModal({
  isOpen,
  onClose,
  ledgerId,
  users,
  baseCurrency,
  existingExpense,
  existingSplits,
}: ExpenseModalProps) {
  const router = useRouter();

  const [expenseStep, setExpenseStep] = useState<1 | 2>(1);
  const modalRef = useModalKeyboard(isOpen, onClose);
  const currencyDropdownRef = useRef<HTMLDivElement>(null);

  // Expense Form states
  const [payerId, setPayerId] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState(baseCurrency);
  const [isCurrencyOpen, setIsCurrencyOpen] = useState(false);
  const [date, setDate] = useState("");
  const [isSubmittingExpense, setIsSubmittingExpense] = useState(false);

  // Split Form states
  const [splitMode, setSplitMode] = useState<"EQUAL" | "EXACT" | "PERCENT">("EQUAL");
  const [selectedSplitUsers, setSelectedSplitUsers] = useState<string[]>([]);
  const [exactAmounts, setExactAmounts] = useState<Record<string, string>>({});
  const [percentages, setPercentages] = useState<Record<string, string>>({});

  // Initialize state when modal opens or existingExpense changes
  useEffect(() => {
    if (isOpen) {
      if (existingExpense) {
        const selectedCurrency = CURRENCIES[existingExpense.original_currency] || CURRENCIES[baseCurrency];
        
        setPayerId(existingExpense.payer_id);
        setDescription(existingExpense.description || "");
        setAmount((existingExpense.amount_cents / Math.pow(10, selectedCurrency.decimals)).toString());
        setCurrency(existingExpense.original_currency);
        
        const expenseDate = new Date(existingExpense.created_at);
        expenseDate.setMinutes(expenseDate.getMinutes() - expenseDate.getTimezoneOffset());
        setDate(expenseDate.toISOString().slice(0, 16));

        // Attempt to infer split mode based on existing splits
        if (existingSplits && existingSplits.length > 0) {
          const splitUserIds = existingSplits.map(s => s.user_id);
          
          // Check if it looks equal
          const totalAmount = existingExpense.amount_cents;
          const baseAmount = Math.floor(totalAmount / existingSplits.length);
          const isMostlyEqual = existingSplits.every(s => Math.abs(s.amount_cents - baseAmount) <= 1);

          if (isMostlyEqual) {
            setSplitMode("EQUAL");
            setSelectedSplitUsers(splitUserIds);
          } else {
            // Default to EXACT if we can't be sure it's equal or percent
            setSplitMode("EXACT");
            const amounts: Record<string, string> = {};
            existingSplits.forEach(s => {
              amounts[s.user_id] = (s.amount_cents / Math.pow(10, selectedCurrency.decimals)).toString();
            });
            setExactAmounts(amounts);
          }
        }
      } else {
        // Reset for new expense
        setPayerId("");
        setDescription("");
        setAmount("");
        setCurrency(baseCurrency);
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        setDate(now.toISOString().slice(0, 16));
        
        setSplitMode("EQUAL");
        setSelectedSplitUsers(users.map(u => u.id));
        setExactAmounts({});
        setPercentages({});
      }
      setExpenseStep(1);
    }
  }, [isOpen, existingExpense, existingSplits, baseCurrency, users]);

  // Close the currency dropdown on an outside click, or on Escape. The Escape
  // listener runs in the capture phase so it beats the modal's own Escape
  // handler — the dropdown closes first, leaving the modal open.
  useEffect(() => {
    if (!isCurrencyOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (currencyDropdownRef.current && !currencyDropdownRef.current.contains(event.target as Node)) {
        setIsCurrencyOpen(false);
      }
    }

    function handleEscapeCapture(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      event.preventDefault();
      setIsCurrencyOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscapeCapture, true);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscapeCapture, true);
    };
  }, [isCurrencyOpen]);

  if (!isOpen) return null;

  const selectedCurrency = CURRENCIES[currency] || CURRENCIES[baseCurrency];
  const amountCentsForSplit = Math.round((parseFloat(amount) || 0) * Math.pow(10, selectedCurrency.decimals));

  const exactAllocatedCents = Object.values(exactAmounts).reduce(
    (sum, val) => sum + Math.round((parseFloat(val) || 0) * Math.pow(10, selectedCurrency.decimals)),
    0
  );
  const exactRemainingCents = amountCentsForSplit - exactAllocatedCents;

  const percentTotal = Object.values(percentages).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
  const isPercentBalanced = Math.abs(percentTotal - 100) <= 0.01;

  const isSplitInvalid =
    (splitMode === "EQUAL" && selectedSplitUsers.length === 0) ||
    (splitMode === "EXACT" && exactRemainingCents !== 0) ||
    (splitMode === "PERCENT" && !isPercentBalanced);

  const handleNextExpenseStep = () => {
    if (!payerId || !amount || parseFloat(amount) <= 0) return;
    setExpenseStep(2);
  };

  const handleSaveExpense = async () => {
    if (isSplitInvalid) return;
    setIsSubmittingExpense(true);

    const amountCents = amountCentsForSplit;

    let expenseId = existingExpense?.id;

    if (existingExpense) {
      // UPDATE existing expense
      const { error: updateError } = await supabase
        .from("expenses")
        .update({
          payer_id: payerId,
          description: description.trim() || null,
          amount_cents: amountCents,
          original_currency: currency,
          created_at: new Date(date).toISOString()
        })
        .eq("id", existingExpense.id);

      if (updateError) {
        console.error("Failed to update expense:", updateError);
        alert("Failed to update expense.");
        setIsSubmittingExpense(false);
        return;
      }
      
      // Delete old splits
      const { error: deleteSplitsError } = await supabase
        .from("splits")
        .delete()
        .eq("expense_id", existingExpense.id);
        
      if (deleteSplitsError) {
        console.error("Failed to delete old splits:", deleteSplitsError);
        alert("Failed to update splits.");
        setIsSubmittingExpense(false);
        return;
      }
    } else {
      // INSERT new expense
      const { data: expenseData, error: expenseError } = await supabase
        .from("expenses")
        .insert([{
          ledger_id: ledgerId,
          payer_id: payerId,
          description: description.trim() || null,
          amount_cents: amountCents,
          original_currency: currency,
          created_at: new Date(date).toISOString()
        }])
        .select()
        .single();

      if (expenseError || !expenseData) {
        console.error("Failed to add expense:", expenseError);
        alert("Failed to add expense.");
        setIsSubmittingExpense(false);
        return;
      }
      expenseId = expenseData.id;
    }

    if (!expenseId) return;

    // Calculate new splits
    let finalSplits: { expense_id: string; user_id: string; amount_cents: number }[] = [];

    if (splitMode === "EQUAL") {
      const splitCount = selectedSplitUsers.length;
      const baseAmount = Math.floor(amountCents / splitCount);
      const remainder = amountCents % splitCount;

      finalSplits = selectedSplitUsers.map((userId, index) => ({
        expense_id: expenseId!,
        user_id: userId,
        amount_cents: baseAmount + (index < remainder ? 1 : 0)
      }));
    }
    else if (splitMode === "EXACT") {
      finalSplits = Object.entries(exactAmounts)
        .map(([userId, val]) => ({
          expense_id: expenseId!,
          user_id: userId,
          amount_cents: Math.round(parseFloat(val || "0") * Math.pow(10, selectedCurrency.decimals))
        }))
        .filter(s => s.amount_cents > 0);
    }
    else if (splitMode === "PERCENT") {
      let allocatedCents = 0;
      const percentEntries = Object.entries(percentages).filter(([_, val]) => parseFloat(val) > 0);

      finalSplits = percentEntries.map(([userId, val], index) => {
        const isLast = index === percentEntries.length - 1;
        if (isLast) {
          return { expense_id: expenseId!, user_id: userId, amount_cents: amountCents - allocatedCents };
        }
        const calcAmount = Math.round(amountCents * (parseFloat(val) / 100));
        allocatedCents += calcAmount;
        return { expense_id: expenseId!, user_id: userId, amount_cents: calcAmount };
      });
    }

    // Insert new splits
    const { error: splitsError } = await supabase
      .from("splits")
      .insert(finalSplits);

    if (splitsError) {
      console.error("Failed to add splits:", splitsError);
      alert("Expense saved, but failed to save splits.");
    } else {
      router.refresh();
      onClose();
    }

    setIsSubmittingExpense(false);
  };

  const handleDeleteExpense = async () => {
    if (!existingExpense) return;
    
    if (window.confirm("Are you sure you want to delete this expense? This action cannot be undone.")) {
      setIsSubmittingExpense(true);
      
      const { error: expenseError } = await supabase
        .from("expenses")
        .delete()
        .eq("id", existingExpense.id);
        
      if (expenseError) {
        console.error("Failed to delete expense:", expenseError);
        alert("Failed to delete the expense.");
        setIsSubmittingExpense(false);
        return;
      }
      
      router.refresh();
      onClose();
    }
  };

  return (
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="expense-modal-title"
      className="fixed inset-0 bg-black/20 z-50 flex flex-col justify-end sm:justify-center p-4"
    >
      <div className="bg-white w-full max-w-md mx-auto rounded-3xl p-6 shadow-xl relative max-h-[85vh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          data-modal-close
          aria-label="Close"
          className="absolute top-6 right-6 text-zinc-400 hover:text-zinc-900"
        >
          ✕
        </button>
        {existingExpense && (
          <button
            type="button"
            onClick={handleDeleteExpense}
            disabled={isSubmittingExpense}
            className="absolute top-6 right-14 text-red-500 hover:text-red-600 text-sm font-medium px-2 py-0.5 rounded-lg hover:bg-red-50 transition-colors"
          >
            Delete
          </button>
        )}

        {expenseStep === 1 ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleNextExpenseStep();
            }}
          >
            <h3 id="expense-modal-title" className="text-xl font-bold mb-6 text-zinc-900">
              {existingExpense ? "Edit Expense" : "Add Expense"}
            </h3>

            <div className="flex flex-col gap-5">
              {/* Payer Selection */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Paid by</label>
                <select
                  value={payerId}
                  onChange={(e) => setPayerId(e.target.value)}
                  className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-zinc-900"
                >
                  <option value="" disabled>Select a member...</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Description (Optional)</label>
                <input
                  type="text"
                  maxLength={50}
                  placeholder="e.g. Dinner, Taxi, Groceries"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-zinc-900"
                />
                <div className="text-right text-xs text-zinc-400 mt-1">{description.length}/50</div>
              </div>

              {/* Amount and Currency */}
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-zinc-900"
                  />
                </div>
                <div className="w-1/3 relative" ref={currencyDropdownRef}>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Currency</label>
                  <button
                    type="button"
                    onClick={() => setIsCurrencyOpen(!isCurrencyOpen)}
                    aria-haspopup="listbox"
                    aria-expanded={isCurrencyOpen}
                    className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none text-left flex justify-between items-center"
                  >
                    {currency}
                    <span className="text-xs">▼</span>
                  </button>
                  {isCurrencyOpen && (
                    <div
                      role="listbox"
                      className="absolute top-full right-0 mt-1 w-48 bg-white border border-zinc-200 rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto"
                    >
                      {CURRENCY_LIST.map((c) => (
                        <button
                          key={c.code}
                          type="button"
                          role="option"
                          aria-selected={c.code === currency}
                          onClick={() => {
                            setCurrency(c.code);
                            setIsCurrencyOpen(false);
                          }}
                          className="w-full text-left p-3 hover:bg-zinc-50 border-b border-zinc-100 last:border-0"
                        >
                          {c.code} - {c.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Date</label>
                <input
                  type="datetime-local"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-zinc-900"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={!payerId || !amount || parseFloat(amount) <= 0}
              className="w-full mt-8 py-4 font-medium bg-zinc-900 text-white rounded-xl disabled:bg-zinc-200 transition-colors"
            >
              Next: Split Expense
            </button>
          </form>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!isSubmittingExpense && !isSplitInvalid) handleSaveExpense();
            }}
          >
            {/* Step 2: Split Expense UI */}
            <h3 id="expense-modal-title" className="text-xl font-bold mb-6 text-zinc-900">Split Expense</h3>

            {/* Mode Selector */}
            <div className="flex bg-zinc-100 p-1 rounded-xl mb-6">
              {["EQUAL", "EXACT", "PERCENT"].map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setSplitMode(mode as "EQUAL" | "EXACT" | "PERCENT")}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${splitMode === mode
                      ? "bg-white text-zinc-900 shadow-sm"
                      : "text-zinc-500 hover:text-zinc-700"
                    }`}
                >
                  {mode === "EQUAL" ? "Equally" : mode === "EXACT" ? "Exact Amount" : "Percentage"}
                </button>
              ))}
            </div>

            {/* Allocation List */}
            <div className="flex flex-col gap-3 mb-6 max-h-60 overflow-y-auto pr-2">
              {users.map(user => (
                <div key={user.id} className="flex items-center justify-between p-3 bg-zinc-50 border border-zinc-200 rounded-xl">
                  <div className="font-medium text-zinc-900">{user.name}</div>

                  {splitMode === "EQUAL" && (
                    <input
                      type="checkbox"
                      checked={selectedSplitUsers.includes(user.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedSplitUsers([...selectedSplitUsers, user.id]);
                        } else {
                          setSelectedSplitUsers(selectedSplitUsers.filter(id => id !== user.id));
                        }
                      }}
                      className="w-5 h-5 accent-zinc-900"
                    />
                  )}

                  {splitMode === "EXACT" && (
                    <div className="relative w-1/3">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">$</span>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={exactAmounts[user.id] || ""}
                        onChange={(e) => setExactAmounts({ ...exactAmounts, [user.id]: e.target.value })}
                        className="w-full pl-7 p-2 text-right bg-white border border-zinc-200 rounded-lg outline-none focus:border-zinc-900 text-sm"
                      />
                    </div>
                  )}

                  {splitMode === "PERCENT" && (
                    <div className="relative w-1/3">
                      <input
                        type="number"
                        placeholder="0"
                        value={percentages[user.id] || ""}
                        onChange={(e) => setPercentages({ ...percentages, [user.id]: e.target.value })}
                        className="w-full pr-7 p-2 text-right bg-white border border-zinc-200 rounded-lg outline-none focus:border-zinc-900 text-sm"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">%</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Status/Validation Banner */}
            <div
              className={`p-4 border rounded-xl mb-8 flex justify-between items-center text-sm ${
                isSplitInvalid ? "bg-red-50 border-red-200" : "bg-zinc-50 border-zinc-200"
              }`}
            >
              {splitMode === "EQUAL" && (
                <>
                  <span className="text-zinc-500">Total to split:</span>
                  <span className="font-bold text-zinc-900">
                    ${(amountCentsForSplit / Math.pow(10, selectedCurrency.decimals)).toFixed(selectedCurrency.decimals)}
                  </span>
                </>
              )}

              {splitMode === "EXACT" && (
                <>
                  <span className={exactRemainingCents === 0 ? "text-zinc-500" : "text-red-600 font-medium"}>
                    {exactRemainingCents === 0
                      ? "Fully allocated"
                      : `$${(Math.abs(exactRemainingCents) / Math.pow(10, selectedCurrency.decimals)).toFixed(selectedCurrency.decimals)} ${exactRemainingCents > 0 ? "remaining" : "over"}`}
                  </span>
                  <span className="font-bold text-zinc-900">
                    ${(exactAllocatedCents / Math.pow(10, selectedCurrency.decimals)).toFixed(selectedCurrency.decimals)} / ${(amountCentsForSplit / Math.pow(10, selectedCurrency.decimals)).toFixed(selectedCurrency.decimals)}
                  </span>
                </>
              )}

              {splitMode === "PERCENT" && (
                <>
                  <span className={isPercentBalanced ? "text-zinc-500" : "text-red-600 font-medium"}>
                    {isPercentBalanced
                      ? "Fully allocated"
                      : `${Math.abs(100 - percentTotal).toFixed(2)}% ${percentTotal < 100 ? "remaining" : "over"}`}
                  </span>
                  <span className="font-bold text-zinc-900">{percentTotal.toFixed(2)}% / 100%</span>
                </>
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setExpenseStep(1)}
                className="flex-1 py-4 font-medium text-zinc-500 hover:bg-zinc-50 rounded-xl border border-zinc-200 transition-colors"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isSubmittingExpense || isSplitInvalid}
                className="flex-[2] py-4 font-medium bg-zinc-900 text-white rounded-xl disabled:bg-zinc-200 transition-colors"
              >
                {isSubmittingExpense ? "Saving..." : (existingExpense ? "Update Expense" : "Confirm & Save")}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
