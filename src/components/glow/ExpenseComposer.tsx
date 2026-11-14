"use client";

// The expense composer: add and edit, all four split modes (T13, T14). Boards
// 09/10 (add, Equally), 11/12 (Exact), 13/14 (Percent), 17/18 (phone sheet);
// docs/01 "Add expense", docs/03 `ExpenseComposer`, docs/04 "Composer behaviour".
//
// Anatomy, top to bottom: the gradient card (description, amount, currency) ·
// "Paid by [●] on [date]" · split-mode tabs · the Equally body · status strip ·
// actions. The panel title row above it comes from `PanelHeader`.
//
// The maths is T03's, reached through `src/lib/glow/composerSplit.ts`:
// `splitAmounts` (Equally, Percent, Shares) for the cents, `composerImpact` for
// the viewer's line, `checkSplit` for validity. Nothing here divides money.
// Saving goes through `saveExpense` with the split mode, and `weight` for
// Percent and Shares. Edit reopens the stored mode with its stored numbers
// (D13); a row from before modes were stored opens in Exact.

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode
} from "react";
import { useParams, useRouter } from "next/navigation";
import { deleteExpense, saveExpense } from "@/src/app/ledger/[id]/actions";
import { CURRENCIES, CURRENCY_LIST } from "@/src/lib/currencies";
import {
  blankExactIds,
  blankRowFill,
  blankRowsLabel,
  checkSplit,
  composerImpact,
  createdAtFor,
  dayLabel,
  dayString,
  DELETE_PROMPT,
  emptyForm,
  equalSplitExtraCentMembers,
  formatMoney,
  formCents,
  formToSplits,
  joinNames,
  filterAmountInput,
  parseAmountCents,
  reopenSplit,
  restrictForm,
  rowsShowSave,
  seedForMode,
  splitTotals,
  type Expense,
  type SaveSnapshot,
  type Split,
  type SplitCheckInput,
  type SplitForm,
  type SplitMode
} from "@/src/lib/glow";
import { pickableMembers } from "@/src/lib/members";
import { Avatar } from "./Avatar";
import { Button } from "./Button";
import { CheckIcon, ChevronDownIcon } from "./icons";
import { Money } from "./Money";
import { SegmentedControl } from "./SegmentedControl";
import { StatusStrip } from "./StatusStrip";
import { clearComposerPrefill, peekComposerPrefill } from "./composerPrefill";
import { usePanelDirty } from "./panelStore";
import { ExactBody, PercentBody, SharesBody, type SplitRow } from "./SplitBodies";
import { usePanelNav } from "./usePanel";
import { useDismiss } from "./useDismiss";
import { useIsPhone } from "./useIsPhone";
import { useGlowData, useViewer } from "./ViewerProvider";

const DESCRIPTION_MAX = 50;
const SAVE_FAILED = "Couldn't save that. Check your connection and try again.";

type Mode = SplitMode;
const MODES = [
  { value: "equal", label: "Equally" },
  { value: "exact", label: "Exact" },
  { value: "percent", label: "Percent" },
  { value: "shares", label: "Shares" }
] as const satisfies readonly { value: Mode; label: string }[];

// ---------- a small popover for the three pills ----------

/**
 * A pill button that opens a menu under it. Esc, an outside press and Tab close
 * it; arrow keys move between the items marked `data-nav`; focus goes to the
 * chosen item on open and back to the pill on close.
 */
