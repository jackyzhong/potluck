import { test } from "node:test";
import assert from "node:assert/strict";
import { createdAtFor, dayLabel, dayString, filterAmountInput, joinNames, parseAmountCents } from "./composer.ts";
import { equalSplitExtraCentMembers, splitEqually } from "./split.ts";
import { composerImpact } from "./ledger.ts";

test("amount fields only let digits, one point and commas through", () => {
  assert.equal(filterAmountInput("64.50"), "64.50");
  assert.equal(filterAmountInput("Late-night 64.50"), "64.50");
  assert.equal(filterAmountInput("1,234.5.6"), "1,234.56");
  assert.equal(filterAmountInput("CA$ 12"), "12");
});

test("parseAmountCents accepts the forms in docs/03", () => {
  assert.equal(parseAmountCents("45"), 4500);
  assert.equal(parseAmountCents("45.5"), 4550);
  assert.equal(parseAmountCents("45.50"), 4550);
  assert.equal(parseAmountCents("64.50"), 6450);
  assert.equal(parseAmountCents("$45"), 4500);
  assert.equal(parseAmountCents("CA$ 1,045.50"), 104550);
  assert.equal(parseAmountCents(".5"), 50);
  assert.equal(parseAmountCents("0"), 0);
  assert.equal(parseAmountCents("0.1"), 10);
  assert.equal(parseAmountCents("19.99"), 1999); // no float noise
  assert.equal(parseAmountCents("500", 0), 500);
});

test("parseAmountCents rejects what isn't an amount", () => {
  for (const bad of ["", "  ", "abc", ".", "1.2.3", "45.555", "-5", "4 5x!"]) {
    assert.equal(parseAmountCents(bad), null, bad);
  }
  assert.equal(parseAmountCents("5.5", 0), null);
  assert.equal(parseAmountCents("9".repeat(30)), null);
});

test("createdAtFor: today keeps the time, another day is local noon", () => {
  const now = new Date(2026, 10, 13, 16, 45, 12);
  assert.equal(createdAtFor(dayString(now), now), now.toISOString());
  assert.equal(createdAtFor("2026-09-08", now), new Date(2026, 8, 8, 12, 0, 0).toISOString());
  assert.equal(createdAtFor("2026-02-31", now), null);
  assert.equal(createdAtFor("nope", now), null);
});

test("dayLabel", () => {
  const now = new Date(2026, 10, 13, 9);
  assert.equal(dayLabel("2026-11-13", now), "Today");
  assert.equal(dayLabel("2026-11-12", now), "Yesterday");
  assert.equal(dayLabel("2026-09-08", now), "Sep 8");
  assert.equal(dayLabel("2025-09-08", now), "Sep 8, 2025");
  assert.equal(dayLabel("2026-11-30", new Date(2026, 11, 1, 9)), "Yesterday");
});

test("joinNames", () => {
  assert.equal(joinNames(["you"]), "you");
  assert.equal(joinNames(["you", "Stephen"]), "you and Stephen");
  assert.equal(joinNames(["you", "Stephen", "Angus"]), "you, Stephen and Angus");
});

test("the 6450 / 4 example on board 09, through T03's functions", () => {
  const order = ["jacky", "stephen", "angus", "alvin", "matthew", "jonah"];
  const included = ["jacky", "stephen", "alvin", "jonah"];
  const shares = splitEqually(6450, included, order);
  assert.deepEqual(shares, { jacky: 1613, stephen: 1613, alvin: 1612, jonah: 1612 });
  assert.deepEqual(equalSplitExtraCentMembers(6450, included, order), ["jacky", "stephen"]);
  const impact = composerImpact({ viewerId: "jacky", payerId: "jacky", amountCents: 6450, shares });
  assert.deepEqual(impact, { cents: 4837, kind: "owed", involved: true });
});
