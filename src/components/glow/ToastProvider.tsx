"use client";

// Polite toast for success saves and undoable deletes (D26), plus error alerts.
// Sits in the browser's top layer (manual popover) so drawers and sheets don't
// cover it, and teleports into open modal <dialog>s so assistive tech and keyboard
// focus remain un-inert when an action button ("Undo") is shown.

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
import { Toast, type ToastAction, type ToastProps } from "./Toast";

const SHOW_MS = 5000;

type ShowOptions = { variant?: ToastProps["variant"]; action?: ToastAction };
type ToastApi = { show: (message: string, options?: ShowOptions) => void; dismiss: () => void };

const NOOP: ToastApi = { show: () => {}, dismiss: () => {} };
const ToastContext = createContext<ToastApi | null>(null);

/** Safe anywhere: outside a `ToastProvider` it does nothing. */
export function useToast(): ToastApi {
  return useContext(ToastContext) ?? NOOP;
}

type ActiveToast = { key: number; message: string; variant: ToastProps["variant"]; action?: ToastAction };

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
  const [active, setActive] = useState<ActiveToast | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const counter = useRef(0);
  const host = useRef<HTMLDivElement>(null);
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const [spokenFor, setSpokenFor] = useState<{ key: number; container: HTMLElement | null } | null>(null);

  const dismiss = useCallback(() => {
    window.clearTimeout(timer.current);
    setActive(null);
  }, []);

  const show = useCallback((message: string, options?: ShowOptions) => {
    window.clearTimeout(timer.current);
    counter.current += 1;
    setContainer(openModal());
    setActive({
      key: counter.current,
      message,
      variant: options?.variant ?? "success",
      action: options?.action
    });
    timer.current = window.setTimeout(() => setActive(null), SHOW_MS);
  }, []);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  useEffect(() => {
    if (!active) return;
    const follow = () =>
      setContainer((now) => {
        const next = openModal();
        return next === now ? now : next;
      });
    const observer = new MutationObserver(follow);
    observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["open"] });
    return () => observer.disconnect();
  }, [active]);

  useEffect(() => {
    if (!active || active.variant === "error") return;
    const id = window.setTimeout(() => setSpokenFor({ key: active.key, container }), 150);
    return () => window.clearTimeout(id);
  }, [active, container]);

  useEffect(() => {
    const el = host.current;
    if (!el || typeof el.showPopover !== "function") return;
    try {
      if (el.matches(":popover-open")) el.hidePopover();
      if (active) el.showPopover();
    } catch {
      /* Fallback for environments without Popover API. */
    }
  }, [active, container]);

  const api = useMemo<ToastApi>(() => ({ show, dismiss }), [show, dismiss]);

  const spokenText =
    active && spokenFor && spokenFor.key === active.key && spokenFor.container === container ? active.message : "";

  const toastAction = active?.action;
  const hideVisible = active?.variant !== "error" && !toastAction;

  const layer = (
    <>
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {spokenText}
      </div>
      <div
        ref={host}
        popover="manual"
        data-toast-host
        className="pointer-events-none fixed inset-x-auto bottom-[calc(96px+env(safe-area-inset-bottom))] left-1/2 top-auto m-0 flex w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 justify-center overflow-visible border-0 bg-transparent p-0 text-text sm:bottom-16"
      >
        {active ? (
          <div
            aria-hidden={hideVisible ? "true" : undefined}
            className={toastAction ? "pointer-events-auto" : undefined}
          >
            <Toast
              key={active.key}
              message={active.message}
              variant={active.variant}
              action={
                toastAction
                  ? {
                      label: toastAction.label,
                      onClick: () => {
                        dismiss();
                        toastAction.onClick();
                      }
                    }
                  : undefined
              }
              live={active.variant === "error"}
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
