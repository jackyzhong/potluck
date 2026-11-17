"use client";

// The Activity toolbar (docs/01 "Toolbar", boards 03/04): the search field, the
// four single-select filters, and, while a hero chip is pressed, a removable
// "With {name}" chip. The page frame hides this slot below 640px (D20).

import { FilterChips, type FilterOption } from "./FilterChips";
import { useFilters } from "./FilterProvider";
import { CloseIcon } from "./icons";
import { SearchField } from "./SearchField";
import { useLedgerView } from "./useLedgerView";
import { useViewer } from "./ViewerProvider";
import type { FilterKind } from "@/src/lib/glow/filter";

const OPTIONS: readonly FilterOption<FilterKind>[] = [
  { value: "all", label: "All" },
  { value: "expenses", label: "Expenses" },
  { value: "payments", label: "Payments" },
  { value: "involving", label: "Involving me" }
];

export function ActivityToolbar() {
  const { filter, setKind, setQuery, clearPerson } = useFilters();
  const { members } = useViewer();
  const { items, totalCount, filtered, query } = useLedgerView();
  const person = filter.personId ? members.find((m) => m.id === filter.personId) : null;
  const hideEmptyPhone = totalCount === 0 ? "max-sm:hidden " : "";

  return (
    <>
      <SearchField
        data-shortcut="search"
        value={filter.query}
        onChange={setQuery}
        className={`${hideEmptyPhone}max-sm:mx-4 sm:min-w-[240px] sm:max-w-[360px] sm:flex-[1_1_320px]`}
      />
      <FilterChips
        aria-label="Filter activity"
        options={OPTIONS}
        value={filter.kind}
        onChange={setKind}
        className={`${hideEmptyPhone}max-sm:flex-nowrap max-sm:overflow-x-auto max-sm:px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`}
      />
      {person ? (
        <button
          type="button"
          onClick={clearPerson}
          aria-label={`Clear filter: with ${person.name}`}
          className="flex h-11 cursor-pointer items-center gap-2 self-start rounded-pill border-0 bg-positive-soft pl-4 pr-3.5 text-[length:var(--text-body)] font-bold text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent max-sm:mx-4"
        >
          With {person.name}
          <CloseIcon size={14} />
        </button>
      ) : null}
      {filtered && items.length > 0 && totalCount > 0 ? (
        <span aria-live="polite" className="mx-5 mt-1 text-[length:var(--text-meta)] text-text-muted sm:hidden">
          {query.trim()
            ? `${items.length} of ${totalCount} match \u201c${query.trim()}\u201d`
            : `${items.length} of ${totalCount} match`}
        </span>
      ) : null}
    </>
  );
}
