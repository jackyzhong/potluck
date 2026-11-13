"use client";

import { useEffect, useRef } from "react";
import { Avatar } from "./Avatar";
import { Money } from "./Money";
import type { AvatarSlot } from "@/src/lib/glow/avatar";
import type { GlowMember } from "@/src/lib/glow/viewer";

export type WhichOneAreYouProps = {
  /** Who can be picked: the group's current members, in ledger order. */
  members: readonly GlowMember[];
  /** Palette slot per member id, from `memberSlots()` over everyone, archived included. */
  slots: ReadonlyMap<string, AvatarSlot>;
  /** Each member's group net in cents (positive: gets money back). */
  nets: Readonly<Record<string, number>>;
  currency: string;
  onPick: (memberId: string) => void;
  /** Dismiss without choosing. The page keeps its neutral wording until someone picks. */
  onClose: () => void;
};

/**
 * First-visit prompt (decision D3): "Which one are you?". Shown when this device
 * has no usable viewer saved for the group. A modal bottom sheet on a phone and
 * a centred card on wider screens, built on the native <dialog> so the browser
 * traps focus, makes the page behind inert and closes it on Esc.
 *
 * Deliberately self-contained: T07/T11 build the shared sheet and the full
 * viewing-as menu later, and this file doesn't try to be their primitive.
 */
export function WhichOneAreYou({ members, slots, nets, currency, onPick, onClose }: WhichOneAreYouProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const firstRef = useRef<HTMLButtonElement>(null);

  // Opened once, on mount. The dialog is removed from the DOM when the prompt
  // goes away, which also takes it out of the top layer, so there is no
  // cleanup to run (and none that could fire a stray close event in dev).
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || dialog.open) return;
    dialog.showModal();
    firstRef.current?.focus();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="which-one-title"
      aria-describedby="which-one-hint"
      // Esc: handle it ourselves so React state stays the source of truth.
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      // A click on the dim backdrop lands on the <dialog> itself, because the
      // dialog has no padding of its own (the inner div has it).
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{ border: "var(--menu-border)" }}
      className="fixed inset-x-0 bottom-0 top-auto m-0 max-h-[85dvh] w-full max-w-none overflow-y-auto rounded-t-sheet bg-surface p-0 text-text shadow-menu backdrop:bg-overlay sm:inset-auto sm:left-1/2 sm:top-1/2 sm:w-[440px] sm:max-w-[calc(100vw-32px)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-hero"
    >
      <div className="px-3 pb-7 pt-2">
        <div aria-hidden="true" className="mx-auto mb-1 h-[5px] w-10 rounded-full bg-sheet-grabber sm:hidden" />

        <div className="flex items-start justify-between gap-3 px-3 py-2">
          <div className="flex flex-col gap-0.5">
            <h2 id="which-one-title" className="text-[19px] font-extrabold leading-tight">
              Which one are you?
            </h2>
            <p id="which-one-hint" className="text-[length:var(--text-meta)] text-text-muted">
              Pick yourself so balances are shown from your side. You can change this any time.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-surface-muted text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <svg
              aria-hidden="true"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <ul className="m-0 flex list-none flex-col p-0">
          {members.map((member, i) => {
            const net = nets[member.id] ?? 0;
            return (
              <li key={member.id}>
                <button
                  ref={i === 0 ? firstRef : undefined}
                  type="button"
                  onClick={() => onPick(member.id)}
                  className="grid min-h-14 w-full cursor-pointer grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-2.5 rounded-tile px-3 py-1.5 text-left hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent"
                >
                  <Avatar name={member.name} slot={slots.get(member.id)} id={member.id} size={36} />
                  <span className="truncate font-bold">{member.name}</span>
                  <span className="text-[length:var(--text-meta)] font-semibold text-text-muted">
                    {net > 0 ? (
                      <>
                        gets back <Money cents={net} currency={currency} tone="positive" />
                      </>
                    ) : net < 0 ? (
                      <>
                        owes <Money cents={-net} currency={currency} tone="negative" />
                      </>
                    ) : (
                      "settled up"
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <p className="px-3 pt-3 text-[length:var(--text-small)] text-text-muted">
          Bookmark this page. The link is how you get back to this group.
        </p>
      </div>
    </dialog>
  );
}
