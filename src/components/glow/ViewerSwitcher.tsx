"use client";

// The viewing-as switcher: the pill (desktop) or avatar button (phone), and the
// menu (desktop) or sheet (phone) it opens. Reads the viewer from useViewer(),
// so the signed-in version can replace it later (D9).

import { useEffect, useRef, useState } from "react";
import { useGlowData, useViewer } from "./ViewerProvider";
import { ViewerAvatarButton, ViewerPill } from "./ViewerPill";
import { ViewerMenu } from "./ViewerMenu";
import { ViewerSheet } from "./ViewerSheet";
import { useIsPhone } from "./useIsPhone";
import { getStoredTheme, setTheme as persistTheme, type Theme } from "@/src/lib/theme";

export type ViewerSwitcherProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Opens the member management UI once the menu has closed and focus is back on the trigger. */
  onManageMembers: () => void;
};

export function ViewerSwitcher({ open, onOpenChange, onManageMembers }: ViewerSwitcherProps) {
  const { status, viewer, viewerId, pickable, setViewer } = useViewer();
  const { slots, totals, currency } = useGlowData();
  const phone = useIsPhone();
  const [theme, setThemeState] = useState<Theme>("system");

  const pillRef = useRef<HTMLButtonElement>(null);
  const avatarRef = useRef<HTMLButtonElement>(null);
  const afterClose = useRef<(() => void) | null>(null);
  const wasOpen = useRef(false);

  // However the menu closed (a pick, Esc, a press outside), put focus back on
  // the button that opened it. A modal dialog makes the page behind it inert,
  // so this has to wait until the sheet is gone; hence an effect, not the click.
  useEffect(() => {
    if (!open && wasOpen.current) {
      (phone ? avatarRef : pillRef).current?.focus();
      const next = afterClose.current;
      afterClose.current = null;
      next?.();
    }
    wasOpen.current = open;
  }, [open, phone]);

  const nets = Object.fromEntries(Object.entries(totals).map(([id, t]) => [id, t.net]));
  const trigger = {
    viewer,
    loading: status === "loading",
    avatarSlot: viewer ? slots.get(viewer.id) : undefined,
    open,
    haspopup: (phone ? "dialog" : "menu") as "dialog" | "menu"
  };
  const toggle = () => {
    if (!open) setThemeState(getStoredTheme());
    onOpenChange(!open);
  };
  const choices = {
    members: pickable,
    slots,
    nets,
    currency,
    viewerId,
    onPick: (id: string) => {
      setViewer(id);
      onOpenChange(false);
    },
    onManage: () => {
      afterClose.current = onManageMembers;
      onOpenChange(false);
    },
    theme,
    onTheme: (t: Theme) => {
      persistTheme(t);
      setThemeState(t);
    },
    onClose: () => onOpenChange(false)
  };

  return (
    <div className="relative">
      <ViewerPill ref={pillRef} {...trigger} onClick={toggle} className="max-sm:hidden" />
      <ViewerAvatarButton ref={avatarRef} {...trigger} onClick={toggle} className="sm:hidden" />
      {open && !phone && <ViewerMenu {...choices} triggerRef={pillRef} />}
      {open && phone && <ViewerSheet {...choices} />}
    </div>
  );
}
