# Glow build progress

The running state of the Glow redesign. Every session that works a task from
[`PLAN.md`](./PLAN.md) updates this file in the same PR as its code.

- **Board:** current status of every task. Edit the row in place.
- **Open questions:** blockers waiting on the owner. The owner answers them in
  place; once resolved, the asking session's successor folds the answer into
  `PLAN.md` and deletes the question.
- **Spec corrections:** places where the spec turned out to be wrong.
  Append-only.
- **Log:** one entry per session, **newest first**. Append-only: never edit or
  delete another session's entry.

Read the board and the five newest log entries before starting work.

---

## Board

Statuses: `todo` · `in progress` (branch) · `in review` (PR link) · `done` · `blocked` (see Open questions)

| Task | Title | Depends on | Status | Branch / PR |
|---|---|---|---|---|
| T00a | Confirm decisions | | done | accepted as defaults, 2026-11-13 |
| T00b | Dev database, `glow` branch | | done | `glow` |
| T01 | Seed script | T00b | in review | [PR #12](https://github.com/jackyzhong/potluck/pull/12) |
| T02 | Tokens, font, theme plumbing | T00a | todo | |
| T03 | Viewer calculation layer | T00a | in review | https://github.com/jackyzhong/potluck/pull/14 |
| T04 | Schema: split mode, weights, created_by | T00a | in review | [PR #13](https://github.com/jackyzhong/potluck/pull/13) |
| T05 | Foundation components | T02 | todo | |
| T06 | Viewer state, first-visit prompt | T03, T05 | todo | |
| T07 | Page frame, viewing-as switcher | T06 | todo | |
| T08 | Activity hero, share card | T07 | todo | |
| T09 | Ledger table and list | T07 | todo | |
| T10 | Search and filters | T08, T09 | todo | |
| T11 | Right panel, drawer, sheet | T07 | todo | |
| T12 | Expense details | T09, T11, T04 | todo | |
| T13 | Composer: shell, Equally | T11, T04, T05 | todo | |
| T14 | Composer: Exact, Percent, Shares, Edit | T13 | todo | |
| T15 | Payments: add, details, edit | T11, T09 | todo | |
| T16 | Balances tab | T07, T15 | todo | |
| T17 | Keyboard shortcuts | T10, T12, T14, T16 | todo | |
| T18 | States and edge cases | T16 | todo | |
| T19 | Accessibility and motion pass | T18 | todo | |
| T20 | Home and create-group restyle | T02 | todo | |
| T21 | Ship | all | todo | |

---

## Open questions

_None yet._ Format:

> **Q1 · T13 · 2026-11-20** What should happen when …? Options: (a) … (b) …
> I'd pick (a) because …
> **Answer:** _(owner)_

---

## Spec corrections

Places where `docs/01`–`08` turned out to be wrong or stale. Each entry says
which doc and section, what it says, and what's actually true. `PLAN.md`
"Spec facts that changed" lists the ones known when the plan was written.

- **docs/05 "Splitting rules", Equal.** It says the app may let the payer absorb the leftover cents and tells the agent to check. Checked: `ExpenseModal` gives one extra cent each to the first `total % n` people in the order they were *selected*, not ledger order, and the payer takes nothing special. D5 (ledger order) is the rule for the new code; `splitEqually` implements it. (T03, 2026-11-13)

---

## Log

### Template

```
### YYYY-MM-DD · T## · <model>
**Status:** done → in review (PR #N) | partial | blocked
**Changed:** files or areas touched, one line each.
**Checked:** npm test ✓ · lint ✓ · build ✓ · visual (boards NN, NN at 1280/390, light/dark) ✓ / not done (why)
**Differs from the boards:** what still looks different, or "nothing noticed".
**Decided:** anything the plan and spec didn't cover that you chose, and why.
**New copy:** strings not in docs/06, if any.
**Next session should know:** traps, half-finished edges, follow-ups.
```

Keep it short. Facts, not a narrative. If something wasn't checked, say so.

---

### 2026-11-13 · T01 · claude-sonnet-5-5
**Status:** done → in review ([PR #12](https://github.com/jackyzhong/potluck/pull/12)).
**Changed:** `scripts/seed-dev.mjs` (new). Nothing else outside this log and the board row.
**Checked:**
- Allow-list: a production-shaped URL and a look-alike URL both exit 1 before any client is created. Not run against production.
- Ran twice against dev: 1 ledger, 6 users, 5 expenses, 28 splits, 2 payments, every split an integer.
- `npm run dev` + the printed URL: Activity shows 5 expenses and 2 settlements.
- npm test ✓ · build ✓ · eslint on `scripts/seed-dev.mjs` ✓.
- **npm run lint ✗**: one error in `ExpenseModal.tsx` (`react-hooks/set-state-in-effect`), the known KNOWN-ISSUES 5.2. It was on `glow` before this task, and I left it because the file is out of T01's scope. T14 removes `ExpenseModal` and T21 confirms lint is clean.
- visual: not applicable (no UI change).
**Differs from the boards:** n/a.
**Decided:**
- The allow-list compares the URL's host to `pooogudusmmfuztxaqfg.supabase.co` exactly, rather than checking that the string contains the ref. It's stricter, and `.env.local` keeps the production URL in a comment, so a plain substring check on the file's text would be wrong.
- Ids are uuids derived from the fixture ids (sha1), so the group's URL is the same on every run: `/ledger/3894c472-c5d9-5a84-ad89-8f6aa3ea2361`.
- A re-run also deletes any other ledger titled "Veld 2026". That's fine on the dev project only, which is the only one the script can reach.
- It inserts into the tables directly and doesn't call `save_expense()`, so T04 changing that function's signature can't break it.
**New copy:** none.
**Next session should know:**
- The seed doesn't set `split_mode`, `weight` or `created_by`. Once T04 is merged, rows will have null for all three, which is how old rows read (D13). T12/T14 testing that needs a percent or shares expense has to add one through the UI. Adding those modes to the seed is a follow-up for after T04.
- Only equal splits are seeded, which is all the fixture contains.
- `npm run lint` is red on `glow` until `ExpenseModal` goes. Don't treat it as caused by your task.

### 2026-11-13 · T04 · claude-sonnet-5-5
**Status:** done → in review ([PR #13](https://github.com/jackyzhong/potluck/pull/13)).
**Changed:**
- `supabase/migrations/20261113224445_split_mode_weights_created_by.sql`: adds `expenses.split_mode` (check), `splits.weight` (numeric, check `>= 0`) and `expenses.created_by` (plain FK to `users`). Drops and recreates `save_expense()` with `p_split_mode` and `p_created_by` (both default null) and a `weight` key in each split. Same revoke/grant to `service_role`.
- `src/lib/validation.ts`, `src/app/ledger/[id]/actions.ts`: `parseExpenseInput` and `saveExpense` carry `splitMode`, `createdBy` and per-split `weight`.
- `src/lib/validation.test.ts`: 6 new tests.
**Checked:**
- npm test ✓ (27 pass, 1 skipped, 0 fail). build ✓.
- lint ✗ for a reason outside this task: the one error is `ExpenseModal.tsx:80` (`react-hooks/set-state-in-effect`, KNOWN-ISSUES 5.2). The plan says it goes away when T14 removes `ExpenseModal`. `npx eslint src/lib src/app/ledger/[id]/actions.ts` (the files I changed) is clean.
- Migration applied to **potluck-dev only**. `apply_migration` stamped it `20261113224555`, so I changed the row in `supabase_migrations.schema_migrations` to `20261113224445`, the file's version. `list_migrations` agrees with the files. Not applied to production.
- Against dev, calling the RPC with a throwaway group:
  - The old call shape (no mode args) stores null mode and null creator.
  - A `created_by` from another ledger is rejected (22023). This can't be tested in `validation.test.ts`, because membership is only known to the database.
  - A percent split without weights, and weights on an exact split, are rejected (22023); a bad mode and a negative weight hit the check constraints (23514).
  - Percent weights are stored.
  - An edit changes `split_mode` but keeps `created_by`.
- Today's UI against dev: with `npm run dev` on the dev project, I added an expense through the unchanged "Add Expense" modal in a throwaway group. It saved with `split_mode`, `created_by` and weights all null. Both throwaway groups and their rows are deleted; the Veld group was not touched.
**Differs from the boards:** n/a (no UI change).
**Decided:**
- `created_by` is **not** changed when an expense is edited, so "Added by" names whoever first added it. Old rows stay null.
- `weight` is required for percent and shares, and rejected for equal, exact and no mode. Validation also requires percent weights (each 0–100) to total 100 (within 1e-6) and shares to be whole numbers totalling at least 1. This mirrors docs/04 "Validation per mode". Zero shares/percent is allowed so someone can sit out.
- `created_by` is a plain FK (no `on delete`), so `remove_member` archives a member who added an expense instead of deleting them, as it does for payers and participants.
- The server does not check that `amountCents` matches what `weight` implies (largest remainder, D6). That needs T03's `splitByWeight`; T13/T14 compute the amounts.
- The save action's 22023 message ("Everyone on an expense must be in this group.") now also covers a `created_by` outside the ledger.
**New copy:** "Pick a valid way to split.", "Shares must be whole numbers.", "A percentage can't be more than 100.", "The percentages must add up to 100.", "Give at least one person a share." (server-side validation messages, not in docs/06).
**Next session should know:**
- T12/T13/T14: send `splitMode`, `createdBy` (the viewer's id) and a `weight` on every split for percent and shares only.
- The `p_splits` JSON takes `weight` as a JSON number; absent or null means no weight.
- The owner applies this migration to production in T21. It drops `save_expense(…8 args)`, so the T21 deploy of the app and the migration should go together.

### 2026-11-13 · T03 · claude-sonnet-5-5
**Status:** done → in review (PR #14).
**Changed:**
- `src/lib/glow/split.ts`: `splitEqually` (D5), `splitByWeight` (D6, largest remainder), `splitAmounts` (one entry point for all four modes), `equalSplitExtraCentMembers` (for the remainder note).
- `src/lib/glow/ledger.ts`: `events`, `impact`, `memberTotals`, `viewerLedger`, `pairwise`, `visibleChips` (D11), `heroCounts`, `shareOfSpend`, `composerImpact`. Types are the app's `Expense`, `Split`, `Payment`. `memberTotals` reuses `getMemberBreakdown` from `balances.ts`; `balances.ts` is unchanged.
- `src/lib/glow/index.ts`: re-exports both.
- `src/lib/glow/fixture-adapter.ts`: test-only. Turns `veld-2026.json` into the app's row types, and holds the test copy of the CAD formatter (the real `Money` formatter is T05's).
- `src/lib/glow/split.test.ts`, `ledger.test.ts`: every value in `expected.json` for Jacky and Stephen, the composer examples, plus property tests (300–500 seeds each).
**Checked:** npm test ✓ (65 pass, 1 skipped, the existing multi-currency skip) · build ✓ (needed `.env.local` copied from the main checkout; it points at the dev project) · lint ✗ **but not from this task**: the one error is `ExpenseModal.tsx:80` (`react-hooks/set-state-in-effect`, KNOWN-ISSUES 5.2), which T21 removes along with the file. `npx eslint src/lib/glow` is clean. Visual check not applicable (no UI).
**Differs from the boards:** n/a.
**Decided:**
- Signatures take plain data: `GroupData = { memberOrder, expenses, splits, payments }`. `memberOrder` is the member ids in ledger order, **archived members included** (they stay in history and totals). T06's `useGlowData()` builds it from `users`.
- Everything is at par (rate 1), like the app today (D8). `memberTotals` passes no exchange rates to `getMemberBreakdown`.
- `pairwise` returns every member, zeros included, so the chips still sum to net. `visibleChips` drops the zeros for the hero (D11). `heroCounts` returns ids (`owesYou`, `youOwe`, `square`), not copy: T08 writes the sub-line from docs/06, including the "everyone owes you" case.
- `composerImpact` returns `{ cents, kind: "owed" | "owe" | "none", involved }`. Involved with a zero impact (you pay for yourself only) gets "none", the "doesn't change your balance" line.
- Events sort by parsed instant, then id by code unit. `reference.mjs` compares the timestamp strings, which would misorder Postgres's `+00:00` or fractional-second forms against `Z`.
- `splitByWeight` scales weights to integers (up to 4 decimals) so remainder ties are exact. Same output as `reference.mjs` on the fixtures. Empty or all-zero weights, and no participants, give `{}`.
- An id the member order doesn't list still gets its share (appended after the known ones), so cents always sum to the total.
- Differences from `reference.mjs` that don't change any fixture value: a payer of a 0-cent expense counts as involved (docs/05 says payer or split row); `shareOfSpend` returns 0% instead of NaN for a group with no expenses.
**New copy:** none.
**Next session should know:**
- T13 must call `splitEqually`, not copy the old ExpenseModal loop (see Spec corrections).
- `fixture-adapter.ts` lives in `src/lib/glow/` and imports `node:fs`. Nothing in the app imports it; don't.
- The viewer's "Paid back" / "You've paid back" tile (docs/05) is `-received` / `sent` from `memberTotals`; nothing new is needed for T16.
- Anything running `npm run build` in a fresh worktree needs `.env.local` (see PLAN "Local setup"), or "Collecting page data" fails.

### 2026-11-13 · T00b (finish) · claude-opus-5-5
**Status:** done.
**Changed:**
- Owner: put the dev URL and secret key in the main checkout's `.env.local` and in Vercel Preview. Vercel Production is unchanged.
- Agent: commented out the old production URL and the unused anon key in `.env.local`. With duplicate keys, the last one wins, so the file worked, but one wrong deletion would have pointed local runs at production.
**Checked:**
- `.env.local`, loaded through `@next/env` as the app loads it, resolves to the dev URL, and its secret key reads all five dev tables (200 responses, 0 rows).
- `npm run dev` in this worktree with the copied `.env.local`: the home page returns 200, and a missing ledger returns 404.
- Vercel: Preview `NEXT_PUBLIC_SUPABASE_URL` is the dev URL, and Production is still the production URL. The Preview secret key is sensitive and can't be read back, so it was checked live instead: a Preview deploy built after the change served `/ledger/<unknown id>`, and the dev project's edge log shows the request from Vercel (IAD) using a `sb_secret_` key and getting 406, which is PostgREST's "no rows" answer. A rejected key would get 401.
- Merged `main` (#10, #11) into `glow`, so `glow` has the lockdown migration in `supabase/migrations/`.
**Next session should know:** T01 is unblocked. Anything that runs the app hits the empty dev database until T01 seeds it.

### 2026-11-13 · T00b · claude-opus-5-5
**Status:** partial. The owner still has to put the secret key in place (see T00b in PLAN.md).
**Changed:**
- Created the Supabase project `potluck-dev` (ref `pooogudusmmfuztxaqfg`, ca-central-1, $0/month).
- Applied all 8 migrations, including `20261113204541_revoke_public_access` (still in `supabase/pending/` on `main` until PR #10 merges).
- Renumbered dev's migration history to the file versions.
- Cut `glow` from `claude/glow-build-plan`, so it already contains PLAN.md.
**Checked:** per-category schema fingerprints (columns, constraints, indexes,
function signatures, grants and ACLs, function bodies ignoring comments, RLS)
match production, with 0 policies on both.
**Next session should know:**
- The function bodies on dev have no comments; the logic is identical to production.
- Until `.env.local` points at dev, T01 and anything that runs the app is blocked.
- T02 and T03 can start now.

### 2026-11-13 · T00a · claude-opus-5-5
**Status:** done.
**Changed:** PLAN.md "Decisions". The owner accepted every recommended option
(D1–D22) as a default, to ship sooner. The status column became "Built in",
which maps each decision to the tasks that implement it, so changing one later
shows what to rework.
**Next session should know:** decisions are settled; don't ask about them.
T00b (dev database, `glow` branch) is still the owner's, and blocks any task
that runs the app or applies a migration. T02 and T03 can start without it.

### 2026-11-13 · plan · claude-opus-5-5
**Status:** PLAN.md and PROGRESS.md written. No code changed.
**Checked:** `node fixtures/reference.mjs --check` passes. Decisions D1–D22 were
proposed at this point (accepted in the T00a entry above). The dev database
doesn't exist yet.
**Decided:** an integration branch (`glow`) instead of a feature flag. Production
keeps the current UI until T21, and no task has to keep old and new UI working
side by side behind a switch.
**Next session should know:** nothing can start until the owner finishes
T00a and T00b.
