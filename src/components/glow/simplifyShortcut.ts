"use client";

// How the D key reaches the Simplify switch. `useSimplifyDebts` lives inside
// BalancesTab, which owns the saved value and the in-flight state, so the tab
// registers its toggle here while it is mounted and the page-level shortcut
// listener (useShortcuts) calls it. Nothing is lifted out of the tab.

import { useEffect } from "react";

let toggle: (() => void) | null = null;

/** BalancesTab: make D flip Simplify while this tab is on screen. */
export function useRegisterSimplifyToggle(fn: () => void): void {
  useEffect(() => {
    toggle = fn;
    return () => {
      if (toggle === fn) toggle = null;
    };
  }, [fn]);
}

/** The listener: returns false when no Balances tab is mounted. */
export function runSimplifyToggle(): boolean {
  if (!toggle) return false;
  toggle();
  return true;
}
