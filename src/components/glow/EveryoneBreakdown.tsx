"use client";

import { useId, useMemo, useState, type ReactNode } from "react";
import {
  everyoneRows,
  lineDate,
  memberLines,
  netLabel,
  paymentsCell,
  showExpensesLabel,
  type BreakdownLine,
  type EveryoneRow
} from "@/src/lib/glow/balances";
import { Avatar } from "./Avatar";
import { Button } from "./Button";
import { ChevronDownIcon } from "./icons";
import { Money } from "./Money";
import { usePanelNav } from "./usePanel";
import { useGlowData, useViewer } from "./ViewerProvider";

// ---------- shared pieces ----------

const toneOf = (row: EveryoneRow) =>
  row.netKind === "back" ? "positive" : row.netKind === "owes" ? "negative" : "neutral";

const eyebrow =
  "m-0 mb-0.5 text-[length:var(--text-small)] font-bold uppercase tracking-[var(--tracking-label)] text-text-muted";

function Chevron({ open }: { open: boolean }) {
  return (
    <ChevronDownIcon
      size={20}
      className={`shrink-0 text-text-muted transition-transform duration-[var(--dur-fast)] motion-reduce:transition-none ${
        open ? "" : "-rotate-90"
      }`}
    />
  );
}

/** One itemised line: "Pizza Badiali · Sep 8" and an amount. Opens the expense in the right panel. */
function Line({ line, currency, onOpen }: { line: BreakdownLine; currency: string; onOpen: (id: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(line.expenseId)}
      className="-mx-1 flex w-[calc(100%+8px)] cursor-pointer items-baseline justify-between gap-2 rounded-input border-0 bg-transparent px-1 text-left text-inherit hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent max-sm:min-h-11 max-sm:items-center sm:py-0.5"
    >
      <span className="min-w-0 truncate">
        {line.description}
        <span className="text-text-muted"> · {lineDate(line.createdAt)}</span>
      </span>
      <Money cents={line.cents} currency={currency} />
    </button>
  );
}

function Lines({
  lines,
  currency,
  onOpen
}: {
  lines: BreakdownLine[];
  currency: string;
  onOpen: (id: string) => void;
}) {
  if (lines.length === 0) return <span className="text-text-muted">None</span>;
  return (
    <>
      {lines.map((l, i) => (
        <Line key={`${l.expenseId}:${i}`} line={l} currency={currency} onOpen={onOpen} />
      ))}
    </>
  );
}

// ---------- the card ----------

/**
 * Everyone, biggest balance first (docs/03 "EveryoneBreakdown"). On a phone each
 * person is an accordion row; from 640px up it's a grid with Paid, Share,
 * Payments and Net columns, and a row opens into three columns. Both are in the
 * DOM and CSS shows one, sharing a single open/closed state. Any number of rows
 * can be open. All figures come from `useGlowData()`'s totals and the existing
 * `getMemberBreakdown`.
 */
