import { test } from "node:test";
import assert from "node:assert/strict";

import {
  NO_FILTER,
  amountQuery,
  filterLedger,
  isFiltering,
  matchesQuery,
  participantsByRow,
  resetForViewerChange,
  viewerLedger,
  type FilterContext,
  type LedgerFilter
} from "./index.ts";
import { loadFixture, toGroupData } from "./fixture-adapter.ts";

const fixture = loadFixture();
const data = toGroupData(fixture);
const names = new Map(fixture.users.map((u) => [u.id, u.name]));
const ctx: FilterContext = { names, participants: participantsByRow(data) };
const rows = viewerLedger(data, "u-jacky");
const run = (f: Partial<LedgerFilter>) =>
  filterLedger(rows, { ...NO_FILTER, ...f }, ctx).map((r) => r.id);

test("109, $109, CA$109.74 and 109.74 all find the Boathouse Dinner expense", () => {
  for (const q of ["109", "$109", "109.74", "CA$109.74", " $109.7 ", "109.7"]) {
    assert.deepEqual(run({ query: q }), ["e-pizza"], q);
  }
});

test("an amount matches from its start, not from the middle", () => {
  assert.deepEqual(run({ query: "74" }), []);
  assert.deepEqual(run({ query: "$3.75" }), ["p-theo-jacky"]);
});

test("amountQuery reads plain and prefixed amounts, and rejects words", () => {
  assert.equal(amountQuery("$1,175.9"), "1175.9");
  assert.equal(amountQuery("pizza"), null);
  assert.equal(amountQuery("1.234"), null);
});

test("text search is case-insensitive over description, names and note", () => {
  assert.deepEqual(run({ query: "pizza" }), ["e-pizza"]);
  assert.deepEqual(run({ query: "WRITE" }), ["p-theo-jacky"]);
  assert.deepEqual(run({ query: "priya" }).sort(), ["e-candy", "e-fans"]);
  assert.deepEqual(run({ query: "lena" }), ["p-lena-jacky"]);
});

test("kind filters", () => {
  assert.equal(run({ kind: "payments" }).length, 2);
  assert.equal(run({ kind: "expenses" }).length, 5);
  const priya = viewerLedger(data, "u-priya");
  const involved = filterLedger(priya, { ...NO_FILTER, kind: "involving" }, ctx);
  assert.ok(involved.length < priya.length);
  assert.ok(involved.every((r) => r.involved));
});

test("with {name}: rows where both the viewer and that person are involved", () => {
  const withLena = run({ personId: "u-lena" });
  assert.ok(withLena.includes("p-lena-jacky"));
  assert.ok(!withLena.includes("p-theo-jacky"));
  for (const id of withLena) assert.ok(ctx.participants.get(id)?.has("u-lena"));
});

test("filters combine", () => {
  assert.deepEqual(run({ kind: "payments", personId: "u-lena" }), ["p-lena-jacky"]);
  assert.deepEqual(run({ kind: "expenses", query: "lena" }), []);
});

test("filtering never changes a row's running balance", () => {
  const all = new Map(rows.map((r) => [r.id, r.balanceAfterCents]));
  const some = filterLedger(rows, { ...NO_FILTER, kind: "payments" }, ctx);
  assert.ok(some.length > 0);
  for (const r of some) assert.equal(r.balanceAfterCents, all.get(r.id));
});

test("no filter returns the same rows", () => {
  assert.equal(filterLedger(rows, NO_FILTER, ctx), rows);
  assert.equal(isFiltering({ ...NO_FILTER, query: "  " }), false);
});

test("matchesQuery with an empty query matches everything", () => {
  assert.ok(matchesQuery(rows[0], "", ctx));
});

test("a viewer change clears everything except Involving me", () => {
  const f: LedgerFilter = { kind: "involving", personId: "u-lena", query: "x" };
  assert.deepEqual(resetForViewerChange(f), { kind: "involving", personId: null, query: "" });
  assert.deepEqual(resetForViewerChange({ kind: "payments", personId: "u-lena", query: "x" }), NO_FILTER);
});
