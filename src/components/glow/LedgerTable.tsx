"use client";

// The desktop ledger (docs/01 "Activity, desktop", boards 03/23). A real table:
// the description cell holds a button, so a row is reachable by keyboard; a click
// anywhere on the row selects it.

import { Avatar } from "./Avatar";
import { Button } from "./Button";
import { useFilters } from "./FilterProvider";
import { LedgerEmpty } from "./LedgerEmpty";
import { usePanelNav } from "./usePanel";
import { Money } from "./Money";
import { useLedgerView, type LedgerItem } from "./useLedgerView";

const th = "px-3 pb-2.5 pt-3.5 text-[length:var(--text-small)] font-bold text-text-muted";

function Impact({ item, currency }: { item: LedgerItem; currency: string }) {
  const { row, direction } = item;
  if (!row.involved || row.impactCents === null) {
    return <span className="text-text-muted">not involved</span>;
  }
  if (row.kind === "payment") {
    return (
      <span className="font-semibold text-text">
        <Money cents={Math.abs(row.impactCents)} currency={currency} /> {direction ?? ""}
      </span>
    );
  }
  return <Money cents={row.impactCents} currency={currency} signed tone="auto" className="font-bold" />;
}

function Row({ item, currency, onSelect }: { item: LedgerItem; currency: string; onSelect: () => void }) {
  const { row, selected } = item;
  const cell = "h-14 border-b border-line-table-row px-3 align-middle group-last:border-b-0";
  return (
    <tr
      onClick={onSelect}
      className={`group cursor-pointer ${selected ? "bg-positive-soft" : ""}`}
    >
      <td className={`${cell} w-24 font-bold ${selected ? "rounded-l-tile" : ""}`}>
        {item.firstOfDay ? item.dateLabel : ""}
      </td>
      <td className={`${cell} w-[40%] max-w-0`}>
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            data-nav-row={row.id}
            aria-current={selected ? "true" : undefined}
            onClick={(e) => {
              e.stopPropagation();
              onSelect();
            }}
            title={item.title}
            className={`min-w-0 truncate rounded-input text-left ${
              selected ? "font-extrabold" : row.kind === "expense" ? "font-bold" : "font-normal"
            }`}
          >
            {item.title}
          </button>
          {row.kind === "payment" ? (
            <>
              <span className="shrink-0 rounded-[10px] bg-positive-tag-bg px-2 py-0.5 text-[length:var(--text-small)] font-semibold text-positive-tag-fg">
                Payment
              </span>
              {row.note ? <span className="min-w-0 truncate text-text-muted">{row.note}</span> : null}
            </>
          ) : null}
        </div>
      </td>
      <td className={`${cell} max-w-[200px]`}>
        <span className="flex min-w-0 items-center gap-2.5 whitespace-nowrap">
          {item.payer.isViewer ? (
            <Avatar name={item.payer.name} variant="you" size={28} />
          ) : (
            <Avatar name={item.payer.name} slot={item.payer.slot} id={item.payer.id} size={28} />
          )}
          <span className="min-w-0 truncate" title={item.payer.isViewer ? undefined : item.payer.name}>
            {item.payer.isViewer ? "You" : item.payer.name}
          </span>
        </span>
      </td>
      <td className={`${cell} text-right`}>
        <Money cents={row.totalCents} currency={currency} />
      </td>
      <td className={`${cell} whitespace-nowrap text-right`}>
        <Impact item={item} currency={currency} />
      </td>
      <td className={`${cell} text-right text-text-secondary ${selected ? "rounded-r-tile" : ""}`}>
        <Money cents={row.balanceAfterCents} currency={currency} />
      </td>
    </tr>
  );
}

export function LedgerTable() {
  const { items, currency, ready, hasViewer, totalCount, filtered, query, select } = useLedgerView();
  const nav = usePanelNav();
  const { clearAll } = useFilters();

  if (!ready) return <LedgerEmpty />;
  if (!hasViewer) return <LedgerEmpty>Pick who you are to see your numbers.</LedgerEmpty>;
  if (items.length === 0 && totalCount > 0) {
    return (
      <LedgerEmpty
        title={query ? `Nothing matches "${query}"` : "Nothing matches these filters."}
        action={
          <Button variant="secondary" size={48} onClick={clearAll}>
            {query ? "Clear search and filters" : "Clear filters"}
          </Button>
        }
      >
        Try a different name, amount or word.
      </LedgerEmpty>
    );
  }
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
    <div className="overflow-x-auto rounded-hero bg-surface px-2 shadow-card">
      <table className="w-full min-w-[600px] border-collapse text-[length:var(--text-body)] text-text">
        <thead>
          <tr className="border-b border-line">
            <th scope="col" className={`${th} text-left`}>Date</th>
            <th scope="col" className={`${th} text-left`}>Description</th>
            <th scope="col" className={`${th} text-left`}>Paid by</th>
            <th scope="col" className={`${th} text-right`}>Total</th>
            <th scope="col" className={`${th} text-right`}>Your impact</th>
            <th
              scope="col"
              className={`${th} text-right`}
              title={filtered ? "Balance after each row, counting the whole history, not just these rows" : undefined}
            >
              Balance
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <Row key={item.row.id} item={item} currency={currency} onSelect={() => select(item.row.id)} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
