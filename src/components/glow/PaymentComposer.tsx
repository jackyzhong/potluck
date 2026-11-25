"use client";

// Add and edit a payment in the right panel (T15, T31, Boards 33-37).
// Uses compact gradient amount card, shared PillPopover / DatePill pickers,
// borderless sunken note field, live viewer balance impact strip, createdBy (D29),
// and inline ConfirmStrip for Discard (D27).

import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { savePayment } from "@/src/app/ledger/[id]/actions";
import { CURRENCIES } from "@/src/lib/currencies";
import { pickableMembers } from "@/src/lib/members";
import {
  centsToInput,
  paymentCreatedAt,
  currencyDecimals,
  dateInputValue,
  parsePaymentAmountCents,
  paymentImpact,
  paymentProblem
} from "@/src/lib/glow/payment";
import { filterAmountInput } from "@/src/lib/glow/composer";
import { formatMoney } from "@/src/lib/glow/money";
import type { Payment } from "@/src/lib/glow/ledger";
import { Avatar } from "./Avatar";
import { Button } from "./Button";
import { ConfirmStrip } from "./ConfirmStrip";
import { DatePill, PILL_OPTION_CLASS, PillPopover } from "./PillPopover";
import { StatusStrip } from "./StatusStrip";
import { peekPaymentPrefill, setPaymentPrefill } from "./paymentPrefill";
import { answerDiscard, usePanelDirty, usePanelSession } from "./panelStore";
import { usePanelNav } from "./usePanel";
import { useGlowData, useViewer } from "./ViewerProvider";

const NOTE_MAX = 50;

