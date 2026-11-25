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
    <div className="flex flex-col items-center gap-3 rounded-card bg-surface px-4 py-8 text-center text-text-muted shadow-card sm:rounded-hero">
      {title || children ? (
        <div className="flex flex-col gap-0.5">
          {title ? (
            <p className="m-0 max-w-full break-words font-bold text-text">{title}</p>
          ) : null}
          {children ? <p className="m-0 max-w-full break-words">{children}</p> : null}
        </div>
      ) : null}
      {action ? <div>{action}</div> : null}
    </div>
  );
}
