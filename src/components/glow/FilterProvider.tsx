"use client";

// The Activity filters (docs/04 "Filtering and search") in one small store, shared
// by the toolbar, the hero chips and the ledger. Mount it inside <ViewerProvider>.
//
// `filter.query` is what the field shows; `applied` is the same filter with the
// search text after a 150ms debounce, which is what the ledger matches against.
// A viewer change clears everything except "Involving me" (resetForViewerChange).

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  NO_FILTER,
  isFiltering,
  resetForViewerChange,
  type FilterKind,
  type LedgerFilter
} from "@/src/lib/glow/filter";
import { useViewer } from "./ViewerProvider";

const DEBOUNCE_MS = 150;

export type FilterState = {
  /** What the controls show. */
  filter: LedgerFilter;
  /** What the ledger applies: the same, with the search text debounced. */
  applied: LedgerFilter;
  /** True when anything narrows the ledger. */
  active: boolean;
  setKind: (kind: FilterKind) => void;
  setQuery: (query: string) => void;
  /** Press a hero chip: set the "with {name}" filter, or clear it if it's already that person. */
  togglePerson: (memberId: string) => void;
  clearPerson: () => void;
  /** Clear search and "with {name}" and go back to All. */
  clearAll: () => void;
};

const FilterContext = createContext<FilterState | null>(null);

export function useFilters(): FilterState {
  const value = useContext(FilterContext);
  if (!value) throw new Error("useFilters() must be used inside <FilterProvider>.");
  return value;
}

export function FilterProvider({ children }: { children: ReactNode }) {
  const { viewerId } = useViewer();
  const [filter, setFilter] = useState<LedgerFilter>(NO_FILTER);
  const [appliedQuery, setAppliedQuery] = useState("");
  const [seenViewer, setSeenViewer] = useState(viewerId);

  // New viewer: reset during render, so no frame shows the old filter.
  if (seenViewer !== viewerId) {
    setSeenViewer(viewerId);
    setFilter(resetForViewerChange);
    setAppliedQuery("");
  }

  useEffect(() => {
    const t = setTimeout(() => setAppliedQuery(filter.query), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [filter.query]);

  const setKind = useCallback((kind: FilterKind) => setFilter((f) => ({ ...f, kind })), []);
  const setQuery = useCallback((query: string) => setFilter((f) => ({ ...f, query })), []);
  const togglePerson = useCallback(
    (memberId: string) => setFilter((f) => ({ ...f, personId: f.personId === memberId ? null : memberId })),
    []
  );
  const clearPerson = useCallback(() => setFilter((f) => ({ ...f, personId: null })), []);
  const clearAll = useCallback(() => {
    setFilter(NO_FILTER);
    setAppliedQuery("");
  }, []);

  const value = useMemo<FilterState>(() => {
    const applied = { ...filter, query: appliedQuery };
    return {
      filter,
      applied,
      active: isFiltering(applied),
      setKind,
      setQuery,
      togglePerson,
      clearPerson,
      clearAll
    };
  }, [filter, appliedQuery, setKind, setQuery, togglePerson, clearPerson, clearAll]);

  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>;
}
