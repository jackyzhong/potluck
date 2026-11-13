# Handoff: Docs/Code Reconciliation Pass

> **Current work (from 2026-11-13): the Glow UI redesign**, built on the `glow` branch. Check out `glow` and start at its `AGENTS.md`; the plan and progress log on that branch are current, the copies on `main` are not. This file is the history of the earlier reconciliation pass.

**Context for the next thread:** This project (`docs/PRD.md`, `docs/db-chart.md`, `docs/features.md`) drifted from the actual `src/` implementation over time. We ran a reconciliation pass: audited the drift, then went through it decision-by-decision. This file is the state of that pass — read it first, then the three docs above, before picking up new work.

**Repo/git state as of this handoff:** `main` branch, working tree clean, in sync with `origin/main` (`https://github.com/jackyzhong/potluck.git`). `.env.local` is correctly covered by `.gitignore` (`.env*`) and was never tracked — no secrets in history. Latest 2 commits already reflect the doc updates below (`Updated db-chart`, `Updated features`).

---

## Decisions made this pass

### 1. `docs/db-chart.md` — done, matches live schema now
Queried the live Supabase schema directly (read-only) rather than trusting the doc. Fixed:
- Added `ledgers.emoji` (real column, used by the emoji picker on group creation).
- Added `users.phone_number` and `users.auth_user_id` (exist live, unused by any code) and annotated these plus `users.is_placeholder` / `users.device_token` as **"Reserved for a future feature"** — schema is ahead of the app here, not a bug.
- Fixed `splits.share_cents` → `amount_cents` (doc was wrong; code and DB already agreed with each other).
- Fixed an internal doc typo (`expenses.total_amount_cents` → `amount_cents`).
- Clarified `expenses.created_at`: it's intentionally user-editable per expense and doubles as the sort key that drives chronological order in the expense list. **Confirmed intentional, keep as-is.**

### 2/3. `docs/features.md` — done, rewritten in two places

- **Feature 1 (was "Placeholder Profiles & Claiming")** → renamed **"Group Member Management (MVP)"**. Rewritten to describe what's actually built: anyone with the link adds a plain name; any name can be a payer or split participant; no identity binding, no join/claim flow. **Claiming/identity-binding is explicitly deprioritized** — out of scope for MVP, in favor of other work (see priorities below). The original claim-flow design is preserved in the doc under a "Deferred (Post-MVP)" subsection so it isn't lost, just clearly marked not-current.
- **Feature 2 (was "Split Logic & State Machine")** → rewritten to drop the Locked/Unlocked live-recalculation engine (never built) and instead document what's real: three static modes — **Equal / Exact Amount / Percentage** — computed once at save time, with the actual floor+remainder and percent-absorption math. A **"Known Gap — Allocation Validation"** section flags that Exact/Percentage modes don't currently validate totals before saving (no running-total display, no submit-lock, possible negative last-entry in Percentage mode if inputs overshoot 100%).

### 4. `docs/PRD.md` — reviewed, **not yet edited**
- Receipt OCR and Offline/PWA are already correctly filed as P2 / "Future Roadmap" in the existing PRD — no drift, no change made.
- Multi-currency (PRD §5.2, marked P0) is the one confirmed-real gap: `getExchangeRates()` in [src/lib/balances.ts](../src/lib/balances.ts) is a stub pegged 1:1 for every currency, so balances across mixed-currency groups are silently wrong today. **Agreed this needs work**, but no PRD text has been changed yet — see priority #2 below before it needs a doc update to match.

---

## Shipped since this handoff was written

