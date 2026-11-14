"use client";

// One polite toast for success messages (D15): no Undo this round, and errors
// stay inline next to what failed. `useToast().show("Expense added")` from any
// client component under the provider.
//
// The toast sits in the browser's top layer (a manual popover) so the tablet
// drawer and the phone sheet, which are modal <dialog>s, can't cover it. A new
// message replaces the one showing, and every message goes away by itself.

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

export function ToastProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<Current | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const counter = useRef(0);
  const host = useRef<HTMLDivElement>(null);

  const show = useCallback((message: string, options?: ShowOptions) => {
    window.clearTimeout(timer.current);
    counter.current += 1;
    setCurrent({ key: counter.current, message, variant: options?.variant ?? "success" });
    timer.current = window.setTimeout(() => setCurrent(null), SHOW_MS);
  }, []);

  useEffect(() => () => window.clearTimeout(timer.current), []);

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
  }, [current]);

  const api = useMemo<ToastApi>(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        ref={host}
        popover="manual"
        data-toast-host
        className="pointer-events-none fixed inset-x-auto left-1/2 bottom-[calc(96px+env(safe-area-inset-bottom))] top-auto m-0 flex w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 justify-center overflow-visible border-0 bg-transparent p-0 text-text sm:bottom-6"
      >
        {current ? (
          <Toast key={current.key} message={current.message} variant={current.variant} className="max-w-full" />
        ) : null}
      </div>
    </ToastContext.Provider>
  );
}
