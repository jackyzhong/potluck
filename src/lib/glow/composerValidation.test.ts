import { test } from "node:test";
import assert from "node:assert/strict";
import { checkSplit, type SplitCheckInput } from "./composerValidation.ts";
import { formatMoney } from "./money.ts";

const format = (cents: number) => formatMoney(cents);
const check = (amountCents: number | null, split: SplitCheckInput) => checkSplit({ amountCents, split, format });

// One test per row of docs/04 "Validation per mode".

test("no amount: strip hidden, Save reads 'Enter an amount' in every mode", () => {
  const splits: SplitCheckInput[] = [
    { mode: "equal", includedCount: 3 },
    { mode: "exact", sumCents: 0 },
    { mode: "percent", sumHundredths: 10000 },
    { mode: "shares", totalShares: 4 }
  ];
  for (const split of splits) {
    for (const amount of [null, 0]) {
      const r = check(amount, split);
      assert.equal(r.canSave, false, split.mode);
      assert.equal(r.strip, null, split.mode);
      assert.equal(r.blockedLabel, "Enter an amount", split.mode);
    }
  }
});

test("Equally: valid with one or more people", () => {
  for (const includedCount of [1, 4, 6]) {
    const r = check(6450, { mode: "equal", includedCount });
    assert.equal(r.canSave, true);
    assert.equal(r.blockedLabel, null);
    assert.deepEqual(r.strip, { tone: "positive", message: "Fully assigned", detail: { kind: "impact" } });
  }
});

test("Equally: nobody included is a warning that blocks Save", () => {
  const r = check(6450, { mode: "equal", includedCount: 0 });
  assert.equal(r.canSave, false);
  assert.equal(r.blockedLabel, "Pick at least one person");
  assert.deepEqual(r.strip, { tone: "warning", message: "Pick at least one person", detail: null });
});

test("Exact: sum equals the amount to the cent", () => {
  const r = check(6450, { mode: "exact", sumCents: 6450 });
  assert.equal(r.canSave, true);
  assert.deepEqual(r.strip, { tone: "positive", message: "Fully assigned", detail: { kind: "impact" } });
  // One cent off either way is not valid.
  assert.equal(check(6450, { mode: "exact", sumCents: 6449 }).canSave, false);
  assert.equal(check(6450, { mode: "exact", sumCents: 6451 }).canSave, false);
});

test("Exact: short of the amount (board 11/12)", () => {
  const r = check(6450, { mode: "exact", sumCents: 4450 });
  assert.equal(r.canSave, false);
  assert.equal(r.blockedLabel, "Assign CA$20.00 more to save");
  assert.deepEqual(r.strip, {
    tone: "warning",
    message: "CA$20.00 left to assign",
    detail: { kind: "text", text: "CA$44.50 of CA$64.50" }
  });
});

test("Exact: over the amount", () => {
  const r = check(6450, { mode: "exact", sumCents: 6500 });
  assert.equal(r.canSave, false);
  assert.equal(r.blockedLabel, "Remove CA$0.50 to save");
  assert.deepEqual(r.strip, {
    tone: "warning",
    message: "CA$0.50 too much",
    detail: { kind: "text", text: "CA$65.00 of CA$64.50" }
  });
});

test("Exact: nothing entered yet is all left to assign", () => {
  const r = check(6450, { mode: "exact", sumCents: 0 });
  assert.equal(r.strip?.message, "CA$64.50 left to assign");
  assert.equal(r.blockedLabel, "Assign CA$64.50 more to save");
});

test("Percent: exactly 100 (board 13/14)", () => {
  const r = check(6450, { mode: "percent", sumHundredths: 10000 });
  assert.equal(r.canSave, true);
  assert.deepEqual(r.strip, { tone: "positive", message: "100% assigned", detail: { kind: "impact" } });
});

test("Percent: under and over 100, and 99.99 is not 100", () => {
  const under = check(6450, { mode: "percent", sumHundredths: 7000 });
  assert.equal(under.canSave, false);
  assert.equal(under.blockedLabel, "Make it add up to 100%");
  assert.deepEqual(under.strip, {
    tone: "warning",
    message: "30% left to assign",
    detail: { kind: "text", text: "70% of 100%" }
  });

  const over = check(6450, { mode: "percent", sumHundredths: 11250 });
  assert.equal(over.canSave, false);
  assert.deepEqual(over.strip, {
    tone: "warning",
    message: "12.5% too much",
    detail: { kind: "text", text: "112.5% of 100%" }
  });

  const close = check(6450, { mode: "percent", sumHundredths: 9999 });
  assert.equal(close.canSave, false);
  assert.equal(close.strip?.message, "0.01% left to assign");
});

test("Shares: valid with at least one share, blocked with none", () => {
  const ok = check(6450, { mode: "shares", totalShares: 1 });
  assert.equal(ok.canSave, true);
  assert.deepEqual(ok.strip, { tone: "positive", message: "Fully assigned", detail: { kind: "impact" } });

  const none = check(6450, { mode: "shares", totalShares: 0 });
  assert.equal(none.canSave, false);
  assert.equal(none.blockedLabel, "Add at least one share");
  assert.deepEqual(none.strip, { tone: "warning", message: "Add at least one share", detail: null });
});
