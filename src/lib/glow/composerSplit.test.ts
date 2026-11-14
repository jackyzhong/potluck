import { test } from "node:test";
import assert from "node:assert/strict";
import {
  blankExactIds,
  blankRowFill,
  blankRowsLabel,
  emptyForm,
  formCents,
  formatPercent,
  formToSplits,
  parseHundredths,
  parseShares,
  reopenSplit,
  restrictForm,
  rowsShowSave,
  sanitizeDecimalInput,
  sanitizePercentInput,
  seedForMode,
  splitTotals,
  type SaveSnapshot,
  type SplitForm
} from "./composerSplit.ts";
import { composerImpact } from "./ledger.ts";
import { splitByWeight } from "./split.ts";

// Veld's six, in ledger order, as the boards use them.
const ORDER = ["you", "stephen", "angus", "alvin", "matthew", "jonah"];
const D = 2;

const form = (over: Partial<SplitForm>): SplitForm => ({ ...emptyForm(ORDER), ...over });
const sum = (r: Record<string, number>) => Object.values(r).reduce((a, b) => a + b, 0);

test("sanitizeDecimalInput keeps digits and one point, no extra decimals", () => {
  assert.equal(sanitizeDecimalInput("CA$ 1,045.505", 2), "1045.50");
  assert.equal(sanitizeDecimalInput("1.2.3", 2), "1.23");
  assert.equal(sanitizeDecimalInput("-5", 2), "5");
  assert.equal(sanitizeDecimalInput("12.5", 0), "125");
  assert.equal(sanitizeDecimalInput("abc", 2), "");
  assert.equal(sanitizePercentInput("33.333"), "33.33");
});

test("formatPercent and parseHundredths round-trip", () => {
  assert.equal(formatPercent(4000), "40");
  assert.equal(formatPercent(3333), "33.33");
  assert.equal(formatPercent(1250), "12.5");
  assert.equal(formatPercent(1), "0.01");
  assert.equal(formatPercent(0), "0");
  for (const text of ["40", "33.33", "12.5", "0.01", "100"]) {
    assert.equal(formatPercent(parseHundredths(text) as number), text);
  }
  assert.equal(parseHundredths(""), null);
});

test("parseShares is a whole number from 0 to 999", () => {
  assert.equal(parseShares("3"), 3);
  assert.equal(parseShares(""), 0);
  assert.equal(parseShares("2.5"), 25);
  assert.equal(parseShares("5000"), 999);
});

test("percent 40/30/20/10 on 64.50 is the board 13 example: +CA$38.70 for the payer", () => {
  const f = form({ mode: "percent", percent: { you: "40", stephen: "30", alvin: "20", jonah: "10" } });
  const cents = formCents(6450, f, D, ORDER);
  assert.deepEqual(cents, { you: 2580, stephen: 1935, alvin: 1290, jonah: 645 });
  assert.equal(splitTotals(f, D).percentSum, 10000);
  const impact = composerImpact({ viewerId: "you", payerId: "you", amountCents: 6450, shares: cents });
  assert.equal(impact.cents, 3870);
});

test("exact: entered amounts are the split; zero rows are left out", () => {
  const f = form({ mode: "exact", exact: { you: "20", stephen: "14.50", angus: "0.00", alvin: "10", matthew: "" } });
  assert.deepEqual(formCents(4450, f, D, ORDER), { you: 2000, stephen: 1450, alvin: 1000 });
  assert.equal(splitTotals(f, D).exactSum, 4450);
  const rows = formToSplits(4450, f, D, ORDER);
  assert.deepEqual(
    rows.map((r) => r.userId),
    ["you", "stephen", "alvin"]
  );
  assert.ok(rows.every((r) => r.weight === null));
});

