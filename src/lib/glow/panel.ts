// The right panel's state machine (docs/04 "Page model"). Pure: no React, no
// router. The URL is the source of truth (decision D18):
//
//   (nothing)                  empty
//   ?e=<id>                    details(id)
//   ?panel=add                 add
//   ?panel=pay                 pay (add a payment, T15)
//   ?e=<id>&panel=edit         edit(id)
//
// Other params (?tab=, anything a later task adds) pass through untouched.

export type PanelState =
  | { kind: "empty" }
  | { kind: "details"; id: string }
  | { kind: "add" }
  | { kind: "pay" }
  | { kind: "edit"; id: string };

/** The two params the panel owns. */
export type PanelParams = { e: string | null; panel: string | null };

export const EMPTY_PANEL: PanelState = { kind: "empty" };

export function readPanelParams(sp: { get(name: string): string | null }): PanelParams {
  return { e: sp.get("e") || null, panel: sp.get("panel") || null };
}

export type ParseOptions = {
  /** Ids that exist. A `?e=` that is not in it (deleted, mistyped) counts as absent. Omit to trust the URL. */
  knownIds?: ReadonlySet<string> | null;
  /**
   * The id an edit was opened for in this visit. A different `?e=` while
   * `panel=edit` is still in the URL means a row was clicked meanwhile.
   * Null after a refresh: the URL is trusted.
   */
  editingId?: string | null;
};

/**
 * URL to state. Rows (T09) only set `?e=`, and the add and edit URLs are the
 * only places `panel` is written, so a leftover `panel` next to a changed `e`
 * means "a row was clicked": details wins and `needsCleanup` says to drop the
 * stale `panel` from the URL.
 */
export function parsePanel(
  params: PanelParams,
  opts: ParseOptions = {}
): { state: PanelState; needsCleanup: boolean } {
  const known = opts.knownIds;
  const e = params.e && (!known || known.has(params.e)) ? params.e : null;
  const staleE = params.e !== null && e === null;

  if (params.panel === "add") {
    if (e) return { state: { kind: "details", id: e }, needsCleanup: true };
    return { state: { kind: "add" }, needsCleanup: staleE };
  }
  if (params.panel === "pay") {
    if (e) return { state: { kind: "details", id: e }, needsCleanup: true };
    return { state: { kind: "pay" }, needsCleanup: staleE };
  }
  if (params.panel === "edit") {
    if (!e) return { state: EMPTY_PANEL, needsCleanup: true };
    if (opts.editingId && opts.editingId !== e) {
      return { state: { kind: "details", id: e }, needsCleanup: true };
    }
    return { state: { kind: "edit", id: e }, needsCleanup: false };
  }
  if (e) return { state: { kind: "details", id: e }, needsCleanup: params.panel !== null };
  return { state: EMPTY_PANEL, needsCleanup: staleE || params.panel !== null };
}

/** State to the two params. */
export function panelToParams(state: PanelState): PanelParams {
  switch (state.kind) {
    case "empty":
      return { e: null, panel: null };
    case "details":
      return { e: state.id, panel: null };
    case "add":
      return { e: null, panel: "add" };
    case "pay":
      return { e: null, panel: "pay" };
    case "edit":
      return { e: state.id, panel: "edit" };
  }
}

/** The query string (no "?") with the panel params replaced and everything else kept. */
export function withPanelState(query: string, state: PanelState): string {
  const next = new URLSearchParams(query);
  next.delete("e");
  next.delete("panel");
  const p = panelToParams(state);
  if (p.e) next.set("e", p.e);
  if (p.panel) next.set("panel", p.panel);
  return next.toString();
}

export function samePanelState(a: PanelState, b: PanelState): boolean {
  if (a.kind !== b.kind) return false;
  return "id" in a && "id" in b ? a.id === b.id : true;
}

// ---------- transitions ----------

export type PanelAction =
  | { type: "select"; id: string } // click a row, Enter on a row
  | { type: "add" } // Add expense, N, Duplicate
  | { type: "pay" } // Add payment, P, Mark paid
  | { type: "edit" } // Edit, E (only from details)
  | { type: "close" } // Esc, close button, scrim, swipe down
  | { type: "saved"; id: string; another?: boolean } // a save finished
  | { type: "deleted" };

/**
 * One step of the machine. `previous` is where an add was opened from, so Close
 * can go back there. A step that doesn't apply (Edit with nothing open) returns
 * the same state.
 */
export function transition(
  state: PanelState,
  action: PanelAction,
  previous: PanelState = EMPTY_PANEL
): PanelState {
  switch (action.type) {
    case "select":
      return { kind: "details", id: action.id };
    case "add":
      return { kind: "add" };
    case "pay":
      return { kind: "pay" };
    case "edit":
      if (state.kind === "details" || state.kind === "edit") return { kind: "edit", id: state.id };
      return state;
    case "close":
      switch (state.kind) {
        case "add":
        case "pay":
          return previous.kind === "details" ? previous : EMPTY_PANEL;
        case "edit":
          return { kind: "details", id: state.id };
        default:
          return EMPTY_PANEL;
      }
    case "saved":
      if (state.kind === "add" || state.kind === "pay") {
        return action.another ? state : { kind: "details", id: action.id };
      }
      if (state.kind === "edit") return { kind: "details", id: state.id };
      return state;
    case "deleted":
      return EMPTY_PANEL;
  }
}

// ---------- the "Discard…?" prompt ----------

/** Leaving an add or an edit with unsaved input must ask first. Moving to the same state doesn't. */
export function needsDiscardPrompt(from: PanelState, to: PanelState, dirty: boolean): boolean {
  if (!dirty) return false;
  if (from.kind !== "add" && from.kind !== "pay" && from.kind !== "edit") return false;
  return !samePanelState(from, to);
}

/** docs/06 "discard": "Discard this expense?" for a new one, "Discard changes?" for an edit. */
export function discardTitle(from: PanelState): string {
  if (from.kind === "pay") return "Discard this payment?";
  return from.kind === "edit" ? "Discard changes?" : "Discard this expense?";
}

// ---------- layout ----------

export type PanelLayout = "inline" | "drawer" | "sheet";

/** docs/04 breakpoints: 1024 and up inline, 640 to 1023 drawer, under 640 sheet. */
export function layoutForWidth(width: number): PanelLayout {
  if (width >= 1024) return "inline";
  if (width >= 640) return "drawer";
  return "sheet";
}

/** Only the inline panel is visible while empty; a drawer or sheet has nothing to show. */
export function isPanelVisible(layout: PanelLayout, state: PanelState): boolean {
  return layout === "inline" || state.kind !== "empty";
}

// ---------- the success toast (D15) ----------

/**
 * What the toast says after a finished save or delete, or null when the action
 * isn't one (a "saved" reported after the panel already moved on to details
 * says nothing). No Undo this round.
 * `isPayment` says whether `state`'s row is a payment, for edits and deletes.
 */
export function toastFor(
  state: PanelState,
  action: PanelAction,
  isPayment: boolean
): string | null {
  if (action.type === "saved") {
    if (state.kind === "add") return "Expense added";
    if (state.kind === "pay") return "Payment added";
    if (state.kind === "edit") return "Changes saved";
    return null;
  }
  if (action.type === "deleted") {
    // Whatever state the panel is in: once the row is gone the URL's ?e= is
    // already treated as absent, so the panel reads "empty" by this point.
    return isPayment ? "Payment deleted" : "Expense deleted";
  }
  return null;
}
