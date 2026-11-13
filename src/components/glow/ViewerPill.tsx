"use client";

import { forwardRef, type ComponentPropsWithoutRef } from "react";
import { Avatar } from "./Avatar";
import { ChevronDownIcon } from "./icons";
import type { AvatarSlot } from "@/src/lib/glow/avatar";
import type { GlowMember } from "@/src/lib/glow/viewer";

type TriggerProps = Omit<ComponentPropsWithoutRef<"button">, "children"> & {
  /** The current viewer, or null while nothing is picked or the saved choice is still being read. */
  viewer: GlowMember | null;
  /** `loading`: storage not read yet. Draws no name, so a returning visitor never sees a flash of the wrong wording. */
  loading: boolean;
  avatarSlot?: AvatarSlot;
  open: boolean;
  /** `menu` for the desktop popover, `dialog` for the phone sheet. */
  haspopup: "menu" | "dialog";
};

function label(viewer: GlowMember | null, loading: boolean) {
  if (viewer) return `Viewing as ${viewer.name}, switch person`;
  return loading ? "Switch person" : "Choose who is viewing, switch person";
}

const base =
  "flex h-11 cursor-pointer items-center rounded-pill border-0 bg-button-secondary-bg text-text shadow-button transition-opacity duration-[var(--dur-fast)] hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent motion-reduce:transition-none";

function Placeholder({ size }: { size: 32 | 36 }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-surface-muted font-extrabold text-text-muted ${size === 32 ? "size-8" : "size-9"}`}
    >
      ?
    </span>
  );
}

/** Desktop: avatar, "Viewing as / {name}", chevron (docs/01 "Viewing-as switcher"). */
export const ViewerPill = forwardRef<HTMLButtonElement, TriggerProps>(function ViewerPill(
  { viewer, loading, avatarSlot, open, haspopup, className = "", ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type="button"
      aria-haspopup={haspopup}
      aria-expanded={open}
      aria-label={label(viewer, loading)}
      className={`${base} gap-2 pl-1.5 pr-3 ${className}`}
      {...rest}
    >
      {viewer ? <Avatar name={viewer.name} slot={avatarSlot} id={viewer.id} size={32} /> : <Placeholder size={32} />}
      <span className="flex flex-col items-start leading-[1.15]">
        <span className="text-[length:var(--text-micro)] font-semibold text-text-muted">Viewing as</span>
        <span className="text-[length:var(--text-body)] font-bold">
          {viewer ? viewer.name : loading ? " " : "Choose person"}
        </span>
      </span>
      <ChevronDownIcon size={16} />
    </button>
  );
});

/** Phone: just the avatar and a chevron (docs/01 "Phone header"). */
export const ViewerAvatarButton = forwardRef<HTMLButtonElement, TriggerProps>(function ViewerAvatarButton(
  { viewer, loading, avatarSlot, open, haspopup, className = "", ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type="button"
      aria-haspopup={haspopup}
      aria-expanded={open}
      aria-label={label(viewer, loading)}
      className={`${base} gap-1 pl-1 pr-2 ${className}`}
      {...rest}
    >
      {viewer ? <Avatar name={viewer.name} slot={avatarSlot} id={viewer.id} size={36} /> : <Placeholder size={36} />}
      <ChevronDownIcon size={16} />
    </button>
  );
});