function PillPopover({
  trigger,
  triggerClassName,
  ariaLabel,
  menuLabel,
  menuRole,
  align = "left",
  children
}: {
  trigger: ReactNode;
  triggerClassName: string;
  ariaLabel: string;
  menuLabel: string;
  menuRole: "listbox" | "group";
  align?: "left" | "right";
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);

  // Focus goes back to the pill through an effect, so no ref is read in render.
  const [refocus, setRefocus] = useState(0);
  const close = (returnFocus = true) => {
    setOpen(false);
    if (returnFocus) setRefocus((n) => n + 1);
  };
  useEffect(() => {
    if (refocus > 0) button.current?.focus();
  }, [refocus]);
  useDismiss(open, () => close(), [wrap]);

  useEffect(() => {
    if (!open) return;
    const items = menu.current?.querySelectorAll<HTMLElement>("[data-nav]");
    const chosen = menu.current?.querySelector<HTMLElement>('[data-nav][aria-selected="true"], [data-nav][aria-pressed="true"]');
    (chosen ?? items?.[0])?.focus();
  }, [open]);

  function onMenuKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Tab") return close(false);
    const items = Array.from(menu.current?.querySelectorAll<HTMLElement>("[data-nav]") ?? []);
    const i = items.indexOf(document.activeElement as HTMLElement);
    let next = -1;
    if (e.key === "ArrowDown") next = (i + 1) % items.length;
    else if (e.key === "ArrowUp") next = (i - 1 + items.length) % items.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = items.length - 1;
    if (next < 0) return;
    e.preventDefault();
    items[next]?.focus();
  }

  return (
    <div ref={wrap} className="relative">
      <button
        ref={button}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup={menuRole === "listbox" ? "listbox" : "dialog"}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`flex cursor-pointer items-center border-0 font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${triggerClassName}`}
      >
        {trigger}
        <ChevronDownIcon size={16} />
      </button>
      {open ? (
        <div
          ref={menu}
          role={menuRole === "group" ? "group" : "listbox"}
          aria-label={menuLabel}
          onKeyDown={onMenuKeyDown}
          style={{ border: "var(--menu-border)" }}
          className={`absolute top-full z-20 mt-1 box-border flex min-w-[200px] max-w-[min(300px,calc(100vw-48px))] flex-col gap-0.5 rounded-card bg-surface p-1.5 text-text shadow-menu ${align === "right" ? "right-0" : "left-0"}`}
        >
          {children(() => close())}
        </div>
      ) : null}
    </div>
  );
}

const optionClass =
  "flex min-h-11 w-full cursor-pointer items-center gap-2.5 rounded-tile border-0 bg-transparent px-2.5 text-left font-semibold text-text hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent aria-selected:bg-surface-muted aria-pressed:bg-surface-muted";

// ---------- the composer ----------

// Rows saved after T04 carry these; older rows have them null.
type ExpenseRow = Expense & { split_mode?: string | null; created_by?: string | null };
type SplitRowData = Split & { weight?: number | string | null };

const WAIT_FOR_ROWS_MS = 5000;

/**
 * `editId` set: edit that expense, reopened in the mode it was saved in.
 * Left out: a new expense (possibly prefilled by Duplicate).
 */
