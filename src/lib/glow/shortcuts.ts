// The keyboard shortcuts (docs/04 "Keyboard shortcuts", decision D21). Pure: no
// React, no DOM. `useShortcuts` reads the keydown and the page, asks this file
// what the key means, and does it.
//
//   N      Add expense            P  Add payment           /  Focus search (Activity)
//   J / K  Next / previous row (Activity) or person (Balances)
//   E      Edit what details shows (Activity)              D  Simplify debts (Balances)
//   1 / 2  Activity / Balances     V  Viewing-as menu
//   Esc    Close the panel, else clear the search (the viewing-as menu closes itself first)
//   Enter  Not handled here: J/K put real focus on a row's button, and Enter on a button opens it.
//   ⌘↵     Not handled here: the composers save on it.

export type ShortcutTab = "activity" | "balances";

export type ShortcutAction =
  | "addExpense"
  | "addPayment"
  | "focusSearch"
  | "next"
  | "previous"
  | "edit"
  | "toggleSimplify"
  | "escape"
  | "showActivity"
  | "showBalances"
  | "viewerMenu";

/** The parts of a KeyboardEvent the mapping looks at. */
export type KeyInfo = {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
  isComposing?: boolean;
};

export type ShortcutContext = {
  tab: ShortcutTab;
  /** Focus is in a text field, select, contenteditable or an open menu/listbox. */
  typing: boolean;
  /** A modal dialog other than the right panel is open (members, discard prompt, viewer sheet). */
  modalOpen: boolean;
};

/**
 * What a key press means, or null to leave it alone. Esc works while typing; a
 * modal dialog swallows everything (it handles its own Esc); a held Ctrl, Cmd or
 * Alt is never ours. Shift is allowed only for "/", which some layouts type with it.
 */
export function shortcutAction(e: KeyInfo, ctx: ShortcutContext): ShortcutAction | null {
  if (e.isComposing || ctx.modalOpen) return null;
  if (e.metaKey || e.ctrlKey || e.altKey) return null;

  if (e.key === "Escape") return e.shiftKey ? null : "escape";
  if (ctx.typing) return null;

  const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (e.shiftKey && key !== "/") return null;

  switch (key) {
    case "n":
      return "addExpense";
    case "p":
      return "addPayment";
    case "j":
      return "next";
    case "k":
      return "previous";
    case "v":
      return "viewerMenu";
    case "1":
      return "showActivity";
    case "2":
      return "showBalances";
    case "/":
      return ctx.tab === "activity" ? "focusSearch" : null;
    case "e":
      return ctx.tab === "activity" ? "edit" : null;
    case "d":
      return ctx.tab === "balances" ? "toggleSimplify" : null;
    default:
      return null;
  }
}

/** The bits of a DOM element that decide whether someone is typing in it. */
export type TypingTarget = {
  tagName?: string;
  isContentEditable?: boolean;
  closest?: (selector: string) => unknown;
};

/** Text fields, selects, textareas, contenteditable, and anything inside an open menu or listbox. */
export function isTypingTarget(target: TypingTarget | null): boolean {
  if (!target) return false;
  const tag = target.tagName?.toUpperCase();
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return Boolean(target.closest?.('[role="menu"], [role="listbox"], [contenteditable="true"]'));
}

/**
 * J and K. `current` is the index of the row that has focus (or is selected),
 * -1 for none. The first press lands on the first row, whichever key it was;
 * after that it stops at the ends instead of wrapping.
 */
export function moveIndex(current: number, count: number, direction: "next" | "previous"): number {
  if (count <= 0) return -1;
  if (current < 0 || current >= count) return 0;
  return direction === "next" ? Math.min(current + 1, count - 1) : Math.max(current - 1, 0);
}

/**
 * Esc, after the viewing-as menu has had its turn: close the panel, then clear
 * the search; with neither, just let go of the search field.
 */
export function escapeStep(s: {
  panelOpen: boolean;
  hasQuery: boolean;
  searchFocused: boolean;
}): "closePanel" | "clearSearch" | "blurSearch" | null {
  if (s.panelOpen) return "closePanel";
  if (s.hasQuery) return "clearSearch";
  if (s.searchFocused) return "blurSearch";
  return null;
}