test("percent saves largest-remainder cents that add up, with the percentages as weights", () => {
  const f = form({ mode: "percent", percent: { you: "33.34", stephen: "33.33", angus: "33.33" } });
  const rows = formToSplits(1000, f, D, ORDER);
  assert.equal(sum(Object.fromEntries(rows.map((r) => [r.userId, r.amountCents]))), 1000);
  assert.deepEqual(
    rows.map((r) => r.weight),
    [33.34, 33.33, 33.33]
  );
  // Matches T03's rule directly (D6): the form adds no maths of its own.
  assert.deepEqual(
    Object.fromEntries(rows.map((r) => [r.userId, r.amountCents])),
    splitByWeight(1000, { you: 33.34, stephen: 33.33, angus: 33.33 }, ORDER)
  );
});

test("percent under 100 shows each row as its own percent of the total", () => {
  const f = form({ mode: "percent", percent: { you: "40", stephen: "30" } });
  assert.deepEqual(formCents(6450, f, D, ORDER), { you: 2580, stephen: 1935 });
  assert.equal(splitTotals(f, D).percentSum, 7000);
});

test("percent over 100 has no amounts to show", () => {
  const f = form({ mode: "percent", percent: { you: "80", stephen: "30" } });
  assert.deepEqual(formCents(6450, f, D, ORDER), {});
});

test("shares: 2/1/1 of 10.01 adds up, weights are the share counts", () => {
  const f = form({ mode: "shares", shares: { you: 2, stephen: 1, angus: 1, alvin: 0 } });
  const rows = formToSplits(1001, f, D, ORDER);
  assert.equal(sum(Object.fromEntries(rows.map((r) => [r.userId, r.amountCents]))), 1001);
  assert.deepEqual(
    rows.map((r) => [r.userId, r.weight]),
    [
      ["you", 2],
      ["stephen", 1],
      ["angus", 1]
    ]
  );
  assert.equal(splitTotals(f, D).shareTotal, 4);
});

test("equal saves every included person with a null weight", () => {
  const f = form({ mode: "equal", included: ["you", "stephen", "alvin"] });
  const rows = formToSplits(1000, f, D, ORDER);
  assert.deepEqual(
    rows.map((r) => [r.userId, r.amountCents, r.weight]),
    [
      ["you", 334, null],
      ["stephen", 333, null],
      ["alvin", 333, null]
    ]
  );
});

test("every mode's saved cents add up to the total (property)", () => {
  let seed = 12345;
  const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
  const saved = (total: number, f: SplitForm) =>
    sum(Object.fromEntries(formToSplits(total, f, D, ORDER).map((r) => [r.userId, r.amountCents])));
  for (let i = 0; i < 400; i++) {
    const total = 1 + Math.floor(rnd() * 100000);
    const ids = ORDER.filter(() => rnd() < 0.7);
    if (ids.length === 0) continue;

    assert.equal(saved(total, form({ mode: "equal", included: ids })), total);

    const sh = form({ mode: "shares", shares: Object.fromEntries(ids.map((id) => [id, 1 + Math.floor(rnd() * 5)])) });
    assert.equal(saved(total, sh), total);

    // Random percentages that add to exactly 100.00 in hundredths.
    let left = 10000;
    const pct: Record<string, string> = {};
    ids.forEach((id, k) => {
      const h = k === ids.length - 1 ? left : Math.floor(rnd() * (left + 1));
      left -= h;
      pct[id] = formatPercent(h);
    });
    const pf = form({ mode: "percent", percent: pct });
    assert.equal(splitTotals(pf, D).percentSum, 10000);
    assert.equal(saved(total, pf), total);
  }
});

// ---------- reopening (D13, KNOWN-ISSUES 1.2) ----------

test("a percent expense reopens as percent with the typed percentages", () => {
  const rows = [
    { userId: "you", amountCents: 2580, weight: 40 },
    { userId: "stephen", amountCents: 1935, weight: 30 },
    { userId: "alvin", amountCents: 1290, weight: 20 },
    { userId: "jonah", amountCents: 645, weight: "10" } // numeric can arrive as text
  ];
  const f = reopenSplit("percent", rows, D);
  assert.equal(f.mode, "percent");
  assert.deepEqual(f.percent, { you: "40", stephen: "30", alvin: "20", jonah: "10" });
  assert.deepEqual(formCents(6450, f, D, ORDER), { you: 2580, stephen: 1935, alvin: 1290, jonah: 645 });
});

