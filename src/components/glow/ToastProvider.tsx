"use client";

// One polite toast for success messages (D15): no Undo this round, and errors
// stay inline next to what failed. `useToast().show("Expense added")` from any
// client component under the provider.
//
// The toast sits in the browser's top layer (a manual popover) so the tablet
// drawer and the phone sheet, which are modal <dialog>s, can't cover it. A new
// message replaces the one showing, and every message goes away by itself.
//
// Two screen-reader details (T19):
// - A modal <dialog> makes everything outside it inert, and inert nodes are not
//   in the accessibility tree, so a toast shown over the drawer or sheet is
//   seen but never heard. While a modal is open the toast is rendered inside
//   it (a popover inside the dialog is still top layer and not inert).
// - A live region that appears together with its text is often skipped, so a
//   success message is spoken through a visually hidden `role="status"` that
//   is always mounted; its text is filled in a moment after it moves or the
//   message changes. The visible success toast is hidden from the tree to
//   avoid hearing it twice. An error keeps `role="alert"`.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from "react";
import { createPortal } from "react-dom";
import { Toast, type ToastProps } from "./Toast";

const SHOW_MS = 5000;

type ShowOptions = { variant?: ToastProps["variant"] };
type ToastApi = { show: (message: string, options?: ShowOptions) => void };

const NOOP: ToastApi = { show: () => {} };
const ToastContext = createContext<ToastApi | null>(null);

/** Safe anywhere: outside a `ToastProvider` it does nothing. */
export function useToast(): ToastApi {
  return useContext(ToastContext) ?? NOOP;
}

type Current = { key: number; message: string; variant: ToastProps["variant"] };

/** The modal <dialog> that is open now, if any (the last one, when prompts stack). */
function openModal(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  try {
    const all = document.querySelectorAll<HTMLElement>("dialog[open]:modal");
    return all.length ? all[all.length - 1] : null;
  } catch {
    return null;
  }
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<Current | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const counter = useRef(0);
  const host = useRef<HTMLDivElement>(null);
  const [container, setContainer] = useState<HTMLElement | null>(null);
  // Which message, in which container, has been handed to the live region.
  const [spokenFor, setSpokenFor] = useState<{ key: number; container: HTMLElement | null } | null>(null);

  const show = useCallback((message: string, options?: ShowOptions) => {
    window.clearTimeout(timer.current);
    counter.current += 1;
    setContainer(openModal());
    setCurrent({ key: counter.current, message, variant: options?.variant ?? "success" });
    timer.current = window.setTimeout(() => setCurrent(null), SHOW_MS);
  }, []);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  // While a toast is up, follow the modal: it can close (a delete closes the
  // drawer) or open under the toast.
  useEffect(() => {
    if (!current) return;
    const follow = () => setContainer((now) => {
      const next = openModal();
      return next === now ? now : next;
    });
    const observer = new MutationObserver(follow);
    observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["open"] });
    return () => observer.disconnect();
  }, [current]);

  // Speak a success message from the always-mounted region, a beat after it
  // (re)appears so assistive tech sees a change rather than a new element.
  useEffect(() => {
    if (!current || current.variant === "error") return;
    const id = window.setTimeout(() => setSpokenFor({ key: current.key, container }), 150);
    return () => window.clearTimeout(id);
  }, [current, container]);

  // Promote to the top layer each time, so a dialog opened since the last toast
  // doesn't stay above it.
  useEffect(() => {
    const el = host.current;
    if (!el || typeof el.showPopover !== "function") return;
    try {
      if (el.matches(":popover-open")) el.hidePopover();
      if (current) el.showPopover();
    } catch {
      /* A browser without the popover API shows the fixed element as it is. */
    }
  }, [current, container]);

  const api = useMemo<ToastApi>(() => ({ show }), [show]);

  const spokenText =
    current && spokenFor && spokenFor.key === current.key && spokenFor.container === container ? current.message : "";

  const layer = (
    <>
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {spokenText}
      </div>
      <div
        ref={host}
        popover="manual"
        data-toast-host
        className="pointer-events-none fixed inset-x-auto left-1/2 bottom-[calc(96px+env(safe-area-inset-bottom))] top-auto m-0 flex w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 justify-center overflow-visible border-0 bg-transparent p-0 text-text sm:bottom-6"
      >
        {current ? (
          <div aria-hidden={current.variant === "error" ? undefined : "true"}>
            <Toast
              key={current.key}
              message={current.message}
              variant={current.variant}
              live={current.variant === "error"}
              className="max-w-full"
            />
          </div>
        ) : null}
      </div>
    </>
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      {container ? createPortal(layer, container) : layer}
    </ToastContext.Provider>
  );
}
