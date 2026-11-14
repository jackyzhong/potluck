"use client";

// The keyboard shortcuts (docs/04, D21). One document keydown listener, mounted
// once by GroupFrame. What each key means, and when to ignore it, is decided by
// the pure `shortcutAction` in src/lib/glow/shortcuts.ts; this file only does it.
//
// Hooks into the rest of the page:
//   N P E Esc   usePanelNav / useOpenPayment (the right panel)
//   /           the search input marked `data-shortcut="search"` (ActivityToolbar)
//   J K Enter   buttons marked `data-nav-row="<id>"` (ledger rows, Balances people).
//               J/K move real focus; Enter then clicks the focused button natively.
//   D           the toggle BalancesTab registers (simplifyShortcut.ts)
//   1 2 V       useGroupTab, and the viewing-as menu state GroupFrame owns

import { useEffect, useRef } from "react";
import { escapeStep, isTypingTarget, moveIndex, shortcutAction } from "@/src/lib/glow/shortcuts";
import { useFilters } from "./FilterProvider";
import { useGroupTab } from "./GroupTabs";
import { useOpenPayment } from "./paymentPrefill";
import { runSimplifyToggle } from "./simplifyShortcut";
import { usePanelNav } from "./usePanel";

const SEARCH = '[data-shortcut="search"]';
const ROWS = "[data-nav-row]";

function visible(el: HTMLElement): boolean {
  return el.checkVisibility ? el.checkVisibility() : el.offsetParent !== null;
}

export function useShortcuts({
  tab,
  viewerMenuOpen,
  setViewerMenuOpen
}: {
  tab: "activity" | "balances";
  viewerMenuOpen: boolean;
  setViewerMenuOpen: (open: boolean) => void;
}) {
  const nav = usePanelNav();
  const openPayment = useOpenPayment();
  const { setTab } = useGroupTab();
  const { filter, setQuery } = useFilters();

  // The listener is attached once and reads the latest of everything through this.
  const latest = useRef({ tab, viewerMenuOpen, setViewerMenuOpen, nav, openPayment, setTab, filter, setQuery });
  useEffect(() => {
    latest.current = { tab, viewerMenuOpen, setViewerMenuOpen, nav, openPayment, setTab, filter, setQuery };
  });

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.defaultPrevented) return;
      const s = latest.current;
      const target = e.target instanceof Element ? e.target : null;

      // The panel's own drawer and sheet are modal dialogs too; they are not "another" one.
      const modalOpen =
        document.querySelector('dialog[open]:not([data-panel-shell]), [role="dialog"][aria-modal="true"]') !== null;
      const action = shortcutAction(e, { tab: s.tab, typing: isTypingTarget(target), modalOpen });
      if (!action) return;

      const search = document.querySelector<HTMLInputElement>(SEARCH);

      switch (action) {
        case "addExpense":
          s.nav.openAdd();
          break;
        case "addPayment":
          s.openPayment();
          break;
        case "focusSearch":
          if (!search || !visible(search)) return;
          search.focus();
          search.select();
          break;
        case "next":
        case "previous": {
          const rows = Array.from(document.querySelectorAll<HTMLElement>(ROWS)).filter(visible);
          let current = rows.findIndex((r) => r === document.activeElement);
          if (current < 0 && (s.nav.state.kind === "details" || s.nav.state.kind === "edit")) {
            const id = s.nav.state.id;
            current = rows.findIndex((r) => r.dataset.navRow === id);
          }
          const to = rows[moveIndex(current, rows.length, action)];
          if (!to) return;
          to.focus();
          to.scrollIntoView({ block: "nearest" });
          break;
        }
        case "edit":
          if (s.nav.state.kind !== "details") return;
          s.nav.openEdit();
          break;
        case "toggleSimplify":
          if (!runSimplifyToggle()) return;
          break;
        case "showActivity":
          s.setTab("activity");
          break;
        case "showBalances":
          s.setTab("balances");
          break;
        case "viewerMenu":
          s.setViewerMenuOpen(!s.viewerMenuOpen);
          break;
        case "escape": {
          // The panel's drawer and sheet close on their own `cancel`; the inline
          // panel closes itself when focus is inside it.
          if (document.querySelector("dialog[open]")) return;
          if (target?.closest('[data-panel-shell="inline"]')) return;
          const searching = s.tab === "activity";
          const step = escapeStep({
            panelOpen: s.nav.state.kind !== "empty",
            hasQuery: searching && s.filter.query !== "",
            searchFocused: searching && search !== null && document.activeElement === search
          });
          if (step === null) return;
          if (step === "closePanel") s.nav.close();
          else if (step === "clearSearch") s.setQuery("");
          else search?.blur();
          break;
        }
      }
      // Ours: keep "/" out of the field it focuses, Esc from also clearing a search input natively.
      e.preventDefault();
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);
}