export function EveryoneBreakdown() {
  const { viewerId, members } = useViewer();
  const { data, currency, slots } = useGlowData();
  const { openDetails } = usePanelNav();
  const baseId = useId();

  const rows = useMemo(
    () => everyoneRows(data, new Set(members.filter((m) => m.archived_at).map((m) => m.id))),
    [data, members]
  );
  const byId = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);

  const [open, setOpen] = useState<ReadonlySet<string>>(new Set());
  const [listed, setListed] = useState<ReadonlySet<string>>(new Set());
  const flip = (set: ReadonlySet<string>, id: string) => {
    const next = new Set(set);
    if (!next.delete(id)) next.add(id);
    return next;
  };

  const isViewer = (id: string) => id === viewerId;
  const nameOf = (id: string) => (isViewer(id) ? "You" : (byId.get(id)?.name ?? "Someone"));
  const avatar = (id: string, size: 32 | 36) => (
    <Avatar
      name={byId.get(id)?.name ?? ""}
      slot={slots.get(id)}
      id={id}
      size={size}
      variant={isViewer(id) ? "you" : "member"}
    />
  );
  const panelId = (id: string, layout: string) => `${baseId}-${layout}-${id}`;

  return (
    <section
      aria-labelledby="everyone-title"
      className="flex min-w-0 flex-[2_1_560px] flex-col rounded-card bg-surface px-3.5 pb-1 pt-3.5 shadow-card sm:rounded-hero sm:px-5 sm:pb-2 sm:pt-[18px]"
    >
      <div className="flex flex-col pb-2">
        <h2 id="everyone-title" className="m-0 text-[length:var(--text-card-title)] font-extrabold sm:text-[18px]">
          Everyone
        </h2>
        <span className="text-[length:var(--text-meta)] text-text-muted">
          <span className="sm:hidden">Tap a person to see how their balance adds up</span>
          <span className="max-sm:hidden">Click a person to see how their balance adds up</span>
        </span>
      </div>

      {/* Phone: accordion */}
      <ul className="m-0 flex list-none flex-col p-0 sm:hidden">
        {rows.map((row) => {
          const isOpen = open.has(row.memberId);
          const id = panelId(row.memberId, "m");
          const showList = listed.has(row.memberId);
          const lines = isOpen ? memberLines(data, row.memberId) : null;
          return (
            <li key={row.memberId} className="border-t border-line first:border-t-0">
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={id}
                onClick={() => setOpen(flip(open, row.memberId))}
                className="grid min-h-[60px] w-full cursor-pointer grid-cols-[36px_minmax(0,1fr)_auto_20px] items-center gap-3 border-0 bg-transparent py-2 text-left text-inherit focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                {avatar(row.memberId, 36)}
                <span className="truncate font-bold">{nameOf(row.memberId)}</span>
                <span className="flex flex-col items-end">
                  <span className="text-[length:var(--text-small)] text-text-muted">
                    {netLabel(row.netKind, isViewer(row.memberId))}
                  </span>
                  {row.netKind === "square" ? null : (
                    <Money cents={Math.abs(row.netCents)} currency={currency} tone={toneOf(row)} className="font-bold" />
                  )}
                </span>
                <Chevron open={isOpen} />
              </button>
              {isOpen && lines ? (
                <div
                  id={id}
                  role="region"
                  aria-label={`${nameOf(row.memberId)}, how the balance adds up`}
                  className="mb-2 flex flex-col gap-1.5 rounded-tile bg-surface-sunken p-3 text-[length:var(--text-body-phone)] tabular-nums"
                >
                  <Total label="Paid for the group" cents={row.paidCents} currency={currency} />
                  <Total label="Their share" cents={-row.shareCents} currency={currency} />
                  <Total label="Payments" cents={row.paymentsCents} currency={currency} signed />
                  <Total label="Net" cents={row.netCents} currency={currency} tone="auto" strong />
                  {lines.expenseCount > 0 ? (
                    <Button
                      variant="soft"
                      inPanel
                      className="mt-1"
                      aria-expanded={showList}
                      onClick={() => setListed(flip(listed, row.memberId))}
                    >
                      {showExpensesLabel(lines.expenseCount, showList)}
                    </Button>
                  ) : null}
                  {showList ? (
                    <div className="mt-1 flex flex-col gap-3 text-[length:var(--text-meta)]">
                      <div className="flex flex-col">
                        <h3 className={eyebrow}>Paid for the group</h3>
                        <Lines lines={lines.paid} currency={currency} onOpen={openDetails} />
                      </div>
                      <div className="flex flex-col">
                        <h3 className={eyebrow}>Their share</h3>
                        <Lines lines={lines.share} currency={currency} onOpen={openDetails} />
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>

      {/* Desktop and tablet: grid */}
      <div className="overflow-x-auto max-sm:hidden">
        <div className="flex min-w-[600px] flex-col tabular-nums">
          <div className={`${GRID} py-2 text-[length:var(--text-small)] font-bold text-text-muted`}>
            <span>Person</span>
            <span className="text-right">Paid</span>
            <span className="text-right">Share</span>
            <span className="text-right">Payments</span>
            <span className="text-right">Net</span>
            <span />
          </div>
          {rows.map((row) => {
            const isOpen = open.has(row.memberId);
            const id = panelId(row.memberId, "d");
            const cells = paymentsCell(row);
            return (
              <div key={row.memberId} className="border-t border-line">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={id}
                  onClick={() => setOpen(flip(open, row.memberId))}
                  className={`${GRID} min-h-14 w-full cursor-pointer border-0 bg-transparent py-1.5 text-left text-inherit focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent`}
                >
                  <span className="flex min-w-0 items-center gap-2.5 font-bold">
                    {avatar(row.memberId, 32)}
                    <span className="truncate">{nameOf(row.memberId)}</span>
                  </span>
                  <span className="text-right">
                    <Money cents={row.paidCents} currency={currency} />
                  </span>
                  <span className="text-right">
                    <Money cents={row.shareCents} currency={currency} />
                  </span>
                  <span className="flex flex-col text-right">
                    {cells.length === 0 ? (
                      <span className="text-text-muted">none</span>
                    ) : (
                      cells.map((c) => (
                        <span key={c.kind}>
                          {c.kind} <Money cents={c.cents} currency={currency} />
                        </span>
                      ))
                    )}
                  </span>
                  <span className="text-right font-bold">
                    {row.netKind === "square" ? (
                      <span className="text-text-muted">{netLabel("square", false)}</span>
                    ) : (
                      <span className={row.netKind === "back" ? "text-positive" : "text-negative"}>
                        {netLabel(row.netKind, isViewer(row.memberId))}{" "}
                        <Money cents={Math.abs(row.netCents)} currency={currency} />
                      </span>
                    )}
                  </span>
                  <Chevron open={isOpen} />
                </button>
                {isOpen ? (
                  <Expanded
                    id={id}
                    name={nameOf(row.memberId)}
                    row={row}
                    currency={currency}
                    lines={memberLines(data, row.memberId)}
                    onOpen={openDetails}
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// Person · Paid · Share · Payments · Net · chevron (docs/01 "Balances, desktop").
const GRID =
  "grid grid-cols-[minmax(150px,1.5fr)_repeat(3,minmax(0,1fr))_minmax(0,1.3fr)_20px] items-center gap-3";

function Total({
  label,
  cents,
  currency,
  tone,
  signed,
  strong
}: {
  label: string;
  cents: number;
  currency: string;
  tone?: "auto";
  signed?: boolean;
  strong?: boolean;
}) {
  return (
    <div
      className={`flex justify-between gap-3 ${
        strong ? "mt-0.5 border-t border-line pt-1.5 font-extrabold" : ""
      }`}
    >
      <span>{label}</span>
      <Money cents={cents} currency={currency} signed={signed} tone={tone} />
    </div>
  );
}

function Column({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <h3 className={`${eyebrow} mb-0.5`}>{title}</h3>
      {children}
    </div>
  );
}

/** The desktop expanded row: Paid for the group · Their share · Adds up to. */
function Expanded({
  id,
  name,
  row,
  currency,
  lines,
  onOpen
}: {
  id: string;
  name: string;
  row: EveryoneRow;
  currency: string;
  lines: ReturnType<typeof memberLines>;
  onOpen: (expenseId: string) => void;
}) {
  return (
    <div
      id={id}
      role="region"
      aria-label={`${name}, how the balance adds up`}
      className="mb-2.5 grid grid-cols-3 gap-6 rounded-chip bg-surface-sunken p-4 text-[length:var(--text-meta)]"
    >
      <Column title="Paid for the group">
        <Lines lines={lines.paid} currency={currency} onOpen={onOpen} />
      </Column>
      <Column title="Their share">
        <Lines lines={lines.share} currency={currency} onOpen={onOpen} />
      </Column>
      <Column title="Adds up to">
        <Total label="Total paid" cents={row.paidCents} currency={currency} />
        <Total label="Total share" cents={-row.shareCents} currency={currency} />
        <Total label="Payments" cents={row.paymentsCents} currency={currency} signed />
        <div className="flex justify-between gap-3 border-t border-line pt-1.5 text-[length:var(--text-body)] font-extrabold">
          <span>Net</span>
          <Money cents={row.netCents} currency={currency} tone="auto" />
        </div>
      </Column>
    </div>
  );
}
