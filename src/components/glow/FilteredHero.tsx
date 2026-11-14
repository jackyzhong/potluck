"use client";

// The hero with its person chips wired to the "with {name}" filter. A client
// component so the server page can render it without passing functions down.

import { BalanceHero } from "./BalanceHero";
import { useFilters } from "./FilterProvider";

export function FilteredHero() {
  const { filter, togglePerson } = useFilters();
  return <BalanceHero onSelectPerson={togglePerson} selectedPersonId={filter.personId} />;
}
