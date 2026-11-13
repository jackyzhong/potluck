// Load the "Veld 2026" sample group into the dev Supabase project.
//
//   node scripts/seed-dev.mjs
//
// Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY from .env.local (or
// the environment), replaces the Veld group, and prints its URL. Safe to
// re-run: the group has a fixed id, so each run deletes it and loads it fresh.
//
// It writes only the columns that exist in supabase/migrations today, straight
// into the tables, so it keeps working before and after the Glow schema
// migration (expenses.split_mode, splits.weight, expenses.created_by).

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

// The only project this script may write to. An allow-list on purpose: any
// other URL, including one we have never heard of, is refused.
const DEV_PROJECT_REF = "pooogudusmmfuztxaqfg";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const fixturePath = resolve(root, "docs/potluck-glow-redesign/fixtures/veld-2026.json");

function fail(message) {
  console.error(`seed-dev: ${message}`);
  process.exit(1);
}

// Variables already in the environment win over the file, as in Next.js.
try {
  process.loadEnvFile(resolve(root, ".env.local"));
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;
if (!url || !secretKey) {
  fail("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY must be set (see .env.local).");
}

let host;
try {
  host = new URL(url).hostname;
} catch {
  fail("NEXT_PUBLIC_SUPABASE_URL is not a valid URL.");
}
if (host !== `${DEV_PROJECT_REF}.supabase.co`) {
  fail(
    `refusing to run: NEXT_PUBLIC_SUPABASE_URL points at ${host}, not the dev project ` +
      `(${DEV_PROJECT_REF}). This script only ever writes to potluck-dev.`
  );
}

const db = createClient(url, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

// The fixture's ids ("u-jacky") are not uuids, so derive stable uuids from
// them. The same fixture id always maps to the same uuid, which gives the
// group a fixed URL and lets a re-run find and replace what it loaded before.
function uuidFor(fixtureId) {
  const h = createHash("sha1").update(`potluck-seed:${fixtureId}`).digest("hex");
  const variant = ((parseInt(h[16], 16) & 0x3) | 0x8).toString(16);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-${variant}${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

// Equal split in integer cents. Leftover cents go one each to the first
// members in ledger order (docs/potluck-glow-redesign/PLAN.md, D5).
function splitEqually(totalCents, memberIds) {
  const base = Math.floor(totalCents / memberIds.length);
  const extra = totalCents - base * memberIds.length;
  return memberIds.map((id, i) => ({ id, cents: base + (i < extra ? 1 : 0) }));
}

function assertCents(value, what) {
  if (!Number.isInteger(value)) fail(`${what} is not an integer number of cents: ${value}`);
}

function check({ error }, what) {
  if (error) fail(`${what} failed: ${error.message}`);
}

const fixture = JSON.parse(readFileSync(fixturePath, "utf8"));
const ledgerId = uuidFor(fixture.ledger.id);

// Ledger order decides who absorbs leftover cents, so make it explicit.
const members = [...fixture.users].sort((a, b) => a.created_at.localeCompare(b.created_at));
const memberIndex = new Map(members.map((u, i) => [u.id, i]));

const expenseRows = [];
const splitRows = [];
for (const e of fixture.expenses) {
  assertCents(e.amount_cents, `${e.description} amount`);
  if (e.split.mode !== "equal") fail(`${e.description}: only equal splits are seeded (got ${e.split.mode}).`);
  const expenseId = uuidFor(e.id);
  expenseRows.push({
    id: expenseId,
    ledger_id: ledgerId,
    payer_id: uuidFor(e.payer_id),
    description: e.description,
    amount_cents: e.amount_cents,
    original_currency: e.original_currency,
    created_at: e.created_at
  });
  const participants = [...e.split.participants].sort((a, b) => memberIndex.get(a) - memberIndex.get(b));
  const shares = splitEqually(e.amount_cents, participants);
  if (shares.reduce((sum, s) => sum + s.cents, 0) !== e.amount_cents) {
    fail(`${e.description}: splits do not add up to the total.`);
  }
  for (const s of shares) {
    splitRows.push({ expense_id: expenseId, user_id: uuidFor(s.id), amount_cents: s.cents });
  }
}

const paymentRows = fixture.payments.map((p) => {
  assertCents(p.amount_cents, `payment ${p.id} amount`);
  return {
    id: uuidFor(p.id),
    ledger_id: ledgerId,
    payer_id: uuidFor(p.payer_id),
    payee_id: uuidFor(p.payee_id),
    amount_cents: p.amount_cents,
    original_currency: p.original_currency,
    note: p.note,
    created_at: p.created_at
  };
});

// Replace: remove the Veld group (this run's fixed id, plus any other ledger
// with the same title from an earlier version of the script), children first
// so no foreign key, present or added later, can block it.
async function deleteLedgers(ids) {
  for (const id of ids) {
    const { data: expenses, error } = await db.from("expenses").select("id").eq("ledger_id", id);
    check({ error }, "reading old expenses");
    const expenseIds = expenses.map((e) => e.id);
    if (expenseIds.length > 0) check(await db.from("splits").delete().in("expense_id", expenseIds), "deleting old splits");
    check(await db.from("payments").delete().eq("ledger_id", id), "deleting old payments");
    check(await db.from("expenses").delete().eq("ledger_id", id), "deleting old expenses");
    check(await db.from("users").delete().eq("ledger_id", id), "deleting old members");
    check(await db.from("ledgers").delete().eq("id", id), "deleting old ledger");
  }
}

const { data: sameTitle, error: lookupError } = await db
  .from("ledgers")
  .select("id")
  .eq("title", fixture.ledger.title);
check({ error: lookupError }, "looking for an existing Veld group");
const oldIds = [...new Set([ledgerId, ...sameTitle.map((l) => l.id)])];
await deleteLedgers(oldIds);

check(
  await db.from("ledgers").insert({
    id: ledgerId,
    title: fixture.ledger.title,
    emoji: fixture.ledger.emoji,
    base_currency: fixture.ledger.base_currency,
    simplify_debts: fixture.ledger.simplify_debts
  }),
  "inserting the ledger"
);
check(
  await db.from("users").insert(
    members.map((u) => ({ id: uuidFor(u.id), ledger_id: ledgerId, name: u.name, created_at: u.created_at }))
  ),
  "inserting members"
);
check(await db.from("expenses").insert(expenseRows), "inserting expenses");
check(await db.from("splits").insert(splitRows), "inserting splits");
check(await db.from("payments").insert(paymentRows), "inserting payments");

console.log(
  `Seeded "${fixture.ledger.title}": ${members.length} members, ${expenseRows.length} expenses, ` +
    `${splitRows.length} splits, ${paymentRows.length} payments.`
);
console.log(`Open it with \`npm run dev\`: http://localhost:3000/ledger/${ledgerId}`);
