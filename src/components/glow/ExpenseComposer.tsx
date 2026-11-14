"use client";

// The expense composer, add mode, Equally (T13). Boards 09/10 (desktop panel)
// and 17/18 (phone sheet); docs/01 "Add expense", docs/03 `ExpenseComposer`,
// docs/04 "Composer behaviour".
//
// Anatomy, top to bottom: the gradient card (description, amount, currency) ·
// "Paid by [●] on [date]" · split-mode tabs · the Equally body · status strip ·
// actions. The panel title row above it comes from `PanelHeader`.
//
// The maths is T03's: `splitEqually` for the cents, `equalSplitExtraCentMembers`
// for the remainder note and `composerImpact` for the viewer's line. Nothing
// here divides money. Saving goes through `saveExpense` with `splitMode: "equal"`
// and `createdBy` set to the viewer. T14 adds Exact, Percent, Shares and edit.

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
import { saveExpense } from "@/src/app/ledger/[id]/actions";
import { CURRENCIES, CURRENCY_LIST } from "@/src/lib/currencies";
import {
  composerImpact,
  createdAtFor,
  dayLabel,
  dayString,
  equalSplitExtraCentMembers,
  joinNames,
  parseAmountCents,
  splitEqually
} from "@/src/lib/glow";
import { Avatar } from "./Avatar";
import { Button } from "./Button";
import { CheckIcon, ChevronDownIcon } from "./icons";
import { Money } from "./Money";
import { SegmentedControl } from "./SegmentedControl";
import { StatusStrip } from "./StatusStrip";
import { clearComposerPrefill, peekComposerPrefill } from "./composerPrefill";
import { usePanelDirty } from "./panelStore";
import { usePanelNav } from "./usePanel";
import { useDismiss } from "./useDismiss";
import { useIsPhone } from "./useIsPhone";
import { useGlowData, useViewer } from "./ViewerProvider";

const DESCRIPTION_MAX = 50;
const SAVE_FAILED = "Couldn't save that. Check your connection and try again.";

type Mode = "equal" | "exact" | "percent" | "shares";
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