export function ExpenseComposer({ editId }: { editId?: string }) {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const ledgerId = params.id;
  const nav = usePanelNav();
  const isPhone = useIsPhone();
  const { data, currency: baseCurrency, slots } = useGlowData();
  const { viewerId, pickable, members } = useViewer();
  const editing = editId !== undefined;

  // Edit works from a snapshot of the stored rows, taken once: the form must not
  // change under the person's hands when a refresh brings new data.
  const [original] = useState(() => {
    if (!editId) return null;
    const expense = data.expenses.find((e) => e.id === editId) as ExpenseRow | undefined;
    if (!expense) return null;
    return { expense, splits: data.splits.filter((s) => s.expense_id === editId) as SplitRowData[] };
  });

  // A Duplicate (T12) leaves a prefill for exactly one opening. Read it for the
  // first render; clear it after mount (an effect, so React's dev double render
  // can't use it up before the real one).
  const [prefill] = useState(() => (editing ? null : peekComposerPrefill()));
  useEffect(() => {
    clearComposerPrefill();
  }, []);

  const [description, setDescription] = useState(original?.expense.description ?? prefill?.description ?? "");
  const [currency, setCurrency] = useState(original?.expense.original_currency || baseCurrency);
  const decimals = (CURRENCIES[currency] ?? CURRENCIES[baseCurrency] ?? CURRENCIES.CAD).decimals;
  const [amountText, setAmountText] = useState(() => {
    const cents = original?.expense.amount_cents ?? prefill?.amountCents;
    return cents === undefined ? "" : (cents / 10 ** decimals).toFixed(decimals);
  });
  // The payer is the viewer until someone picks another (the viewer may only
  // be known after the first render, so it isn't copied into state).
  const [chosenPayer, setChosenPayer] = useState<string | null>(
    original?.expense.payer_id ?? prefill?.payerId ?? null
  );
  const payerId = chosenPayer ?? viewerId;
  const [date, setDate] = useState(() =>
    dayString(original ? new Date(original.expense.created_at) : new Date())
  );

  // Who gets a row: everyone in the group, plus anyone archived who is already
  // on the expense being edited (so saving doesn't silently drop them).
  const rowMembers = useMemo(
    () =>
      editing && original
        ? pickableMembers(members, [original.expense.payer_id, ...original.splits.map((s) => s.user_id)])
        : pickable,
    [editing, original, members, pickable]
  );
  const rowIds = useMemo(() => rowMembers.map((m) => m.id), [rowMembers]);

  const [form, setForm] = useState<SplitForm>(() => {
    const stored = original
      ? {
          mode: original.expense.split_mode,
          rows: original.splits.map((s) => ({ userId: s.user_id, amountCents: s.amount_cents, weight: s.weight }))
        }
      : prefill?.splits
        ? { mode: prefill.splitMode, rows: prefill.splits }
        : null;
    if (stored) {
      const reopened = restrictForm(reopenSplit(stored.mode, stored.rows, decimals), rowIds);
      if (reopened.mode !== "equal" || reopened.included.length > 0) return reopened;
    }
    const fresh = emptyForm(rowIds);
    if (prefill) {
      const wanted = new Set(prefill.participantIds);
      const kept = rowIds.filter((id) => wanted.has(id));
      if (kept.length > 0) fresh.included = kept;
    }
    return fresh;
  });
  // Which tabs hold the person's own numbers. A tab that doesn't is filled from
  // the tab they leave when they switch to it (docs/03).
  const [touched, setTouched] = useState<Record<Mode, boolean>>(() => ({
    equal: false,
    exact: false,
    percent: false,
    shares: false,
    [form.mode]: true
  }));
  const mode = form.mode;

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<{ id: string; snapshot: SaveSnapshot } | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const amountRef = useRef<HTMLInputElement>(null);
  const saveRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const deleteRef = useRef<HTMLButtonElement>(null);
  const confirmedOnce = useRef(false);
  const tabsId = useId();

  // Unsaved input: add asks once something is typed; edit asks once anything
  // differs from what was opened.
  const signature = JSON.stringify([description, amountText, currency, chosenPayer, date, form]);
  const [openedSignature] = useState(signature);
  usePanelDirty(
    editing ? signature !== openedSignature : description.trim() !== "" || amountText.trim() !== ""
  );

  // Focus the safe choice when the delete question appears, and hand focus back
  // to Delete if it is dismissed (as in the details panel).
  useEffect(() => {
    if (confirming) {
      confirmedOnce.current = true;
      cancelRef.current?.focus();
    } else if (confirmedOnce.current) {
      deleteRef.current?.focus();
    }
  }, [confirming]);

  // ----- numbers (all from T03, through composerSplit) -----
  const memberOrder = data.memberOrder;
  const parsedAmount = parseAmountCents(amountText, decimals);
  const total = parsedAmount !== null && parsedAmount > 0 ? parsedAmount : null;
  const hasAmount = total !== null;
  const totals = useMemo(() => splitTotals(form, decimals), [form, decimals]);
  const cents = useMemo(
    () => (total === null ? {} : formCents(total, form, decimals, memberOrder)),
    [total, form, decimals, memberOrder]
  );
  const extraCentIds = useMemo(
    () => (total !== null && mode === "equal" ? equalSplitExtraCentMembers(total, form.included, memberOrder) : []),
    [total, mode, form.included, memberOrder]
  );
  const format = (c: number) => formatMoney(c, { currency });

  const splitInput: SplitCheckInput =
    mode === "equal"
      ? { mode, includedCount: form.included.length }
      : mode === "exact"
        ? { mode, sumCents: totals.exactSum }
        : mode === "percent"
          ? { mode, sumHundredths: totals.percentSum }
          : { mode, totalShares: totals.shareTotal };
  const check = checkSplit({ amountCents: total, split: splitInput, format });
  const impact =
    check.strip?.detail?.kind === "impact" && total !== null && viewerId && payerId
      ? composerImpact({ viewerId, payerId, amountCents: total, shares: cents })
      : null;

  const nameOf = (id: string, lower = false) => {
    if (id === viewerId) return lower ? "you" : "You";
    return members.find((m) => m.id === id)?.name ?? "";
  };
  const avatarOf = (id: string, size: 32 | 28 = 32) => {
    const name = nameOf(id);
    return id === viewerId ? (
      <Avatar name={name} variant="you" size={size} />
    ) : (
      <Avatar name={name} slot={slots.get(id)} id={id} size={size} />
    );
  };
  const rows: SplitRow[] = rowMembers.map((m) => ({
    id: m.id,
    name: nameOf(m.id),
    possessive: m.id === viewerId ? "Your" : `${nameOf(m.id)}'s`,
    avatar: avatarOf(m.id)
  }));

  // ----- can it be saved? The reason is the Save button's label (docs/04) -----
  const blockedReason: string | null = !hasAmount
    ? check.blockedLabel
    : !payerId
      ? "Choose who paid"
      : check.blockedLabel;
  const blocked = blockedReason !== null;

  // ----- changing numbers -----
  function changeMode(next: Mode) {
    if (next === mode) return;
    setForm((cur) => {
      const seeded =
        next !== "equal" && !touched[next]
          ? seedForMode(next, cur, { totalCents: total, decimals, memberOrder, everyoneIds: rowIds })
          : {};
      return { ...cur, ...seeded, mode: next };
    });
  }
  const touch = (m: Mode) => setTouched((t) => (t[m] ? t : { ...t, [m]: true }));
  const setExactText = (id: string, text: string) => {
    touch("exact");
    setForm((cur) => ({ ...cur, exact: { ...cur.exact, [id]: text } }));
  };
  const setPercentText = (id: string, text: string) => {
    touch("percent");
    setForm((cur) => ({ ...cur, percent: { ...cur.percent, [id]: text } }));
  };
  const setShareCount = (id: string, n: number) => {
    touch("shares");
    setForm((cur) => ({ ...cur, shares: { ...cur.shares, [id]: n } }));
  };
  const toggleIncluded = (id: string) => {
    touch("equal");
    setForm((cur) => ({
      ...cur,
      included: cur.included.includes(id) ? cur.included.filter((x) => x !== id) : [...cur.included, id]
    }));
  };

  // Exact's helper: what's left, shared across the rows with nothing typed.
  const blankIds = mode === "exact" ? blankExactIds(form, rowIds) : [];
  const remaining = total === null ? 0 : total - totals.exactSum;
  const showFill = mode === "exact" && remaining > 0 && blankIds.length > 0;
  function fillBlankRows() {
    const fill = blankRowFill(remaining, blankIds, memberOrder);
    touch("exact");
    setForm((cur) => ({
      ...cur,
      exact: {
        ...cur.exact,
        ...Object.fromEntries(Object.entries(fill).map(([id, c]) => [id, (c / 10 ** decimals).toFixed(decimals)]))
      }
    }));
    // The helper disappears once the rows are full; keep focus somewhere real.
    saveRef.current?.focus();
  }

  async function save(addAnother: boolean) {
    if (blocked || saving || confirming || total === null || !payerId) return;
    // An edit that keeps its day keeps its exact time too, so the row doesn't
    // jump in the ledger. A new day is written per D7.
    const unchangedDay = original && date === dayString(new Date(original.expense.created_at));
    const createdAt = unchangedDay ? original.expense.created_at : createdAtFor(date, new Date());
    if (!createdAt) {
      setError("Pick a valid date.");
      return;
    }
    const splits = formToSplits(total, form, decimals, memberOrder);
    const trimmed = description.trim() === "" ? null : description;
    setSaving(true);
    setError(null);
    try {
      const result = await saveExpense(ledgerId, editId ?? null, {
        payerId,
        description: trimmed,
        amountCents: total,
        currency,
        createdAt,
        splitMode: mode,
        // "Added by" names whoever first added it; the database ignores this on edit.
        createdBy: editing ? null : viewerId,
        splits
      });
      if (!result.ok) {
        setError(result.error);
        setSaving(false);
        return;
      }
      router.refresh();
      if (addAnother) {
        // Keep payer, date, mode and participants; start the next one. Exact
        // amounts belonged to the last total, so they go; percentages and
        // shares still mean something.
        setDescription("");
        setAmountText("");
        setForm((cur) => ({ ...cur, exact: {} }));
        setTouched((t) => ({ ...t, exact: false }));
        setSaving(false);
        nav.dispatch({ type: "saved", id: result.data.id, another: true });
        amountRef.current?.focus();
      } else {
        // Wait for the refreshed rows to show the change before the panel
        // switches to details, or the URL rewrite would race the refresh and
        // Next would drop it (see the effect below).
        setSaved({
          id: result.data.id,
          snapshot: {
            amountCents: total,
            payerId,
            description: trimmed,
            splitMode: mode,
            day: date,
            splits
          }
        });
      }
    } catch {
      setError(SAVE_FAILED);
      setSaving(false);
    }
  }

  useEffect(() => {
    if (!saved) return;
    const arrived = editing
      ? rowsShowSave(
          data.expenses.find((e) => e.id === saved.id),
          data.splits.filter((s) => s.expense_id === saved.id) as SplitRowData[],
          saved.snapshot,
          (iso) => dayString(new Date(iso))
        )
      : data.expenses.some((e) => e.id === saved.id);
    if (arrived) {
      nav.dispatch({ type: "saved", id: saved.id });
      return;
    }
    // The refresh never showed it (someone else changed it, or the network
    // dropped). Move on rather than leave the form spinning.
    const timer = setTimeout(() => nav.dispatch({ type: "saved", id: saved.id }), WAIT_FOR_ROWS_MS);
    return () => clearTimeout(timer);
  }, [saved, editing, data.expenses, data.splits, nav]);

  async function remove() {
    if (!editId || deleting) return;
    setDeleting(true);
    setError(null);
    try {
      const result = await deleteExpense(ledgerId, editId);
      if (!result.ok) {
        setError(result.error);
        setDeleting(false);
        return;
      }
      // The panel empties once the refreshed rows no longer have it (effect below).
      setDeleted(true);
      router.refresh();
    } catch {
      setError("Couldn't delete this expense. Check your connection and try again.");
      setDeleting(false);
    }
  }

  useEffect(() => {
    if (!deleted) return;
    if (!data.expenses.some((e) => e.id === editId)) {
      nav.dispatch({ type: "deleted" });
      return;
    }
    const timer = setTimeout(() => nav.dispatch({ type: "deleted" }), WAIT_FOR_ROWS_MS);
    return () => clearTimeout(timer);
  }, [deleted, editId, data.expenses, nav]);

  function onKeyDown(e: KeyboardEvent<HTMLFormElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      void save(false);
    }
  }

  // The expense can vanish from under an edit (deleted elsewhere); nothing to edit.
  if (editing && !original) return null;

  // ----- the pieces -----
  const payerOptions = members.filter((m) => !m.archived_at || m.id === chosenPayer);
  const viewerFirst = [...payerOptions].sort(
    (a, b) => Number(b.id === viewerId) - Number(a.id === viewerId)
  );
  const today = dayString(new Date());
  const yesterday = (() => {
    const d = new Date();
    return dayString(new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1, 12));
  })();
  const allIncluded = rowIds.every((id) => form.included.includes(id));
  const stripDetail =
    check.strip?.detail?.kind === "text"
      ? check.strip.detail.text
      : check.strip?.detail?.kind === "impact" && impact !== null
        ? impact.kind === "none"
          ? "This doesn't change your balance"
          : (
              <>
                You&apos;ll {impact.kind === "owed" ? "be owed" : "owe"}{" "}
                <Money cents={Math.abs(impact.cents)} currency={currency} className="font-bold" /> more
              </>
            )
        : null;

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void save(false);
      }}
      onKeyDown={onKeyDown}
      className="flex flex-col gap-3.5"
    >
      {/* The gradient card */}
      <div className="flex flex-col gap-2.5 rounded-card p-4 text-on-glow [background:var(--gradient-glow-compact)]">
        <label className="flex flex-col gap-1">
          <span className="flex justify-between text-[length:var(--text-meta)] font-semibold">
            <span>What was it for?</span>
            <span aria-hidden="true" className="tabular-nums">
              {description.length}/{DESCRIPTION_MAX}
            </span>
          </span>
          <input
            type="text"
            maxLength={DESCRIPTION_MAX}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="box-border h-10 rounded-input border-0 bg-on-glow-input max-sm:h-11 px-3 font-semibold text-on-glow focus-visible:outline-2 focus-visible:outline-on-glow"
          />
        </label>
        <div className="flex items-end gap-2.5">
          <label className="flex min-w-0 flex-[1_1_0] flex-col gap-0.5">
            <span className="text-[length:var(--text-meta)] font-semibold">Amount</span>
            <input
              ref={amountRef}
              data-autofocus
              type="text"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0.00"
              value={amountText}
              onChange={(e) => setAmountText(filterAmountInput(e.target.value))}
              className="box-border h-14 w-full min-w-0 rounded-input border-0 bg-transparent p-0 text-[length:var(--text-amount-input)] font-extrabold tracking-[-0.03em] text-on-glow tabular-nums placeholder:text-on-glow/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-glow"
            />
          </label>
          <PillPopover
            ariaLabel={`Currency: ${CURRENCIES[currency]?.name ?? currency}`}
            menuLabel="Currency"
            menuRole="listbox"
            align="right"
            triggerClassName="h-11 gap-1.5 rounded-pill bg-on-glow-input px-3.5 text-on-glow"
            trigger={currency}
          >
            {(close) =>
              CURRENCY_LIST.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  role="option"
                  data-nav
                  aria-selected={c.code === currency}
                  onClick={() => {
                    setCurrency(c.code);
                    close();
                  }}
                  className={optionClass}
                >
                  <span className="font-bold">{c.code}</span>
                  <span className="text-text-muted">{c.name}</span>
                </button>
              ))
            }
          </PillPopover>
        </div>
      </div>

      {/* Paid by [member] on [date] */}
      <div className="flex flex-wrap items-center gap-2 font-semibold">
        <span>Paid by</span>
        <PillPopover
          ariaLabel={`Paid by: ${payerId ? nameOf(payerId) : "choose someone"}`}
          menuLabel="Paid by"
          menuRole="listbox"
          triggerClassName={`h-11 gap-2 rounded-pill bg-surface-muted-2 pr-3 text-text ${payerId ? "pl-1.5" : "pl-4"}`}
          trigger={
            payerId ? (
              <>
                {avatarOf(payerId)}
                {nameOf(payerId)}
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
                aria-selected={m.id === payerId}
                onClick={() => {
                  setChosenPayer(m.id);
                  close();
                }}
                className={optionClass}
              >
                {avatarOf(m.id)}
                {nameOf(m.id)}
              </button>
            ))
          }
        </PillPopover>
        <span>on</span>
        <PillPopover
          ariaLabel={`Date: ${dayLabel(date)}`}
          menuLabel="Date"
          menuRole="group"
          triggerClassName="h-11 gap-1.5 rounded-pill bg-surface-muted-2 px-3.5 text-text"
          trigger={dayLabel(date)}
        >
          {(close) => (
            <>
              {[
                { label: "Today", value: today },
                { label: "Yesterday", value: yesterday }
              ].map((o) => (
                <button
                  key={o.value}
                  type="button"
                  data-nav
                  aria-pressed={date === o.value}
                  onClick={() => {
                    setDate(o.value);
                    close();
                  }}
                  className={optionClass}
                >
                  {o.label}
                </button>
              ))}
              <label className="flex min-h-11 flex-col justify-center gap-0.5 px-2.5 text-[length:var(--text-meta)] font-semibold text-text-muted">
                Pick a date
                <input
                  type="date"
                  data-nav
                  value={date}
                  onChange={(e) => {
                    if (e.target.value) {
                      setDate(e.target.value);
                      close();
                    }
                  }}
                  className="box-border h-10 rounded-input border-0 bg-surface-sunken px-2.5 font-semibold text-text"
                />
              </label>
            </>
          )}
        </PillPopover>
      </div>

      <SegmentedControl
        variant="split"
        aria-label="How to split"
        id={tabsId}
        options={MODES}
        value={mode}
        onChange={changeMode}
      />

      {/* Mode body */}
      <div
        role="tabpanel"
        id={`${tabsId}-panel-${mode}`}
        aria-labelledby={`${tabsId}-tab-${mode}`}
        className="flex flex-col"
      >
        {mode === "equal" ? (
          <>
            <div className="flex min-h-11 items-center justify-between text-[length:var(--text-meta)]">
              <span className="text-text-muted">
                {form.included.length} of {rowIds.length} people included
              </span>
              {allIncluded ? null : (
                <Button
                  variant="text"
                  tone="positive"
                  onClick={() => {
                    touch("equal");
                    setForm((cur) => ({ ...cur, included: [...rowIds] }));
                  }}
                  className="px-1"
                >
                  Include everyone
                </Button>
              )}
            </div>
            <ul className="m-0 flex list-none flex-col p-0">
              {rowMembers.map((m) => {
                const on = form.included.includes(m.id);
                return (
                  <li key={m.id}>
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={on}
                      onClick={() => toggleIncluded(m.id)}
                      className="grid min-h-11 w-full cursor-pointer grid-cols-[22px_32px_minmax(0,1fr)_auto] items-center gap-2.5 rounded-input border-0 bg-transparent py-1 text-left text-[length:var(--text-body)] text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    >
                      <span
                        aria-hidden="true"
                        className={`box-border flex size-[22px] items-center justify-center rounded-check ${on ? "bg-accent text-white" : "border-2 border-solid border-text-muted"}`}
                      >
                        {on ? <CheckIcon size={14} /> : null}
                      </span>
                      {avatarOf(m.id)}
                      <span className={`font-semibold ${on ? "" : "text-text-muted"}`}>{nameOf(m.id)}</span>
                      {on ? (
                        <Money cents={cents[m.id] ?? 0} currency={currency} className="font-bold" />
                      ) : (
                        <span className="text-[length:var(--text-meta)] text-text-muted">not included</span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
            {extraCentIds.length > 0 && total !== null ? (
              <p className="m-0 mt-1 text-[length:var(--text-meta)] text-text-muted">
                <Money cents={total} currency={currency} /> doesn&apos;t divide evenly by {form.included.length},
                so{" "}
                {extraCentIds.length === 1
                  ? `${nameOf(extraCentIds[0], true)} ${extraCentIds[0] === viewerId ? "take" : "takes"} an extra cent.`
                  : `${joinNames(extraCentIds.map((id) => nameOf(id, true)))} each take an extra cent.`}
              </p>
            ) : null}
          </>
        ) : mode === "exact" ? (
          <ExactBody rows={rows} values={form.exact} decimals={decimals} currency={currency} onChange={setExactText} />
        ) : mode === "percent" ? (
          <PercentBody rows={rows} values={form.percent} cents={cents} currency={currency} onChange={setPercentText} />
        ) : (
          <SharesBody rows={rows} values={form.shares} cents={cents} currency={currency} onChange={setShareCount} />
        )}
      </div>

      {/* Status strip: hidden until there's an amount (docs/04). The live region
          is always mounted (a region that appears together with its text is
          often not announced), and while empty the negative margin cancels
          the form's gap so it takes no room. */}
      <div role="status" aria-live="polite" aria-atomic="true" className="empty:-mt-3.5">
        {check.strip ? (
          <StatusStrip live={false} tone={check.strip.tone} message={check.strip.message} detail={stripDetail} />
        ) : null}
      </div>

      {showFill ? (
        <Button variant="soft" inPanel size={44} onClick={fillBlankRows}>
          {blankRowsLabel(format(remaining), blankIds.length)}
        </Button>
      ) : null}

      {error ? (
        <p
          role="alert"
          className="m-0 rounded-tile bg-negative-soft px-3.5 py-2.5 text-[length:var(--text-meta)] font-semibold text-negative"
        >
          {error}
        </p>
      ) : null}

      {confirming ? (
        <div role="group" aria-label="Confirm delete" className="flex flex-col gap-3">
          <p className="m-0 font-semibold">{DELETE_PROMPT}</p>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              ref={cancelRef}
              size={48}
              variant="secondary"
              className="flex-[1_1_110px]"
              onClick={() => {
                setConfirming(false);
                setError(null);
              }}
            >
              Cancel
            </Button>
            <Button
              size={48}
              variant="text"
              tone="negative"
              disabled={deleting}
              className="flex-[1_1_110px] font-extrabold"
              onClick={() => void remove()}
            >
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {editing ? (
            <Button
              ref={deleteRef}
              size={48}
              variant="text"
              tone="negative"
              onClick={() => setConfirming(true)}
            >
              Delete
            </Button>
          ) : (
            <Button
              variant="soft"
              inPanel
              size={48}
              disabled={blocked || saving}
              onClick={() => void save(true)}
              className="flex-[1_1_150px] whitespace-nowrap"
            >
              Save and add another
            </Button>
          )}
          <Button
            ref={saveRef}
            type="submit"
            size={48}
            disabled={blocked || saving}
            kbd={isPhone || blocked || saving ? undefined : "⌘↵"}
            className="flex-[1_1_150px]"
          >
            {saving ? "Saving…" : (blockedReason ?? (editing ? "Save changes" : "Save expense"))}
          </Button>
        </div>
      )}
    </form>
  );
}

