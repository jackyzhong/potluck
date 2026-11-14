import { test } from "node:test";
import assert from "node:assert/strict";

import { detailsModel, detailsMeta, impactStrip, splitSentence, type DetailsInput } from "./details.ts";

const order = ["j", "s", "an", "al", "m", "jo"];
const names: Record<string, string> = { j: "Jacky", s: "Stephen", an: "Angus", al: "Alvin", m: "Matthew", jo: "Jonah" };
const nameOf = (id: string) => names[id] ?? "Unknown";
// Pizza Badiali: CA$109.74 paid by Jacky, 6 ways.
const pizza = { j: 1830, s: 1829, an: 1829, al: 1829, m: 1829, jo: 1828 };
const base: DetailsInput = {
  splitMode: "equal",
  totalCents: 10974,
  payerId: "j",
  createdBy: "j",
  shares: pizza,
  memberOrder: order,
  nameOf,
  viewerId: "j",
  dateLabel: "Sep 8"
};

test("viewer paid: lent strip, owes-you rows, You first", () => {
  const m = detailsModel(base);
  assert.deepEqual(m.impact, { kind: "lent", label: "You paid, so you lent", cents: 10974 - 1830 });
  assert.equal(m.meta, "Sep 8 · added by you");
  assert.equal(m.payerName, "You");
  assert.equal(m.splitText, "equally, 6 ways");
  assert.equal(m.rows[0].name, "You");
  assert.equal(m.rows[0].prefix, "paid, share");
  assert.deepEqual(
    m.rows.slice(1).map((r) => [r.name, r.prefix, r.tone]),
    [
      ["Stephen", "owes you", "positive"],
      ["Angus", "owes you", "positive"],
      ["Alvin", "owes you", "positive"],
      ["Matthew", "owes you", "positive"],
      ["Jonah", "owes you", "positive"]
    ]
  );
});

test("viewer in split, not payer: share strip, You owe the payer, others owe the payer", () => {
  const m = detailsModel({ ...base, viewerId: "s" });
  assert.deepEqual(m.impact, { kind: "share", label: "Your share", cents: -1829 });
  assert.equal(m.meta, "Sep 8 · added by Jacky");
  assert.equal(m.payerName, "Jacky");
  assert.deepEqual(
    m.rows.slice(0, 3).map((r) => [r.name, r.prefix, r.cents, r.tone]),
    [
      ["You", "owe Jacky", 1829, "negative"],
      ["Jacky", "paid, share", 1830, "muted"],
      ["Angus", "owes Jacky", 1829, "default"]
    ]
  );
});

test("viewer not involved", () => {
  const shares = { s: 5000, an: 5000 };
  const m = detailsModel({ ...base, viewerId: "j", payerId: "s", shares, totalCents: 10000 });
  assert.deepEqual(m.impact, { kind: "none", label: "You're not part of this one" });
  assert.deepEqual(m.rows.map((r) => r.name), ["Stephen", "Angus"]);
});

test("viewer paid but is not in the split lends the whole total", () => {
  const m = detailsModel({ ...base, shares: { s: 5000, an: 4974 } });
  assert.equal(m.impact?.kind === "lent" && m.impact.cents, 10974);
  assert.equal(m.rows[0].prefix, "paid");
  assert.equal(m.rows[0].cents, null);
});

test("no viewer yet: neutral, no strip, no 'you'", () => {
  const m = detailsModel({ ...base, viewerId: null });
  assert.equal(m.impact, null);
  assert.equal(m.meta, "Sep 8 · added by Jacky");
  assert.equal(m.payerName, "Jacky");
  assert.ok(m.rows.every((r) => r.name !== "You"));
  assert.equal(m.rows[0].prefix, "paid, share");
});

test("split sentence by stored mode; null says custom split", () => {
  assert.equal(splitSentence("equal", 6), "equally, 6 ways");
  assert.equal(splitSentence("equal", 1), "equally, 1 way");
  assert.equal(splitSentence("exact", 3), "by exact amounts");
  assert.equal(splitSentence("percent", 3), "by percentage");
  assert.equal(splitSentence("shares", 3), "by shares");
  assert.equal(splitSentence(null, 3), "custom split");
  assert.equal(splitSentence(undefined, 3), "custom split");
  assert.equal(splitSentence("weird", 3), "custom split");
});

test("legacy rows with equal shares read as an equal split; others stay custom", () => {
  const legacy = { ...base, splitMode: null, shares: { j: 1829, s: 1829, an: 1829, al: 1829, m: 1829, jo: 1829 } };
  assert.equal(detailsModel(legacy).splitText, "equally, 6 ways");
  assert.equal(detailsModel({ ...legacy, splitMode: undefined }).splitText, "equally, 6 ways");
  // A stored mode always wins.
  assert.equal(detailsModel({ ...legacy, splitMode: "exact" }).splitText, "by exact amounts");
  // Unequal, or not adding up to the total, stays custom.
  const uneven = { j: 5000, s: 3000, an: 2974 };
  assert.equal(detailsModel({ ...legacy, shares: uneven }).splitText, "custom split");
  assert.equal(detailsModel({ ...legacy, totalCents: 10000 }).splitText, "custom split");
  assert.equal(detailsModel({ ...legacy, shares: { j: 10974 } }).splitText, "custom split");
});

test("meta leaves out 'added by' on old rows", () => {
  assert.equal(detailsMeta("Sep 8", null, "j", nameOf), "Sep 8");
  assert.equal(detailsMeta("Sep 8", "s", "j", nameOf), "Sep 8 · added by Stephen");
});

test("impactStrip: lent = total minus own share", () => {
  const s = impactStrip({ totalCents: 100, payerId: "a", shares: { a: 50, b: 50 }, viewerId: "a" });
  assert.deepEqual(s, { kind: "lent", label: "You paid, so you lent", cents: 50 });
});
