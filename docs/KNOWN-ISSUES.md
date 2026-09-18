# Known Issues & Improvement Log

A running list of things that are wrong, fragile, or worth improving — kept
separate from [HANDOFF.md](./HANDOFF.md), which is a point-in-time snapshot of
one work session. Add to this file whenever something is noticed but not fixed;
delete an entry when it is genuinely resolved.

Each entry says how it was established. **Confirmed** means it was reproduced or
queried directly against the live database; **observed** means it was read out
of the code and looks wrong but has not been exercised.

---

## 1. Correctness — affects users today

### 1.1 Saving an expense with a blank description fails · Confirmed

The Add Expense form labels the field **"Description (Optional)"** and
`ExpenseModal` writes `description.trim() || null`, but `expenses.description`
is `NOT NULL` in the database with no default. The insert is rejected, the user
gets "Failed to add expense.", and nothing explains why.

Verified directly as the `anon` role: an insert with `description = null`
creates 0 rows, while the identical insert with text creates 1. Consistent with
production data — all 37 expenses have a non-empty description, because it has
never been possible to save one without.

**Fix:** decide whether it is optional. If yes, `alter table expenses alter
column description drop not null`. If no, make the field required in the form
and drop the "(Optional)" label. Either way the two should agree.

### 1.2 Editing a percentage split silently converts it to exact amounts · Observed

`ExpenseModal.tsx:87-108` infers the split mode when opening an existing
expense. It only distinguishes "looks equal" from everything else, and
everything else becomes `EXACT`. A split originally entered as percentages
reopens as fixed amounts, so re-saving writes the amounts rather than the
percentages, and the original intent is lost. Changing the expense total
afterwards will not re-divide it the way the author expected.

**Fix:** persist the split mode on the expense (a `split_mode` column) rather
than re-deriving it, and store the percentages used.

### 1.3 Split state leaks between expenses in the edit modal · Observed

In the same block, the `EQUAL` branch sets `selectedSplitUsers` but never
clears `exactAmounts`/`percentages`, and the `EXACT` branch does the reverse.
If `existingSplits` is empty, neither branch runs and the mode carries over
from whatever was open previously. Switching split modes after opening a second
expense can therefore surface the first expense's numbers.

**Fix:** reset all four split states unconditionally before applying the
inferred ones.

### 1.4 Multi-currency balances are silently wrong · Confirmed (pre-existing)

`getExchangeRates()` in `src/lib/balances.ts` is a stub that pegs every
currency at 1.0. A ledger mixing currencies produces balances that are simply
incorrect, with nothing in the UI indicating it. This is HANDOFF priority #1 —
the rate needs to be locked at expense-creation time and persisted, not looked
up live, or historical balances will drift as rates move.

---

## 2. Data integrity & access control

### 2.1 Every row in every table is readable and writable by anyone · Confirmed

RLS is enabled on all four tables, but every policy is `using (true)` /
`with check (true)` for `anon` or `public`. The security model is supposed to
be "the ledger UUID in the URL is the secret", but that is not what the
policies enforce.

Queried as the `anon` role — the role the publicly shipped key uses — with no
ledger id supplied at all:

| ledgers | expenses | users | splits |
| ---: | ---: | ---: | ---: |
| 16 | 37 | 36 | 114 |

Every row, across every group. The same applies to writes: an anonymous client
can update or delete any other group's expenses. Anyone who pulls the anon key
out of the deployed JS bundle can enumerate, alter or wipe all data.

**Fix:** the URL secret has to be presented as a credential rather than assumed.
Options include scoping policies to a ledger id passed as a request header or
JWT claim, or moving writes behind server-side route handlers that hold a
service role key and check the ledger id. This is the most serious item in this
file and should be resolved before the app is shared beyond trusted users.

### 2.2 A missing RLS policy fails silently, it does not error · Confirmed

Postgres filters out rows no policy admits, and PostgREST reports that as
`200` with an empty body. A write that touched nothing is indistinguishable
from one that succeeded. This already caused a real bug: `expenses` had no
UPDATE policy, so every expense edit silently discarded the user's changes
while the UI reported success.

Both known gaps (`expenses`, `ledgers`) now have UPDATE policies, and the two
client call sites ask for the affected rows back and treat an empty result as
failure. The hazard is structural, though — it recurs with any new table or
operation.

