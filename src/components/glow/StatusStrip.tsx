import type { ReactNode } from "react";

export type StatusStripProps = {
  /** `positive`: "Fully assigned", "lent". `warning`: "left to assign", "your share". */
  tone: "positive" | "warning";
  /** The bold left message: "CA$20.00 left to assign". */
  message: ReactNode;
  /** The right-hand detail: "CA$44.50 of CA$64.50". */
  detail?: ReactNode;
  className?: string;
};

const tones = {
  positive: { box: "bg-positive-soft", message: "text-positive" },
  warning: { box: "bg-negative-soft", message: "text-negative" }
} as const;

/**
 * A live region: while someone edits splits, changes are announced politely
 * ("Fully assigned", "CA$5.00 left to assign"). Render it once and update its
 * text, rather than mounting a fresh one, so the change is picked up.
 */
export function StatusStrip({ tone, message, detail, className = "" }: StatusStripProps) {
  const t = tones[tone];
  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={`flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-tile px-3.5 py-2.5 text-[length:var(--text-meta)] tabular-nums text-text ${t.box} ${className}`}
    >
      <span className={`font-bold ${t.message}`}>{message}</span>
      {detail ? <span>{detail}</span> : null}
    </div>
  );
}
