"use client";

import { useRef, type KeyboardEvent } from "react";

export type SegmentOption<V extends string> = { value: V; label: string };

export type SegmentedControlProps<V extends string> = {
  options: readonly SegmentOption<V>[];
  value: V;
  onChange: (value: V) => void;
  /** Names the tablist: "Group views", "How to split". */
  "aria-label": string;
  /**
   * `pill`: the Activity/Balances switch (pill track, pill segments).
   * `split`: the split-mode tabs inside the composer (radius 16 track, radius 12
   * segments, equal widths, on the darker panel fill).
   */
  variant?: "pill" | "split";
  /** Segment height in px for `pill`: 40 on desktop, 44 on phone. `split` is always 40. */
  size?: 40 | 44;
  /** `pill` only: stretch to the full width with equal segments (phone). */
  fill?: boolean;
  /**
   * When set, each tab gets `id="{id}-tab-{value}"` and `aria-controls="{id}-panel-{value}"`.
   * Give the matching panel `id="{id}-panel-{value}"` and `aria-labelledby="{id}-tab-{value}"`.
   * Leave it out when the tabs don't switch a panel, so nothing points at a missing id.
   */
  id?: string;
  className?: string;
};

/**
 * A `role="tablist"`. Left/Right move between segments and select the new one
 * (automatic activation: the content behind these tabs is cheap to swap), Home
 * and End jump to the ends. Only the selected tab is in the tab order.
 */
export function SegmentedControl<V extends string>({
  options,
  value,
  onChange,
  variant = "pill",
  size = 40,
  fill = false,
  id,
  className = "",
  ...rest
}: SegmentedControlProps<V>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const split = variant === "split";

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const i = options.findIndex((o) => o.value === value);
    let next = i;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (i + 1) % options.length;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (i - 1 + options.length) % options.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = options.length - 1;
    else return;
    e.preventDefault();
    onChange(options[next].value);
    refs.current[next]?.focus();
  }

  const track = split
    ? "grid gap-1 rounded-chip bg-surface-muted-2 p-1"
    : `${fill ? "flex" : "inline-flex"} gap-1 rounded-pill bg-surface-muted p-1`;
  const height = split || size === 40 ? "h-10" : "h-11";

  return (
    <div
      role="tablist"
      aria-label={rest["aria-label"]}
      onKeyDown={onKeyDown}
      style={split ? { gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` } : undefined}
      className={`${track} ${className}`}
    >
      {options.map((o, i) => {
        const selected = o.value === value;
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={id ? `${id}-tab-${o.value}` : undefined}
            aria-controls={id ? `${id}-panel-${o.value}` : undefined}
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(o.value)}
            className={[
              "cursor-pointer border-0 text-[length:var(--text-body)] transition-colors duration-[var(--dur-base)] ease-[var(--ease-out)] motion-reduce:transition-none",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
              height,
              split ? "rounded-input" : `rounded-pill ${fill ? "flex-1 basis-0" : "px-5"}`,
              selected
                ? "bg-segment-selected font-bold text-text shadow-[var(--segment-selected-shadow)]"
                : "bg-transparent font-semibold text-text-secondary"
            ].join(" ")}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
