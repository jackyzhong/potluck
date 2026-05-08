// src/app/ledger/[id]/ActionMenu.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/src/lib/supabase";
import { CURRENCY_LIST, CURRENCIES } from "@/src/lib/currencies";
import UserManagementModal from "./UserManagementModal";

type User = {
  id: string;
  name: string;
  is_placeholder: boolean;
};

export default function ActionMenu({ 
  ledgerId, 
  initialUsers,
  baseCurrency
}: { 
  ledgerId: string;
  initialUsers: User[];
  baseCurrency: string;
}) {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>(initialUsers);
  
  // Modal states
  const [isManagingUsers, setIsManagingUsers] = useState(false);
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [expenseStep, setExpenseStep] = useState<1 | 2>(1);
  
  // Expense Form states
  const [payerId, setPayerId] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState(baseCurrency);
  const [isCurrencyOpen, setIsCurrencyOpen] = useState(false);
  const [date, setDate] = useState(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  });
  const [isSubmittingExpense, setIsSubmittingExpense] = useState(false);

  // Split Form states
  const [splitMode, setSplitMode] = useState<"EQUAL" | "EXACT" | "PERCENT">("EQUAL");
  const [selectedSplitUsers, setSelectedSplitUsers] = useState<string[]>(initialUsers.map(u => u.id));
  const [exactAmounts, setExactAmounts] = useState<Record<string, string>>({});
  const [percentages, setPercentages] = useState<Record<string, string>>({});

  const handleNextExpenseStep = () => {
    if (!payerId || !amount || parseFloat(amount) <= 0) return;
    setExpenseStep(2);
  };

  const handleCreateExpense = async () => {
    setIsSubmittingExpense(true);

    const selectedCurrency = CURRENCIES[currency] || CURRENCIES[baseCurrency];
    const amountCents = Math.round(parseFloat(amount) * Math.pow(10, selectedCurrency.decimals));

    // 1. Insert the Expense
    const { error: expenseError } = await supabase
      .from("expenses")
      .insert([{
        ledger_id: ledgerId,
        payer_id: payerId,
        description: description.trim() || null,
        amount_cents: amountCents,
        original_currency: currency,
        created_at: new Date(date).toISOString()
      }]);

    // Note: The database insertion for the `splits` table will go here 
    // once we define the schema and wire up the math engine validation.

    if (!expenseError) {
      setIsAddingExpense(false);
      setExpenseStep(1);
      setDescription("");
      setAmount("");
      setPayerId("");
      
      // Reset split states
      setSplitMode("EQUAL");
      setExactAmounts({});
      setPercentages({});
      
      router.refresh(); 
    } else {
      console.error("Failed to add expense:", expenseError);
      alert("Failed to add expense.");
    }
    
    setIsSubmittingExpense(false);
  };

  return (
    <>
      <UserManagementModal 
        isOpen={isManagingUsers}
        onClose={() => setIsManagingUsers(false)}
        ledgerId={ledgerId}
        users={users}
        onUserAdded={(newUser) => setUsers([...users, newUser])}
      />

      {/* Add Expense Modal */}
      {isAddingExpense && (
        <div className="fixed inset-0 bg-black/20 z-20 flex flex-col justify-end p-4">
          <div className="bg-white w-full max-w-md mx-auto rounded-3xl p-6 shadow-xl relative max-h-[85vh] overflow-y-auto">
            <button 
              onClick={() => {
                setIsAddingExpense(false);
                setExpenseStep(1);
              }}
              className="absolute top-6 right-6 text-zinc-400 hover:text-zinc-900"
            >
              ✕
            </button>

            {expenseStep === 1 ? (
              <>
                <h3 className="text-xl font-bold mb-6 text-zinc-900">Add Expense</h3>
                
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
                    <div className="w-1/3 relative">
                      <label className="block text-sm font-medium text-zinc-700 mb-1">Currency</label>
                      <button
                        onClick={() => setIsCurrencyOpen(!isCurrencyOpen)}
                        className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none text-left flex justify-between items-center"
                      >
                        {currency}
                        <span className="text-xs">▼</span>
                      </button>
                      {isCurrencyOpen && (
                        <div className="absolute top-full right-0 mt-1 w-48 bg-white border border-zinc-200 rounded-xl shadow-lg z-30 max-h-48 overflow-y-auto">
                          {CURRENCY_LIST.map((c) => (
                            <button
                              key={c.code}
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
                  onClick={handleNextExpenseStep}
                  disabled={!payerId || !amount || parseFloat(amount) <= 0}
                  className="w-full mt-8 py-4 font-medium bg-zinc-900 text-white rounded-xl disabled:bg-zinc-200 transition-colors"
                >
                  Next: Split Expense
                </button>
              </>
            ) : (
              <>
                {/* Step 2: Split Expense UI */}
                <h3 className="text-xl font-bold mb-6 text-zinc-900">Split Expense</h3>
                
                {/* Mode Selector */}
                <div className="flex bg-zinc-100 p-1 rounded-xl mb-6">
                  {["EQUAL", "EXACT", "PERCENT"].map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setSplitMode(mode as "EQUAL" | "EXACT" | "PERCENT")}
                      className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                        splitMode === mode 
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
                            onChange={(e) => setExactAmounts({...exactAmounts, [user.id]: e.target.value})}
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
                            onChange={(e) => setPercentages({...percentages, [user.id]: e.target.value})}
                            className="w-full pr-7 p-2 text-right bg-white border border-zinc-200 rounded-lg outline-none focus:border-zinc-900 text-sm"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">%</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Status/Validation Banner */}
                <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl mb-8 flex justify-between items-center text-sm">
                  <span className="text-zinc-500">Total to split:</span>
                  <span className="font-bold text-zinc-900">${parseFloat(amount).toFixed(2) || "0.00"}</span>
                </div>

                <div className="flex gap-2">
                  <button 
                    onClick={() => setExpenseStep(1)}
                    className="flex-1 py-4 font-medium text-zinc-500 hover:bg-zinc-50 rounded-xl border border-zinc-200 transition-colors"
                  >
                    Back
                  </button>
                  <button 
                    onClick={handleCreateExpense}
                    disabled={isSubmittingExpense || (splitMode === "EQUAL" && selectedSplitUsers.length === 0)}
                    className="flex-[2] py-4 font-medium bg-zinc-900 text-white rounded-xl disabled:bg-zinc-200 transition-colors"
                  >
                    {isSubmittingExpense ? "Saving..." : "Confirm & Save"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Floating Action Buttons */}
      <div className="fixed bottom-8 right-8 flex flex-col gap-4 z-10">
        <button 
          onClick={() => setIsManagingUsers(true)}
          className="bg-white text-zinc-900 border border-zinc-200 shadow-md hover:bg-zinc-50 px-6 py-3 rounded-full font-medium transition-all active:scale-95"
        >
          Manage Users
        </button>

        <button 
          onClick={() => setIsAddingExpense(true)}
          className="bg-zinc-900 text-white shadow-lg hover:bg-zinc-800 px-6 py-3 rounded-full font-medium transition-all active:scale-95"
        >
          Add Expense
        </button>
      </div>
    </>
  );
}