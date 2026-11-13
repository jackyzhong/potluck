// Validation for everything a browser sends to a server action.
//
// Server actions are reachable by a plain POST from anyone, not only through
// the app's UI, so nothing here may assume the form did its job. Each parser
// takes `unknown` and either returns a clean value or a message safe to show.
//
// Kept free of Next.js and Supabase imports so `npm test` can exercise it.

import { CURRENCIES } from "./currencies.ts";

export type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const LIMITS = {
  title: 100,
  memberName: 50,
  description: 50,
  note: 50,
  emoji: 32,
  splits: 200,
  // Large enough for any real expense, small enough that sums of many of them
  // stay well inside Number.MAX_SAFE_INTEGER.
  amountCents: 1_000_000_000_00
} as const;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

function fail<T>(error: string): Parsed<T> {
  return { ok: false, error };
}

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function requiredText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= max ? trimmed : null;
}

/** Blank becomes null; anything that is not a string, or is too long, fails. */
function optionalText(value: unknown, max: number): { ok: boolean; value: string | null } {
  if (value === null || value === undefined) return { ok: true, value: null };
  if (typeof value !== "string") return { ok: false, value: null };
  const trimmed = value.trim();
  if (trimmed.length > max) return { ok: false, value: null };
  return { ok: true, value: trimmed.length > 0 ? trimmed : null };
}

function positiveCents(value: unknown): number | null {
  return Number.isSafeInteger(value) && (value as number) > 0 && (value as number) <= LIMITS.amountCents
    ? (value as number)
    : null;
}

function currency(value: unknown): string | null {
  return typeof value === "string" && Object.hasOwn(CURRENCIES, value) ? value : null;
}

function timestamp(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const time = Date.parse(value);
  return Number.isNaN(time) ? null : new Date(time).toISOString();
}

// ---------------------------------------------------------------------------

export type LedgerInput = { title: string; emoji: string; baseCurrency: string };

export function parseLedgerInput(input: unknown): Parsed<LedgerInput> {
  const raw = record(input);
  if (!raw) return fail("Invalid request.");

  const title = requiredText(raw.title, LIMITS.title);
  if (!title) return fail(`Give the group a name of up to ${LIMITS.title} characters.`);

  const emoji = requiredText(raw.emoji, LIMITS.emoji);
  if (!emoji) return fail("Pick an emoji for the group.");

  const baseCurrency = currency(raw.baseCurrency);
  if (!baseCurrency) return fail("Pick a supported currency.");

  return { ok: true, value: { title, emoji, baseCurrency } };
}

export function parseMemberName(input: unknown): Parsed<string> {
  const name = requiredText(input, LIMITS.memberName);
  return name
    ? { ok: true, value: name }
    : fail(`Names must be between 1 and ${LIMITS.memberName} characters.`);
}

export type SplitInput = { userId: string; amountCents: number };

export type ExpenseInput = {
  payerId: string;
  description: string | null;
  amountCents: number;
  currency: string;
  createdAt: string;
  splits: SplitInput[];
};

export function parseExpenseInput(input: unknown): Parsed<ExpenseInput> {
  const raw = record(input);
  if (!raw) return fail("Invalid request.");

  if (!isUuid(raw.payerId)) return fail("Choose who paid.");

  const description = optionalText(raw.description, LIMITS.description);
  if (!description.ok) return fail(`Descriptions are limited to ${LIMITS.description} characters.`);

  const amountCents = positiveCents(raw.amountCents);
  if (amountCents === null) return fail("Enter an amount greater than zero.");

  const code = currency(raw.currency);
  if (!code) return fail("Pick a supported currency.");

  const createdAt = timestamp(raw.createdAt);
  if (!createdAt) return fail("Enter a valid date.");

  if (!Array.isArray(raw.splits) || raw.splits.length === 0) {
    return fail("Split the expense between at least one person.");
  }
  if (raw.splits.length > LIMITS.splits) return fail("Too many people in one split.");

  const splits: SplitInput[] = [];
  const seen = new Set<string>();
  let total = 0;
  for (const entry of raw.splits) {
    const split = record(entry);
    if (!split || !isUuid(split.userId)) return fail("Invalid split.");
    // Zero is allowed: an equal split of 1 cent between three people gives two
    // of them nothing, and that is still a correct split.
    if (!Number.isSafeInteger(split.amountCents) || (split.amountCents as number) < 0) {
      return fail("Invalid split amount.");
    }
    const userId = split.userId.toLowerCase();
    if (seen.has(userId)) return fail("Each person can only appear once in a split.");
    seen.add(userId);
    total += split.amountCents as number;
    splits.push({ userId, amountCents: split.amountCents as number });
  }

  // The invariant every balance depends on: shares add up to exactly the total.
  if (total !== amountCents) return fail("The split doesn't add up to the expense total.");

  return {
    ok: true,
    value: {
      payerId: raw.payerId.toLowerCase(),
      description: description.value,
      amountCents,
      currency: code,
      createdAt,
      splits
    }
  };
}

export type PaymentInput = {
  payerId: string;
  payeeId: string;
  amountCents: number;
  currency: string;
  note: string | null;
  createdAt: string;
};

export function parsePaymentInput(input: unknown): Parsed<PaymentInput> {
  const raw = record(input);
  if (!raw) return fail("Invalid request.");

  if (!isUuid(raw.payerId) || !isUuid(raw.payeeId)) return fail("Choose who paid and who received it.");
  const payerId = raw.payerId.toLowerCase();
  const payeeId = raw.payeeId.toLowerCase();
  if (payerId === payeeId) return fail("Someone can't pay themselves.");

  const amountCents = positiveCents(raw.amountCents);
  if (amountCents === null) return fail("Enter an amount greater than zero.");

  const code = currency(raw.currency);
  if (!code) return fail("Pick a supported currency.");

  const note = optionalText(raw.note, LIMITS.note);
  if (!note.ok) return fail(`Notes are limited to ${LIMITS.note} characters.`);

  const createdAt = timestamp(raw.createdAt);
  if (!createdAt) return fail("Enter a valid date.");

  return { ok: true, value: { payerId, payeeId, amountCents, currency: code, note: note.value, createdAt } };
}

/**
 * What every server action returns. Errors are messages safe to show a user;
 * database details are logged on the server and never sent to the browser.
 */
export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };
