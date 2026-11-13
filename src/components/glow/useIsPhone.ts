"use client";

import { useSyncExternalStore } from "react";

// docs/04 breakpoints: below 640px is the phone layout.
const QUERY = "(max-width: 639px)";

function subscribe(onChange: () => void) {
  const mql = window.matchMedia(QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

/**
 * True on the phone layout. Use it only to choose between two things that are
 * not both in the DOM (the viewer menu or the viewer sheet). Layout itself is
 * CSS. The server render says false, which is harmless: nothing that depends
 * on it is open during the server render.
 */
export function useIsPhone(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false
  );
}
