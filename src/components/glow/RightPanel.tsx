"use client";

// The right panel (docs/04 "Page model", docs/03 RightPanel). Fill the `panel`
// slot of GroupFrame with <RightPanel />; it reads ?e= and ?panel= itself.
//
//   >= 1024    inline card in the content row (the slot's wrapper)
//   640-1023   overlay drawer from the right, scrim behind
//   < 640      full-height sheet: grabber, close, swipe down
//
// Drawer and sheet are native modal <dialog>s rendered in a portal: the browser
// traps focus, makes the page behind inert and reports Escape through `cancel`.
// Only one shell is ever mounted, so a form inside it is never duplicated.
// The slot's wrapper is hidden below 1024px by a rule in globals.css, so the
// server-rendered inline card never shows on a phone before hydration.

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type PointerEvent,
  type ReactNode,
  type RefObject
} from "react";
import { createPortal } from "react-dom";
import { useModalKeyboard, focusInside } from "@/src/lib/useModalKeyboard";
import {
  discardTitle,
  isPanelVisible,
  needsDiscardPrompt,
  samePanelState,
  type PanelLayout,
  type PanelState
} from "@/src/lib/glow/panel";
import { PanelBody, PanelHeader, usePanelBadge, usePanelSubtitle, usePanelTitle } from "./PanelContent";
import { askToDiscard, getPanelSession, panelOpener } from "./panelStore";
import { useDeletedToast, usePanelNav, usePanelState, writePanelUrl } from "./usePanel";
import { usePathname } from "next/navigation";

// ---------- layout ----------

const DESKTOP = "(min-width: 1024px)";
const TABLET = "(min-width: 640px)";

function subscribeLayout(onChange: () => void) {
  const queries = [window.matchMedia(DESKTOP), window.matchMedia(TABLET)];
  queries.forEach((q) => q.addEventListener("change", onChange));
  return () => queries.forEach((q) => q.removeEventListener("change", onChange));
}
function layoutSnapshot(): PanelLayout {
  if (window.matchMedia(DESKTOP).matches) return "inline";
  return window.matchMedia(TABLET).matches ? "drawer" : "sheet";
}
/** The server render and hydration say "inline"; CSS hides that card below 1024px. */
export function usePanelLayout(): PanelLayout {
  return useSyncExternalStore(subscribeLayout, layoutSnapshot, () => "inline");
}

// ---------- the panel ----------

export function RightPanel() {
  const layout = usePanelLayout();
  const pathname = usePathname();
  const { state: urlState, needsCleanup } = usePanelState();
  const nav = usePanelNav();
  useDeletedToast();

  // `shown` follows the URL, except that it won't leave a dirty add or edit
  // behind the user's back (a row click sets ?e= without asking). In that case
  // the URL is put back and the prompt opens; Discard writes the new state.
  const [shown, setShown] = useState<PanelState>(urlState);
  const differs = !samePanelState(shown, urlState);
  const blocked = differs && needsDiscardPrompt(shown, urlState, getPanelSession().dirty);
  if (differs && !blocked) setShown(urlState);
  useEffect(() => {
    if (!blocked) return;
    writePanelUrl(pathname, shown);
    askToDiscard({
      title: discardTitle(shown),
      proceed: () => writePanelUrl(pathname, urlState)
    });
  }, [blocked, shown, urlState, pathname]);

  // A stale ?e= (deleted expense) or a leftover ?panel= is tidied up in the URL.
  useEffect(() => {
    if (needsCleanup && samePanelState(shown, urlState)) writePanelUrl(pathname, urlState);
  }, [needsCleanup, shown, urlState, pathname]);

  const visible = isPanelVisible(layout, shown);

  return visible ? <PanelShell key={layout} layout={layout} state={shown} onClose={nav.close} /> : null;
}

