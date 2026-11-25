"use client";

// The details panel for an expense (boards 15/16). Everything is worded from the
// viewer's side by src/lib/glow/details.ts; this file only draws it and runs the
// three actions:
//   Edit       opens the composer in edit mode (?e=<id>&panel=edit, T14)
//   Duplicate  opens the add panel prefilled, split and all
//   Delete     asks inline first (D14), then deleteExpense, with an Undo toast (D26)

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteExpense, restoreExpense } from "@/src/app/ledger/[id]/actions";
import { detailsModel, type RowTone } from "@/src/lib/glow/details";
import { formatMoney } from "@/src/lib/glow/money";
import type { Expense, Split } from "@/src/lib/glow/ledger";
import { Avatar } from "./Avatar";
import { Button } from "./Button";
import { ConfirmStrip } from "./ConfirmStrip";
import { Money } from "./Money";
import { registerUndoDelete } from "./panelStore";
import { useToast } from "./ToastProvider";
import { useGlowData, useViewer } from "./ViewerProvider";
import { usePanelNav } from "./usePanel";
import { useHydrated } from "./useHydrated";
import { setComposerPrefill } from "./composerPrefill";

const DAY = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

// Rows saved after T04 carry these two; older rows have them null.
type ExpenseRow = Expense & { split_mode?: string | null; created_by?: string | null };

const rowTone: Record<RowTone, string> = {
  muted: "text-text-muted",
  positive: "font-semibold text-positive",
  negative: "font-semibold text-negative",
  default: "text-text"
};

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex h-9 items-center gap-2 rounded-full bg-surface-muted-2 px-3 text-[length:var(--text-body)] font-bold">
      {children}
    </span>
  );
}

