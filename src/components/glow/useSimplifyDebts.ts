"use client";

// The group's Simplify setting, as the Balances tab reads and writes it.
//
// The setting belongs to the ledger (`ledgers.simplify_debts`), not to whoever
// is looking, so a toggle changes the plan for everyone. The page passes the
// saved value down; this hook shows the new value straight away while the write
// is in flight, then refreshes so the server's value takes over. If the write
// fails React puts the saved value back and the error shows inline (D15).

import { useCallback, useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setSimplifyDebts } from "@/src/app/ledger/[id]/actions";

export function useSimplifyDebts(ledgerId: string, saved: boolean) {
  const router = useRouter();
  const [saving, startSaving] = useTransition();
  const [simplified, showSimplified] = useOptimistic(saved);
  const [error, setError] = useState<string | null>(null);

  const set = useCallback(
    (next: boolean) => {
      setError(null);
      startSaving(async () => {
        showSimplified(next);
        try {
          const result = await setSimplifyDebts(ledgerId, next);
          if (!result.ok) {
            setError("Couldn't save that for the group. Please try again.");
            return;
          }
        } catch {
          setError("Couldn't save that for the group. Check your connection and try again.");
          return;
        }
        router.refresh();
      });
    },
    [ledgerId, router, showSimplified]
  );

  return { simplified, saving, error, set };
}
