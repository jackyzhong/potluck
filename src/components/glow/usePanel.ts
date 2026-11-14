"use client";

// How the rest of the page reads and drives the right panel. The URL holds the
// state (?e=, ?panel=; decision D18), so a refresh or a shared link restores it.
//
//   const { state } = usePanelState();        // empty | details | add | edit
//   const nav = usePanelNav();
//   nav.openDetails(id)   // a ledger row (T09)
//   nav.openAdd()         // Add expense, N, Duplicate
//   nav.openEdit()        // Edit, E (from details)
//   nav.close()
//   nav.dispatch({ type: "saved", id })      // T13/T14, after a save
//
// Every move that would throw away unsaved input goes through the "Discard…?"
// prompt first (see usePanelDirty in panelStore.ts). The URL is written with
// history.replaceState, which Next syncs into useSearchParams without a server
// round trip, and without piling up history entries.

import { useCallback, useEffect, useMemo, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  EMPTY_PANEL,
  discardTitle,
  needsDiscardPrompt,
  parsePanel,
  readPanelParams,
  samePanelState,
  toastFor,
  transition,
  withPanelState,
  type PanelAction,
  type PanelState
} from "@/src/lib/glow/panel";
import { useToast } from "./ToastProvider";
import { useGlowData } from "./ViewerProvider";
import {
  askToDiscard,
  clearPanelDirty,
  getPanelSession,
  setPanelHistory,
  usePanelSession
} from "./panelStore";

/** The panel state the URL describes, checked against the rows that exist. */
export function usePanelState(): { state: PanelState; needsCleanup: boolean } {
  const searchParams = useSearchParams();
  const { data } = useGlowData();
  const { editingId } = usePanelSession();
  const knownIds = useMemo(() => {
    const ids = new Set<string>();
    for (const e of data.expenses) ids.add(e.id);
    for (const p of data.payments) ids.add(p.id);
    return ids;
  }, [data.expenses, data.payments]);
  return useMemo(
    () => parsePanel(readPanelParams(searchParams), { knownIds, editingId }),
    [searchParams, knownIds, editingId]
  );
}

/** Rewrite the URL's panel params in place, keeping everything else. */
export function writePanelUrl(pathname: string, state: PanelState) {
  const query = withPanelState(window.location.search.replace(/^\?/, ""), state);
  // `null` state: Next's patched replaceState ignores calls that pass its own
  // internal state object, and then useSearchParams wouldn't see the change.
  window.history.replaceState(null, "", query ? `${pathname}?${query}` : pathname);
}

// Two reports of the same finished save (the row arriving and the fallback
// timer) must give one toast.
let lastToast = { message: "", at: 0 };
function announce(toast: ReturnType<typeof useToast>, message: string | null) {
  const now = Date.now();
  if (!message || (message === lastToast.message && now - lastToast.at < 1500)) return;
  lastToast = { message, at: now };
  toast.show(message);
}

/**
 * Toast "Expense deleted" / "Payment deleted" when the row the panel was
 * showing disappears from the data. Mount it once, in the panel. The details
 * component can't report this itself: the refreshed data drops the row, the URL
 * cleanup empties the panel, and the component is gone before its own "deleted"
 * report runs. (A row someone else deleted while it was open reads the same.)
 */
export function useDeletedToast() {
  const { state } = usePanelState();
  const { data } = useGlowData();
  const toast = useToast();
  const prev = useRef<{ id: string; payment: boolean } | null>(null);
  const stateId = "id" in state ? state.id : "";
  useEffect(() => {
    const exists = (id: string) =>
      data.expenses.some((e) => e.id === id) || data.payments.some((p) => p.id === id);
    const was = prev.current;
    if (was && !exists(was.id)) {
      announce(toast, toastFor(EMPTY_PANEL, { type: "deleted" }, was.payment));
      prev.current = null;
    }
    if (!stateId) prev.current = null; // closed normally: nothing to announce later
    else if (exists(stateId)) {
      prev.current = { id: stateId, payment: data.payments.some((p) => p.id === stateId) };
    }
  }, [stateId, data.expenses, data.payments, toast]);
}

export function usePanelNav() {
  const pathname = usePathname();
  const { state } = usePanelState();
  const toast = useToast();

  const dispatch = useCallback(
    (action: PanelAction) => {
      const { previous } = getPanelSession();
      // A finished save or delete has nothing left to discard.
      if (action.type === "saved" || action.type === "deleted") {
        clearPanelDirty();
        // Deletes are announced by useDeletedToast, once the row is really gone.
        if (action.type === "saved") announce(toast, toastFor(state, action, false));
      }
      const next = transition(state, action, previous);
      if (samePanelState(state, next)) return;

      const go = () => {
        if (next.kind === "add" || next.kind === "pay") setPanelHistory({ previous: state });
        setPanelHistory({ editingId: next.kind === "edit" ? next.id : null });
        writePanelUrl(pathname, next);
      };
      if (needsDiscardPrompt(state, next, getPanelSession().dirty)) {
        askToDiscard({ title: discardTitle(state), proceed: go });
      } else {
        go();
      }
    },
    [state, pathname, toast]
  );

  return useMemo(
    () => ({
      state,
      dispatch,
      openDetails: (id: string) => dispatch({ type: "select", id }),
      openAdd: () => dispatch({ type: "add" }),
      openEdit: () => dispatch({ type: "edit" }),
      close: () => dispatch({ type: "close" })
    }),
    [state, dispatch]
  );
}
