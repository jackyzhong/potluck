import type { ComponentPropsWithoutRef } from "react";

/**
 * Inline key hint, drawn as `Add expense [N]`. Hidden on touch devices, where
 * there is no keyboard to use it with (`hover: none`).
 *
 * Inside a button, pass `aria-hidden` (or use Button's `kbd` prop): the hint is
 * sighted-user help and would just add noise to the button's name.
 */
export function Kbd({ className = "", ...rest }: ComponentPropsWithoutRef<"kbd">) {
  return (
    <kbd
      className={`rounded-md border border-kbd-border bg-kbd-bg px-1.5 py-px font-sans text-[length:var(--text-small)] font-semibold text-kbd-fg [@media(hover:none)]:hidden ${className}`}
      {...rest}
    />
  );
}
