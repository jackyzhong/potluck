"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { ViewerChoices, type ViewerChoicesProps } from "./ViewerChoices";
import { CloseIcon } from "./icons";

export type ViewerSheetProps = Omit<ViewerChoicesProps, "mode"> & {
  onClose: () => void;
};

const SWIPE_CLOSE_PX = 80;

/**
 * Phone bottom sheet for the viewing-as switcher (boards 21/22): radius 28 on
 * top, a grabber, a 44px close button and the same rows as the desktop menu.
 * Mount it only while open. It is a native modal <dialog>, so the browser
 * traps focus, makes the page behind inert and handles Esc; the scrim, the
 * close button, a swipe down on the header and a pick all close it.
 * The caller returns focus to the avatar button.
 */
export function ViewerSheet({ onClose, ...choices }: ViewerSheetProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const drag = useRef<{ startY: number; id: number } | null>(null);
  const [dy, setDy] = useState(0);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || dialog.open) return;
    dialog.showModal();
    const selected = dialog.querySelector<HTMLElement>("[data-selected]");
    (selected ?? dialog.querySelector<HTMLElement>("[data-nav]"))?.focus();
  }, []);

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    // A press on the close button is a click, not the start of a swipe.
    if ((e.target as HTMLElement).closest("button")) return;
    drag.current = { startY: e.clientY, id: e.pointerId };
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
  }
  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    setDy(Math.max(0, e.clientY - drag.current.startY));
  }
  function endDrag(e: PointerEvent<HTMLDivElement>, cancelled: boolean) {
    if (!drag.current) return;
    const moved = Math.max(0, e.clientY - drag.current.startY);
    drag.current = null;
    setDragging(false);
    if (!cancelled && moved > SWIPE_CLOSE_PX) onClose();
    else setDy(0);
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="viewer-sheet-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      // The dialog has no padding of its own, so a click on the dim scrim lands on it.
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        border: "var(--menu-border)",
        transform: dy ? `translateY(${dy}px)` : undefined,
        transition: dragging ? "none" : undefined
      }}
      className="fixed inset-x-0 bottom-0 top-auto m-0 max-h-[92dvh] w-full max-w-none overflow-y-auto rounded-t-sheet bg-surface p-0 text-text shadow-menu backdrop:bg-overlay motion-safe:transition-transform"
    >
      <div className="px-3 pb-[max(28px,env(safe-area-inset-bottom))] pt-2">
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={(e) => endDrag(e, false)}
          onPointerCancel={(e) => endDrag(e, true)}
          className="touch-none"
        >
          <div aria-hidden="true" className="mx-auto mb-1 h-[5px] w-10 rounded-full bg-sheet-grabber" />
          <div className="flex items-start justify-between gap-3 px-3 py-2">
            <div className="flex flex-col gap-0.5">
              <h2 id="viewer-sheet-title" className="text-[19px] font-extrabold leading-tight">
                View the group as
              </h2>
              <p className="text-[length:var(--text-meta)] text-text-muted">
                Amounts and “you” switch to this person
              </p>
            </div>
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-surface-muted text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <CloseIcon size={20} />
            </button>
          </div>
        </div>
        <ViewerChoices mode="sheet" {...choices} />
      </div>
    </dialog>
  );
}
