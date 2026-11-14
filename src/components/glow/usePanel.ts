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

import { useCallback, useMemo, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
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

export function usePanelNav() {
  const pathname = usePathname();
  const { state } = usePanelState();
  const toast = useToast();
  const { data } = useGlowData();
  // A deleted payment is gone from `data` by the time its delete is reported,
  // so remember the ids that were payments while they still existed.
  const paymentIds = useRef(new Set<string>());
  for (const p of data.payments) paymentIds.current.add(p.id);

  const dispatch = useCallback(
    (action: PanelAction) => {
      const { previous } = getPanelSession();
      // A finished save or delete has nothing left to discard.
      if (action.type === "saved" || action.type === "deleted") {
        clearPanelDirty();
        const id = "id" in state ? state.id : "";
        const message = toastFor(state, action, paymentIds.current.has(id));
        const now = Date.now();
        if (message && !(message === lastToast.message && now - lastToast.at < 1500)) {
          lastToast = { message, at: now };
          toast.show(message);
        }
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
