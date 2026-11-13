// Splitting an expense into per-member cents.
//
// Every function here returns integer cents that sum exactly to the total, so
// the money is conserved no matter which mode produced the split.
//
// `memberOrder` is the ledger's member ids in ledger order (users.created_at
// ascending, archived members included). It decides who takes leftover cents:
//   - Equal (D5): the first members in ledger order take one extra cent each.
//   - Percent and Shares (D6): largest remainder, ties in ledger order.

/** Cents owed by each member, keyed by user id. */
export type SplitCents = Record<string, number>;

export type SplitSpec =
  | { mode: "equal"; participants: string[] }
  // Percent and Shares both reduce to "weights": 40/30/20/10, or 1/1/2.
  | { mode: "percent" | "shares"; weights: Record<string, number> }
  // Exact amounts are stored as entered. They are only valid when they sum to
  // the total; `splitAmounts` does not check that, the form does.
  | { mode: "exact"; amounts: Record<string, number> };

/** Ids in ledger order, then any id the order doesn't know, in the order given. */
function inLedgerOrder(ids: Iterable<string>, memberOrder: string[]): string[] {
  const wanted = new Set(ids);
  const ordered = memberOrder.filter((id) => wanted.has(id));
  const known = new Set(ordered);
  // An id missing from memberOrder still gets its share: dropping it would
  // make the cents stop adding up to the total.
  for (const id of wanted) if (!known.has(id)) ordered.push(id);
  return ordered;
}

/**
 * Equal split. Leftover cents go one each to the first participants in ledger
 * order. No participants gives an empty split (the composer blocks saving).
 */
export function splitEqually(
  totalCents: number,
  participantIds: string[],
  memberOrder: string[]
): SplitCents {
  const ordered = inLedgerOrder(participantIds, memberOrder);
  if (ordered.length === 0) return {};
  const base = Math.floor(totalCents / ordered.length);
  let rest = totalCents - base * ordered.length;
  const out: SplitCents = {};
  for (const id of ordered) {
    out[id] = base + (rest > 0 ? 1 : 0);
    rest--;
  }
  return out;
}

// Weights may be decimal (33.33%). Scale them to integers so the remainder
// comparison below is exact instead of depending on floating-point noise.
// Four decimals is more than any form will offer, and keeps total * weight
// well inside Number's safe integer range for any realistic amount.
function toIntegerWeights(weights: number[]): number[] {
  for (let k = 0; k <= 4; k++) {
    const scale = 10 ** k;
    if (weights.every((w) => Math.abs(w * scale - Math.round(w * scale)) < 1e-9)) {
      return weights.map((w) => Math.round(w * scale));
    }
  }
  return weights.map((w) => Math.round(w * 1e4));
}

/**
 * Weighted split (Percent or Shares), largest-remainder method: floor every
 * exact share, then hand the missing cents to the largest fractional
 * remainders, ties in ledger order. Members with a weight of 0 (or less) are
 * left out. With no positive weights the result is empty.
 */
export function splitByWeight(
  totalCents: number,
  weights: Record<string, number>,
  memberOrder: string[]
): SplitCents {
  const positive = Object.entries(weights)
    .filter(([, w]) => Number.isFinite(w) && w > 0)
    .map(([id]) => id);
  const ids = inLedgerOrder(positive, memberOrder);
  if (ids.length === 0) return {};

  const w = toIntegerWeights(ids.map((id) => weights[id]));
  const sum = w.reduce((a, b) => a + b, 0);
  if (sum <= 0) return {};

  const rows = ids.map((id, index) => {
    const numerator = totalCents * w[index];
    const floor = Math.floor(numerator / sum);
    return { id, index, floor, remainder: numerator - floor * sum };
  });

  const out: SplitCents = {};
  let assigned = 0;
  for (const r of rows) {
    out[r.id] = r.floor;
    assigned += r.floor;
  }
  const byRemainder = [...rows].sort((a, b) => b.remainder - a.remainder || a.index - b.index);
  for (let i = 0; i < totalCents - assigned; i++) out[byRemainder[i].id] += 1;
  return out;
}

/** The cents per member for any split mode. */
export function splitAmounts(
  totalCents: number,
  spec: SplitSpec,
  memberOrder: string[]
): SplitCents {
  switch (spec.mode) {
    case "equal":
      return splitEqually(totalCents, spec.participants, memberOrder);
    case "percent":
    case "shares":
      return splitByWeight(totalCents, spec.weights, memberOrder);
    case "exact":
      return { ...spec.amounts };
  }
}

/** Members who take an extra cent in an equal split (for the remainder note). */
export function equalSplitExtraCentMembers(
  totalCents: number,
  participantIds: string[],
  memberOrder: string[]
): string[] {
  const ordered = inLedgerOrder(participantIds, memberOrder);
  if (ordered.length === 0) return [];
  return ordered.slice(0, totalCents % ordered.length);
}
