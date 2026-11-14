import type { ReactNode } from "react";
import { AlertIcon, CheckIcon } from "./icons";

export type ToastProps = {
  message: ReactNode;
  /**
   * `success` is the toast the app shows after a save (D15: one polite toast,
   * no Undo this round). `error` is the same shape for a failure; D15 keeps
   * errors inline for now, so nothing uses it yet.
   */
  variant?: "success" | "error";
  className?: string;
  /** `false` when the caller speaks the message through its own live region (the provider does, for success). */
  live?: boolean;
};

/**
 * Look and screen-reader behaviour only. It does not position itself, time out
 * or manage a queue: T18 wires it into saves and errors and decides where it
 * sits. Mount it when there is a message and unmount it after.
 *
 * Success is `role="status"` (polite). Error is `role="alert"` (assertive), as
 * a failure shouldn't wait for the user to stop speaking.
 */
export function Toast({ message, variant = "success", className = "", live = true }: ToastProps) {
  const isError = variant === "error";
  return (
    <div
      role={!live ? undefined : isError ? "alert" : "status"}
      {...(isError || !live ? {} : { "aria-live": "polite" as const })}
      className={[
        "inline-flex min-h-11 items-center gap-2.5 rounded-chip px-4 py-2.5 shadow-menu",
        "text-[length:var(--text-body)] font-semibold",
        isError ? "bg-negative-soft text-negative" : "bg-button-primary-bg text-button-primary-fg",
        className
      ].join(" ")}
    >
      {isError ? <AlertIcon className="shrink-0" /> : <CheckIcon className="shrink-0" />}
      <span>{message}</span>
    </div>
  );
}
