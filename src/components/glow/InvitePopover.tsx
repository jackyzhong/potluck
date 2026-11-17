"use client";

// Invite (T29): "Invite people" desktop popover (340px) and phone modal bottom
// sheet (< 640px) with Copy link -> Link copied tonal toggle and persistent
// "Don't lose this link" reminder (Boards 24, 25, 30, 31).

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { createPortal } from "react-dom";
import { Button } from "./Button";
import { CloseIcon } from "./icons";
import { useDismiss } from "./useDismiss";
import { useIsPhone } from "./useIsPhone";

const SWIPE_CLOSE_PX = 80;

export function InvitePopover({ ledgerId }: { ledgerId: string }) {
  const [open, setOpen] = useState(false);
  const [link, setLink] = useState("");
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");
  const phone = useIsPhone();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);

  useDismiss(open && !phone, () => setOpen(false), [popoverRef, triggerRef]);

  // Focus the primary action on open; restore focus to Invite on close.
  useEffect(() => {
    if (open && !phone) copyRef.current?.focus();
    else if (!open && wasOpen.current) triggerRef.current?.focus();
    wasOpen.current = open;
  }, [open, phone]);

  function openInvite() {
    if (!open) {
      setLink(`${window.location.origin}/ledger/${ledgerId}`);
      setStatus("idle");
    }
    setOpen(!open);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setStatus("copied");
    } catch {
      setStatus("failed");
    }
  }

  const content = (
    <div className="flex flex-col gap-2.5 px-3 pb-2 pt-1">
      <label htmlFor="invite-group-link" className="text-[length:var(--text-meta)] font-semibold">
        Group link
      </label>
      <input
        id="invite-group-link"
        readOnly
        value={link}
        onFocus={(e) => e.currentTarget.select()}
        className="h-11 w-full min-w-0 truncate rounded-input border-0 bg-surface-sunken px-3 text-[length:var(--text-body)] font-semibold tabular-nums text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      />
      <Button
        ref={copyRef}
        variant={status === "copied" ? "soft" : "primary"}
        inPanel={status === "copied"}
        size={48}
        onClick={copy}
        className="w-full"
      >
        {status === "copied" ? "Link copied" : "Copy link"}
      </Button>
      <div className="flex flex-col gap-0.5 rounded-tile bg-negative-soft px-3.5 py-2.5 text-[length:var(--text-meta)] leading-[1.35]">
        <span className="font-bold text-negative">Don&apos;t lose this link</span>
        <span className="text-text">
          There are no accounts, so it&apos;s the only way back to the group. Bookmark this page.
        </span>
      </div>
      <p
        role="status"
        className={status === "failed" ? "m-0 text-[length:var(--text-small)] text-negative" : "sr-only"}
      >
        {status === "copied"
          ? "Link copied. Anyone with it can view and add expenses."
          : status === "failed"
            ? "Couldn't copy. Select the link above and copy it."
            : ""}
      </p>
    </div>
  );

  return (
    <div className="relative max-sm:static">
      <Button
        ref={triggerRef}
        variant="secondary"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={openInvite}
      >
        Invite
      </Button>
      {open && !phone ? (
        <div
          ref={popoverRef}
          role="dialog"
          aria-labelledby="invite-popover-title"
          style={{ border: "var(--menu-border)" }}
          className="absolute right-0 top-[52px] z-20 box-border flex w-[340px] flex-col rounded-card bg-surface p-2 text-left text-text shadow-menu"
        >
          <div className="flex flex-col gap-0.5 px-3 py-2">
            <span id="invite-popover-title" className="text-[15px] font-extrabold">
              Invite people
            </span>
            <span className="text-[length:var(--text-meta)] text-text-muted">
              Anyone with the link can view the group and add expenses.
            </span>
          </div>
          {content}
        </div>
      ) : null}
      {open && phone ? (
        <InviteSheet onClose={() => setOpen(false)} focusRef={copyRef}>
          {content}
        </InviteSheet>
      ) : null}
    </div>
  );
}

function InviteSheet({
  onClose,
  focusRef,
  children
}: {
  onClose: () => void;
  focusRef: React.RefObject<HTMLButtonElement | null>;
  children: React.ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const drag = useRef<{ startY: number } | null>(null);
  const [dy, setDy] = useState(0);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || dialog.open) return;
    dialog.showModal();
    focusRef.current?.focus();
  }, [focusRef]);

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest("button")) return;
    drag.current = { startY: e.clientY };
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

  return createPortal(
    <dialog
      ref={dialogRef}
      aria-labelledby="invite-sheet-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
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
          <div className="flex items-start justify-between gap-3 px-3 pt-2">
            <div className="flex flex-col gap-0.5 pt-1.5">
              <h2 id="invite-sheet-title" className="m-0 text-[19px] font-extrabold leading-tight">
                Invite people
              </h2>
              <p className="m-0 text-[length:var(--text-meta)] text-text-muted">
                Anyone with the link can view the group and add expenses.
              </p>
            </div>
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-pill border-0 bg-surface-muted-2 text-text transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <CloseIcon size={20} />
            </button>
          </div>
        </div>
        <div className="pt-2">{children}</div>
      </div>
    </dialog>,
    document.body
  );
}
