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
const rows = viewerLedger(data, "u-sam");
const run = (f: Partial<LedgerFilter>) =>
  filterLedger(rows, { ...NO_FILTER, ...f }, ctx).map((r) => r.id);

test("214, $214, CA$214.35 and 214.35 all find the Boathouse dinner", () => {
  for (const q of ["214", "$214", "214.35", "CA$214.35", " $214.3 ", "214.3"]) {
    assert.deepEqual(run({ query: q }), ["e-dinner"], q);
  }
});

test("an amount matches from its start, not from the middle", () => {
  assert.deepEqual(run({ query: "35" }), []);
  assert.deepEqual(run({ query: "$25.00" }), ["p-theo-sam"]);
});

test("amountQuery reads plain and prefixed amounts, and rejects words", () => {
  assert.equal(amountQuery("$1,175.9"), "1175.9");
  assert.equal(amountQuery("dinner"), null);
  assert.equal(amountQuery("1.234"), null);
});

test("text search is case-insensitive over description, names and note", () => {
  assert.deepEqual(run({ query: "boathouse" }), ["e-dinner"]);
  assert.deepEqual(run({ query: "TRANSFER" }), ["p-theo-sam"]);
  assert.deepEqual(run({ query: "priya" }).sort(), ["e-cabin", "e-groceries", "p-sam-priya"]);
  assert.deepEqual(run({ query: "nadia" }), ["e-sunscreen"]);
  const withViewer = filterLedger(
    rows,
    { ...NO_FILTER, query: "paid you" },
    { ...ctx, viewerId: "u-sam" }
  ).map((r) => r.id);
  assert.deepEqual(withViewer, ["p-theo-sam"]);
});

test("kind filters", () => {
  assert.equal(run({ kind: "payments" }).length, 2);
  assert.equal(run({ kind: "expenses" }).length, 10);
  const lena = viewerLedger(data, "u-lena");
  const involved = filterLedger(lena, { ...NO_FILTER, kind: "involving" }, ctx);
  assert.ok(involved.length < lena.length);
  assert.ok(involved.every((r) => r.involved));
});

test("with {name}: rows where both the viewer and that person are involved", () => {
  const withTheo = run({ personId: "u-theo" });
  assert.ok(withTheo.includes("p-theo-sam"));
  assert.ok(!withTheo.includes("p-sam-priya"));
  assert.ok(!withTheo.includes("e-parking"));
  for (const id of withTheo) assert.ok(ctx.participants.get(id)?.has("u-theo"));
});

test("filters combine", () => {
  assert.deepEqual(run({ kind: "payments", personId: "u-theo" }), ["p-theo-sam"]);
  assert.deepEqual(run({ kind: "payments", query: "nadia" }), []);
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
