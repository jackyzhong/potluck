import type { ReactNode } from "react";
import { AlertIcon } from "./icons";

export type ToastAction = { label: string; onClick: () => void };

export type ToastProps = {
  message: ReactNode;
  variant?: "success" | "error";
  /** Optional tonal action pill inside the toast (e.g. `"Undo"` per D26). */
  action?: ToastAction;
  className?: string;
  /** `false` when the caller speaks the message through its own live region (the provider does, for success). */
  live?: boolean;
};

/**
 * 52px floating pill toast (Boards 43 / 49). Success uses the elevated surface
 * pill with `--menu-border` and optional tonal action button; error keeps the
 * soft negative fill and alert icon.
 */
export function Toast({ message, variant = "success", action, className = "", live = true }: ToastProps) {
  const isError = variant === "error";
  return (
    <div
      role={!live ? undefined : isError ? "alert" : "status"}
      {...(isError || !live ? {} : { "aria-live": "polite" as const })}
      style={isError ? undefined : { border: "var(--menu-border)" }}
      className={[
        "inline-flex h-[52px] items-center gap-3 rounded-pill shadow-menu",
        action ? "pl-5 pr-2.5" : "px-5",
        "text-[length:var(--text-body)] font-semibold",
        isError ? "bg-negative-soft text-negative" : "bg-surface text-text",
        className
      ].join(" ")}
    >
      {isError ? <AlertIcon className="shrink-0" /> : null}
      <span className="truncate">{message}</span>
      {action ? (
        <button
          type="button"
          onClick={action.onClick}
          className="h-9 shrink-0 cursor-pointer rounded-pill bg-surface-muted-2 px-3.5 text-[length:var(--text-meta)] font-bold text-text transition-colors hover:bg-surface-muted"
        >
          {action.label}
        </button>
      ) : null}
    </div>
  );
}
