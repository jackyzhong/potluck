"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/src/lib/supabase";
import { CURRENCIES, formatCurrency } from "@/src/lib/currencies";
import { useModalKeyboard } from "@/src/lib/useModalKeyboard";

type User = {
  id: string;
  name: string;
  is_placeholder: boolean;
};

export type PaymentPrefill = {
  payerId: string;
  payeeId: string;
  amountCents: number;
};

/**
 * Mounted only while open, so the form seeds itself from `prefill` on the way
 * in and needs no effect to resynchronise. Render it as `{isOpen && <PaymentModal .../>}`.
 */
interface PaymentModalProps {
  onClose: () => void;
  ledgerId: string;
  users: User[];
  baseCurrency: string;
  /** Settling a suggested transfer fills the form in from that debt. */
  prefill?: PaymentPrefill;
}

export default function PaymentModal({
  onClose,
  ledgerId,
  users,
  baseCurrency,
  prefill
}: PaymentModalProps) {
  const router = useRouter();
  const modalRef = useModalKeyboard(true, onClose);

  const currency = CURRENCIES[baseCurrency] || CURRENCIES.CAD;

  const [payerId, setPayerId] = useState(prefill?.payerId ?? "");
  const [payeeId, setPayeeId] = useState(prefill?.payeeId ?? "");
  const [amount, setAmount] = useState(() =>
    prefill ? (prefill.amountCents / Math.pow(10, currency.decimals)).toFixed(currency.decimals) : ""
  );
  const [note, setNote] = useState("");
  const [date, setDate] = useState(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const amountCents = Math.round((parseFloat(amount) || 0) * Math.pow(10, currency.decimals));
  const isSamePerson = payerId !== "" && payerId === payeeId;
  const isInvalid = !payerId || !payeeId || isSamePerson || amountCents <= 0;

  const handleSave = async () => {
    if (isInvalid) return;
    setIsSubmitting(true);

    const { data, error } = await supabase
      .from("payments")
      .insert([
        {
          ledger_id: ledgerId,
          payer_id: payerId,
          payee_id: payeeId,
          amount_cents: amountCents,
          original_currency: baseCurrency,
          note: note.trim() || null,
          created_at: new Date(date).toISOString()
        }
      ])
      .select("id");

    // A row the database declines to write comes back as success with no rows.
    if (error || !data?.length) {
      console.error("Failed to record payment:", error);
      alert("Failed to record payment.");
      setIsSubmitting(false);
      return;
    }

    router.refresh();
    onClose();
    setIsSubmitting(false);
  };

  const payerName = users.find((u) => u.id === payerId)?.name;
  const payeeName = users.find((u) => u.id === payeeId)?.name;

  return (
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-modal-title"
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

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!isSubmitting && !isInvalid) handleSave();
          }}
        >
          <h3 id="payment-modal-title" className="text-xl font-bold mb-1 text-zinc-900">
            Record a Payment
          </h3>
          <p className="text-sm text-zinc-500 mb-6">Money one member actually handed to another.</p>

          <div className="flex flex-col gap-5">
            <div>
              <label htmlFor="payment-payer" className="block text-sm font-medium text-zinc-700 mb-1">
                Who paid
              </label>
              <select
                id="payment-payer"
                value={payerId}
                onChange={(e) => setPayerId(e.target.value)}
                className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-zinc-900"
              >
                <option value="" disabled>
                  Select a member...
                </option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="payment-payee" className="block text-sm font-medium text-zinc-700 mb-1">
                Who received it
              </label>
              <select
                id="payment-payee"
                value={payeeId}
                onChange={(e) => setPayeeId(e.target.value)}
                className={`w-full p-3 bg-zinc-50 border rounded-xl outline-none focus:border-zinc-900 ${
                  isSamePerson ? "border-red-300" : "border-zinc-200"
                }`}
              >
                <option value="" disabled>
                  Select a member...
                </option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
              {isSamePerson && (
                <p className="text-sm text-red-600 mt-1">Pick two different people.</p>
              )}
            </div>

            <div>
              <label htmlFor="payment-amount" className="block text-sm font-medium text-zinc-700 mb-1">
                Amount ({baseCurrency})
              </label>
              <input
                id="payment-amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-zinc-900"
              />
            </div>

            <div>
              <label htmlFor="payment-note" className="block text-sm font-medium text-zinc-700 mb-1">
                Note (Optional)
              </label>
              <input
                id="payment-note"
                type="text"
                maxLength={50}
                placeholder="e.g. e-transfer, cash"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-zinc-900"
              />
            </div>

            <div>
              <label htmlFor="payment-date" className="block text-sm font-medium text-zinc-700 mb-1">
                Date
              </label>
              <input
                id="payment-date"
                type="datetime-local"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-zinc-900"
              />
            </div>
          </div>

          {!isInvalid && (
            <p className="text-sm text-zinc-500 mt-6 p-3 bg-zinc-50 border border-zinc-200 rounded-xl">
              <span className="font-medium text-zinc-900">{payerName}</span> paid{" "}
              <span className="font-medium text-zinc-900">{payeeName}</span>{" "}
              <span className="font-medium text-zinc-900">
                {formatCurrency(amountCents, baseCurrency)}
              </span>
              .
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting || isInvalid}
            className="w-full mt-6 py-4 font-medium bg-zinc-900 text-white rounded-xl disabled:bg-zinc-200 transition-colors"
          >
            {isSubmitting ? "Saving..." : "Record Payment"}
          </button>
        </form>
      </div>
    </div>
  );
}
