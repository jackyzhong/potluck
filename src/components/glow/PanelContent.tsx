"use client";

// What goes inside the right panel for each state. These are PLACEHOLDERS (T11
// builds the shell only):
//   details  T12 replaces DetailsPlaceholder with ExpenseDetails (boards 15/16)
//   add/edit T13/T14: ExpenseComposer (edit is for expense ids)
//   payments T15 adds its own states
// Whatever you put here gets the panel header from PanelHeader, marks its first
// meaningful control `data-autofocus`, and reports unsaved input with
// usePanelDirty() (panelStore.ts).

import type { ReactNode } from "react";
import { paymentTitle } from "@/src/lib/glow/payment";
import { Button } from "./Button";
import { ExpenseDetails } from "./ExpenseDetails";
import { Kbd } from "./Kbd";
import { CloseIcon } from "./icons";
import { Money } from "./Money";
import { ExpenseComposer } from "./ExpenseComposer";
import { useGlowData, useViewer } from "./ViewerProvider";
import { AddPayment, PaymentOr } from "./PaymentPanel";
import { ManageMembersPanel } from "./ManageMembersPanel";
import { usePanelNav } from "./usePanel";
import type { PanelLayout, PanelState } from "@/src/lib/glow/panel";

/**
 * Title row of every panel state (boards 15/17/44/58): 20px title (plus optional
 * subtitle or inline tag), Esc + close on inline desktop, and a 44px round
 * tonal close button in the tablet drawer and phone bottom sheet.
 */
export function PanelHeader({
  title,
  subtitle,
  badge,
  titleId,
  layout = "inline",
  focusTitle,
  onClose
}: {
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  titleId?: string;
  layout?: PanelLayout;
  /** Put focus on the title when the panel opens (details: "the title in details"). */
  focusTitle?: boolean;
  onClose: () => void;
}) {
  const tonalClose = layout !== "inline";
  return (
    <div data-panel-grab className="flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2
            id={titleId}
            tabIndex={-1}
            data-autofocus={focusTitle ? "" : undefined}
            className="m-0 min-w-0 text-[20px] font-extrabold leading-tight tracking-[-0.01em] outline-none"
          >
            {title}
          </h2>
          {badge}
        </div>
        {subtitle ? (
          <p className="m-0 mt-0.5 text-[length:var(--text-meta)] text-text-muted">{subtitle}</p>
        ) : null}
      </div>
      <button
        type="button"
        aria-label="Close"
        data-modal-close
        onClick={onClose}
        className={
          tonalClose
            ? "flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-pill border-0 bg-surface-muted-2 text-text transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            : "flex h-11 min-w-11 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full border-0 bg-transparent px-1.5 text-text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        }
      >
        {tonalClose ? null : <Kbd aria-hidden="true">Esc</Kbd>}
        <CloseIcon size={20} />
      </button>
    </div>
  );
}

/** What the title row says for a state. */
export function usePanelTitle(state: PanelState): string {
  const { data } = useGlowData();
  const { viewerId, members } = useViewer();
  switch (state.kind) {
    case "add":
      return "Add expense";
    case "pay":
      return "Add payment";
    case "members":
      return "Manage members";
    case "edit":
      return data.payments.some((p) => p.id === state.id) ? "Edit payment" : "Edit expense";
    case "details": {
      const expense = data.expenses.find((e) => e.id === state.id);
      if (expense) return expense.description?.trim() || "Untitled expense";
      const payment = data.payments.find((p) => p.id === state.id);
      if (payment) {
        const nameOf = (uid: string) => members.find((m) => m.id === uid)?.name ?? "Someone";
        return paymentTitle(
          { name: nameOf(payment.payer_id), isViewer: payment.payer_id === viewerId },
          { name: nameOf(payment.payee_id), isViewer: payment.payee_id === viewerId }
        );
      }
      return "Details";
    }
    case "empty":
      return "";
  }
}

/** Optional inline tag next to the title (Payment tag on payment details, T31). */
export function usePanelBadge(state: PanelState): ReactNode {
  const { data } = useGlowData();
  if (state.kind !== "details") return undefined;
  if (!data.payments.some((p) => p.id === state.id)) return undefined;
  return (
    <span className="rounded-[10px] bg-positive-tag-bg px-2 py-0.5 text-[length:var(--text-small)] font-semibold text-positive-tag-fg">
      Payment
    </span>
  );
}

/** Optional secondary line under the panel title (currently Manage members count). */
export function usePanelSubtitle(state: PanelState): string | undefined {
  const { members } = useViewer();
  if (state.kind !== "members") return undefined;
  const count = members.filter((m) => !m.archived_at).length;
  return `${count} ${count === 1 ? "person" : "people"} in this group`;
}

export function EmptyPlaceholder() {
  const nav = usePanelNav();
  return (
    <div className="flex flex-col items-center gap-3.5 py-8 text-center">
      <p className="m-0 text-text-muted">Select an expense to see how it was split.</p>
      <Button variant="soft" inPanel size={44} kbd="N" onClick={nav.openAdd}>
        Add expense
      </Button>
    </div>
  );
}

function DetailsPlaceholder({ id }: { id: string }) {
  const { data, currency } = useGlowData();
  const nav = usePanelNav();
  const expense = data.expenses.find((e) => e.id === id);
  const payment = expense ? undefined : data.payments.find((p) => p.id === id);
  const cents = expense?.amount_cents ?? payment?.amount_cents ?? 0;
  return (
    <>
      <span className="text-[44px] font-extrabold leading-[1.05] tracking-[-0.03em]">
        <Money cents={cents} currency={currency} />
      </span>
      {expense ? (
        <div className="flex flex-wrap gap-2">
          <Button size={48} kbd="E" onClick={nav.openEdit} className="flex-[1_1_110px]">
            Edit
          </Button>
        </div>
      ) : null}
    </>
  );
}

// Expenses get ExpenseDetails (T12). Payment ids are caught by PaymentOr (T15) before
// this runs, so the placeholder branch below is only a fallback.
function DetailsBody({ id }: { id: string }) {
  const { data } = useGlowData();
  if (data.payments.some((p) => p.id === id)) return <DetailsPlaceholder id={id} />;
  // Not a payment: an expense, which may be mid-delete (ExpenseDetails copes).
  return <ExpenseDetails id={id} />;
}

/** Everything below the header, for one state. */
export function PanelBody({ state }: { state: PanelState }) {
  switch (state.kind) {
    case "empty":
      return <EmptyPlaceholder />;
    case "details":
      return (
        <PaymentOr id={state.id} mode="details">
          <DetailsBody id={state.id} />
        </PaymentOr>
      );
    case "pay":
      return <AddPayment />;
    case "members":
      return <ManageMembersPanel />;
    case "add":
      return <ExpenseComposer />;
    case "edit":
      return (
        <PaymentOr id={state.id} mode="edit">
          {/* Keyed by id so editing one expense never carries another's form. */}
          <ExpenseComposer key={state.id} editId={state.id} />
        </PaymentOr>
      );
  }
}
