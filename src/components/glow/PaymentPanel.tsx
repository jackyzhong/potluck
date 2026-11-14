"use client";

// The seam between the shared PanelBody (PanelContent.tsx) and the payment
// panel states. PanelBody renders `<PaymentOr>` around the expense content for
// the two states an id can belong to either kind of row (details, edit): if the
// id is a payment, the payment panel shows; otherwise the expense content
// (T12/T13/T14) does. The add-payment state (`pay`) has no expense twin.

import type { ReactNode } from "react";
import { PaymentComposer } from "./PaymentComposer";
import { PaymentDetails } from "./PaymentDetails";
import { useGlowData } from "./ViewerProvider";

export function PaymentOr({
  id,
  mode,
  children
}: {
  id: string;
  mode: "details" | "edit";
  /** What shows when `id` is not a payment. */
  children: ReactNode;
}) {
  const { data } = useGlowData();
  if (!data.payments.some((p) => p.id === id)) return <>{children}</>;
  return mode === "details" ? <PaymentDetails id={id} /> : <PaymentComposer key={id} paymentId={id} />;
}

/** The add-payment state. */
export function AddPayment() {
  return <PaymentComposer />;
}