export function ExpenseComposer() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const ledgerId = params.id;
  const nav = usePanelNav();
  const isPhone = useIsPhone();
  const { data, currency: baseCurrency, slots } = useGlowData();
  const { viewerId, pickable, members } = useViewer();

  // A Duplicate (T12) leaves a prefill for exactly one opening. Read it for the
  // first render; clear it after mount (an effect, so React's dev double render
  // can't use it up before the real one).
  const [prefill] = useState(peekComposerPrefill);
  useEffect(() => {
    clearComposerPrefill();
  }, []);

  const [description, setDescription] = useState(prefill?.description ?? "");
  const [currency, setCurrency] = useState(baseCurrency);
  const decimals = (CURRENCIES[currency] ?? CURRENCIES[baseCurrency] ?? CURRENCIES.CAD).decimals;
  const [amountText, setAmountText] = useState(() =>
    prefill ? (prefill.amountCents / 10 ** decimals).toFixed(decimals) : ""
  );
  // The payer is the viewer until someone picks another (the viewer may only
  // be known after the first render, so it isn't copied into state).
  const [chosenPayer, setChosenPayer] = useState<string | null>(prefill?.payerId ?? null);
  const payerId = chosenPayer ?? viewerId;
  const [date, setDate] = useState(() => dayString(new Date()));
  const [mode, setMode] = useState<Mode>("equal");
  const [included, setIncluded] = useState<string[]>(() => {
    const everyone = pickable.map((m) => m.id);
    if (!prefill) return everyone;
    const wanted = new Set(prefill.participantIds);
    const kept = everyone.filter((id) => wanted.has(id));
    return kept.length > 0 ? kept : everyone;
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const tabsId = useId();

  usePanelDirty(description.trim() !== "" || amountText.trim() !== "");

  // ----- numbers (all from T03) -----
  const memberOrder = data.memberOrder;
  const amountCents = parseAmountCents(amountText, decimals);
  const hasAmount = amountCents !== null && amountCents > 0;
  const includedIds = useMemo(
    () => pickable.map((m) => m.id).filter((id) => included.includes(id)),
    [pickable, included]
  );
  const shares = useMemo(
    () => splitEqually(hasAmount ? amountCents : 0, includedIds, memberOrder),
    [hasAmount, amountCents, includedIds, memberOrder]
  );
  const extraCentIds = useMemo(
    () => (hasAmount ? equalSplitExtraCentMembers(amountCents, includedIds, memberOrder) : []),
    [hasAmount, amountCents, includedIds, memberOrder]
  );
  const impact =
    hasAmount && viewerId && payerId && includedIds.length > 0
      ? composerImpact({ viewerId, payerId, amountCents, shares })
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

  // ----- can it be saved? The reason is the Save button's label (docs/04) -----
  const blockedReason: string | null = !hasAmount
    ? "Enter an amount"
    : !payerId
      ? "Choose who paid"
      : mode !== "equal"
        ? "Split equally to save"
        : includedIds.length === 0
          ? "Pick at least one person"
          : null;
  const blocked = blockedReason !== null;

  async function save(addAnother: boolean) {
    if (blocked || saving || !hasAmount || !payerId) return;
    const createdAt = createdAtFor(date, new Date());
    if (!createdAt) {
      setError("Pick a valid date.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const result = await saveExpense(ledgerId, null, {
        payerId,
        description: description.trim() === "" ? null : description,
        amountCents,
        currency,
        createdAt,
        splitMode: "equal",
        createdBy: viewerId,
        splits: includedIds.map((id) => ({ userId: id, amountCents: shares[id], weight: null }))
      });
      if (!result.ok) {
        setError(result.error);
        setSaving(false);
        return;
      }
      router.refresh();
      if (addAnother) {
        // Keep payer, date, mode and participants; start the next one.
        setDescription("");
        setAmountText("");
        setSaving(false);
        nav.dispatch({ type: "saved", id: result.data.id, another: true });
        amountRef.current?.focus();
      } else {
        // Wait for the refreshed rows to include the new expense before the
        // panel switches to its details, or the new `?e=` would be dropped as
        // an id that doesn't exist yet (see the effect below).
        setSavedId(result.data.id);
      }
    } catch {
      setError(SAVE_FAILED);
      setSaving(false);
    }
  }

  useEffect(() => {
    if (!savedId) return;
    const arrived = data.expenses.some((e) => e.id === savedId);
    if (arrived) {
      nav.dispatch({ type: "saved", id: savedId });
      return;
    }
    // The refresh never showed it (someone else deleted it, or the network
    // dropped). Move on rather than leave the form spinning.
    const timer = setTimeout(() => nav.dispatch({ type: "saved", id: savedId }), 5000);
    return () => clearTimeout(timer);
  }, [savedId, data.expenses, nav]);

  function onKeyDown(e: KeyboardEvent<HTMLFormElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      void save(false);
    }
  }

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
  const allIncluded = includedIds.length === pickable.length;

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
            className="box-border h-10 rounded-input border-0 bg-on-glow-input px-3 font-semibold text-on-glow outline-none focus-visible:outline-2 focus-visible:outline-on-glow"
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
              onChange={(e) => setAmountText(e.target.value)}
              className="box-border h-14 w-full min-w-0 rounded-input border-0 bg-transparent p-0 text-[length:var(--text-amount-input)] font-extrabold tracking-[-0.03em] text-on-glow tabular-nums outline-none placeholder:text-on-glow/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-glow"
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
        onChange={setMode}
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
                {includedIds.length} of {pickable.length} people included
              </span>
              {allIncluded ? null : (
                <Button
                  variant="text"
                  tone="positive"
                  onClick={() => setIncluded(pickable.map((m) => m.id))}
                  className="px-1"
                >
                  Include everyone
                </Button>
              )}
            </div>
            <ul className="m-0 flex list-none flex-col p-0">
              {pickable.map((m) => {
                const on = included.includes(m.id);
                return (
                  <li key={m.id}>
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={on}
                      onClick={() =>
                        setIncluded((cur) =>
                          cur.includes(m.id) ? cur.filter((id) => id !== m.id) : [...cur, m.id]
                        )
                      }
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
                        <Money cents={shares[m.id] ?? 0} currency={currency} className="font-bold" />
                      ) : (
                        <span className="text-[length:var(--text-meta)] text-text-muted">not included</span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
            {extraCentIds.length > 0 && amountCents !== null ? (
              <p className="m-0 mt-1 text-[length:var(--text-meta)] text-text-muted">
                <Money cents={amountCents} currency={currency} /> doesn&apos;t divide evenly by{" "}
                {includedIds.length}, so{" "}
                {extraCentIds.length === 1
                  ? `${nameOf(extraCentIds[0], true)} ${extraCentIds[0] === viewerId ? "take" : "takes"} an extra cent.`
                  : `${joinNames(extraCentIds.map((id) => nameOf(id, true)))} each take an extra cent.`}
              </p>
            ) : null}
          </>
        ) : (
          <p className="m-0 py-3 text-text-muted">
            Exact, Percent and Shares aren&apos;t built yet. Pick Equally to split this expense.
          </p>
        )}
      </div>

      {/* Status strip: hidden until there's an amount (docs/04) */}
      {hasAmount && mode === "equal" ? (
        includedIds.length === 0 ? (
          <StatusStrip tone="warning" message="Pick at least one person" />
        ) : (
          <StatusStrip
            tone="positive"
            message="Fully assigned"
            detail={
              impact === null ? null : impact.kind === "none" ? (
                "This doesn't change your balance"
              ) : (
                <>
                  You&apos;ll {impact.kind === "owed" ? "be owed" : "owe"}{" "}
                  <Money cents={Math.abs(impact.cents)} currency={currency} className="font-bold" />{" "}
                  more
                </>
              )
            }
          />
        )
      ) : null}

      {error ? (
        <p
          role="alert"
          className="m-0 rounded-tile bg-negative-soft px-3.5 py-2.5 text-[length:var(--text-meta)] font-semibold text-negative"
        >
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button
          variant="soft"
          inPanel
          size={48}
          disabled={blocked || saving}
          onClick={() => void save(true)}
          className="flex-[1_1_150px]"
        >
          Save and add another
        </Button>
        <Button
          type="submit"
          size={48}
          disabled={blocked || saving}
          kbd={isPhone || blocked || saving ? undefined : "⌘↵"}
          className="flex-[1_1_150px]"
        >
          {saving ? "Saving…" : (blockedReason ?? "Save expense")}
        </Button>
      </div>
    </form>
  );
}
