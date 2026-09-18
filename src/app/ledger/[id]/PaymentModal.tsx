"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/src/lib/supabase";
import { CURRENCIES, formatCurrency } from "@/src/lib/currencies";
import { Payment } from "@/src/lib/balances";
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
  /** Editing an existing settlement rather than recording a new one. */
  existingPayment?: Payment;
}

export default function PaymentModal({
  onClose,
  ledgerId,
  users,
  baseCurrency,
  prefill,
  existingPayment
}: PaymentModalProps) {
  const router = useRouter();
  const modalRef = useModalKeyboard(true, onClose);

  // Edit in whatever currency the payment was recorded in, so an edit cannot
  // silently relabel it if the ledger's base currency has since changed.
  const currencyCode = existingPayment?.original_currency ?? baseCurrency;
  const currency = CURRENCIES[currencyCode] || CURRENCIES.CAD;

  const [payerId, setPayerId] = useState(existingPayment?.payer_id ?? prefill?.payerId ?? "");
  const [payeeId, setPayeeId] = useState(existingPayment?.payee_id ?? prefill?.payeeId ?? "");
  const [amount, setAmount] = useState(() => {
    const cents = existingPayment?.amount_cents ?? prefill?.amountCents;
    return cents === undefined ? "" : (cents / Math.pow(10, currency.decimals)).toFixed(currency.decimals);
  });
  const [note, setNote] = useState(existingPayment?.note ?? "");
  const [date, setDate] = useState(() => {
    const when = existingPayment ? new Date(existingPayment.created_at) : new Date();
    when.setMinutes(when.getMinutes() - when.getTimezoneOffset());
    return when.toISOString().slice(0, 16);
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const amountCents = Math.round((parseFloat(amount) || 0) * Math.pow(10, currency.decimals));
  const isSamePerson = payerId !== "" && payerId === payeeId;
  const isInvalid = !payerId || !payeeId || isSamePerson || amountCents <= 0;

  const handleSave = async () => {
    if (isInvalid) return;
    setIsSubmitting(true);

    const fields = {
      payer_id: payerId,
      payee_id: payeeId,
      amount_cents: amountCents,
      original_currency: currencyCode,
      note: note.trim() || null,
      created_at: new Date(date).toISOString()
    };

    // A row the database declines to write comes back as success with no rows,
    // so an empty result has to count as a failure.
    const { data, error } = existingPayment
      ? await supabase.from("payments").update(fields).eq("id", existingPayment.id).select("id")
      : await supabase
          .from("payments")
          .insert([{ ledger_id: ledgerId, ...fields }])
          .select("id");

    if (error || !data?.length) {
      console.error("Failed to save payment:", error);
      alert("Failed to save payment.");
      setIsSubmitting(false);
      return;
    }

    router.refresh();
    onClose();
    setIsSubmitting(false);
  };

  const handleDelete = async () => {
    if (!existingPayment) return;
    if (!window.confirm("Delete this payment? This will put the debt back.")) return;

    setIsSubmitting(true);
    const { data, error } = await supabase
      .from("payments")
      .delete()
      .eq("id", existingPayment.id)
      .select("id");

    if (error || !data?.length) {
      console.error("Failed to delete payment:", error);
      alert("Failed to delete payment.");
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
        {existingPayment && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={isSubmitting}
            className="absolute top-6 right-14 text-red-500 hover:text-red-600 text-sm font-medium px-2 py-0.5 rounded-lg hover:bg-red-50 transition-colors"
          >
            Delete
          </button>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!isSubmitting && !isInvalid) handleSave();
          }}
        >
          <h3 id="payment-modal-title" className="text-xl font-bold mb-1 text-zinc-900">
            {existingPayment ? "Edit Payment" : "Record a Payment"}
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
                Amount ({currencyCode})
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
                {formatCurrency(amountCents, currencyCode)}
              </span>
              .
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting || isInvalid}
            className="w-full mt-6 py-4 font-medium bg-zinc-900 text-white rounded-xl disabled:bg-zinc-200 transition-colors"
          >
            {isSubmitting ? "Saving..." : existingPayment ? "Update Payment" : "Record Payment"}
          </button>
        </form>
      </div>
    </div>
  );
}
