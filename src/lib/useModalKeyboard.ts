"use client";

import { useEffect, useLayoutEffect, useRef } from "react";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function getFocusable(container: HTMLElement | null): HTMLElement[] {
  if (!container) return [];
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
    .filter((el) => el.getClientRects().length > 0);
}

export type ModalKeyboardOptions = {
  /**
   * Where Escape is heard. "document" (default): anywhere. "inside": only while
   * focus is inside the container, for an inline panel that shares the page
   * with other things that also use Escape. "none": the container is a native
   * <dialog>, which reports Escape itself through its `cancel` event.
   */
  escape?: "document" | "inside" | "none";
  /** Keep Tab inside the container (default true). Off for inline panels, and for native modal <dialog>s, which trap focus themselves. */
  trapFocus?: boolean;
  /**
   * Where focus returns on close. Default: whatever had focus when it opened.
   * Safari and Firefox on macOS don't focus a button when it is clicked, so
   * that can be <body>; a caller that knows the real opener says so here.
   */
  getOpener?: () => HTMLElement | null;
  /** Skip moving focus in on open. For a panel restored by a page load. */
  skipInitialFocus?: boolean;
};

/** Focus the `data-autofocus` element, else the first field that isn't the close button. */
export function focusInside(container: HTMLElement | null) {
  if (!container) return;
  const marked = container.querySelector<HTMLElement>("[data-autofocus]");
  if (marked) {
    marked.focus();
    return;
  }
  const focusable = getFocusable(container);
  const target = focusable.find((el) => el.dataset.modalClose === undefined) ?? focusable[0];
  target?.focus();
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
 * An element marked `data-autofocus` inside the container wins over the first
 * field (the panel puts it on the details title, or the composer's amount).
 *
 * Returns a ref to attach to the modal's outermost element.
 */
export function useModalKeyboard<T extends HTMLElement = HTMLDivElement>(
  isOpen: boolean,
  onClose: () => void,
  options: ModalKeyboardOptions = {}
) {
  const containerRef = useRef<T>(null);
  const { escape = "document", trapFocus = true } = options;
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  });
  const openerRef = useRef<HTMLElement | null>(null);

  // Remember the opener before anything moves focus (a native dialog's
  // showModal() does, in its own layout effect, which runs after this one).
  // Captured once per open: React's dev-mode double mount re-runs the effects
  // after focus has already moved into the modal, and must not overwrite it.
  const heldRef = useRef(false);
  useLayoutEffect(() => {
    if (!isOpen) {
      heldRef.current = false;
      return;
    }
    if (heldRef.current) return;
    heldRef.current = true;
    openerRef.current =
      optionsRef.current.getOpener?.() ?? (document.activeElement as HTMLElement | null);
  }, [isOpen]);

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
        if (escape === "none") return;
        if (escape === "inside" && !containerRef.current?.contains(document.activeElement)) return;
        e.preventDefault();
        onCloseRef.current();
        return;
      }

      if (e.key !== "Tab" || !trapFocus) return;

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
  }, [isOpen, escape, trapFocus]);

  // Focus the first field on open, restore focus to the opener on close.
  useEffect(() => {
    if (!isOpen) return;

    if (!optionsRef.current.skipInitialFocus) focusInside(containerRef.current);

    return () => {
      const opener = openerRef.current;
      if (opener?.isConnected) opener.focus?.();
    };
  }, [isOpen]);

  return containerRef;
}
