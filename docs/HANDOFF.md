# Handoff: Docs/Code Reconciliation Pass

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

## Agreed priorities for upcoming work (in order)

1. **Split allocation validation** (Exact/Percentage modes in `ExpenseModal.tsx`). Small, cheap, prevents bad data landing in `splits` — do this first, before/alongside starting payments work, not as a competing multi-week priority.
2. **Multi-currency: lock the exchange rate at expense-creation time and persist it.** Needs a schema addition (e.g. `base_amount_cents` or `exchange_rate` column on `expenses`) so balances don't drift as rates change after the fact — this matters for the PRD's "Audit-Ready Accuracy" principle. Only *after* that's in place, wire `getExchangeRates()` to a real rate source (Frankfurter / exchangerate-api.com are fine for MVP volume).
3. **Payments / settlement tracker** — the next major feature (marking debts as paid/settled). Not yet designed or scoped.
4. Once #2 and #3 have real shape, do a follow-up PRD.md pass to formally record the claiming deprioritization, the multi-currency plan, and the new payments feature — keeping the "Documentation First" promise in `README.md` intact.

---

## Known repo hygiene items (not blocking, but noted)

- Root [test_db.js](../test_db.js) imports `dotenv`, which isn't in `package.json` or `node_modules` — currently broken as committed. Either fix (`npm i -D dotenv`) or delete.
- No `supabase/migrations` directory — the live DB schema has no version-controlled source of truth, which is exactly how `db-chart.md` drifted last time. Worth introducing migrations (Supabase CLI) before the next schema change, so this reconciliation doesn't have to happen again.
- `AGENTS.md` contains an unusual instruction: *"This is NOT the Next.js you know... read `node_modules/next/dist/docs/` before writing any code."* That directory does exist, so it's not broken, but it implies a customized Next.js build — worth double-checking this still reflects intent, since it'll shape how the next thread approaches any Next.js-specific code.

---

## Where things stand for the next thread

Safe to start directly on priority #1 (split validation) or #2 (multi-currency rate locking) — both are scoped above. If picking up #3 (payments), it'll need its own design pass first (data model for settlement/payment records isn't defined yet). All three docs (`PRD.md`, `db-chart.md`, `features.md`) are accurate as of this handoff — trust them over any stale assumptions from before this pass.
