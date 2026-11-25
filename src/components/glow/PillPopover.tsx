"use client";

// Shared popover pills (T31, T32) used by ExpenseComposer and PaymentComposer
// so currency, member, and date pickers share one accessible keyboard menu.

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { dayLabel, dayString } from "@/src/lib/glow/composer";
import { ChevronDownIcon } from "./icons";
import { useDismiss } from "./useDismiss";

export const PILL_OPTION_CLASS =
  "flex min-h-11 w-full cursor-pointer items-center gap-2.5 rounded-tile border-0 bg-transparent px-2.5 text-left font-semibold text-text hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent aria-selected:bg-surface-muted aria-pressed:bg-surface-muted";

export function PillPopover({
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
    const chosen = menu.current?.querySelector<HTMLElement>(
      '[data-nav][aria-selected="true"], [data-nav][aria-pressed="true"]'
    );
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

/** Shared Today / Yesterday / calendar date pill for expense & payment composers. */
export function DatePill({ value, onChange }: { value: string; onChange: (day: string) => void }) {
  const today = dayString(new Date());
  const yesterday = (() => {
    const d = new Date();
    return dayString(new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1, 12));
  })();

  return (
    <PillPopover
      ariaLabel={`Date: ${dayLabel(value)}`}
      menuLabel="Date"
      menuRole="group"
      triggerClassName="h-11 gap-1.5 rounded-pill bg-surface-muted-2 px-3.5 text-text"
      trigger={dayLabel(value)}
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
              aria-pressed={value === o.value}
              onClick={() => {
                onChange(o.value);
                close();
              }}
              className={PILL_OPTION_CLASS}
            >
              {o.label}
            </button>
          ))}
          <label className="flex min-h-11 flex-col justify-center gap-0.5 px-2.5 text-[length:var(--text-meta)] font-semibold text-text-muted">
            Pick a date
            <input
              type="date"
              data-nav
              value={value}
              onChange={(e) => {
                if (e.target.value) {
                  onChange(e.target.value);
                  close();
                }
              }}
              className="box-border h-10 rounded-input border-0 bg-surface-sunken px-2.5 font-semibold text-text"
            />
          </label>
        </>
      )}
    </PillPopover>
  );
}