- **Split allocation validation** (old priority #1) — done. Exact/Percentage modes now show a running allocated/remaining total and block save until the split balances.
- **Keyboard navigation** — shared `useModalKeyboard` hook: Escape closes, Tab is trapped inside the modal, focus returns to the opener. Dialog semantics on all three modals.
- **Balances UI** — per-person "Overall" net positions, and the Transfers list now reports how many payments simplification saves.
- **Expense edit was silently discarding changes** — `expenses` had RLS enabled but no UPDATE policy, so every edit updated zero rows and PostgREST still reported success. Policy added; the client now asks for the affected rows back and treats an empty result as a failure.
- **Simplify Debts is now a ledger-wide setting** (`ledgers.simplify_debts`, default on) rather than per-viewer component state, so the whole group sees the same transfers.
- **Balance drill-down** — clicking a member in Balances unfolds the expenses they fronted, the shares they owe and their payments, ending in the `paid − share = net` arithmetic that produces the figure above it. Expense rows open the expense.
- **Payments / settlement tracking** (old priority #3) — done, all four phases. Recording, Settle-up from a suggested transfer, the Activity list, and edit/delete. Designed in [payments-design.md](./payments-design.md).
- **The PRD.md pass** (old priority #4) — done. It now records the claiming deprioritization, the real state of multi-currency, and the settlement engine.
- **Pre-priority cleanup batch** (2026-11-05) — the live schema is now in [`supabase/migrations/`](../supabase/migrations/), verified by replaying it and diffing against the live catalog. Expense descriptions are genuinely optional, the key columns are NOT NULL, and duplicate split rows are blocked. The edit modal no longer leaks split values between expenses. The stale generated `src/types/*` files and the broken `test_db.js` are gone, taking lint from 36 problems to 1.
- **A test suite** — `npm test` runs `src/lib/balances.test.ts` on Node's built-in runner with type stripping, no dependencies added. Randomized property tests over 300 generated ledgers; the load-bearing one asserts that settling every suggested transfer leaves every member at exactly zero.

---

## Agreed priorities for upcoming work (in order)

> Reordered on 2026-11-05: access control and member removal now come first, realtime third, multi-currency last. Multi-currency is still the PRD's P0 gap and mixed-currency groups stay silently wrong until it lands.

1. **Fix the open access model.** *Done (2026-11-05), locked down live 2026-11-13.* All database access moved to the server: reads in the page's server component, writes in server actions that validate every argument and scope every row to the ledger in the URL, using the secret key. Expense saves are a single transaction (`save_expense()`). The open policies and the public roles' grants were removed by `supabase/migrations/20261113204541_revoke_public_access.sql`, applied once the release was live on Vercel with `SUPABASE_SECRET_KEY` set. Rate limiting is still missing; see [KNOWN-ISSUES.md](./KNOWN-ISSUES.md) §2.5.
2. **Decide the remove-member story.** *Done (2026-11-05).* Members can be renamed, and removed: deleted if they have no activity, archived otherwise (hidden from pickers for new records, kept on existing ones and in balances), and restored from a "Removed" list. See [features.md](./features.md) §1.
3. **Supabase Realtime so shared state updates live.** Today `simplify_debts` is genuinely shared, but other members only see a change on their next page load. Same gap applies to a new expense — you add one, nobody else sees it until they reload.

   **This is cheaper than it sounds.** The `supabase_realtime` publication already exists on the project with insert/update/delete enabled; it just has no tables in it. Enabling it is one statement:

   ```sql
   alter publication supabase_realtime add table ledgers, expenses, splits;
   ```

   Client side, it's a `supabase.channel(...).on('postgres_changes', {...}, () => router.refresh())` subscription in a `useEffect`. **Revised by #1:** the public key no longer has any table access, so `postgres_changes` subscriptions from the browser receive nothing, and the publication statement above no longer applies. Use Realtime **broadcast** instead: after each successful write, the server action sends a contentless "changed" message on a channel named after the ledger id, and clients subscribed to it call `router.refresh()`. The channel name is the ledger UUID, so it carries the same secret-link model, and the message holds no data. This also removes the `splits`-has-no-`ledger_id` wrinkle below, since nothing filters database rows any more.

   - **Just the Simplify Debts toggle:** ~30 minutes. One table, filterable server-side by `id=eq.<ledgerId>`, one `router.refresh()` on event.
   - **Expenses and splits too:** roughly half a day, because of one real wrinkle — `splits` has no `ledger_id` column, so its realtime stream can't be filtered per ledger server-side. Either denormalize `ledger_id` onto `splits` (also simplifies the two-step fetch in `page.tsx`) or accept that every connected client receives every group's split events. Prefer the former. Also debounce the refresh so a burst of split inserts doesn't trigger one refetch each.
   - **Caveats:** free tier is 200 concurrent connections / 2M messages per month — fine at this scale. And realtime can't be exercised against a local mock, so it has to be verified against the real project (i.e. on the Vercel deploy, not in a sandbox).

4. **Multi-currency: lock the exchange rate at expense-creation time and persist it.** Needs a schema addition (e.g. `base_amount_cents` or `exchange_rate` column on `expenses`) so balances don't drift as rates change after the fact — this matters for the PRD's "Audit-Ready Accuracy" principle. Only *after* that's in place, wire `getExchangeRates()` to a real rate source (Frankfurter / exchangerate-api.com are fine for MVP volume).

---

## Known repo hygiene items (not blocking, but noted)

> Superseded by [KNOWN-ISSUES.md](./KNOWN-ISSUES.md), which carries these items
> plus everything found since. Keep new findings there, not here — this file is
> a snapshot of one session, that one is the running log.

- ~~Root `test_db.js` imports `dotenv`, which isn't installed.~~ Deleted.
- ~~No `supabase/migrations` directory.~~ Added; every schema change now goes in as a migration file.
- `AGENTS.md` contains an unusual instruction: *"This is NOT the Next.js you know... read `node_modules/next/dist/docs/` before writing any code."* That directory does exist, so it's not broken, but it implies a customized Next.js build — worth double-checking this still reflects intent, since it'll shape how the next thread approaches any Next.js-specific code.

---

## Where things stand for the next thread

Priority #1 (the open access model) is done and live; #2 (remove-member) is done; #3 (realtime) is next. Multi-currency (now #4) carries two linked defects: the stubbed rate source, and a confirmed rounding bug where converting each split independently does not conserve money (KNOWN-ISSUES §1.5). `src/lib/balances.test.ts` already holds the acceptance test for the second, shipped skipped — unskip it when the fix lands.

`PRD.md`, `db-chart.md` and `features.md` are accurate as of this pass and now cover payments. [KNOWN-ISSUES.md](./KNOWN-ISSUES.md) is the running log of everything found but not fixed — read it before picking anything up; it is more current than this file, which is a snapshot.