function PanelShell({
  layout,
  state,
  onClose
}: {
  layout: PanelLayout;
  state: PanelState;
  onClose: () => void;
}) {
  const open = state.kind !== "empty";
  const titleId = useId();
  const title = usePanelTitle(state);
  const subtitle = usePanelSubtitle(state);
  const badge = usePanelBadge(state);
  // Mounted already open: a page load, or a resize across a breakpoint.
  const [restored] = useState(() => state.kind !== "empty");

  const ref = useModalKeyboard<HTMLElement>(open, onClose, {
    escape: layout === "inline" ? "inside" : "none",
    trapFocus: false,
    getOpener: panelOpener,
    // A panel restored by a page load shouldn't steal focus inline. A modal
    // drawer or sheet always takes it.
    skipInitialFocus: layout === "inline" && restored
  });

  // Declared after the hook, so the hook has already noted the opener when
  // showModal() moves focus.
  useLayoutEffect(() => {
    const dialog = ref.current as HTMLDialogElement | null;
    if (layout !== "inline" && dialog && !dialog.open) dialog.showModal();
  }, [layout, ref]);

  // Moving between kinds (details to edit) replaces the control that had focus.
  // Moving between two expenses (same kind) leaves focus where it is.
  const kind = state.kind;
  const lastKind = useRef(kind);
  useEffect(() => {
    if (lastKind.current !== kind && kind !== "empty") focusInside(ref.current);
    lastKind.current = kind;
  }, [kind, ref]);

  const body = (
    <>
      {state.kind === "empty" ? null : (
        <PanelHeader
          title={title}
          subtitle={subtitle}
          badge={badge}
          titleId={titleId}
          layout={layout}
          focusTitle={state.kind === "details"}
          onClose={onClose}
        />
      )}
      <PanelBody state={state} />
    </>
  );

  if (layout === "inline") {
    return (
      <aside
        ref={ref}
        data-panel-shell="inline"
        data-panel-kind={state.kind}
        aria-label={open ? undefined : "Expense details"}
        aria-labelledby={open ? titleId : undefined}
        className="flex flex-col gap-3.5 rounded-hero bg-surface p-5 text-text shadow-card"
      >
        {body}
      </aside>
    );
  }

  return createPortal(
    layout === "drawer" ? (
      <DrawerDialog dialogRef={ref} titleId={titleId} onClose={onClose}>
        {body}
      </DrawerDialog>
    ) : (
      <SheetDialog dialogRef={ref} titleId={titleId} onClose={onClose}>
        {body}
      </SheetDialog>
    ),
    document.body
  );
}

// ---------- drawer and sheet ----------

type DialogProps = {
  dialogRef: RefObject<HTMLElement | null>;
  titleId: string;
  onClose: () => void;
  children: ReactNode;
};

/** 640-1023: from the right, 420px wide, scrim behind. Esc and the scrim ask via onClose. */
function DrawerDialog({ dialogRef, titleId, onClose, children }: DialogProps) {
  return (
    <dialog
      ref={dialogRef as RefObject<HTMLDialogElement>}
      data-panel-shell="drawer"
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      // No padding on the dialog itself, so a click on the scrim lands on it.
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{ border: "var(--menu-border)" }}
      className="fixed inset-y-0 left-auto right-0 m-0 h-dvh max-h-none w-[420px] max-w-full overflow-y-auto rounded-l-sheet bg-surface p-0 text-text shadow-menu backdrop:bg-overlay"
    >
      <div className="flex flex-col gap-3.5 p-5 pb-[max(20px,env(safe-area-inset-bottom))]">
        {children}
      </div>
    </dialog>
  );
}

const SWIPE_CLOSE_PX = 80;

/**
 * Under 640: full height, 28px top radius, a grabber, the close button in the
 * header, and a swipe down on the grabber or header to close (asking first when
 * the form is dirty, because onClose is the guarded close).
 */
function SheetDialog({ dialogRef, titleId, onClose, children }: DialogProps) {
  const drag = useRef<{ startY: number } | null>(null);
  const [dy, setDy] = useState(0);
  const [dragging, setDragging] = useState(false);

  function onPointerDown(e: PointerEvent<HTMLDialogElement>) {
    const target = e.target as HTMLElement;
    if (!target.closest("[data-panel-grab]") || target.closest("button")) return;
    drag.current = { startY: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
  }
  function onPointerMove(e: PointerEvent<HTMLDialogElement>) {
    if (drag.current) setDy(Math.max(0, e.clientY - drag.current.startY));
  }
  function endDrag(e: PointerEvent<HTMLDialogElement>, cancelled: boolean) {
    if (!drag.current) return;
    const moved = Math.max(0, e.clientY - drag.current.startY);
    drag.current = null;
    setDragging(false);
    setDy(0); // snap back; if the close goes ahead the sheet unmounts anyway
    if (!cancelled && moved > SWIPE_CLOSE_PX) onClose();
  }

  return (
    <dialog
      ref={dialogRef as RefObject<HTMLDialogElement>}
      data-panel-shell="sheet"
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={(e) => endDrag(e, false)}
      onPointerCancel={(e) => endDrag(e, true)}
      style={{
        border: "var(--menu-border)",
        transform: dy ? `translateY(${dy}px)` : undefined,
        transition: dragging ? "none" : undefined
      }}
      className="fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none overflow-y-auto rounded-t-sheet bg-surface p-0 text-text shadow-menu backdrop:bg-overlay motion-safe:transition-transform"
    >
      <div className="flex flex-col gap-3.5 px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-2">
        <div
          data-panel-grab
          aria-hidden="true"
          className="mx-auto -mb-1 h-[5px] w-10 shrink-0 touch-none rounded-full bg-sheet-grabber"
        />
        {children}
      </div>
    </dialog>
  );
}
