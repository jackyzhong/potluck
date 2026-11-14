import { test } from "node:test";
import assert from "node:assert/strict";

import {
  centsToInput,
  paymentCreatedAt,
  currencyDecimals,
  dateInputValue,
  parsePaymentAmountCents,
  paymentProblem,
  paymentTitle
} from "./payment.ts";

test("parsePaymentAmountCents reads what people type", () => {
  assert.equal(parsePaymentAmountCents("12.50"), 1250);
  assert.equal(parsePaymentAmountCents("12.5"), 1250);
  assert.equal(parsePaymentAmountCents("12"), 1200);
  assert.equal(parsePaymentAmountCents("12."), 1200);
  assert.equal(parsePaymentAmountCents(".5"), 50);
  assert.equal(parsePaymentAmountCents("1,250.05"), 125005);
  assert.equal(parsePaymentAmountCents(" 0.07 "), 7);
  // 19.99 * 100 is 1998.9999999999998 in floating point; text parsing is exact.
  assert.equal(parsePaymentAmountCents("19.99"), 1999);
});

test("parsePaymentAmountCents rejects anything that isn't a positive amount", () => {
  for (const bad of ["", ".", "0", "0.00", "-5", "abc", "1e3", "1.234", "1.2.3", "$5"]) {
    assert.equal(parsePaymentAmountCents(bad), null, bad);
  }
  assert.equal(parsePaymentAmountCents("1.234", 3), 1234);
  assert.equal(parsePaymentAmountCents("500", 0), 500);
  assert.equal(parsePaymentAmountCents("5.5", 0), null);
});

test("centsToInput round-trips with parsePaymentAmountCents", () => {
  assert.equal(centsToInput(1250), "12.50");
  assert.equal(centsToInput(7), "0.07");
  for (const cents of [1, 99, 100, 125005, 1999]) {
    assert.equal(parsePaymentAmountCents(centsToInput(cents)), cents);
  }
});

test("currencyDecimals", () => {
  assert.equal(currencyDecimals("CAD"), 2);
  assert.equal(currencyDecimals("JPY"), 0);
});

test("paymentProblem names the first thing wrong", () => {
  const ok = { payerId: "a", payeeId: "b", amount: "5" };
  assert.equal(paymentProblem(ok), null);
  assert.equal(paymentProblem({ ...ok, payerId: "" }), "Choose who paid and who received it.");
  assert.equal(paymentProblem({ ...ok, payeeId: "" }), "Choose who paid and who received it.");
  assert.equal(paymentProblem({ ...ok, payeeId: "a" }), "Pick two different people.");
  assert.equal(paymentProblem({ ...ok, amount: "" }), "Enter an amount greater than zero.");
  assert.equal(paymentProblem({ ...ok, amount: "0" }), "Enter an amount greater than zero.");
});

test("an edit that leaves the date alone keeps the exact timestamp", () => {
  const original = "2026-09-17T15:42:11.000Z";
  assert.equal(paymentCreatedAt(dateInputValue(original), original), new Date(original).toISOString());
});

test("a changed date keeps the time of day, a new payment uses now", () => {
  const original = new Date(2026, 8, 17, 15, 42, 11).toISOString();
  const moved = new Date(paymentCreatedAt("2026-09-20", original));
  assert.equal(dateInputValue(moved), "2026-09-20");
  assert.equal(moved.getHours(), 15);
  assert.equal(moved.getMinutes(), 42);

  const now = new Date(2026, 10, 13, 9, 5, 0);
  const fresh = new Date(paymentCreatedAt("2026-11-13", null, now));
  assert.equal(fresh.getTime(), now.getTime());
  const earlier = new Date(paymentCreatedAt("2026-11-10", null, now));
  assert.equal(dateInputValue(earlier), "2026-11-10");
  assert.equal(earlier.getHours(), 9);
});

test("paymentTitle follows docs/06", () => {
  const you = { name: "Jacky", isViewer: true };
  const m = { name: "Matthew", isViewer: false };
  const a = { name: "Alvin", isViewer: false };
  assert.equal(paymentTitle(m, you), "Matthew paid you");
  assert.equal(paymentTitle(you, a), "You paid Alvin");
  assert.equal(paymentTitle(m, a), "Matthew paid Alvin");
});