export function ExpenseDetails({ id }: { id: string }) {
  const { data, currency, slots } = useGlowData();
  const hydrated = useHydrated();
  const { viewerId, members } = useViewer();
  const nav = usePanelNav();
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleted, setDeleted] = useState(false);
  const deleteRef = useRef<HTMLButtonElement>(null);
  const confirmedOnce = useRef(false);

  // ConfirmStrip handles focusing its [data-autofocus] Cancel button; return focus
  // to Delete if dismissed.
  useEffect(() => {
    if (confirming) {
      confirmedOnce.current = true;
    } else if (confirmedOnce.current) {
      deleteRef.current?.focus();
    }
  }, [confirming]);

  const expense = data.expenses.find((e) => e.id === id) as ExpenseRow | undefined;
  const gone = deleted && !expense;
  const { dispatch } = nav;
  useEffect(() => {
    if (gone) dispatch({ type: "deleted" });
  }, [gone, dispatch]);
  // The row can vanish under us (deleted elsewhere, or by us a moment ago).
  if (!expense) return null;

  const shares: Record<string, number> = {};
  for (const s of data.splits) {
    if (s.expense_id === id) shares[s.user_id] = (shares[s.user_id] ?? 0) + s.amount_cents;
  }
  const nameOf = (uid: string) => members.find((m) => m.id === uid)?.name ?? "Unknown";
  const model = detailsModel({
    splitMode: expense.split_mode,
    totalCents: expense.amount_cents,
    payerId: expense.payer_id,
    createdBy: expense.created_by,
    shares,
    memberOrder: data.memberOrder,
    nameOf,
    viewerId,
    dateLabel: hydrated ? DAY.format(new Date(expense.created_at)) : ""
  });

  const slotOf = (uid: string) => slots.get(uid);

  const remove = () => {
    setError(null);
    const snapshotSplits = (data.splits as (Split & { weight?: number | string | null })[])
      .filter((s) => s.expense_id === expense.id)
      .map((s) => ({
        userId: s.user_id,
        amountCents: s.amount_cents,
        weight: s.weight === null || s.weight === undefined ? null : Number(s.weight)
      }));
    const splitMode =
      expense.split_mode === "equal" ||
      expense.split_mode === "exact" ||
      expense.split_mode === "percent" ||
      expense.split_mode === "shares"
        ? expense.split_mode
        : null;
    const snapshot = {
      payerId: expense.payer_id,
      description: expense.description,
      amountCents: expense.amount_cents,
      currency: expense.original_currency,
      createdAt: expense.created_at,
      splitMode,
      createdBy: expense.created_by ?? null,
      splits: snapshotSplits
    };
    startTransition(async () => {
      try {
        const result = await deleteExpense(expense.ledger_id, expense.id);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        registerUndoDelete(expense.id, async () => {
          const res = await restoreExpense(expense.ledger_id, expense.id, snapshot);
          if (res.ok) router.refresh();
          else toast.show(res.error, { variant: "error" });
        });
        // The panel empties once the refreshed rows arrive (the effect above).
        // Rewriting the URL while the refresh is in flight made Next drop it,
        // which left the deleted row on screen.
        setDeleted(true);
        router.refresh();
      } catch {
        setError("Couldn't delete this expense. Check your connection and try again.");
      }
    });
  };

  const expenseCurrency = expense.original_currency || currency;
  const viewerSignedNet =
    viewerId !== null
      ? (expense.payer_id === viewerId ? expense.amount_cents : 0) - (shares[viewerId] ?? 0)
      : 0;
  const deleteBody =
    viewerSignedNet > 0 ? (
      <>
        It&apos;ll be removed for everyone, and you&apos;ll be owed{" "}
        <strong className="tabular-nums">{formatMoney(viewerSignedNet, { currency: expenseCurrency })}</strong> less.
      </>
    ) : viewerSignedNet < 0 ? (
      <>
        It&apos;ll be removed for everyone, and you&apos;ll owe{" "}
        <strong className="tabular-nums">{formatMoney(-viewerSignedNet, { currency: expenseCurrency })}</strong> less.
      </>
    ) : (
      "It'll be removed for everyone."
    );

  const impact = model.impact;
  return (
    <>
      <div className="-mt-1">
        <div className="text-[44px] font-extrabold leading-[1.05] tracking-[-0.03em]">
          <Money cents={expense.amount_cents} currency={expense.original_currency || currency} />
        </div>
        <div className="mt-1 min-h-[1lh] text-[length:var(--text-meta)] text-text-muted">
          {/* The day depends on the viewer's time zone, so it waits for the browser (useHydrated). */}
          {hydrated ? model.meta : null}
        </div>
      </div>

      {impact ? (
        <div
          className={`flex items-center justify-between gap-3 rounded-[14px] px-3.5 py-3 ${
            impact.kind === "share" ? "bg-negative-soft" : "bg-positive-soft"
          }`}
        >
          <span className="font-semibold">{impact.label}</span>
          {impact.kind === "none" ? null : (
            <Money
              cents={impact.cents}
              currency={currency}
              signed
              tone={impact.kind === "lent" ? "positive" : "negative"}
              className="text-[18px] font-extrabold"
            />
          )}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-x-2 gap-y-2 text-[length:var(--text-body)]">
        <span>Paid by</span>
        <Pill>
          {model.payerIsViewer ? (
            <Avatar name="You" variant="you" size={28} />
          ) : (
            <Avatar name={model.payerName} id={expense.payer_id} slot={slotOf(expense.payer_id)} size={28} />
          )}
          {model.payerName}
        </Pill>
        <span>and split</span>
        <Pill>{model.splitText}</Pill>
      </div>

      <ul className="m-0 flex list-none flex-col border-b border-line p-0">
        {model.rows.map((row) => (
          <li
            key={row.id}
            className="flex min-h-11 items-center gap-3 border-t border-line py-1.5 text-[length:var(--text-body)]"
          >
            {row.isViewer ? (
              <Avatar name="You" variant="you" size={32} />
            ) : (
              <Avatar name={row.name} id={row.id} slot={slotOf(row.id)} size={32} />
            )}
            <span className={`min-w-0 flex-1 truncate ${row.isViewer ? "font-bold" : ""}`}>{row.name}</span>
            <span className={`text-right ${rowTone[row.tone]}`}>
              {row.prefix}
              {row.cents === null ? null : (
                <>
                  {" "}
                  <Money cents={row.cents} currency={currency} />
                </>
              )}
            </span>
          </li>
        ))}
      </ul>

      {error ? (
        <p role="alert" className="m-0 text-[length:var(--text-meta)] font-semibold text-negative">
          {error}
        </p>
      ) : null}

      {confirming ? (
        <ConfirmStrip
          title="Delete this expense?"
          body={deleteBody}
          cancelLabel="Cancel"
          confirmLabel="Delete expense"
          confirmBusyLabel="Deleting…"
          busy={pending}
          onCancel={() => {
            setConfirming(false);
            setError(null);
          }}
          onConfirm={remove}
        />
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <Button size={48} kbd="E" onClick={() => nav.openEdit()} className="flex-[1_1_110px]">
            Edit
          </Button>
          <Button
            size={48}
            variant="secondary"
            className="flex-[1_1_110px]"
            onClick={() => {
              // Same description, amount, payer and split (mode and weights too);
              // dated today (docs/03).
              const rows = (data.splits as (Split & { weight?: number | string | null })[])
                .filter((s) => s.expense_id === id)
                .map((s) => ({ userId: s.user_id, amountCents: s.amount_cents, weight: s.weight ?? null }));
              setComposerPrefill({
                description: expense.description,
                amountCents: expense.amount_cents,
                payerId: expense.payer_id,
                participantIds: rows.map((r) => r.userId),
                splitMode: expense.split_mode ?? null,
                splits: rows
              });
              nav.openAdd();
            }}
          >
            Duplicate
          </Button>
          <Button
            ref={deleteRef}
            size={48}
            variant="text"
            tone="negative"
            onClick={() => setConfirming(true)}
          >
            Delete
          </Button>
        </div>
      )}
    </>
  );
}
