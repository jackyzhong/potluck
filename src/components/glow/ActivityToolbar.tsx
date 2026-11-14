"use client";

// The Activity toolbar (docs/01 "Toolbar", boards 03/04): the search field, the
// four single-select filters, and, while a hero chip is pressed, a removable
// "With {name}" chip. The page frame hides this slot below 640px (D20).

import { FilterChips, type FilterOption } from "./FilterChips";
import { useFilters } from "./FilterProvider";
import { CloseIcon } from "./icons";
import { SearchField } from "./SearchField";
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
  const person = filter.personId ? members.find((m) => m.id === filter.personId) : null;

  return (
    <>
      <SearchField data-shortcut="search" value={filter.query} onChange={setQuery} className="min-w-[240px] max-w-[360px] flex-[1_1_320px]" />
      <FilterChips aria-label="Filter activity" options={OPTIONS} value={filter.kind} onChange={setKind} />
      {person ? (
        <button
          type="button"
          onClick={clearPerson}
          aria-label={`Clear filter: with ${person.name}`}
          className="flex h-11 cursor-pointer items-center gap-2 rounded-pill border-0 bg-positive-soft pl-4 pr-3.5 text-[length:var(--text-body)] font-bold text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          With {person.name}
          <CloseIcon size={14} />
        </button>
      ) : null}
    </>
  );
}