export function PaymentComposer({ paymentId }: { paymentId?: string }) {
  const router = useRouter();
  const { id: ledgerId } = useParams<{ id: string }>();
  const nav = usePanelNav();
  const { pending } = usePanelSession();
  const { data, currency: baseCurrency, slots } = useGlowData();
  const { viewer, members } = useViewer();
  const uid = useId();
  const discardWrapRef = useRef<HTMLDivElement>(null);

  const existing = paymentId ? data.payments.find((p) => p.id === paymentId) : undefined;
  const currencyCode = existing?.original_currency ?? baseCurrency;
  const decimals = currencyDecimals(CURRENCIES[currencyCode] ? currencyCode : "CAD");

  const [initial] = useState(() => {
    const prefill = existing ? null : peekPaymentPrefill();
    return {
      payerId: existing?.payer_id ?? prefill?.payerId ?? "",
      payeeId: existing?.payee_id ?? prefill?.payeeId ?? "",
      amount:
        existing || prefill
          ? centsToInput(existing?.amount_cents ?? prefill?.amountCents ?? 0, decimals)
          : "",
      note: existing?.note ?? "",
      date: dateInputValue(existing ? existing.created_at : new Date())
    };
  });
  useEffect(() => setPaymentPrefill(null), []);

  const [pickedPayer, setPickedPayer] = useState<string | null>(null);
  const defaultPayer = initial.payerId || viewer?.id || "";
  const payerId = pickedPayer ?? defaultPayer;
  const setPayerId = setPickedPayer;
  const [payeeId, setPayeeId] = useState(initial.payeeId);
  const [amount, setAmount] = useState(initial.amount);
  const [note, setNote] = useState(initial.note);
  const [date, setDate] = useState(initial.date);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<{ id: string; arrived: (p: Payment) => boolean } | null>(null);
  const savedId = saved?.id ?? null;

  const dirty =
    payerId !== defaultPayer ||
    payeeId !== initial.payeeId ||
    amount !== initial.amount ||
    note !== initial.note ||
    date !== initial.date;
  usePanelDirty(dirty && savedId === null);

  // Move focus onto the safe "Keep editing" choice when inline Discard appears.
  useEffect(() => {
    if (!pending) return;
    discardWrapRef.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus();
  }, [pending]);

  const pickable = useMemo(
    () =>
      pickableMembers(
        members,
        [existing?.payer_id, existing?.payee_id, initial.payerId, initial.payeeId].filter(Boolean) as string[]
      ),
    [members, existing, initial.payerId, initial.payeeId]
  );
  const viewerFirst = useMemo(
    () => [...pickable].sort((a, b) => Number(b.id === viewer?.id) - Number(a.id === viewer?.id)),
    [pickable, viewer?.id]
  );

  const { dispatch } = nav;
  useEffect(() => {
    if (!saved) return;
    const row = data.payments.find((p) => p.id === saved.id);
    if (row && saved.arrived(row)) dispatch({ type: "saved", id: saved.id });
  }, [saved, data.payments, dispatch]);
  useEffect(() => {
    if (!savedId) return;
    const t = window.setTimeout(() => dispatch({ type: "saved", id: savedId }), 4000);
    return () => window.clearTimeout(t);
  }, [savedId, dispatch]);

  const sameSide = payerId !== "" && payerId === payeeId;
  const liveProblem = sameSide ? "Pick two different people." : null;
  const parsedAmount = parsePaymentAmountCents(amount, decimals);
  const liveImpact = paymentImpact({
    payerId,
    payeeId,
    amountCents: parsedAmount,
    viewerId: viewer?.id ?? null
  });

  const nameOf = (id: string) => {
    if (id === viewer?.id) return "You";
    return members.find((m) => m.id === id)?.name ?? "Someone";
  };
  const avatarOf = (id: string) =>
    id === viewer?.id ? (
      <Avatar name="You" variant="you" size={32} />
    ) : (
      <Avatar name={nameOf(id)} id={id} slot={slots.get(id)} size={32} />
    );

  async function submit(e?: FormEvent) {
    e?.preventDefault();
    if (saving || savedId) return;
    if (existing && !dirty) return;
    const problem = paymentProblem({ payerId, payeeId, amount }, decimals);
    if (problem) {
      setError(problem);
      return;
    }
    const amountCents = parsePaymentAmountCents(amount, decimals);
    if (amountCents === null) return;
    const createdAt = paymentCreatedAt(date, existing?.created_at ?? null);
    setSaving(true);
    setError(null);
    const result = await savePayment(ledgerId, existing?.id ?? null, {
      payerId,
      payeeId,
      amountCents,
      currency: currencyCode,
      note: note.trim(),
      createdAt,
      createdBy: existing ? undefined : (viewer?.id ?? null)
    });
    if (!result.ok) {
      setError(result.error);
      setSaving(false);
      return;
    }
    router.refresh();
    setSaved({
      id: result.data.id,
      arrived: (p) =>
        p.payer_id === payerId &&
        p.payee_id === payeeId &&
        p.amount_cents === amountCents &&
        (p.note ?? "") === note.trim() &&
        new Date(p.created_at).getTime() === new Date(createdAt).getTime()
    });
  }

  const pick = (set: (v: string) => void) => (v: string) => {
    set(v);
    setError(null);
  };
  const shownError = error ?? liveProblem;
  const busy = saving || savedId !== null;
  const submitDisabled = busy || (Boolean(existing) && !dirty);

  function renderPersonPill(label: string, value: string, onPick: (v: string) => void) {
    const selected = viewerFirst.find((m) => m.id === value);
    return (
      <PillPopover
        ariaLabel={`${label}: ${selected ? nameOf(selected.id) : "choose someone"}`}
        menuLabel={label}
        menuRole="listbox"
        triggerClassName={`h-11 gap-2 rounded-pill bg-surface-muted-2 pr-3 text-text ${selected ? "pl-1.5" : "pl-4"}`}
        trigger={
          selected ? (
            <>
              {avatarOf(selected.id)}
              <span className="truncate">{nameOf(selected.id)}</span>
            </>
          ) : (
            "Choose"
          )
        }
      >
        {(close) =>
          viewerFirst.map((m) => (
            <button
              key={m.id}
              type="button"
              role="option"
              data-nav
              aria-selected={m.id === value}
              onClick={() => {
                onPick(m.id);
                close();
              }}
              className={PILL_OPTION_CLASS}
            >
              {avatarOf(m.id)}
              <span className="truncate">{nameOf(m.id)}</span>
              {m.archived_at ? <span className="text-[length:var(--text-meta)] text-text-muted">(removed)</span> : null}
            </button>
          ))
        }
      </PillPopover>
    );
  }

  return (
    <form
      onSubmit={(e) => void submit(e)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void submit();
      }}
      className="flex flex-col gap-3.5"
      noValidate
    >
      <div className="flex flex-col gap-2.5 rounded-card p-4 text-on-glow [background:var(--gradient-glow-compact)]">
        <div className="flex items-end gap-2.5">
          <label htmlFor={`${uid}-amount`} className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-[length:var(--text-meta)] font-semibold">Amount</span>
            <input
              id={`${uid}-amount`}
              data-autofocus
              type="text"
              inputMode="decimal"
              autoComplete="off"
              placeholder={centsToInput(0, decimals)}
              value={amount}
              onChange={(e) => {
                setAmount(filterAmountInput(e.target.value));
                setError(null);
              }}
              aria-invalid={error !== null && parsedAmount === null}
              className="box-border h-14 w-full min-w-0 border-0 bg-transparent p-0 text-[length:var(--text-amount-input)] font-extrabold leading-tight tracking-[-0.03em] text-on-glow tabular-nums placeholder:text-on-glow/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-glow"
            />
          </label>
          <span className="flex h-11 shrink-0 items-center rounded-pill bg-on-glow-input px-3.5 font-bold">
            {currencyCode}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 font-semibold">
        <span>From</span>
        {renderPersonPill("From", payerId, pick(setPayerId))}
        <span>to</span>
        {renderPersonPill("To", payeeId, pick(setPayeeId))}
        <span>on</span>
        <DatePill value={date} onChange={setDate} />
      </div>

      <label className="flex flex-col gap-1 text-[length:var(--text-meta)] font-semibold">
        <span className="flex justify-between">
          <span>Note (optional)</span>
          <span className="font-normal text-text-muted tabular-nums">
            {note.length}/{NOTE_MAX}
          </span>
        </span>
        <input
          type="text"
          maxLength={NOTE_MAX}
          placeholder="e.g. e-transfer, cash"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="h-10 rounded-input border-0 bg-surface-sunken px-3 text-[length:var(--text-body)] font-semibold text-text placeholder:font-normal placeholder:text-text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent max-sm:h-11"
        />
      </label>

      {liveImpact ? (
        liveImpact.kind === "paid" ? (
          <StatusStrip
            live={false}
            tone="positive"
            message={`You pay ${nameOf(payeeId)}`}
            detail={
              <>
                You&apos;ll be owed{" "}
                <strong className="tabular-nums">{formatMoney(liveImpact.cents, { currency: currencyCode })}</strong>{" "}
                more
              </>
            }
          />
        ) : liveImpact.kind === "received" ? (
          <StatusStrip
            live={false}
            tone="warning"
            message={`${nameOf(payerId)} pays you`}
            detail={
              <>
                You&apos;ll be owed{" "}
                <strong className="tabular-nums">{formatMoney(liveImpact.cents, { currency: currencyCode })}</strong>{" "}
                less
              </>
            }
          />
        ) : (
          <StatusStrip
            live={false}
            tone="neutral"
            message={`${nameOf(payerId)} pays ${nameOf(payeeId)}`}
            detail="Doesn't change your balance"
          />
        )
      ) : null}

      <p
        role="alert"
        className={`m-0 rounded-tile bg-negative-soft px-3.5 py-2.5 text-[length:var(--text-meta)] font-bold text-negative ${shownError ? "" : "hidden"}`}
      >
        {shownError}
      </p>

      {pending ? (
        <div ref={discardWrapRef}>
          <ConfirmStrip
            title={pending.title}
            body={existing ? "Your changes won't be saved." : "What you've entered won't be saved."}
            cancelLabel="Keep editing"
            confirmLabel="Discard"
            onCancel={() => answerDiscard(false)}
            onConfirm={() => answerDiscard(true)}
          />
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="soft"
            inPanel
            size={48}
            disabled={busy}
            onClick={nav.close}
            className="flex-[1_1_150px]"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            size={48}
            kbd={!submitDisabled ? "⌘↵" : undefined}
            disabled={submitDisabled}
            className="flex-[1_1_150px]"
          >
            {busy ? "Saving…" : existing && !dirty ? "No changes yet" : existing ? "Save changes" : "Save payment"}
          </Button>
        </div>
      )}
    </form>
  );
}
