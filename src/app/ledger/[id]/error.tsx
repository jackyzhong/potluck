"use client";

import Link from "next/link";
import { useEffect } from "react";
import {
  STATUS_BUTTON_PRIMARY,
  STATUS_BUTTON_SECONDARY,
  StatusCardPage
} from "@/src/components/glow/StatusCardPage";

export default function LedgerError({
  error,
  reset,
  unstable_retry
}: {
  error: Error & { digest?: string };
  reset: () => void;
  unstable_retry?: () => void;
}) {
  useEffect(() => {
    console.error("Ledger load error:", error);
  }, [error]);

  return (
    <StatusCardPage
      title="Couldn't load this group"
      body="Potluck couldn't reach the group. Check your connection and try again. Nothing has been lost."
      actions={
        <>
          <Link href="/" className={STATUS_BUTTON_SECONDARY}>
            Go to home
          </Link>
          <button
            type="button"
            onClick={() => (unstable_retry ?? reset)()}
            className={STATUS_BUTTON_PRIMARY}
          >
            Try again
          </button>
        </>
      }
    />
  );
}
