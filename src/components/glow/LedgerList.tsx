"use client";

// The phone ledger (docs/01 "Activity, phone", boards 01/02): one tappable row per
// event, payer avatar · title over a meta line · impact over the running balance.

import { Avatar } from "./Avatar";
import { Button } from "./Button";
import { LedgerEmpty } from "./LedgerEmpty";
import { usePanelNav } from "./usePanel";
import { Money } from "./Money";
import { useLedgerView, type LedgerItem } from "./useLedgerView";

function Impact({ item, currency }: { item: LedgerItem; currency: string }) {
  const { row, direction } = item;
  if (!row.involved || row.impactCents === null) {
    return <span className="font-normal text-text-muted">not involved</span>;
  }
  if (row.kind === "payment") {
    return (
      <span className="font-semibold text-text">
        <Money cents={Math.abs(row.impactCents)} currency={currency} /> {direction ?? ""}
      </span>
    );
  }
  return <Money cents={row.impactCents} currency={currency} signed tone="auto" />;
}

function Meta({ item, currency }: { item: LedgerItem; currency: string }) {
  const { row } = item;
  if (row.kind === "payment") {
    return (
      <>
        {item.dateLabel} · payment{row.note ? ` · ${row.note}` : ""}
      </>
    );
  }
  return (
    <>
      {item.dateLabel} · {item.payer.isViewer ? "You" : item.payer.name} paid{" "}
      <Money cents={row.totalCents} currency={currency} />
    </>
  );
}

export function LedgerList() {
  const { items, currency, ready, hasViewer, select } = useLedgerView({ applyFilters: false });
  const nav = usePanelNav();

  if (!ready) return <LedgerEmpty />;
  if (!hasViewer) return <LedgerEmpty>Pick who you are to see your numbers.</LedgerEmpty>;
  if (items.length === 0) return (
      <LedgerEmpty
        title="No expenses yet"
        action={
          <Button size={48} kbd="N" onClick={nav.openAdd}>
            Add expense
          </Button>
        }
      >
        Add the first one and Potluck keeps the tally.
      </LedgerEmpty>
    );

  return (
    <ul className="rounded-card bg-surface px-3.5 shadow-card">
      {items.map((item) => (
        <li key={item.row.id} className="border-b border-line last:border-b-0">
          <button
            type="button"
            data-nav-row={item.row.id}
            aria-current={item.selected ? "true" : undefined}
            onClick={() => select(item.row.id)}
            className={`-mx-2 grid min-h-16 w-[calc(100%+16px)] grid-cols-[36px_1fr_auto] items-center gap-3 rounded-tile px-2 py-2 text-left text-[length:var(--text-body-phone)] ${
              item.selected ? "bg-positive-soft" : ""
            }`}
          >
            {item.payer.isViewer ? (
              <Avatar name={item.payer.name} variant="you" size={36} />
            ) : (
              <Avatar name={item.payer.name} slot={item.payer.slot} id={item.payer.id} size={36} />
            )}
            <span className="min-w-0">
              <span className={`line-clamp-2 block ${item.selected ? "font-extrabold" : "font-bold"}`}>
                {item.title}
              </span>
              <span className="block text-[length:var(--text-meta)] text-text-muted">
                <Meta item={item} currency={currency} />
              </span>
            </span>
            <span className="text-right">
              <span className="block font-bold">
                <Impact item={item} currency={currency} />
              </span>
              <span className="block text-[length:var(--text-small)] text-text-muted">
                bal. <Money cents={item.row.balanceAfterCents} currency={currency} />
              </span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
