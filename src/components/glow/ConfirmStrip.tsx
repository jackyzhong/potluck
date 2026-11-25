"use client";

import type { KeyboardEvent, ReactNode } from "react";

export type ConfirmStripProps = {
  title: string;
  body?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
  confirmBusyLabel?: string;
  ariaLabel?: string;
  className?: string;
};

/**
 * Inline confirmation strip used for destructive or discard steps (`ConfirmStrip`
 * replaces modal alerts across members remove, delete, and discard per T24/D27).
 *
 * Pressing Escape cancels the strip without bubbling to outer drawers/sheets.
 */
export function ConfirmStrip({
  title,
  body,
  confirmLabel,
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  busy = false,
  confirmBusyLabel,
  ariaLabel,
  className = ""
}: ConfirmStripProps) {
  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "Escape") return;
    e.preventDefault();
    e.stopPropagation();
    if (!busy) onCancel();
  }

  return (
    <div
      role="group"
      aria-label={ariaLabel ?? title}
      onKeyDown={handleKeyDown}
      className={[
        "flex flex-col gap-2.5 rounded-tile bg-negative-soft px-3.5 py-3 text-[length:var(--text-meta)] leading-[1.45]",
        className
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="flex flex-col gap-0.5">
        <div className="font-bold text-negative">{title}</div>
        {body ? <div className="text-text">{body}</div> : null}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          data-autofocus
          disabled={busy}
          onClick={onCancel}
          className="min-h-11 flex-1 cursor-pointer rounded-pill bg-surface px-3.5 font-bold text-text transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-60"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onConfirm}
          className="min-h-11 flex-1 cursor-pointer rounded-pill bg-transparent px-3.5 font-bold text-negative transition-colors hover:bg-surface/40 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? (confirmBusyLabel ?? confirmLabel) : confirmLabel}
        </button>
      </div>
    </div>
  );
}
