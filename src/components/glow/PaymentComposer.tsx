"use client";

// Add and edit a payment in the right panel (decision D16, T15). Same shell as
// the expense composer (board 09): the amount sits on the gradient card, the
// controls below it, one primary Save at the bottom. A payment is "From [●] to
// [●]": money one member actually handed to another (docs/payments-design.md).
//
// Saves through the `savePayment` server action, then `router.refresh()`, then
// `dispatch({ type: "saved" })`. Errors show inline (D15), never in a browser dialog.

import { useEffect, useId, useMemo, useState, type FormEvent } from "react";
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
  paymentProblem
} from "@/src/lib/glow/payment";
import { filterAmountInput } from "@/src/lib/glow/composer";
import type { Payment } from "@/src/lib/glow/ledger";
import type { AvatarSlot } from "@/src/lib/glow/avatar";
import { Avatar } from "./Avatar";
import { Button } from "./Button";
import { ChevronDownIcon } from "./icons";
import { peekPaymentPrefill, setPaymentPrefill } from "./paymentPrefill";
import { usePanelDirty } from "./panelStore";
import { usePanelNav } from "./usePanel";
import { useGlowData, useViewer } from "./ViewerProvider";

const NOTE_MAX = 50;

const pill =
  "relative inline-flex h-11 min-w-0 items-center gap-2 rounded-pill bg-surface-muted-2 pl-1.5 pr-3 font-bold text-text focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent";

type Person = { id: string; name: string; archived_at?: string | null };

/** A native <select> dressed as the board's pill, with the chosen person's avatar. */
function PersonSelect({
  id,
  label,
  value,
  onChange,
  options,
  viewerId,
  slots
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Person[];
  viewerId: string | null;
  slots: Map<string, AvatarSlot>;
}) {
  const member = options.find((m) => m.id === value);
  return (
    <span className={pill}>
      {member ? (
        <Avatar
          name={member.name}
          id={member.id}
          slot={slots.get(member.id)}
          variant={member.id === viewerId ? "you" : "member"}
          size={32}
        />
      ) : (
        <span aria-hidden="true" className="size-8 shrink-0 rounded-full border border-dashed border-line-strong" />
      )}
      <select
        id={id}
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-w-0 max-w-[140px] cursor-pointer appearance-none truncate border-0 bg-transparent py-2 pr-5 font-bold text-text outline-none max-sm:h-11"
      >
        <option value="" disabled>
          Choose…
        </option>
        {options.map((m) => (
          <option key={m.id} value={m.id}>
            {m.id === viewerId ? "You" : m.name}
            {m.archived_at ? " (removed)" : ""}
          </option>
        ))}
      </select>
      <ChevronDownIcon size={16} className="pointer-events-none absolute right-3 text-text-muted" />
    </span>
  );
}

