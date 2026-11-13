import type { ComponentPropsWithoutRef, MouseEvent, ReactNode, Ref } from "react";
import { Kbd } from "./Kbd";

export type ButtonVariant = "primary" | "secondary" | "soft" | "text" | "icon";
/** Height in px: 44 header and inline, 48 panel actions, 52 phone bottom bar. */
export type ButtonSize = 44 | 48 | 52;

type Common = Omit<ComponentPropsWithoutRef<"button">, "disabled" | "children"> & {
  size?: ButtonSize;
  /** React 19 passes `ref` to function components as an ordinary prop; it lands on the <button>. */
  ref?: Ref<HTMLButtonElement>;
  /**
   * Marks the button unavailable WITHOUT removing it from the tab order, so a
   * screen-reader user can still land on it and read why. It sets
   * `aria-disabled`, swaps to the disabled colours and swallows clicks and
   * form submits. Put the reason in the label ("Assign CA$20.00 more to save").
   */
  disabled?: boolean;
  children?: ReactNode;
};

type TextOrFilled = Common & {
  variant?: Exclude<ButtonVariant, "icon">;
  /** `soft` only: use the darker fill that sits inside panels (Mark paid, Save and add another). */
  inPanel?: boolean;
  /** `text` only: the label colour. "Include everyone" is positive, "Delete" is negative. */
  tone?: "default" | "positive" | "negative";
  /** A shortcut hint drawn as a key cap after the label, e.g. "N" or "⌘↵". Hidden from assistive tech. */
  kbd?: string;
};

type IconOnly = Common & {
  variant: "icon";
  /** An icon button has no visible text, so it needs a name. */
  "aria-label": string;
};

export type ButtonProps = TextOrFilled | IconOnly;

const heights: Record<ButtonSize, string> = { 44: "h-11", 48: "h-12", 52: "h-[52px]" };

const filled = {
  primary: "bg-button-primary-bg text-button-primary-fg",
  secondary: "bg-button-secondary-bg text-text shadow-button",
  soft: "bg-surface-muted text-text",
  softInPanel: "bg-surface-muted-2 text-text",
  text: "bg-transparent"
} as const;

const textTones = {
  default: "text-text",
  positive: "text-positive",
  negative: "text-negative"
} as const;

const disabledClasses = "cursor-not-allowed bg-button-disabled-bg text-button-disabled-fg";

export function Button(props: ButtonProps) {
  // One flat view of the union: `rest` is then plain <button> attributes.
  const {
    variant = "primary",
    size = 44,
    inPanel = false,
    tone = "default",
    kbd,
    disabled = false,
    className = "",
    onClick,
    type = "button",
    children,
    ...rest
  } = props as Common & { variant?: ButtonVariant; inPanel?: boolean; tone?: keyof typeof textTones; kbd?: string };

  const isIcon = variant === "icon";
  const skin = isIcon
    ? "w-11 bg-transparent px-0 text-text"
    : variant === "soft" && inPanel
      ? filled.softInPanel
      : variant === "text"
        ? `${filled.text} ${textTones[tone]}`
        : filled[variant];

  function handleClick(e: MouseEvent<HTMLButtonElement>) {
    if (disabled) {
      e.preventDefault(); // also stops a type="submit" button from submitting
      return;
    }
    onClick?.(e);
  }

  return (
    <button
      type={type}
      aria-disabled={disabled || undefined}
      onClick={handleClick}
      className={[
        "inline-flex items-center justify-center gap-2 rounded-pill border-0 text-[length:var(--text-body)] font-bold",
        "transition-opacity duration-[var(--dur-fast)] ease-[var(--ease-out)] motion-reduce:transition-none",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        isIcon ? "h-11" : heights[size],
        isIcon ? "" : "px-4",
        disabled ? disabledClasses : `cursor-pointer hover:opacity-90 active:opacity-80 ${skin}`,
        className
      ].join(" ")}
      {...rest}
    >
      {children}
      {kbd ? <Kbd aria-hidden="true">{kbd}</Kbd> : null}
    </button>
  );
}
