"use client";

// False during the server render and the first client render, true after.
//
// Dates are the reason: the server formats in its own time zone (UTC on
// Vercel), the browser in the viewer's. An expense saved on a Canadian evening
// is already the next day in UTC, so "Nov 13" from the server would hydrate
// against "Nov 14" in the browser: a hydration error and a wrong first paint.
// Anything that turns a timestamp into a calendar day waits for this.

import { useSyncExternalStore } from "react";

const noop = () => () => {};

export function useHydrated(): boolean {
  return useSyncExternalStore(
    noop,
    () => true,
    () => false
  );
}
