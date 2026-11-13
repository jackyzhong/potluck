"use client";

import { useEffect, useRef, type RefObject } from "react";
import { ViewerChoices, type ViewerChoicesProps } from "./ViewerChoices";
import { useDismiss } from "./useDismiss";

export type ViewerMenuProps = Omit<ViewerChoicesProps, "mode"> & {
  onClose: () => void;
  /** The pill that opened the menu: pressing it again must not count as an outside press. */
  triggerRef: RefObject<HTMLElement | null>;
};

/**
 * Desktop popover under the viewing-as pill (boards 19/20): right-aligned,
 * 340 wide, radius 20. Mount it only while open. Esc, an outside press and a
 * pick all close it; arrow keys, Home/End and type-ahead move between items.
 * The caller returns focus to the pill.
 */
export function ViewerMenu({ onClose, triggerRef, ...choices }: ViewerMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(true, onClose, [ref, triggerRef]);

  // Focus the current viewer on open (or the first item), as a menu should.
  useEffect(() => {
    const items = ref.current?.querySelectorAll<HTMLElement>("[data-nav]");
    const selected = ref.current?.querySelector<HTMLElement>("[data-selected]");
    (selected ?? items?.[0])?.focus();
  }, []);

  return (
    <div
      ref={ref}
      role="menu"
      aria-label="View the group as"
      style={{ border: "var(--menu-border)" }}
      onKeyDown={(e) => {
        // Tab leaves a menu: close it and let focus go back to the pill.
        if (e.key === "Tab") onClose();
      }}
      className="absolute right-0 top-[52px] z-20 box-border w-[340px] rounded-card bg-surface p-2 text-text shadow-menu"
    >
      <div className="flex flex-col gap-0.5 px-3 py-2">
        <span className="text-[15px] font-extrabold">View the group as</span>
        <span className="text-[length:var(--text-meta)] text-text-muted">
          Amounts and “you” switch to this person
        </span>
      </div>
      <ViewerChoices mode="menu" {...choices} />
    </div>
  );
}
