"use client";

// Opening the add-payment panel, optionally filled in.
//
//   const openPayment = useOpenPayment();
//   openPayment();                                               // Add payment, P
//   openPayment({ payerId, payeeId, amountCents });              // Mark paid (T16)
//
// The prefill is handed over through a tiny module store rather than the URL:
// ids and amounts have no business in a shareable link. The composer takes it
// when it mounts and clears it, so it only ever applies to the panel that was
// just opened. If the panel is
// already open, a prefill can't be applied to the form on screen, so it is
// ignored.

import { useCallback } from "react";
import { usePanelNav } from "./usePanel";

export type PaymentPrefill = {
  payerId: string;
  payeeId: string;
  amountCents: number;
};

let pending: PaymentPrefill | null = null;

/** Set (or clear, with null) what the next add-payment panel starts with. */
export function setPaymentPrefill(prefill: PaymentPrefill | null): void {
  pending = prefill;
}

/**
 * The composer reads this while it initialises its fields, and calls
 * `setPaymentPrefill(null)` from an effect once mounted. (Reading never clears:
 * React may run an initialiser twice in development.)
 */
export function peekPaymentPrefill(): PaymentPrefill | null {
  return pending;
}

export function useOpenPayment(): (prefill?: PaymentPrefill) => void {
  const { state, dispatch } = usePanelNav();
  return useCallback(
    (prefill?: PaymentPrefill) => {
      if (state.kind !== "pay") setPaymentPrefill(prefill ?? null);
      dispatch({ type: "pay" });
    },
    [state.kind, dispatch]
  );
}
