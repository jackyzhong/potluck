"use client";

// The list shared by the viewing-as menu (desktop) and sheet (phone): one row
// per member, "Manage members", and the theme setting (decision D4).

import { useRef, type KeyboardEvent } from "react";
import { Avatar } from "./Avatar";
import { Money } from "./Money";
import { CheckIcon, PeopleIcon } from "./icons";
import type { AvatarSlot } from "@/src/lib/glow/avatar";
import type { GlowMember } from "@/src/lib/glow/viewer";
import { THEMES, type Theme } from "@/src/lib/theme";

const THEME_LABELS: Record<Theme, string> = { system: "System", light: "Light", dark: "Dark" };

export type ViewerChoicesProps = {
  /** `menu`: the desktop popover (menu roles, arrow keys only). `sheet`: the phone dialog (radio roles, normal tab order). */
  mode: "menu" | "sheet";
  members: readonly GlowMember[];
  slots: ReadonlyMap<string, AvatarSlot>;
  /** Group net per member id, in cents. */
  nets: Readonly<Record<string, number>>;
  currency: string;
  viewerId: string | null;
  onPick: (memberId: string) => void;
  onManage: () => void;
  theme: Theme;
  onTheme: (theme: Theme) => void;
};

function Net({ cents, currency }: { cents: number; currency: string }) {
  if (cents > 0) {
    return (
      <>
        gets back <Money cents={cents} currency={currency} tone="positive" />
      </>
    );
  }
  if (cents < 0) {
    return (
      <>
        owes <Money cents={-cents} currency={currency} tone="negative" />
      </>
    );
  }
  return <>settled up</>;
}

/**
 * Arrow keys, Home/End and type-ahead over every `[data-nav]` element inside.
 * Used for both modes: it only moves focus, so it is harmless in the sheet.
 */
function useListKeys() {
  const typed = useRef({ text: "", at: 0 });

  return function onKeyDown(e: KeyboardEvent<HTMLElement>) {
    const items = Array.from(e.currentTarget.querySelectorAll<HTMLElement>("[data-nav]"));
    if (items.length === 0) return;
    const i = items.indexOf(document.activeElement as HTMLElement);
    let next = -1;

    if (e.key === "ArrowDown") next = i < 0 ? 0 : (i + 1) % items.length;
    else if (e.key === "ArrowUp") next = i < 0 ? items.length - 1 : (i - 1 + items.length) % items.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = items.length - 1;
    else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && e.key !== " ") {
      const now = Date.now();
      typed.current.text = now - typed.current.at > 700 ? e.key.toLowerCase() : typed.current.text + e.key.toLowerCase();
      typed.current.at = now;
      const text = typed.current.text;
      // Start after the current item so repeated letters cycle through matches.
      const order = [...items.slice(i + 1), ...items.slice(0, i + 1)];
      const hit = order.find((el) => (el.dataset.label ?? "").toLowerCase().startsWith(text));
      if (hit) next = items.indexOf(hit);
      else return;
    } else return;

    e.preventDefault();
    items[next]?.focus();
  };
}

export function ViewerChoices({
  mode,
  members,
  slots,
  nets,
  currency,
  viewerId,
  onPick,
  onManage,
  theme,
  onTheme
}: ViewerChoicesProps) {
  const onKeyDown = useListKeys();
  const menu = mode === "menu";
  const itemRole = menu ? "menuitemradio" : "radio";
  // Menu items are reached with the arrow keys; in the sheet, Tab should work too.
  const tab = menu ? -1 : undefined;

  return (
    <div onKeyDown={onKeyDown} className="flex flex-col">
      <div
        role={menu ? "group" : "radiogroup"}
        aria-label="View the group as"
        className="flex flex-col"
      >
        {members.map((member) => {
          const selected = member.id === viewerId;
          return (
            <button
              key={member.id}
              type="button"
              role={itemRole}
              aria-checked={selected}
              data-nav
              data-label={member.name}
              data-selected={selected || undefined}
              tabIndex={tab}
              onClick={() => onPick(member.id)}
              className={[
                "grid w-full cursor-pointer grid-cols-[32px_minmax(0,1fr)_auto_20px] items-center gap-2.5 rounded-tile border-0 px-3 py-1.5 text-left",
                "min-h-[52px] max-sm:min-h-14 max-sm:grid-cols-[36px_minmax(0,1fr)_auto_20px]",
                "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent",
                selected ? "bg-positive-soft" : "bg-transparent hover:bg-surface-muted"
              ].join(" ")}
            >
              <Avatar
                name={member.name}
                slot={slots.get(member.id)}
                id={member.id}
                size={menu ? 32 : 36}
              />
              <span className="truncate font-bold">{member.name}</span>
              <span className="text-[length:var(--text-meta)] font-semibold text-text-muted">
                <Net cents={nets[member.id] ?? 0} currency={currency} />
              </span>
              <span className="flex justify-end text-positive">
                {selected ? <CheckIcon size={20} /> : null}
              </span>
            </button>
          );
        })}
      </div>

      <div aria-hidden="true" className="mx-3 my-1.5 h-px bg-line" />

      <button
        type="button"
        role={menu ? "menuitem" : undefined}
        data-nav
        data-label="Manage members"
        tabIndex={tab}
        onClick={onManage}
        className="flex min-h-12 w-full cursor-pointer items-center gap-2.5 rounded-tile border-0 bg-transparent px-3 py-1.5 text-left font-bold text-text hover:bg-surface-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent max-sm:min-h-14"
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-muted max-sm:size-9">
          <PeopleIcon size={18} />
        </span>
        Manage members
      </button>

      <div aria-hidden="true" className="mx-3 my-1.5 h-px bg-line" />

      <div role={menu ? "group" : "radiogroup"} aria-label="Theme" className="flex flex-col gap-2 px-3 pb-2 pt-1">
        <span className="text-[length:var(--text-small)] font-bold uppercase tracking-[var(--tracking-label)] text-text-muted">
          Theme
        </span>
        <div className="grid grid-cols-3 gap-1 rounded-pill bg-surface-muted p-1">
          {THEMES.map((t) => {
            const selected = t === theme;
            return (
              <button
                key={t}
                type="button"
                role={itemRole}
                aria-checked={selected}
                data-nav
                data-label={THEME_LABELS[t]}
                tabIndex={tab}
                onClick={() => onTheme(t)}
                className={[
                  "h-10 cursor-pointer rounded-pill border-0 text-[length:var(--text-body)] max-sm:h-11",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                  selected
                    ? "bg-segment-selected font-bold text-text shadow-[var(--segment-selected-shadow)]"
                    : "bg-transparent font-semibold text-text-secondary"
                ].join(" ")}
              >
                {THEME_LABELS[t]}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
