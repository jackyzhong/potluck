// A one-shot hand-off from "Duplicate" (T12) to the add composer (T13).
//
//   setComposerPrefill({ description, amountCents, payerId, participantIds });
//   nav.openAdd();
//
// The composer reads it when it mounts in add mode and clears it once it has,
// so it applies to that one opening only. Date is never prefilled: a duplicate
// is dated today (docs/03 "Duplicate"). It is a module variable, not React
// state, because the button that sets it and the composer that reads it live in
// different parts of the page.
//
// T14: a duplicate keeps the split. `splitMode` and `splits` are the stored mode
// and rows of the expense being copied; the composer reopens them the same way
// Edit does (a row with no stored mode opens in Exact, D13). Without `splits`
// (the T13 shape) it is an equal split between `participantIds`.

import type { StoredRow } from "@/src/lib/glow/composerSplit";

export type ComposerPrefill = {
  description: string | null;
  amountCents: number;
  payerId: string;
  /** Members to include in the equal split. Ids that aren't current members are ignored. */
  participantIds: string[];
  /** The copied expense's stored `split_mode`; null for rows saved before modes existed. */
  splitMode?: string | null;
  /** The copied expense's split rows, with `weight` for percent and shares. */
  splits?: StoredRow[];
};

let pending: ComposerPrefill | null = null;

export function setComposerPrefill(prefill: ComposerPrefill): void {
  pending = prefill;
}

/** The prefill waiting for the composer, without using it up. */
export function peekComposerPrefill(): ComposerPrefill | null {
  return pending;
}

/** Use it up. The composer calls this from an effect, after it has read the value. */
export function clearComposerPrefill(): void {
  pending = null;
}
