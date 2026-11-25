"use client";

// What LedgerTable (desktop) and LedgerList (phone) share: the viewer's rows from
// useGlowData(), who is who, the day grouping, and the selected row in the URL.
//
// Selecting a row only sets `?e=<id>` (decision D18). Opening the panel or sheet
// is T11's job; it reads the same param. Other params (?tab=, ?panel=) are kept.

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { AvatarSlot } from "@/src/lib/glow/avatar";
import { filterLedger, participantsByRow } from "@/src/lib/glow/filter";
import { events, type LedgerRow } from "@/src/lib/glow/ledger";
import { useFilters } from "./FilterProvider";
import { useGlowData, useViewer, type ViewerNumbers } from "./ViewerProvider";

export type LedgerPerson = { id: string; name: string; slot: AvatarSlot | undefined; isViewer: boolean };

export type LedgerItem = {
  row: ViewerNumbers["ledger"][number];
  /** "Firewood", "Theo paid you", "You paid Lena". */
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
  /** How many rows the viewer has before any filter. */
  totalCount: number;
  /** True when a filter or search is hiding rows. */
  filtered: boolean;
  /** The applied search text, for the empty state. */
  query: string;
  select: (id: string) => void;
};

const DAY = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/**
 * `applyFilters: false` shows every row. The phone list uses it: filters have no
 * phone controls this round (D20), so a hidden one must not narrow the list.
 */
export function useLedgerView({ applyFilters = true }: { applyFilters?: boolean } = {}): LedgerView {
  const { forViewer, currency, slots, data } = useGlowData();
  const { applied } = useFilters();
  const participants = useMemo(() => participantsByRow(data), [data]);
  const { status, viewerId, members } = useViewer();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("e");

  const allRows = useMemo<LedgerRow[]>(() => {
    if (forViewer) return forViewer.ledger;
    return events(data)
      .reverse()
      .map((ev): LedgerRow =>
        ev.kind === "expense"
          ? {
              id: ev.expense.id,
              kind: "expense",
              createdAt: ev.expense.created_at,
              title: ev.expense.description,
              payerId: ev.expense.payer_id,
              payeeId: null,
              note: null,
              totalCents: ev.expense.amount_cents,
              involved: false,
              impactCents: null,
              balanceAfterCents: 0
            }
          : {
              id: ev.payment.id,
              kind: "payment",
              createdAt: ev.payment.created_at,
              title: null,
              payerId: ev.payment.payer_id,
              payeeId: ev.payment.payee_id,
              note: ev.payment.note,
              totalCents: ev.payment.amount_cents,
              involved: false,
              impactCents: null,
              balanceAfterCents: 0
            }
      );
  }, [forViewer, data]);

  const items = useMemo<LedgerItem[]>(() => {
    const byId = new Map(members.map((m) => [m.id, m]));
    const person = (id: string): LedgerPerson => ({
      id,
      name: byId.get(id)?.name ?? "Someone",
      slot: slots.get(id),
      isViewer: viewerId !== null && id === viewerId
    });
    // Hide rows after viewerLedger: each keeps the balance it had in the full history.
    const names = new Map(members.map((m) => [m.id, m.name]));
    const rows = applyFilters
      ? filterLedger(allRows, applied, { names, participants, viewerId })
      : allRows;
    return rows.map((row, index): LedgerItem => {
      const payer = person(row.payerId);
      const date = new Date(row.createdAt);
      const key = dayKey(date);
      const firstOfDay = index === 0 || key !== dayKey(new Date(rows[index - 1].createdAt));

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
  }, [allRows, members, slots, viewerId, selectedId, applied, applyFilters, participants]);

  const select = useCallback(
    (id: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("e", id);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  return {
    items,
    currency,
    ready: status === "ready",
    hasViewer: forViewer !== null,
    totalCount: allRows.length,
    filtered: applyFilters && items.length !== allRows.length,
    query: applyFilters ? applied.query.trim() : "",
    select
  };
}
