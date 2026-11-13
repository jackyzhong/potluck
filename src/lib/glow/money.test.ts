import { test } from "node:test";
import assert from "node:assert/strict";

import { formatMoney, moneyTone, MINUS } from "./money.ts";

test("formats cents as CA$ with grouping and two decimals", () => {
  assert.equal(formatMoney(117590), "CA$1,175.90");
  assert.equal(formatMoney(5), "CA$0.05");
  assert.equal(formatMoney(100), "CA$1.00");
  assert.equal(formatMoney(123456789), "CA$1,234,567.89");
  assert.equal(formatMoney(0), "CA$0.00");
});

test("negative amounts use U+2212, before the currency", () => {
  const text = formatMoney(-1250);
  assert.equal(text, "−CA$12.50");
  assert.equal(text.codePointAt(0), 0x2212);
  assert.ok(!text.includes("-"), "no hyphen-minus anywhere");
  assert.equal(MINUS, "−");
});

test("signed puts + before positives and leaves zero bare", () => {
  assert.equal(formatMoney(9145, { signed: true }), "+CA$91.45");
  assert.equal(formatMoney(-9145, { signed: true }), "−CA$91.45");
  assert.equal(formatMoney(0, { signed: true }), "CA$0.00");
});

test("compact drops the currency and always signs", () => {
  assert.equal(formatMoney(2879, { compact: true }), "+28.79");
  assert.equal(formatMoney(780, { compact: true }), "+7.80");
  assert.equal(formatMoney(-1638, { compact: true }), "−1638".replace("1638", "16.38"));
  assert.equal(formatMoney(0, { compact: true }), "0.00");
  assert.equal(formatMoney(123456, { compact: true }), "+1,234.56");
});

test("other currencies keep their own symbol and decimals", () => {
  assert.equal(formatMoney(1050, { currency: "USD" }), "$10.50");
  assert.equal(formatMoney(-1050, { currency: "EUR" }), "−€10.50");
  assert.equal(formatMoney(1050, { currency: "JPY" }), "¥1,050");
});

test("rounds nothing: refuses fractional or non-finite cents", () => {
  assert.throws(() => formatMoney(10.5), RangeError);
  assert.throws(() => formatMoney(NaN), RangeError);
  assert.throws(() => formatMoney(Infinity), RangeError);
});

test("negative zero prints as zero, not as a minus", () => {
  assert.equal(formatMoney(-0), "CA$0.00");
  assert.equal(formatMoney(-0, { compact: true }), "0.00");
});

test("moneyTone: auto follows the sign, explicit tones win", () => {
  assert.equal(moneyTone(5, "auto"), "positive");
  assert.equal(moneyTone(-5, "auto"), "negative");
  assert.equal(moneyTone(0, "auto"), "neutral");
  assert.equal(moneyTone(5, "negative"), "negative");
  assert.equal(moneyTone(-5, "neutral"), "neutral");
});
