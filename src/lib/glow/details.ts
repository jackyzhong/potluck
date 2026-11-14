// The wording of the expense details panel (boards 15/16, docs/06 "Right panel /
// details"), worked out from the viewer's side. Pure: the component only draws
// what this returns.
//
// Sign convention as everywhere: positive means others owe the viewer more.

export type DetailsInput = {
  /** The expense's stored split mode. Null on rows saved before T04: "custom split". */
  splitMode: string | null | undefined;
  totalCents: number;
  payerId: string;
  /** Who added it (D12). Null on older rows: no "added by". */
  createdBy: string | null | undefined;
  /** Each member's cents on this expense. */
  shares: Record<string, number>;
  /** Member ids in ledger order, archived included. */
  memberOrder: string[];
  nameOf: (id: string) => string;
  /** Null until a viewer is chosen: wording stays neutral (D3). */
  viewerId: string | null;
  /** Already formatted ("Sep 8"). */
  dateLabel: string;
};

export type ImpactStrip =
  | { kind: "lent"; label: string; cents: number }
  | { kind: "share"; label: string; cents: number }
  | { kind: "none"; label: string };

export type RowTone = "muted" | "positive" | "negative" | "default";

export type SplitRow = {
  id: string;
  /** "You" for the viewer. */
  name: string;
  isViewer: boolean;
  /** Text before the amount: "owes you", "paid, share", "owe Jacky". */
  prefix: string;
  /** The amount shown after the prefix. Null when there is none ("paid"). */
  cents: number | null;
  tone: RowTone;
};

export type DetailsModel = {
  /** "Sep 8 · added by you". */
  meta: string;
  /** Null while there is no viewer. */
  impact: ImpactStrip | null;
  payerName: string;
  payerIsViewer: boolean;
  /** "equally, 6 ways", "by exact amounts", "by percentage", "by shares", "custom split". */
  splitText: string;
  rows: SplitRow[];
};

/** The split half of the sentence "Paid by [You] and split [equally, 6 ways]". */
export function splitSentence(mode: string | null | undefined, people: number): string {
  switch (mode) {
    case "equal":
      return `equally, ${people} ${people === 1 ? "way" : "ways"}`;
    case "exact":
      return "by exact amounts";
    case "percent":
      return "by percentage";
    case "shares":
      return "by shares";
    default:
      return "custom split";
  }
}

/** The viewer's own effect and the strip it sits in (docs/06). */
export function impactStrip(
  input: Pick<DetailsInput, "totalCents" | "payerId" | "shares" | "viewerId">
): ImpactStrip | null {
  const { viewerId } = input;
  if (!viewerId) return null;
  const paid = input.payerId === viewerId;
  const inSplit = viewerId in input.shares;
  if (!paid && !inSplit) return { kind: "none", label: "You're not part of this one" };
  const net = (paid ? input.totalCents : 0) - (input.shares[viewerId] ?? 0);
  return paid
    ? { kind: "lent", label: "You paid, so you lent", cents: net }
    : { kind: "share", label: "Your share", cents: net };
}

export function detailsMeta(
  dateLabel: string,
  createdBy: string | null | undefined,
  viewerId: string | null,
  nameOf: (id: string) => string
): string {
  if (!createdBy) return dateLabel;
  const who = viewerId && createdBy === viewerId ? "you" : nameOf(createdBy);
  return `${dateLabel} · added by ${who}`;
}

/**
 * The split rows, worded from the viewer's side. Order: the viewer first, then
 * the payer, then everyone else in ledger order (board 23). The payer always
 * has a row, even when they aren't in the split.
 */
export function splitRows(
  input: Pick<DetailsInput, "payerId" | "shares" | "memberOrder" | "nameOf" | "viewerId">
): SplitRow[] {
  const { payerId, shares, viewerId, nameOf } = input;
  const ids = new Set(Object.keys(shares));
  ids.add(payerId);
  const known = input.memberOrder.filter((id) => ids.has(id));
  // A split member the order doesn't know still gets a row.
  for (const id of ids) if (!known.includes(id)) known.push(id);

  const rank = (id: string) => (id === viewerId ? 0 : id === payerId ? 1 : 2);
  const ordered = known
    .map((id, i) => ({ id, i }))
    .sort((a, b) => rank(a.id) - rank(b.id) || a.i - b.i)
    .map((x) => x.id);

  const payerName = viewerId === payerId ? "You" : nameOf(payerId);
  return ordered.map((id): SplitRow => {
    const isViewer = id === viewerId;
    const name = isViewer ? "You" : nameOf(id);
    const base = { id, name, isViewer };
    if (id === payerId) {
      return id in shares
        ? { ...base, prefix: "paid, share", cents: shares[id], tone: "muted" }
        : { ...base, prefix: "paid", cents: null, tone: "muted" };
    }
    const cents = shares[id] ?? 0;
    if (payerId === viewerId) return { ...base, prefix: "owes you", cents, tone: "positive" };
    if (isViewer) return { ...base, prefix: `owe ${payerName}`, cents, tone: "negative" };
    return { ...base, prefix: `owes ${payerName}`, cents, tone: "default" };
  });
}

export function detailsModel(input: DetailsInput): DetailsModel {
  const payerIsViewer = input.viewerId === input.payerId;
  const people = Object.keys(input.shares).length;
  return {
    meta: detailsMeta(input.dateLabel, input.createdBy, input.viewerId, input.nameOf),
    impact: impactStrip(input),
    payerName: payerIsViewer ? "You" : input.nameOf(input.payerId),
    payerIsViewer,
    splitText: splitSentence(input.splitMode, people),
    rows: splitRows(input)
  };
}

/** Delete confirmation (D14: asks first, no Undo). */
export const DELETE_PROMPT = "Delete this expense? This can't be undone.";
