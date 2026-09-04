"use client";

import { useEffect, useRef } from "react";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function getFocusable(container: HTMLElement | null): HTMLElement[] {
  if (!container) return [];
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
    .filter((el) => el.getClientRects().length > 0);
}

/**
 * Wires up the keyboard behaviour every modal in the app shares: Escape closes
 * it, Tab cycles within it instead of escaping to the page behind, the first
 * useful field is focused on open, and focus returns to whatever opened the
 * modal once it closes.
 *
 * Mark the ✕ button with `data-modal-close` so opening focus skips past it and
 * lands on the first real field instead.
 *
 * Returns a ref to attach to the modal's outermost element.
 */
export function useModalKeyboard(isOpen: boolean, onClose: () => void) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Callers pass inline arrow functions, so track the latest one in a ref
  // rather than resubscribing (and stealing focus) on every render.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Escape to close, Tab trapped inside the modal.
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCloseRef.current();
        return;
      }

      if (e.key !== "Tab") return;

      const focusable = getFocusable(containerRef.current);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      const isInside = containerRef.current?.contains(active) ?? false;

      if (e.shiftKey && (active === first || !isInside)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !isInside)) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Focus the first field on open, restore focus to the opener on close.
  useEffect(() => {
    if (!isOpen) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const focusable = getFocusable(containerRef.current);
    const target = focusable.find((el) => el.dataset.modalClose === undefined) ?? focusable[0];
    target?.focus();

    return () => previouslyFocused?.focus?.();
  }, [isOpen]);

  return containerRef;
}
