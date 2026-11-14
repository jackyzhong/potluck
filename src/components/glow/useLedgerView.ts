"use client";

// What LedgerTable (desktop) and LedgerList (phone) share: the viewer's rows from
// useGlowData(), who is who, the day grouping, and the selected row in the URL.
//
// Selecting a row only sets `?e=<id>` (decision D18). Opening the panel or sheet
// is T11's job; it reads the same param. Other params (?tab=, ?panel=) are kept.

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { AvatarSlot } from "@/src/lib/glow/avatar";
import { useGlowData, useViewer, type ViewerNumbers } from "./ViewerProvider";

export type LedgerPerson = { id: string; name: string; slot: AvatarSlot | undefined; isViewer: boolean };

export type LedgerItem = {
  row: ViewerNumbers["ledger"][number];
  /** "Fans", "Matthew paid you", "You paid Alvin". */
  title: string;
  payer: LedgerPerson;
  /** "Sep 18". */
  dateLabel: string;
  /** True on the first (newest) row of a calendar day. */
  firstOfDay: boolean;
  selected: boolean;
  /** Payments only: the viewer received it ("in") or sent it ("out"). */
  direction: "in" | "out" | null;
};

export type LedgerView = {
  items: LedgerItem[];
  currency: string;
  /** False until this device's saved viewer has been read. */
  ready: boolean;
  /** False when nobody is picked, so there is no impact to show. */
  hasViewer: boolean;
  select: (id: string) => void;
};

const DAY = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function useLedgerView(): LedgerView {
  const { forViewer, currency, slots } = useGlowData();
  const { status, viewerId, members } = useViewer();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("e");

  const items = useMemo<LedgerItem[]>(() => {
    if (!forViewer) return [];
    const byId = new Map(members.map((m) => [m.id, m]));
    const person = (id: string): LedgerPerson => ({
      id,
      name: byId.get(id)?.name ?? "Someone",
      slot: slots.get(id),
      isViewer: id === viewerId
    });
    let prevDay = "";
    return forViewer.ledger.map((row): LedgerItem => {
      const payer = person(row.payerId);
      const date = new Date(row.createdAt);
      const key = dayKey(date);
      const firstOfDay = key !== prevDay;
      prevDay = key;

      let title: string;
      let direction: LedgerItem["direction"] = null;
      if (row.kind === "expense") {
        title = row.title?.trim() || "Untitled expense";
      } else {
        const payee = person(row.payeeId ?? "");
        if (payee.isViewer) direction = "in";
        else if (payer.isViewer) direction = "out";
        title = payee.isViewer
          ? `${payer.name} paid you`
          : payer.isViewer
            ? `You paid ${payee.name}`
            : `${payer.name} paid ${payee.name}`;
      }
      return {
        row,
        title,
        payer,
        dateLabel: DAY.format(date),
        firstOfDay,
        selected: row.id === selectedId,
        direction
      };
    });
  }, [forViewer, members, slots, viewerId, selectedId]);

  const select = useCallback(
    (id: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("e", id);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  return { items, currency, ready: status === "ready", hasViewer: forViewer !== null, select };
}
