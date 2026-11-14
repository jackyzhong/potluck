"use client";

// The details panel for a selected payment row (T15). Payments aren't boarded,
// so this follows the expense details shell (board 15): the amount, a meta line,
// an impact strip, "{payer} paid {payee}", then Edit and Delete. Delete asks
// first, inline in the panel (D14), and has no Undo.

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { deletePayment } from "@/src/app/ledger/[id]/actions";
import { paymentTitle } from "@/src/lib/glow/payment";
import { Avatar } from "./Avatar";
import { Button } from "./Button";
import { Money } from "./Money";
import { StatusStrip } from "./StatusStrip";
import { usePanelNav } from "./usePanel";
import { useHydrated } from "./useHydrated";
import { useGlowData, useViewer } from "./ViewerProvider";

const DATE = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

export function PaymentDetails({ id }: { id: string }) {
  const router = useRouter();
  const hydrated = useHydrated();
  const { id: ledgerId } = useParams<{ id: string }>();
  const nav = usePanelNav();
  const { data, currency: baseCurrency, slots } = useGlowData();
  const { viewer, members } = useViewer();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [deleted, setDeleted] = useState(false);
  const { dispatch } = nav;
  const payment = data.payments.find((p) => p.id === id);
  const gone = payment === undefined;
  useEffect(() => {
    if (deleted && gone) dispatch({ type: "deleted" });
  }, [deleted, gone, dispatch]);
  useEffect(() => {
    if (!deleted) return;
    const t = window.setTimeout(() => dispatch({ type: "deleted" }), 4000);
    return () => window.clearTimeout(t);
  }, [deleted, dispatch]);
  if (!payment) return null;

  const person = (memberId: string) => {
    const m = members.find((x) => x.id === memberId);
    return { id: memberId, name: m?.name ?? "Someone", isViewer: memberId === viewer?.id };
  };
  const payer = person(payment.payer_id);
  const payee = person(payment.payee_id);
  const currency = payment.original_currency || baseCurrency;

  async function remove() {
    if (busy) return;
    setBusy(true);
    setError(null);
    const result = await deletePayment(ledgerId, id);
    if (!result.ok) {
      setError(result.error);
      setBusy(false);
      return;
    }
    // Don't touch the URL until the refreshed rows arrive (see the effects above):
    // a replaceState during router.refresh() makes Next drop the refresh.
    router.refresh();
    setDeleted(true);
  }

  const chip = (p: typeof payer) => (
    <span className="inline-flex items-center gap-2 rounded-pill bg-surface-muted py-1 pl-1 pr-3 font-bold">
      <Avatar name={p.name} id={p.id} slot={slots.get(p.id)} variant={p.isViewer ? "you" : "member"} size={28} />
      {p.isViewer ? "You" : p.name}
    </span>
  );

  return (
    <>
      <div className="flex flex-col gap-1">
        <span className="text-[length:var(--text-detail-amount)] font-extrabold leading-[1.05] tracking-[-0.03em]">
          <Money cents={payment.amount_cents} currency={currency} />
        </span>
        <span className="text-[length:var(--text-body)] text-text-muted">
          {hydrated ? `${DATE.format(new Date(payment.created_at))} · Payment` : "Payment"}
        </span>
      </div>

      {payee.isViewer ? (
        <StatusStrip
          tone="positive"
          message="You were paid"
          detail={<Money cents={payment.amount_cents} currency={currency} signed className="font-bold" />}
        />
      ) : payer.isViewer ? (
        <StatusStrip
          tone="warning"
          message="You paid"
          detail={<Money cents={-payment.amount_cents} currency={currency} className="font-bold" />}
        />
      ) : (
        <StatusStrip tone="positive" message="You're not part of this one" />
      )}

      <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
        {chip(payer)}
        <span className="font-semibold">paid</span>
        {chip(payee)}
      </div>
      <p className="sr-only">{paymentTitle(payer, payee)}</p>

      {payment.note ? (
        <p className="m-0 rounded-tile bg-surface-sunken px-3.5 py-2.5 text-[length:var(--text-body)]">
          {payment.note}
        </p>
      ) : null}

      {error ? (
        <p role="alert" className="m-0 rounded-tile bg-negative-soft px-3.5 py-2.5 text-[length:var(--text-meta)] font-bold text-negative">
          {error}
        </p>
      ) : null}

      {confirming ? (
        <div role="group" aria-label="Delete this payment" className="flex flex-col gap-3 rounded-tile bg-negative-soft p-3.5">
          <p className="m-0 font-bold text-negative">
            Delete this payment? This can&apos;t be undone, and the debt comes back.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="soft" inPanel size={48} data-autofocus onClick={() => setConfirming(false)} className="flex-[1_1_110px]">
              Cancel
            </Button>
            <Button size={48} disabled={busy || deleted} onClick={remove} className="flex-[1_1_110px]">
              {busy ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <Button size={48} kbd="E" onClick={nav.openEdit} className="flex-[1_1_110px]">
            Edit
          </Button>
          <Button
            variant="text"
            tone="negative"
            size={48}
            onClick={() => {
              setError(null);
              setConfirming(true);
            }}
          >
            Delete
          </Button>
        </div>
      )}
    </>
  );
}
