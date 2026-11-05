# Known Issues & Improvement Log

A running list of things that are wrong, fragile, or worth improving — kept
separate from [HANDOFF.md](./HANDOFF.md), which is a point-in-time snapshot of
one work session. Add to this file whenever something is noticed but not fixed;
delete an entry when it is genuinely resolved. Entry numbers are stable IDs
that other docs cite, so gaps are expected — do not renumber.

Each entry says how it was established. **Confirmed** means it was reproduced or
queried directly against the live database; **observed** means it was read out
of the code and looks wrong but has not been exercised.

---

## 1. Correctness — affects users today

### 1.2 Editing a percentage split silently converts it to exact amounts · Observed

`ExpenseModal.tsx:87-108` infers the split mode when opening an existing
expense. It only distinguishes "looks equal" from everything else, and
everything else becomes `EXACT`. A split originally entered as percentages
reopens as fixed amounts, so re-saving writes the amounts rather than the
percentages, and the original intent is lost. Changing the expense total
afterwards will not re-divide it the way the author expected.

**Fix:** persist the split mode on the expense (a `split_mode` column) rather
than re-deriving it, and store the percentages used.

### 1.4 Multi-currency balances are silently wrong · Confirmed (pre-existing)

`getExchangeRates()` in `src/lib/balances.ts` is a stub that pegs every
currency at 1.0. A ledger mixing currencies produces balances that are simply
incorrect, with nothing in the UI indicating it. This is HANDOFF priority #4 —
the rate needs to be locked at expense-creation time and persisted, not looked
up live, or historical balances will drift as rates move.

### 1.5 Mixed currencies do not conserve money · Confirmed

Every amount is converted independently and rounded to whole cents, so an
expense's converted shares need not add back up to its converted total. The
payer is credited one figure and the participants are charged another, and the
difference is created or destroyed out of thin air.

Minimal reproduction: an expense of `16344` at rate `1.37`, split evenly two
ways. The payer is credited `round(16344 x 1.37) = 22391`; the two shares are
charged `round(8172 x 1.37) x 2 = 22392`. One cent appears from nowhere. Across
a ledger the drift accumulates and net balances stop summing to zero, which
means the Balances tab can tell a group to move money that does not exist.

Invisible in production today only because every rate is pegged at 1.0 (see
1.4), where the arithmetic is exact integer maths.

**Fix:** belongs with the rate-locking work in 1.4, not before it — the right
answer depends on whether converted amounts get persisted per split. Whatever
the approach, converted shares must be derived so they sum exactly to the
converted total (distribute the remainder, the way the app's EQUAL split mode
already does in cents).

`src/lib/balances.test.ts` carries the acceptance test for this, currently
skipped: `"mixed currencies conserve money"`. Unskip it when the fix lands.

---

## 2. Data integrity & access control

### 2.1 Every row in every table is readable and writable by anyone · Fix pending rollout

Every RLS policy is `using (true)`, so anyone holding the public key from the
deployed JavaScript can read, alter or delete every group's data without
knowing any link. Confirmed as the `anon` role: every row of every table comes
back with no ledger id supplied.

**Fixed in code:** the browser no longer talks to Supabase. All reads and
writes run on the server with the secret key, scoped to the ledger in the URL,
and the public key needs no access. See [db-chart.md](./db-chart.md#access-model).

**Still open until the lockdown is applied.** The old policies stay live until
`supabase/pending/revoke_public_access.sql` runs, and it must run *after* the
release is deployed, or the old client code breaks:

1. Add `SUPABASE_SECRET_KEY` to Vercel (Production and Preview).
2. Deploy, and check that creating a group, adding a member, saving, editing
   and deleting an expense and a payment, and the Simplify Debts toggle all work.
3. Apply the migration, move the file into `supabase/migrations/` under the
   version Supabase records, and delete this entry.

Not yet covered: rate limiting. Anyone can still create ledgers or flood a
ledger they know the link to. The server actions are the place to add it.

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

---

## 4. Product & UX

### 4.1 Shared state only updates on reload · Known

`ledgers.simplify_debts` is genuinely shared, but other members see a change
only when they next load the page. The same applies to a newly added expense.
Scoped as HANDOFF priority #3. Since the access-model change (2.1) the
public key has no table access, so this has to use Realtime broadcast from the
server actions rather than database change feeds; see HANDOFF for the design.

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

### 5.1 Test coverage stops at the balance math · Partly resolved

`npm test` now runs `src/lib/balances.test.ts` on Node's built-in runner with
type stripping — no test dependencies. It covers the balance and payment
arithmetic as randomized property tests over 300 generated ledgers, and it is
what caught 1.5.

`src/lib/validation.test.ts` covers the parsing every server action does on
its input. The `save_expense()` database function was exercised against a
local Postgres when written, but has no automated test.

What is still uncovered: every React component and the server actions' calls
to Supabase. Those need a browser or a live database, so they remain manual. Adding a component test setup is the next step if this
starts to bite.

### 5.2 One lint error remains: form state set inside an effect · Confirmed

`npm run lint` is down to a single error. `ExpenseModal` copies the expense
being edited into its form state from a `useEffect`, which React's
`set-state-in-effect` rule flags because it renders twice on every open.
It works, but the right fix is structural: give the modal a `key` from the
parent so each open remounts it, and seed the form from `useState`
initialisers instead of an effect. That needs checking in a browser, which is
why it was not done alongside the lint cleanup.

Once it is fixed, lint is clean and can be made a CI gate.

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
