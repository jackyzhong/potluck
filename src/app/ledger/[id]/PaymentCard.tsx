"use client";

import { useState } from "react";
import { formatCurrency } from "@/src/lib/currencies";
import { Payment } from "@/src/lib/balances";
import PaymentModal from "./PaymentModal";

type User = {
  id: string;
  name: string;
  is_placeholder: boolean;
};

interface PaymentCardProps {
  payment: Payment;
  users: User[];
  userMap: Map<string, string>;
  ledgerId: string;
  baseCurrency: string;
}

export default function PaymentCard({
  payment,
  users,
  userMap,
  ledgerId,
  baseCurrency
}: PaymentCardProps) {
  const [isEditOpen, setIsEditOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsEditOpen(true)}
        className="w-full text-left bg-white rounded-3xl shadow-sm p-5 flex items-center justify-between gap-3 border border-zinc-100 cursor-pointer hover:bg-zinc-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 transition-colors"
      >
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 whitespace-nowrap">
              Settlement
            </span>
          </div>
          <span className="font-semibold text-zinc-900">
            {userMap.get(payment.payer_id) || "Unknown"}{" "}
            <span className="text-zinc-400 font-normal">paid</span>{" "}
            {userMap.get(payment.payee_id) || "Unknown"}
          </span>
          {payment.note && <span className="text-sm text-zinc-500 truncate">{payment.note}</span>}
        </div>
        <div className="text-right shrink-0">
          <span className="font-bold text-zinc-900 block text-lg">
            {formatCurrency(payment.amount_cents, payment.original_currency)}
          </span>
          <span className="text-xs text-zinc-400">
            {new Date(payment.created_at).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric"
            })}
          </span>
        </div>
      </button>

      {isEditOpen && (
        <PaymentModal
          onClose={() => setIsEditOpen(false)}
          ledgerId={ledgerId}
          users={users}
          baseCurrency={baseCurrency}
          existingPayment={payment}
        />
      )}
    </>
  );
}