test("a shares expense reopens with its share counts, and a missing member is 0", () => {
  const f = reopenSplit(
    "shares",
    [
      { userId: "you", amountCents: 500, weight: 2 },
      { userId: "stephen", amountCents: 250, weight: 1 }
    ],
    D
  );
  assert.equal(f.mode, "shares");
  assert.deepEqual(f.shares, { you: 2, stephen: 1 });
  assert.equal((f.shares as Record<string, number>).angus ?? 0, 0);
});

test("an equal expense reopens equal, with the people it was split between", () => {
  const f = reopenSplit(
    "equal",
    [
      { userId: "you", amountCents: 334, weight: null },
      { userId: "stephen", amountCents: 333, weight: null }
    ],
    D
  );
  assert.equal(f.mode, "equal");
  assert.deepEqual(f.included, ["you", "stephen"]);
});

test("an old row with no mode opens in Exact with its stored amounts (D13)", () => {
  for (const mode of [null, undefined]) {
    const f = reopenSplit(
      mode,
      [
        { userId: "you", amountCents: 1829 },
        { userId: "stephen", amountCents: 1829 }
      ],
      D
    );
    assert.equal(f.mode, "exact");
    assert.deepEqual(f.exact, { you: "18.29", stephen: "18.29" });
    assert.deepEqual(f.included, ["you", "stephen"]);
  }
});

test("a weighted mode with a missing weight falls back to Exact instead of inventing numbers", () => {
  const f = reopenSplit(
    "percent",
    [
      { userId: "you", amountCents: 100, weight: 50 },
      { userId: "stephen", amountCents: 100, weight: null }
    ],
    D
  );
  assert.equal(f.mode, "exact");
  assert.deepEqual(f.exact, { you: "1.00", stephen: "1.00" });
});

test("zero-decimal currencies reopen without a decimal point", () => {
  const f = reopenSplit(null, [{ userId: "you", amountCents: 1200 }], 0);
  assert.deepEqual(f.exact, { you: "1200" });
});

// ---------- carrying numbers across tabs ----------

const opts = (totalCents: number | null) => ({ totalCents, decimals: D, memberOrder: ORDER, everyoneIds: ORDER });

test("Equally to Exact fills each included person's equal share", () => {
  const f = form({ mode: "equal", included: ["you", "stephen", "alvin", "jonah"] });
  const seeded = seedForMode("exact", f, opts(6450));
  assert.deepEqual(seeded.exact, { you: "16.13", stephen: "16.13", alvin: "16.12", jonah: "16.12" });
});

test("Equally to Exact with no amount yet leaves the rows blank", () => {
  assert.deepEqual(seedForMode("exact", emptyForm(ORDER), opts(null)).exact, {});
});

test("Equally to Percent gives percentages that add up to exactly 100", () => {
  const f = form({ mode: "equal", included: ["you", "stephen", "angus"] });
  const seeded = seedForMode("percent", f, opts(null));
  assert.deepEqual(seeded.percent, { you: "33.34", stephen: "33.33", angus: "33.33" });
  const total = Object.values(seeded.percent ?? {}).reduce((a, t) => a + (parseHundredths(t) as number), 0);
  assert.equal(total, 10000);
});

test("Exact to Percent converts the amounts to percentages that add up to exactly 100", () => {
  const f = form({ mode: "exact", exact: { you: "20", stephen: "14.50", alvin: "10" } });
  const seeded = seedForMode("percent", f, opts(6450));
  const h = Object.values(seeded.percent ?? {}).map((t) => parseHundredths(t) as number);
  assert.equal(
    h.reduce((a, b) => a + b, 0),
    10000
  );
  assert.deepEqual(Object.keys(seeded.percent ?? {}), ["you", "stephen", "alvin"]);
});

test("Percent to Exact turns the percentages into their cents", () => {
  const f = form({ mode: "percent", percent: { you: "40", stephen: "30", alvin: "20", jonah: "10" } });
  assert.deepEqual(seedForMode("exact", f, opts(6450)).exact, {
    you: "25.80",
    stephen: "19.35",
    alvin: "12.90",
    jonah: "6.45"
  });
});

