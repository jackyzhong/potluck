import type { ReactNode } from "react";

/** Shared card shell for the ledger's non-row states. */
export function LedgerEmpty({ children }: { children?: ReactNode }) {
  return (
    <div className="rounded-card bg-surface p-6 py-16 text-center text-text-muted shadow-card sm:rounded-hero">
      {children}
    </div>
  );
}
