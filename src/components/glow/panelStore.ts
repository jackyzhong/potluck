"use client";

// Shared, non-URL panel state: whether the open form has unsaved input, the
// "Discard…?" prompt waiting for an answer, where an add was opened from, and
// which element opened the panel. It is a module store, not a context, because
// the things that navigate (ledger rows, header buttons, the composer) live in
// different slots of the page and share no provider.

import { useEffect, useSyncExternalStore } from "react";
import { EMPTY_PANEL, type PanelState } from "@/src/lib/glow/panel";

export type PendingDiscard = { title: string; proceed: () => void };

type Session = {
  dirty: boolean;
  pending: PendingDiscard | null;
  /** Where an add was opened from, so Close goes back there. */
  previous: PanelState;
  /** The id an edit was opened for in this visit (see parsePanel). */
  editingId: string | null;
};

let session: Session = { dirty: false, pending: null, previous: EMPTY_PANEL, editingId: null };
const listeners = new Set<() => void>();

function update(patch: Partial<Session>) {
  session = { ...session, ...patch };
  listeners.forEach((l) => l());
}
function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function getPanelSession(): Session {
  return session;
}
export function usePanelSession(): Session {
  return useSyncExternalStore(subscribe, getPanelSession, getPanelSession);
}

export function setPanelHistory(patch: Pick<Partial<Session>, "previous" | "editingId">) {
  update(patch);
}

// ---------- dirty form API (T13, T14) ----------

/**
 * Call from a form with `isDirty` true while it holds unsaved input. While
 * it's true, anything that would leave the form (Close, Esc, a click on a row,
 * swipe down, the scrim) asks "Discard…?" first. The flag clears when the form
 * unmounts. Only add and edit prompt; details never does.
 */
export function usePanelDirty(isDirty: boolean) {
  useEffect(() => {
    update({ dirty: isDirty });
    return () => update({ dirty: false });
  }, [isDirty]);
}

/** Forget unsaved input without asking (after a successful save or delete). */
export function clearPanelDirty() {
  if (session.dirty) update({ dirty: false });
}

/** Open the prompt. `proceed` runs only if the user picks Discard. */
export function askToDiscard(pending: PendingDiscard) {
  update({ pending });
}
export function answerDiscard(discard: boolean) {
  const pending = session.pending;
  if (!pending) return;
  update(discard ? { pending: null, dirty: false } : { pending: null });
  if (discard) pending.proceed();
}

// Leaving the page (reload, close tab) with unsaved input.
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", (e) => {
    if (session.dirty) e.preventDefault();
  });
}

// ---------- the opener ----------

// Safari and Firefox on macOS don't focus a button on click, so activeElement
// is <body> by the time the panel opens. Remember the last thing pressed.
let lastPressed: HTMLElement | null = null;
if (typeof document !== "undefined") {
  document.addEventListener(
    "pointerdown",
    (e) => {
      const el = (e.target as HTMLElement | null)?.closest<HTMLElement>(
        'button, a[href], [role="button"], [tabindex]'
      );
      if (el && !el.closest("[data-panel-shell]")) lastPressed = el;
    },
    true
  );
}

/** The element that opened the panel: the focused one, else the last one pressed. */
export function panelOpener(): HTMLElement | null {
  const active = document.activeElement as HTMLElement | null;
  if (active && active !== document.body && !active.closest("[data-panel-shell]")) return active;
  return lastPressed?.isConnected ? lastPressed : null;
}
