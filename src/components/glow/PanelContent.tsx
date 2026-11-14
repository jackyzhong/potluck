"use client";

// What goes inside the right panel for each state. These are PLACEHOLDERS (T11
// builds the shell only):
//   details  T12 replaces DetailsPlaceholder with ExpenseDetails (boards 15/16)
//   add/edit T13/T14: ExpenseComposer (edit is for expense ids)
//   payments T15 adds its own states
// Whatever you put here gets the panel header from PanelHeader, marks its first
// meaningful control `data-autofocus`, and reports unsaved input with
// usePanelDirty() (panelStore.ts).

import { Button } from "./Button";
import { ExpenseDetails } from "./ExpenseDetails";
import { Kbd } from "./Kbd";
import { CloseIcon } from "./icons";
import { Money } from "./Money";
import { ExpenseComposer } from "./ExpenseComposer";
import { useGlowData } from "./ViewerProvider";
import { AddPayment, PaymentOr } from "./PaymentPanel";
import { usePanelNav } from "./usePanel";
import type { PanelState } from "@/src/lib/glow/panel";

/**
 * Title row of every panel state (boards 15/17): 20px title, the Esc hint on
 * devices with a keyboard, and a 44px close button. On a phone sheet the row is
 * also the swipe-down handle (`data-panel-grab`).
 */
export function PanelHeader({
  title,
  titleId,
  focusTitle,
  onClose
}: {
  title: string;
  titleId?: string;
  /** Put focus on the title when the panel opens (details: "the title in details"). */
  focusTitle?: boolean;
  onClose: () => void;
}) {
  return (
    <div data-panel-grab className="flex items-center justify-between gap-3">
      <h2
        id={titleId}
        tabIndex={-1}
        data-autofocus={focusTitle ? "" : undefined}
        className="m-0 min-w-0 text-[20px] font-extrabold leading-tight tracking-[-0.01em] outline-none"
      >
        {title}
      </h2>
      <button
        type="button"
        aria-label="Close"
        data-modal-close
        onClick={onClose}
        className="flex h-11 min-w-11 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full border-0 bg-transparent px-1.5 text-text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <Kbd aria-hidden="true">Esc</Kbd>
        <CloseIcon size={20} />
      </button>
    </div>
  );
}

/** What the title row says for a state. */
export function usePanelTitle(state: PanelState): string {
  const { data } = useGlowData();
  switch (state.kind) {
    case "add":
      return "Add expense";
    case "pay":
      return "Add payment";
    case "edit":
      return data.payments.some((p) => p.id === state.id) ? "Edit payment" : "Edit expense";
    case "details": {
      const expense = data.expenses.find((e) => e.id === state.id);
      if (expense) return expense.description?.trim() || "Untitled expense";
      return data.payments.some((p) => p.id === state.id) ? "Payment" : "Details";
    }
    case "empty":
      return "";
  }
}

export function EmptyPlaceholder() {
  const nav = usePanelNav();
  return (
    <div className="flex flex-col items-start gap-4 py-2">
      <p className="m-0 text-text-muted">Select an expense to see how it was split.</p>
      <Button size={48} kbd="N" onClick={nav.openAdd}>
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