export function PaymentComposer({ paymentId }: { paymentId?: string }) {
  const router = useRouter();
  const { id: ledgerId } = useParams<{ id: string }>();
  const nav = usePanelNav();
  const { data, currency: baseCurrency, slots } = useGlowData();
  const { viewer, members } = useViewer();
  const uid = useId();

  const existing = paymentId ? data.payments.find((p) => p.id === paymentId) : undefined;

  // Edit in whatever currency the payment was recorded in, so an edit can't
  // relabel it if the group's base currency has changed since.
  const currencyCode = existing?.original_currency ?? baseCurrency;
  const decimals = currencyDecimals(CURRENCIES[currencyCode] ? currencyCode : "CAD");

  // Seeded once: an edit from the row, a "Mark paid" prefill, or a blank form
  // where the viewer is the payer.
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

  // Untouched (null) a new payment is from the viewer, who may only be known a
  // moment after first render (the saved choice is read from the browser).
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
  // After an add, wait for the refreshed rows to include the new payment before
  // opening its details; otherwise the unknown ?e= would be dropped.
  // An edit waits for its new values to show up in the rows. Switching the panel
  // (a history.replaceState) while router.refresh() is in flight makes Next drop
  // the refresh, so the panel only moves once the refreshed rows have arrived.
  const [saved, setSaved] = useState<{ id: string; arrived: (p: Payment) => boolean } | null>(null);
  const savedId = saved?.id ?? null;

  const dirty =
    payerId !== defaultPayer ||
    payeeId !== initial.payeeId ||
    amount !== initial.amount ||
    note !== initial.note ||
    date !== initial.date;
  usePanelDirty(dirty && savedId === null);

  // Removed members aren't offered for a new payment, but an edit (or a debt
  // being settled) keeps the people it is already about.
  const pickable = useMemo(
    () => pickableMembers(members, [existing?.payer_id, existing?.payee_id, initial.payerId, initial.payeeId].filter(Boolean) as string[]),
    [members, existing, initial.payerId, initial.payeeId]
  );

  const { dispatch } = nav;
  useEffect(() => {
    if (!saved) return;
    const row = data.payments.find((p) => p.id === saved.id);
    if (row && saved.arrived(row)) dispatch({ type: "saved", id: saved.id });
  }, [saved, data.payments, dispatch]);
  // If the refresh never brings the row (offline), don't leave the form stuck.
  useEffect(() => {
    if (!savedId) return;
    const t = window.setTimeout(() => dispatch({ type: "saved", id: savedId }), 4000);
    return () => window.clearTimeout(t);
  }, [savedId, dispatch]);

  const sameSide = payerId !== "" && payerId === payeeId;
  const liveProblem = sameSide ? "Pick two different people." : null;

  async function submit(e?: FormEvent) {
    e?.preventDefault();
    if (saving || savedId) return;
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
      createdAt
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

  const people = { options: pickable, viewerId: viewer?.id ?? null, slots };
  const pick = (set: (v: string) => void) => (v: string) => {
    set(v);
    setError(null);
  };
  const shownError = error ?? liveProblem;
  const busy = saving || savedId !== null;

  return (
    <form
      onSubmit={submit}
      onKeyDown={(e) => {
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void submit();
      }}
      className="flex flex-col gap-3.5"
      noValidate
    >
      <div className="rounded-hero p-4 text-on-glow [background:var(--gradient-glow)]">
        <label htmlFor={`${uid}-amount`} className="text-[length:var(--text-body)] font-bold">
          Amount
        </label>
        <div className="mt-1 flex items-center justify-between gap-3">
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
            aria-invalid={error !== null && parsePaymentAmountCents(amount, decimals) === null}
            className="min-w-0 flex-1 border-0 bg-transparent p-0 text-[length:var(--text-amount-input)] font-extrabold leading-tight tracking-[-0.03em] text-on-glow placeholder:text-on-glow/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-glow"
          />
          <span className="shrink-0 rounded-pill bg-on-glow-tile px-3.5 py-2 font-bold">{currencyCode}</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2">
        <span className="font-semibold">From</span>
        <PersonSelect {...people} id={`${uid}-from`} label="Who paid" value={payerId} onChange={pick(setPayerId)} />
        <span className="font-semibold">to</span>
        <PersonSelect {...people} id={`${uid}-to`} label="Who received it" value={payeeId} onChange={pick(setPayeeId)} />
      </div>

      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2">
        <label htmlFor={`${uid}-date`} className="font-semibold">
          on
        </label>
        <input
          id={`${uid}-date`}
          type="date"
          value={date}
          onChange={(e) => {
            if (e.target.value) setDate(e.target.value);
          }}
          className="h-11 rounded-pill border-0 bg-surface-muted-2 px-4 font-bold text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        />
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
          className="h-11 rounded-input border border-line-strong bg-surface-sunken px-3 text-[length:var(--text-body)] font-normal text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        />
      </label>

      <p
        role="alert"
        className={`m-0 rounded-tile bg-negative-soft px-3.5 py-2.5 text-[length:var(--text-meta)] font-bold text-negative ${shownError ? "" : "hidden"}`}
      >
        {shownError}
      </p>

      <Button type="submit" size={48} kbd="⌘↵" disabled={busy} className="w-full">
        {busy ? "Saving…" : existing ? "Save changes" : "Save payment"}
      </Button>
    </form>
  );
}
