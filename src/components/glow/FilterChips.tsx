export type FilterOption<V extends string> = { value: V; label: string };

export type FilterChipsProps<V extends string> = {
  options: readonly FilterOption<V>[];
  value: V;
  onChange: (value: V) => void;
  /** Names the group for assistive tech, e.g. "Filter activity". */
  "aria-label": string;
  className?: string;
};

/**
 * Single-select row of toggle buttons (All · Expenses · Payments · Involving me).
 * Each is a button with `aria-pressed`; exactly one is pressed.
 */
export function FilterChips<V extends string>({
  options,
  value,
  onChange,
  className = "",
  ...rest
}: FilterChipsProps<V>) {
  return (
    <div role="group" aria-label={rest["aria-label"]} className={`flex flex-wrap gap-1.5 ${className}`}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(o.value)}
            className={`h-11 cursor-pointer rounded-pill border-0 px-4 text-[length:var(--text-body)] transition-colors duration-[var(--dur-fast)] ease-[var(--ease-out)] motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
              selected
                ? "bg-button-primary-bg font-bold text-button-primary-fg"
                : "bg-surface-muted font-semibold text-text"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
