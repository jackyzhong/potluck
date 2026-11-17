"use client";

// Payment details panel & phone sheet (T31, Boards 35 & 38): header title +
// Payment badge (via PanelContent), 44px amount + "added by" meta (D29),
// direction-aware impact strip ("CA$3.75 in" / "out"), payer -> payee pills,
// recessed Summary + pairwise remaining card, and inline ConfirmStrip delete
// with Undo restore (D26).

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { deletePayment, restorePayment } from "@/src/app/ledger/[id]/actions";
import { detailsMeta } from "@/src/lib/glow/details";
import { formatMoney } from "@/src/lib/glow/money";
import { paymentPairRemaining, paymentTitle } from "@/src/lib/glow/payment";
import { Avatar } from "./Avatar";
import { Button } from "./Button";
import { ConfirmStrip } from "./ConfirmStrip";
import { Money } from "./Money";
import { registerUndoDelete } from "./panelStore";
import { useToast } from "./ToastProvider";
import { useHydrated } from "./useHydrated";
import { usePanelNav } from "./usePanel";
import { useGlowData, useViewer } from "./ViewerProvider";

const DAY = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

export function PaymentDetails({ id }: { id: string }) {
  const router = useRouter();
  const hydrated = useHydrated();
  const { id: ledgerId } = useParams<{ id: string }>();
  const nav = usePanelNav();
  const toast = useToast();
  const { data, currency: baseCurrency, slots, forViewer } = useGlowData();
  const { viewer, viewerId, members } = useViewer();
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

  const nameOf = (uid: string) => members.find((m) => m.id === uid)?.name ?? "Someone";
  const person = (memberId: string) => ({
    id: memberId,
    name: nameOf(memberId),
    isViewer: memberId === viewerId
  });
  const payer = person(payment.payer_id);
  const payee = person(payment.payee_id);
  const currency = payment.original_currency || baseCurrency;
  const meta = detailsMeta(
    hydrated ? DAY.format(new Date(payment.created_at)) : "",
    payment.created_by,
    viewerId,
    nameOf
  );

  const other = payer.isViewer ? payee : payee.isViewer ? payer : null;
  const pairRemaining =
    other && forViewer ? paymentPairRemaining(forViewer.pairs, other.id) : null;

  async function remove() {
    if (busy || !payment) return;
    setBusy(true);
    setError(null);
    const snapshot = {
      payerId: payment.payer_id,
      payeeId: payment.payee_id,
      amountCents: payment.amount_cents,
      currency: payment.original_currency,
      note: payment.note,
      createdAt: payment.created_at,
      createdBy: payment.created_by ?? null
    };
    const result = await deletePayment(ledgerId, id);
    if (!result.ok) {
      setError(result.error);
      setBusy(false);
      return;
    }
    registerUndoDelete(id, async () => {
      const res = await restorePayment(ledgerId, id, snapshot);
      if (res.ok) router.refresh();
      else toast.show(res.error, { variant: "error" });
    });
    router.refresh();
    setDeleted(true);
  }

  const chip = (p: typeof payer) => (
    <span className="inline-flex h-9 items-center gap-2 rounded-pill bg-surface-muted-2 pl-1 pr-3 font-bold">
      <Avatar name={p.name} id={p.id} slot={slots.get(p.id)} variant={p.isViewer ? "you" : "member"} size={28} />
      {p.isViewer ? "You" : p.name}
    </span>
  );

  const deleteBody = payee.isViewer ? (
    <>
      It&apos;ll be removed for everyone, and {payer.name} will owe you{" "}
      <strong className="tabular-nums">{formatMoney(payment.amount_cents, { currency })}</strong> more.
    </>
  ) : payer.isViewer ? (
    <>
      It&apos;ll be removed for everyone, and you&apos;ll owe {payee.name}{" "}
      <strong className="tabular-nums">{formatMoney(payment.amount_cents, { currency })}</strong> more.
    </>
  ) : (
    "It'll be removed for everyone."
  );

  return (
    <>
      <div className="flex flex-col gap-0.5">
        <span className="text-[length:var(--text-detail-amount)] font-extrabold leading-[1.05] tracking-[-0.03em] tabular-nums">
          <Money cents={payment.amount_cents} currency={currency} />
        </span>
        {meta ? <span className="text-[length:var(--text-meta)] text-text-muted">{meta}</span> : null}
      </div>

      {viewer ? (
        payee.isViewer ? (
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-tile bg-positive-soft px-3.5 py-3">
            <span className="font-semibold text-text">You were paid</span>
            <span className="text-[18px] font-extrabold tabular-nums text-positive">
              <Money cents={payment.amount_cents} currency={currency} /> in
            </span>
          </div>
        ) : payer.isViewer ? (
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-tile bg-negative-soft px-3.5 py-3">
            <span className="font-semibold text-text">You paid</span>
            <span className="text-[18px] font-extrabold tabular-nums text-negative">
              <Money cents={payment.amount_cents} currency={currency} /> out
            </span>
          </div>
        ) : (
          <div className="flex items-center rounded-tile bg-surface-sunken px-3.5 py-3">
            <span className="font-semibold text-text-muted">You&apos;re not part of this one</span>
          </div>
        )
      ) : null}

      <div className="flex flex-wrap items-center gap-2 font-semibold">
        {chip(payer)}
        <span>paid</span>
        {chip(payee)}
      </div>
      <p className="sr-only">{paymentTitle(payer, payee)}</p>

      {payment.note || (other && pairRemaining !== null) ? (
        <div className="flex flex-col gap-1.5 rounded-chip bg-surface-sunken p-4 text-[length:var(--text-meta)]">
          {payment.note ? (
            <div className="flex justify-between gap-3">
              <span className="text-text-muted">Note</span>
              <span className="font-semibold text-text">{payment.note}</span>
            </div>
          ) : null}
          {other && pairRemaining !== null ? (
            <div className="flex justify-between gap-3">
              <span className="text-text-muted">
                {pairRemaining > 0
                  ? `${other.name} still owes you`
                  : pairRemaining < 0
                    ? `You still owe ${other.name}`
                    : `Settled up with ${other.name}`}
              </span>
              {pairRemaining > 0 ? (
                <Money cents={pairRemaining} currency={currency} tone="positive" className="font-bold" />
              ) : pairRemaining < 0 ? (
                <Money cents={-pairRemaining} currency={currency} tone="negative" className="font-bold" />
              ) : (
                <Money cents={0} currency={currency} className="font-bold text-text-muted" />
              )}
            </div>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="m-0 rounded-tile bg-negative-soft px-3.5 py-2.5 text-[length:var(--text-meta)] font-bold text-negative">
          {error}
        </p>
      ) : null}

      {confirming ? (
        <ConfirmStrip
          title="Delete this payment?"
          body={deleteBody}
          cancelLabel="Cancel"
          confirmLabel="Delete payment"
          confirmBusyLabel="Deleting…"
          busy={busy || deleted}
          onCancel={() => setConfirming(false)}
          onConfirm={() => void remove()}
        />
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
