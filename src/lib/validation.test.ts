import { test } from "node:test";
import assert from "node:assert/strict";

import {
  isUuid,
  LIMITS,
  parseExpenseInput,
  parseLedgerInput,
  parseMemberName,
  parsePaymentInput
} from "./validation.ts";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const C = "33333333-3333-4333-8333-333333333333";

function expense(overrides: Record<string, unknown> = {}) {
  return {
    payerId: A,
    description: "Dinner",
    amountCents: 1000,
    currency: "CAD",
    createdAt: "2026-11-05T19:30:00.000Z",
    splits: [
      { userId: A, amountCents: 500 },
      { userId: B, amountCents: 500 }
    ],
    ...overrides
  };
}

function payment(overrides: Record<string, unknown> = {}) {
  return {
    payerId: A,
    payeeId: B,
    amountCents: 2500,
    currency: "CAD",
    note: "",
    createdAt: "2026-11-05T19:30:00.000Z",
    ...overrides
  };
}

test("isUuid accepts UUIDs and nothing else", () => {
  assert.equal(isUuid(A), true);
  assert.equal(isUuid(A.toUpperCase()), true);
  for (const bad of ["", "abc", `${A}x`, A.replaceAll("-", ""), 42, null, undefined, { id: A }]) {
    assert.equal(isUuid(bad), false, String(bad));
  }
});

test("ledger input is trimmed and checked", () => {
  assert.deepEqual(parseLedgerInput({ title: "  Japan 2026 ", emoji: "🗾", baseCurrency: "USD" }), {
    ok: true,
    value: { title: "Japan 2026", emoji: "🗾", baseCurrency: "USD" }
  });
  assert.equal(parseLedgerInput({ title: "   ", emoji: "🍲", baseCurrency: "CAD" }).ok, false);
  assert.equal(parseLedgerInput({ title: "x".repeat(LIMITS.title + 1), emoji: "🍲", baseCurrency: "CAD" }).ok, false);
  assert.equal(parseLedgerInput({ title: "Trip", emoji: "🍲", baseCurrency: "XYZ" }).ok, false);
  // Inherited object keys are not currencies.
  assert.equal(parseLedgerInput({ title: "Trip", emoji: "🍲", baseCurrency: "toString" }).ok, false);
  assert.equal(parseLedgerInput(null).ok, false);
  assert.equal(parseLedgerInput("Trip").ok, false);
});

test("member names are trimmed and bounded", () => {
  assert.deepEqual(parseMemberName("  Sam "), { ok: true, value: "Sam" });
  assert.equal(parseMemberName("").ok, false);
  assert.equal(parseMemberName("   ").ok, false);
  assert.equal(parseMemberName("x".repeat(LIMITS.memberName + 1)).ok, false);
  assert.equal(parseMemberName(7).ok, false);
});

test("a valid expense parses, with a blank description becoming null", () => {
  const parsed = parseExpenseInput(expense({ description: "   " }));
  assert.equal(parsed.ok, true);
  if (parsed.ok) {
    assert.equal(parsed.value.description, null);
    assert.equal(parsed.value.splits.length, 2);
  }
  assert.equal(parseExpenseInput(expense({ description: null })).ok, true);
});

test("an expense whose splits do not add up is rejected", () => {
  const short = expense({ splits: [{ userId: A, amountCents: 500 }, { userId: B, amountCents: 499 }] });
  const over = expense({ splits: [{ userId: A, amountCents: 500 }, { userId: B, amountCents: 501 }] });
  assert.equal(parseExpenseInput(short).ok, false);
  assert.equal(parseExpenseInput(over).ok, false);
});

test("zero-cent shares are allowed, negative and fractional ones are not", () => {
  const oneCentThreeWays = expense({
    amountCents: 1,
    splits: [
      { userId: A, amountCents: 1 },
      { userId: B, amountCents: 0 },
      { userId: C, amountCents: 0 }
    ]
  });
  assert.equal(parseExpenseInput(oneCentThreeWays).ok, true);

  const negative = expense({ splits: [{ userId: A, amountCents: 1500 }, { userId: B, amountCents: -500 }] });
  const fractional = expense({ splits: [{ userId: A, amountCents: 500.5 }, { userId: B, amountCents: 499.5 }] });
  assert.equal(parseExpenseInput(negative).ok, false);
  assert.equal(parseExpenseInput(fractional).ok, false);
});

test("a person cannot appear twice in one split, whatever the case of their id", () => {
  const dup = expense({ splits: [{ userId: A, amountCents: 500 }, { userId: A.toUpperCase(), amountCents: 500 }] });
  assert.equal(parseExpenseInput(dup).ok, false);
});

test("expense amounts, currencies, dates and ids are all checked", () => {
  for (const bad of [
    { amountCents: 0 },
    { amountCents: -100 },
    { amountCents: 10.5 },
    { amountCents: "1000" },
    { amountCents: LIMITS.amountCents + 1 },
    { currency: "GBP" },
    { createdAt: "not a date" },
    { createdAt: 0 },
    { payerId: "me" },
    { description: "x".repeat(LIMITS.description + 1) },
    { description: 5 },
    { splits: [] },
    { splits: "everyone" },
    { splits: [{ userId: "nope", amountCents: 1000 }] }
  ]) {
    assert.equal(parseExpenseInput(expense(bad)).ok, false, JSON.stringify(bad));
  }
});

test("ids are normalised to lower case", () => {
  const parsed = parseExpenseInput(
    expense({ payerId: A.toUpperCase(), splits: [{ userId: B.toUpperCase(), amountCents: 1000 }] })
  );
  assert.equal(parsed.ok, true);
  if (parsed.ok) {
    assert.equal(parsed.value.payerId, A);
    assert.equal(parsed.value.splits[0].userId, B);
  }
});

test("a valid payment parses, with a blank note becoming null", () => {
  const parsed = parsePaymentInput(payment());
  assert.equal(parsed.ok, true);
  if (parsed.ok) assert.equal(parsed.value.note, null);
});

test("payments are checked the same way, and nobody can pay themselves", () => {
  for (const bad of [
    { payeeId: A },
    { payeeId: A.toUpperCase() },
    { payerId: "x" },
    { amountCents: 0 },
    { amountCents: 1.5 },
    { currency: "JPY" },
    { note: "x".repeat(LIMITS.note + 1) },
    { createdAt: "yesterday-ish" }
  ]) {
    assert.equal(parsePaymentInput(payment(bad)).ok, false, JSON.stringify(bad));
  }
});
