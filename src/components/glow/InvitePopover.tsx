"use client";

// Invite (decision D2): a popover with "Copy link" and the reminder not to lose
// the link, in place of the old "Don't lose the link to this page!" line.

import { useEffect, useRef, useState } from "react";
import { Button } from "./Button";
import { useDismiss } from "./useDismiss";

export function InvitePopover({ ledgerId }: { ledgerId: string }) {
  const [open, setOpen] = useState(false);
  const [link, setLink] = useState("");
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);

  useDismiss(open, () => setOpen(false), [popoverRef, triggerRef]);

  // Focus the first control on open; give focus back to Invite on close.
  useEffect(() => {
    if (open) copyRef.current?.focus();
    else if (wasOpen.current) triggerRef.current?.focus();
    wasOpen.current = open;
  }, [open]);

  function toggle() {
    if (!open) {
      // The group link, without ?tab= and the like: it is how people get back to the group.
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

  return (
    <div className="relative max-sm:static">
      <Button
        ref={triggerRef}
        variant="secondary"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={toggle}
      >
        Invite
      </Button>
      {open && (
        <div
          ref={popoverRef}
          role="dialog"
          aria-label="Invite people"
          style={{ border: "var(--menu-border)" }}
          className="absolute right-0 top-[52px] z-20 box-border flex w-[340px] flex-col gap-3 rounded-card bg-surface p-4 text-text shadow-menu max-sm:left-4 max-sm:right-4 max-sm:top-[64px] max-sm:w-auto"
        >
          <div className="flex flex-col gap-0.5">
            <span className="text-[15px] font-extrabold">Share this group</span>
            <span className="text-[length:var(--text-meta)] text-text-muted">
              Anyone with the link can view and add expenses. Don&apos;t lose the link to this
              page: bookmark it.
            </span>
          </div>
          <input
            readOnly
            value={link}
            aria-label="Group link"
            onFocus={(e) => e.currentTarget.select()}
            className="h-11 w-full min-w-0 rounded-input border-0 bg-surface-sunken px-3 text-[length:var(--text-meta)] text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          />
          <Button ref={copyRef} onClick={copy} className="w-full">
            {status === "copied" ? "Link copied" : "Copy link"}
          </Button>
          <p role="status" className="m-0 min-h-4 text-[length:var(--text-small)] text-text-muted">
            {status === "copied"
              ? "Link copied. Anyone with it can view and add expenses."
              : status === "failed"
                ? "Couldn't copy. Select the link above and copy it."
                : ""}
          </p>
        </div>
      )}
    </div>
  );
}
