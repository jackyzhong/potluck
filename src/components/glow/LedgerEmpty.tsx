import type { ReactNode } from "react";

/**
 * Shared card shell for the ledger's non-row states. Pass `title` (and a line
 * of `children` under it) plus an optional `action` button, or just children
 * for a one-line message.
 */
export function LedgerEmpty({
  title,
  children,
  action
}: {
  title?: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-card bg-surface p-6 py-16 text-center text-text-muted shadow-card sm:rounded-hero">
      {title ? (
        <p className="m-0 max-w-full break-words text-[length:var(--text-card-title)] font-extrabold text-text">
          {title}
        </p>
      ) : null}
      {children ? <p className="m-0 max-w-full break-words">{children}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
