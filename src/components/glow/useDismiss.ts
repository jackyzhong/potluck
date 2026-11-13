"use client";

import { useEffect, useRef, type RefObject } from "react";

/**
 * Closes a popover on Escape or on a press outside it. `inside` lists the
 * elements that count as "inside" (the popover itself and the button that
 * opened it, so pressing that button toggles instead of closing and reopening).
 *
 * Escape is caught in the capture phase and stopped, so it closes the popover
 * and not a modal that happens to be open behind it.
 */
export function useDismiss(
  open: boolean,
  onClose: () => void,
  inside: readonly RefObject<HTMLElement | null>[]
) {
  // Callers pass inline arrow functions; read the latest one without resubscribing.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);
  const insideRef = useRef(inside);
  useEffect(() => {
    insideRef.current = inside;
  }, [inside]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node;
      if (insideRef.current.some((r) => r.current?.contains(target))) return;
      onCloseRef.current();
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      e.preventDefault();
      onCloseRef.current();
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [open]);
}
