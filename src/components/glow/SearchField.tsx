import type { ComponentPropsWithoutRef, Ref } from "react";
import { SearchIcon } from "./icons";
import { Kbd } from "./Kbd";

export type SearchFieldProps = Omit<ComponentPropsWithoutRef<"input">, "type" | "value" | "onChange" | "aria-label"> & {
  value: string;
  onChange: (value: string) => void;
  /** Accessible name. The placeholder is not a label. */
  "aria-label"?: string;
  /** Show the "[/]" shortcut hint on the right. Default true; hidden on touch devices. */
  showHint?: boolean;
  /** For the "/" shortcut (T17) to focus the field. */
  inputRef?: Ref<HTMLInputElement>;
  className?: string;
};

/** Pill, 44px, search icon, placeholder, "[/]" hint. A real `<input type="search">`. */
export function SearchField({
  value,
  onChange,
  "aria-label": ariaLabel = "Search activity",
  placeholder = "Search expenses, people, amounts",
  showHint = true,
  inputRef,
  className = "",
  ...rest
}: SearchFieldProps) {
  return (
    <label
      className={`flex h-11 items-center gap-2 rounded-pill bg-surface px-3.5 shadow-button focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent ${className}`}
    >
      <SearchIcon className="shrink-0 text-text-muted" />
      <input
        ref={inputRef}
        type="search"
        aria-label={ariaLabel}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        // The label ring above shows focus; the bare input needs none of its own.
        className="min-w-0 grow border-0 bg-transparent text-[length:var(--text-body)] text-text outline-0 placeholder:text-text-muted"
        {...rest}
      />
      {showHint ? <Kbd aria-hidden="true">/</Kbd> : null}
    </label>
  );
}