**Fix:** when adding a write path, add the policy in the same change, and use
`.select()` on the write so a filtered-out result is detectable. The policy
matrix is documented in [db-chart.md](./db-chart.md#row-level-security).

### 2.3 Nothing prevents duplicate split rows · Observed

There is no unique constraint on `splits (expense_id, user_id)`. Nothing in the
current code produces duplicates, but nothing stops them either — and a
duplicate would quietly double-count that person's share in every balance.
`getMemberBreakdown` sums per-expense rather than assuming one row per person,
specifically so the breakdown still reconciles if duplicates ever appear.

**Fix:** `create unique index on splits (expense_id, user_id)`.

### 2.4 Foreign keys to `users` have no delete behaviour · Confirmed

`splits.user_id` and `expenses.payer_id` reference `users(id)` with no
`ON DELETE` clause, so a user who appears in any split or expense cannot be
deleted at all — the delete errors with a foreign key violation. Hit directly
while cleaning up test data.

There is no remove-member flow in the UI today, so this is latent rather than
broken. It will block one the moment it is built.

**Fix:** decide the semantics first. Deleting a member who owes money is
probably wrong; soft-delete (an `archived` flag) or refusing to remove members
with activity is likely the right answer, not a cascade.

### 2.5 Columns are nullable that probably should not be · Observed

`expenses.payer_id`, `splits.expense_id` and `splits.user_id` are all nullable.
An expense with no payer or a split attached to nothing would break the balance
math in ways that are hard to trace back. Meanwhile `expenses.description` is
`NOT NULL` when the product treats it as optional (see 1.1) — the constraints
appear to have been set by accident rather than by intent.

**Fix:** audit the four tables against what the product actually requires.

---

## 3. Schema process

### 3.1 The live schema has no version-controlled source of truth · Known

There is still no `supabase/migrations` directory. The schema lives only in the
Supabase project, which is exactly how `db-chart.md` drifted out of sync once
before. Two migrations were applied during this session
(`allow_public_update_on_expenses`, `add_shared_simplify_debts_to_ledgers`);
they exist in Supabase's own migration history but not in this repo, so a fresh
project cannot be rebuilt from source.

**Fix:** adopt the Supabase CLI and check in migrations before the next schema
change. Worth doing soon — every session that changes the schema without it
widens the gap.

---

## 4. Product & UX

### 4.1 Shared state only updates on reload · Known

`ledgers.simplify_debts` is genuinely shared, but other members see a change
only when they next load the page. The same applies to a newly added expense.
Scoped in detail as HANDOFF priority #2: the `supabase_realtime` publication
already exists on the project with no tables in it, so enabling it is one
statement plus a subscription. Roughly 30 minutes for the toggle alone, half a
day to cover expenses and splits — the wrinkle being that `splits` has no
`ledger_id` column, so its stream cannot be filtered per ledger server-side.

### 4.2 Breakdown rows and expense details will disagree on currency · Observed

In the balances drill-down, row amounts are converted to the ledger's base
currency, but the expense details modal it opens shows the expense in its
original currency. Invisible today only because rates are pegged 1:1 (see 1.4).
Once real rates land, clicking a row reading `CA$45.00` will open a modal
saying `¥5000`.

**Fix:** when rates become real, show both — the original amount with the
converted value beside it.

### 4.3 Errors are reported with `alert()` · Known

Every failure path in `ExpenseModal`, `BalancesView` and `UserManagementModal`
uses a browser `alert()`. It blocks the page, cannot be styled, and reads as
broken on mobile. Fine for MVP, worth replacing with inline error state or a
toast before any wider release.

### 4.4 Members can be added but never removed or renamed · Known

`UserManagementModal` only inserts. A typo in a member's name is permanent, and
someone added by mistake stays in the group forever. See 2.4 — the deletion
story needs a decision before the UI can exist.

---

## 5. Engineering & tooling

### 5.1 There are no automated tests · Known

No test runner, no test script in `package.json`, no test files. Every
regression in this codebase so far has been caught by reading the code or by
driving a browser by hand. The silent-RLS bug (2.2) is exactly the kind of
thing a test would have caught: the balance math is pure, deterministic and
trivial to test.

**Fix:** highest-leverage starting point is `src/lib/balances.ts` — pure
functions over plain data, no mocking needed. A property worth asserting
directly: `getMemberBreakdown(...).netCents` must always equal
`getNetBalances()[userId]`, which is what keeps a breakdown from contradicting
the balance it explains.

### 5.2 Lint is not gating, and almost all of its noise is one generated file · Confirmed

`npm run lint` reports 36 problems (27 errors, 9 warnings), which makes it
useless as a signal. But 29 of those come from `src/types/validator.ts` and
`src/types/routes.d.ts` — files Next.js generates and whose header says *"This
file is generated automatically by Next.js / Do not edit this file manually"* —
and 2 more from `test_db.js` (see 5.3). Hand-written application code accounts
for only a handful.

**Fix:** stop tracking the generated `src/types/*` files (gitignore them, they
are regenerated by `next build`) or exclude them in `eslint.config.mjs`. That
drops the count low enough to make lint a meaningful CI gate.

### 5.3 `test_db.js` is broken as committed · Known

It imports `dotenv`, which is in neither `package.json` nor `node_modules`, so
it cannot run. It also accounts for 2 of the lint errors. Either add the
dependency or delete the file.

### 5.4 The remote sandbox cannot reach Supabase · Environment note

The agent sandbox's network policy blocks `supabase.co`, so the app cannot be
exercised end-to-end against the real project from there — the ledger page
404s because its server-side fetch fails. Work in that environment has been
verified against a local PostgREST-compatible mock instead, which is fine for
UI behaviour but cannot cover anything RLS- or Realtime-dependent.

**Implication:** database-level behaviour has to be verified by querying the
project directly (via SQL) or on the Vercel deploy. Do not read a passing local
run as proof that a policy or subscription works.

---

## 6. Reserved / intentionally unused

Not problems — recorded so they are not mistaken for dead code:
`users.is_placeholder`, `users.device_token`, `users.phone_number` and
`users.auth_user_id` all exist in the schema ahead of the app. They were
scaffolded for a join/claim flow that is explicitly deprioritized; see
[features.md](./features.md) and [db-chart.md](./db-chart.md).