test("Shares: one each for whoever was in, or everyone when nobody was (D17)", () => {
  const f = form({ mode: "equal", included: ["you", "alvin"] });
  assert.deepEqual(seedForMode("shares", f, opts(1000)).shares, { you: 1, alvin: 1 });
  const nobody = form({ mode: "equal", included: [] });
  assert.deepEqual(seedForMode("shares", nobody, opts(1000)).shares, Object.fromEntries(ORDER.map((id) => [id, 1])));
});

// ---------- the blank-rows helper ----------

test("the helper's label follows docs/06, with the singular for one row", () => {
  assert.equal(blankRowsLabel("CA$20.00", 3), "Split CA$20.00 across the 3 blank rows");
  assert.equal(blankRowsLabel("CA$20.00", 1), "Put CA$20.00 in the blank row");
});

test("restrictForm drops members who aren't rows any more", () => {
  const f = form({
    mode: "percent",
    included: ["you", "gone"],
    exact: { you: "1", gone: "2" },
    percent: { you: "50", gone: "50" },
    shares: { you: 1, gone: 1 }
  });
  assert.deepEqual(restrictForm(f, ["you", "stephen"]), {
    mode: "percent",
    included: ["you"],
    exact: { you: "1" },
    percent: { you: "50" },
    shares: { you: 1 }
  });
});

// ---------- waiting for the refreshed rows (T12's trap) ----------

const day = (iso: string) => iso.slice(0, 10);
const saved: SaveSnapshot = {
  amountCents: 6450,
  payerId: "you",
  description: "Shawarma ",
  splitMode: "percent",
  day: "2026-11-13",
  splits: [
    { userId: "you", amountCents: 3870, weight: 60 },
    { userId: "stephen", amountCents: 2580, weight: 40 }
  ]
};
const shownExpense = {
  amount_cents: 6450,
  payer_id: "you",
  description: "Shawarma",
  split_mode: "percent",
  created_at: "2026-11-13T12:00:00Z"
};
const shownSplits = [
  { user_id: "you", amount_cents: 3870, weight: "60" },
  { user_id: "stephen", amount_cents: 2580, weight: 40 }
];

test("rowsShowSave is true only once the refreshed rows carry the saved numbers", () => {
  assert.equal(rowsShowSave(shownExpense, shownSplits, saved, day), true);
  // Still the old rows: a different amount, mode, weight, day or member list.
  assert.equal(rowsShowSave({ ...shownExpense, amount_cents: 6000 }, shownSplits, saved, day), false);
  assert.equal(rowsShowSave({ ...shownExpense, split_mode: null }, shownSplits, saved, day), false);
  assert.equal(rowsShowSave({ ...shownExpense, created_at: "2026-11-12T12:00:00Z" }, shownSplits, saved, day), false);
  assert.equal(rowsShowSave({ ...shownExpense, payer_id: "stephen" }, shownSplits, saved, day), false);
  assert.equal(
    rowsShowSave(shownExpense, [{ ...shownSplits[0], weight: 50 }, shownSplits[1]], saved, day),
    false
  );
  assert.equal(rowsShowSave(shownExpense, shownSplits.slice(0, 1), saved, day), false);
  assert.equal(rowsShowSave(undefined, shownSplits, saved, day), false);
});

test("blank rows are the ones with nothing typed", () => {
  const f = form({ mode: "exact", exact: { you: "20", stephen: "0.00", angus: "" } });
  assert.deepEqual(blankExactIds(f, ORDER), ["angus", "alvin", "matthew", "jonah"]);
});

test("the helper shares what's left equally, extra cents to the first (board 11: 20.00 across 3)", () => {
  assert.deepEqual(blankRowFill(2000, ["angus", "matthew", "jonah"], ORDER), {
    angus: 667,
    matthew: 667,
    jonah: 666
  });
  assert.deepEqual(blankRowFill(500, ["jonah"], ORDER), { jonah: 500 });
  assert.deepEqual(blankRowFill(0, ["jonah"], ORDER), {});
  assert.deepEqual(blankRowFill(-5, ["jonah"], ORDER), {});
});
