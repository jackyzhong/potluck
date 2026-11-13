import type { ComponentPropsWithoutRef, ReactNode } from "react";

export type SwitchProps = Omit<ComponentPropsWithoutRef<"button">, "onChange" | "role" | "aria-checked" | "children"> & {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  /** Visible label, inside the same button so the whole row is one target: "Simplify" on phone, "Simplify debts" on desktop. */
  label: ReactNode;
};

/**
 * 46 × 28 track, 22px knob, `--accent` when on. The off track is `--text-muted`
 * with a `--surface` knob: the boards only draw the on state, and this keeps the
 * off state 3:1 against the page in both themes (WCAG 1.4.11).
 */
export function Switch({ checked, onCheckedChange, label, className = "", ...rest }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className={`inline-flex h-11 cursor-pointer items-center gap-2 border-0 bg-transparent p-0 text-[length:var(--text-meta)] font-semibold text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${className}`}
      {...rest}
    >
      {label}
      <span
        aria-hidden="true"
        className={`box-border flex h-7 w-[46px] shrink-0 items-center rounded-[14px] p-[3px] transition-colors duration-[var(--dur-base)] ease-[var(--ease-out)] motion-reduce:transition-none ${
          checked ? "bg-accent" : "bg-text-muted"
        }`}
      >
        <span
          className={`size-[22px] rounded-full transition-transform duration-[var(--dur-base)] ease-[var(--ease-out)] motion-reduce:transition-none ${
            checked ? "translate-x-[18px] bg-on-glow" : "translate-x-0 bg-surface"
          }`}
        />
      </span>
    </button>
  );
}
