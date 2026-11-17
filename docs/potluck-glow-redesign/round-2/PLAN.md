# Glow Round 2 build plan

Round 2 finishes the remaining Potluck Glow screens and builds the new public landing page (`66` boards in [`round-2/`](./README.md)). See [`AUDIT.md`](./AUDIT.md) for the verified `"code_today"` mappings and all `14` contradictions (`C1`–`C14`) surfaced against Round 1 (`D1`–`D22`) and the `glow` branch (`8eef590`).

[`../PROGRESS.md`](../PROGRESS.md) tracks task state across both Round 1 (`T00a`–`T21`) and Round 2 (`T22`–`T36`).

---

## How to work a Round 2 task

This plan extends [`../PLAN.md`](../PLAN.md). Follow the same workflow, rules, and verification bars:

1. **Read [`../PROGRESS.md`](../PROGRESS.md) and [`AUDIT.md`](./AUDIT.md) first.** Claim the first `todo` task whose **Status** is **Ready now** (or unblocked by the owner) and whose **Dependencies** are all `done`.
2. **Branch & PR target:** Confirm decision **B6** (whether Round 2 merges into `glow` or a post-merge `main`-based branch). Cut task branches `glow-T##-<slug>` (hyphenated, because Git cannot branch `glow/*` while `refs/heads/glow` exists).
3. **Next.js 16 rule (`AGENTS.md`):** Before editing route files, error boundaries, or `loading.tsx`, read the relevant guide under `node_modules/next/dist/docs/01-app/`.
4. **Tokens & primitives only:** Reuse components in `src/components/glow/` and utilities in `src/app/tokens.css` / `src/app/globals.css`. No raw hex colors, no `dark:` overrides, no third-party UI libraries, and no new design tokens.
5. **Preserve existing docs & server boundaries:** Keep Supabase access strictly server-side (`src/lib/server/supabase.ts`), validate all server-action arguments in `src/lib/validation.ts`, and never run seeds or migrations against production Supabase (`xjkvjfmdljdpynlumszz`).
6. **Checks & Visual verification:** Before opening a PR, run `npm test && npm run lint && npx tsc --noEmit && npm run build`, and compare rendered light and dark screenshots against the task's boards at the exact viewport dimensions listed in **Done when**.

---

## Owner Decisions (`B1`–`B7`) & Newly Surfaced Conflicts (`C4`–`C14`)

Tasks marked **Blocked by B1–B7** (or **Pending C#**) must not guess the product outcome. Once the owner answers in [`../PROGRESS.md`](../PROGRESS.md), fold the answer into this plan and flip the task status to **Ready now**.

| ID | Question / Conflict | Tasks Affected |
|---|---|---|
| **B1** | Add initial members at group creation (requires SQL RPC + validation change) or keep name + currency only? | **T22, T34** (2) |
| **B2** | Build phone `"Your groups"` list (`/groups`, device-local `localStorage` + light server read + phone back button) and desktop entry point (if any)? *(Conflicts with D19 / **C3**)* | **T35** (1) |
| **B3** | Undo on delete toasts (requires soft-delete/undo window + `"Delete this expense?"` copy change) vs Round 1 **D14/D15** no-Undo? *(Conflicts with **C1**)* | **T23, T25, T32** (3) |
| **B4** | Discard prompt: inline strip at bottom of form (`42`/`48`, per design rules) vs existing `DiscardDialog` modal in `RightPanel.tsx`? *(Conflicts with **C2**)* | **T32** (1) |
| **B5** | Round 1 `Q1` (right-panel vertical alignment beside hero) & `Q2` (edge-to-edge phone sheet vs floating card)? Boards assume `Q2(a)` edge-to-edge sheet. | **T27** (and downstream **T28, T30–T32**) |
| **B6** | Build Round 2 on `glow` before merging into `main`, or merge `glow` → `main` (`T21`) first? | **All (`T22`–`T36`)** (process) |
| **B7** | Landing page screenshots: captured by agent from seeded Veld 2026 dev group, or supplied by owner? | **T36** (1) |
| **C4** | Balance hero zero-value chips (`Matthew 0.00`, `Jonah 0.00` on `51`/`59`) vs Round 1 **D11** hiding zero chips? | **T33** |
| **C5** | Settled hero showing `CA$0.00` (`51`–`53`, `59`–`61`) vs Round 1 `docs/03` & `hero.ts` (`showAmount: false`)? | **T33** |
| **C6** | Phone search bar & horizontal filter chips (`57`/`65`, hiding hero when active) vs Round 1 **D20** (no phone search)? | **T33** |
| **C7** | Payment `"added by {name}"` (`35`/`38`): add `payments.created_by` column, derive from `payer_id`, or omit `"added by"`? | **T23, T31** |
| **C8** | Share card heading `"Trip so far"` (Round 2 boards) vs `"So far"` (Round 1 **D10**)? | **T28, T33** |
| **C9** | Reopen `split_mode: null` expenses in `Equally` (`39`/`45` Pizza Badiali) vs `Exact` (Round 1 **D13**)? | **T32** |
| **C10** | Group title max length `50` (`05`/`06` counter `9/50`) vs `100` (`LIMITS.title` in `validation.ts`)? | **T22, T34** |
| **C11** | Phone create-group `"What happens next"` card: omit as drawn (`06`/`14`) or stack below form (`round-2/README.md`)? | **T34** |
| **C12** | First-visit phone background list: blank impact/third-person names like `07`/`15` & `round-2/README.md`, vs Jacky's numbers drawn behind scrim in `08`/`16`? | **T28** |
| **C14** | Landing header/hero `"Create a group"` links (`#create` scroll vs `/create-group` direct), plus `"Supabase"` RLS phrasing vs `0 RLS policies`? | **T36** |

---

## Dependency Order

1. **Phase 1 — Schema & Server Actions:** `T22`, `T23`
2. **Phase 2 — Shared UI Primitives & Boundaries:** `T24`, `T25`, `T26`
3. **Phase 3 — Group Page Panels, Menus & States:** `T27` → `T28`, `T29`, `T30` (needs `T24`, `T27`), `T31` (needs `T24`), `T32` (needs `T24`), `T33`
4. **Phase 4 — New Pages:** `T34` (needs `T22`), `T35`, `T36` (needs `T27`–`T33` for final app screenshots)

```
Phase 1 (Schema/Server)       Phase 2 (Shared UI)               Phase 3 (Group Screens)              Phase 4 (New Pages)
───────────────────────       ───────────────────               ───────────────────────              ───────────────────
T22 Create group SQL/RPC ──────────────────────────────────────────────────────────────────────────▶ T34 Create group UI [B1]
T23 Undo/Payment schema  ───▶ T25 Toast Undo wiring [B3]
                              T24 ConfirmStrip ──────────┬─────▶ T30 Manage members (needs T27)
                                                         ├─────▶ T31 Payments panel
                                                         └─────▶ T32 Expense Edit/Shares/Delete/Discard [B4]
                              T26 not-found / error
                              T27 Drawer/Sheet/EmptyPanel ─────▶ T28 First visit & Theme menu
                                                                T29 Invite popover & sheet
                                                                T33 Empty, Loading, Hero, Phone search ──▶ T36 Landing [B7]
                                                                T35 Phone groups list [B2]
```

---

## Tasks

### Phase 1 — Schema & Server Actions

#### T22 · Create group with initial members (schema + server action)
- **Status:** **Blocked by B1** (and clarify **C10**: `LIMITS.title` 50 vs 100)
- **Size:** M · **Review**
- **Goal:** Atomically create a group and its initial member list in a single server action/SQL RPC, returning the new ledger ID and creator's user ID so the creator skips the first-visit prompt.
- **Boards:** [`05-create-group-light.html`](./html/05-create-group-light.html), [`06-create-group-phone-light.html`](./html/06-create-group-phone-light.html), [`13-create-group-dark.html`](./html/13-create-group-dark.html), [`14-create-group-phone-dark.html`](./html/14-create-group-phone-dark.html) (server & validation contract)
- **Files to touch:**
  - `supabase/migrations/<timestamp>_create_ledger_with_members.sql` (new)
  - `src/lib/validation.ts` (`parseLedgerInput`, `LIMITS.title` if adjusted)
  - `src/lib/validation.test.ts` (new or expanded unit tests)
  - `src/app/create-group/actions.ts` (`createLedger`)
- **Dependencies:** None (first task in Phase 1; confirm **B1**, **B6**)
- **Schema/Server changes:**
  - Create `public.create_ledger(p_title text, p_emoji text, p_base_currency text, p_members text[])` RPC returning `jsonb` (`ledger_id`, `creator_user_id`), `SECURITY DEFINER` with `SET search_path = public`, `REVOKE ALL FROM PUBLIC`, `GRANT EXECUTE TO service_role`. Insert the ledger row and ordered `public.users` rows (`is_placeholder = true`), returning the first row's `id` as `creator_user_id`.
  - Apply the migration to **dev Supabase only** (`pooogudusmmfuztxaqfg`), never production (`xjkvjfmdljdpynlumszz`).
  - Extend `parseLedgerInput` to validate non-empty `members: string[]`, apply `parseMemberName` (`1..50` chars per `LIMITS.memberName`), reject trimmed case-insensitive duplicates, and cap count reasonably (e.g. `LIMITS.splits` or explicit cap).
- **Done when:**
  - [ ] Migration applies cleanly on dev and `GRANT EXECUTE` is restricted to `service_role`.
  - [ ] `parseLedgerInput` unit tests in `src/lib/validation.test.ts` cover empty member lists, whitespace-only names, over-length names, and case-insensitive duplicates.
  - [ ] Calling `createLedger` returns `{ ok: true, data: { id, creatorUserId } }` cleanly without orphaned ledgers on invalid input.
  - [ ] Existing create-group tests/builds continue to pass; `npm test && npm run lint && npx tsc --noEmit && npm run build` pass.

#### T23 · Delete undo & payment creator support (schema + server actions)
- **Status:** **Blocked by B3** (Undo delete semantics) & **Pending C7** (`payments.created_by`)
- **Size:** M · **Review**
- **Goal:** Provide safe server-side undo for deleted expenses and payments, and optionally record `payments.created_by` if the owner chooses `"added by"` on payment details.
- **Boards:** [`35-payment-details-light.html`](./html/35-payment-details-light.html), [`38-payment-details-dark.html`](./html/38-payment-details-dark.html), [`43-toast-board-light.html`](./html/43-toast-board-light.html), [`49-toast-board-dark.html`](./html/49-toast-board-dark.html) (server & schema support)
- **Files to touch:**
  - `supabase/migrations/<timestamp>_soft_delete_and_payment_creator.sql` (new)
  - `src/app/ledger/[id]/actions.ts` (`deleteExpense`, `restoreExpense`, `deletePayment`, `restorePayment`, `savePayment`)
  - `src/app/ledger/[id]/page.tsx` (filter `deleted_at IS NULL` if soft-delete column is used)
  - `src/lib/types.ts`, `src/lib/validation.ts`, `src/lib/validation.test.ts`
- **Dependencies:** None (confirm **B3**, **C7**, **B6**)
- **Schema/Server changes:**
  - **If B3 picks Undo (soft delete approach recommended over re-insert to preserve cascading splits/FKs safely):** Add `deleted_at timestamptz null` to `public.expenses` and `public.payments` (plus scheduled cleanup or index); update `deleteExpense` / `deletePayment` to stamp `deleted_at = now()` scoped to `ledger_id`, and add `restoreExpense` / `restorePayment` clearing `deleted_at = null` scoped to `ledger_id` (plus re-verifying concurrent edits/splits stay intact).
  - **If C7 keeps `"added by {name}"` on PaymentDetails:** Add `created_by uuid null references public.users(id) on delete set null` to `public.payments`, pass `createdBy` in `savePayment`, and validate it belongs to `ledgerId`.
  - Apply migration to **dev Supabase only** (`pooogudusmmfuztxaqfg`).
- **Done when:**
  - [ ] Deleting and immediately restoring an expense restores the exact expense, original `created_at`, `created_by`, `split_mode`, and split weights/cents.
  - [ ] Deleting and restoring a payment preserves all fields; cross-ledger restore calls are rejected.
  - [ ] `ledger/[id]/page.tsx` hides soft-deleted rows while preserving totals parity.
  - [ ] Validation tests + `npm test && npm run lint && npx tsc --noEmit && npm run build` pass.

---

### Phase 2 — Shared UI Primitives & Error Boundaries

#### T24 · Inline confirmation strip primitive (`ConfirmStrip`)
- **Status:** **Ready now**
- **Size:** S
- **Goal:** Build the reusable inline orange confirmation strip used for Manage members remove (`22`/`28`), Expense/Payment delete confirm (`41`/`47`), and Discard confirm (`42`/`48`, if approved under B4).
- **Boards:** [`22-members-states-light.html`](./html/22-members-states-light.html), [`28-members-states-dark.html`](./html/28-members-states-dark.html), [`41-delete-confirm-light.html`](./html/41-delete-confirm-light.html), [`42-discard-light.html`](./html/42-discard-light.html), [`47-delete-confirm-dark.html`](./html/47-delete-confirm-dark.html), [`48-discard-dark.html`](./html/48-discard-dark.html)
- **Files to touch:**
  - `src/components/glow/ConfirmStrip.tsx` (new)
  - `src/components/glow/index.ts` (export `ConfirmStrip`, `type ConfirmStripProps`)
  - `src/app/dev/glow/page.tsx` (add showcase section)
- **Dependencies:** None
- **Schema/Server changes:** None
- **UI & A11y details:**
  - Container: `rounded-tile bg-negative-soft px-3.5 py-3 text-[length:var(--text-meta)] flex flex-col gap-2.5` (`role="group"` with `aria-label`).
  - Title: `font-bold text-negative`; Body: `text-text` (supports `ReactNode` for bold `<Money>` delta).
  - Actions: `flex gap-2`; Cancel button (`44px`, `rounded-pill bg-surface text-text font-bold flex-1`, `data-autofocus`) and Confirm button (`44px`, `rounded-pill bg-transparent text-negative font-bold flex-1`).
  - Pressing `Escape` inside the strip cancels without closing an outer modal/panel (`e.preventDefault()`, calls `onCancel`, returns focus cleanly).
- **Done when:**
  - [ ] `ConfirmStrip` rendered in `/dev/glow` matches light/dark strip tokens from `22`/`28`/`41`/`47` (both `#FFF1E6` + `#FFFFFF` cancel button in light, `#3A2418` + `#1C1C2E` cancel button in dark).
  - [ ] Touch targets are `>= 44px` and focus rings meet T19 contrast rules.
  - [ ] `npm test && npm run lint && npx tsc --noEmit && npm run build` pass.

#### T25 · Toast pill restyle and optional action (`Toast` & `ToastProvider`)
- **Status:** **Visual restyle Ready now** / **Undo wiring Blocked by B3**
- **Size:** S
- **Goal:** Restyle `Toast` to match Boards `43`/`49` (52px surface pill with menu shadow, dark border token, no checkmark on success, optional 36px tonal action button) and wire `"Undo"` to delete actions once **T23**/**B3** land.
- **Boards:** [`43-toast-board-light.html`](./html/43-toast-board-light.html) (`1280×920`), [`49-toast-board-dark.html`](./html/49-toast-board-dark.html) (`1280×920`)
- **Files to touch:**
  - `src/components/glow/Toast.tsx`
  - `src/components/glow/ToastProvider.tsx`
  - `src/components/glow/usePanel.ts` (`useDeletedToast`, Undo callback when **B3** approved)
  - `src/app/dev/glow/page.tsx` (update toast gallery sample)
- **Dependencies:** `T23` (only for wiring the Undo callback after delete)
- **Schema/Server changes:** None (handled in `T23`)
- **UI & A11y details:**
  - Success toast: `h-[52px] rounded-pill bg-surface text-text shadow-menu pl-5 pr-2.5 gap-3 font-semibold` with `style={{ border: "var(--menu-border)" }}`, no `CheckIcon`.
  - Optional action prop `action?: { label: string; onClick: () => void }` rendered as a `h-9 px-3.5 rounded-pill bg-surface-muted-2 text-text text-[length:var(--text-meta)] font-bold` button.
  - Position bottom-centre at `bottom-16` (`64px`, above shortcut footer on desktop) and above `PhoneActionBar` on phone; preserve T19's `<dialog>` portal behavior and visually hidden `role="status"` live region (making sure interactive `"Undo"` button remains keyboard-focusable when present).
- **Done when:**
  - [ ] Light (`1280×920`) and dark (`1280×920`) screenshots of the toast match Boards `43`/`49` (`bg-surface`, `52px` pill, `1px solid #33334D` border in dark mode via `--menu-border`, `36px` tonal `"Undo"` button).
  - [ ] Screen-reader announcement (`role="status"`) and focus/keyboard activation of optional action work inside open `<dialog>`s too.
  - [ ] `npm test && npm run lint && npx tsc --noEmit && npm run build` pass.

#### T26 · Group not-found and error boundaries (`not-found.tsx` & `error.tsx`)
- **Status:** **Ready now**
- **Size:** S
- **Goal:** Replace Next.js's default 404/error screens on `/ledger/[id]` (and root 404) with styled Glow status cards matching Boards `09`–`11` & `17`–`19`.
- **Boards:** [`09-not-found-light.html`](./html/09-not-found-light.html) (`1280×640`), [`10-not-found-phone-light.html`](./html/10-not-found-phone-light.html) (`390×844`), [`11-load-error-light.html`](./html/11-load-error-light.html) (`1280×640`), [`17-not-found-dark.html`](./html/17-not-found-dark.html), [`18-not-found-phone-dark.html`](./html/18-not-found-phone-dark.html), [`19-load-error-dark.html`](./html/19-load-error-dark.html)
- **Files to touch:**
  - `src/components/glow/StatusCardPage.tsx` (or `src/components/glow/GroupErrorCard.tsx`, shared wordmark header + left-aligned card shell)
  - `src/app/ledger/[id]/not-found.tsx` (new)
  - `src/app/not-found.tsx` (new)
  - `src/app/ledger/[id]/error.tsx` (new, `'use client'`)
- **Dependencies:** None
- **Schema/Server changes:** None
- **Next.js 16 requirements (`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/`):**
  - Read `not-found.md` and `error.md` before coding.
  - In `error.tsx`, wire `"Try again"` to `(unstable_retry ?? reset)()` so Server Component data re-fetches instead of only re-rendering client state.
  - Verify `not-found.tsx` copy matches boards literally (`"We can't find that group"`, `"The link may be incomplete, or the group may have been deleted. Ask whoever shared it to send the link again."`) and has **no icon badge**; `"Go to home"` links to `/`, `"Create a group"` links to `/create-group`.
- **Done when:**
  - [ ] Invalid ledger UUID (`notFound()`) and non-existent ledger UUID render `not-found.tsx` matching Boards `09`/`10`/`17`/`18` at `1280×640` and `390×844` in light and dark.
  - [ ] Simulated load failure renders `error.tsx` matching Boards `11`/`19` at `1280×640` (and responsive `390×844`) and `"Try again"` recovers when the server succeeds.
  - [ ] `npm test && npm run lint && npx tsc --noEmit && npm run build` pass.

---

### Phase 3 — Group Page Panels, Menus & States

#### T27 · Tablet drawer, phone sheet close button & empty panel polish (`RightPanel` & `PanelContent`)
- **Status:** **Ready now** (boards assume Round 1 **Q2(a)** edge-to-edge sheet; confirm **B5** only if owner overrides `Q1`/`Q2`)
- **Size:** S
- **Goal:** Align the tablet drawer geometry, drawer/sheet round tonal close button, and empty desktop panel state with Round 2 boards (`07`, `23`–`26`, `34`, `43`–`44`, `58`, `66`).
- **Boards:** [`58-tablet-light.html`](./html/58-tablet-light.html) (`820×1100`), [`66-tablet-dark.html`](./html/66-tablet-dark.html) (`820×1100`), [`44-details-phone-light.html`](./html/44-details-phone-light.html), [`50-details-phone-dark.html`](./html/50-details-phone-dark.html), [`07-which-one-light.html`](./html/07-which-one-light.html), [`43-toast-board-light.html`](./html/43-toast-board-light.html)
- **Files to touch:**
  - `src/components/glow/RightPanel.tsx` (`DrawerDialog` width & radius)
  - `src/components/glow/PanelContent.tsx` (`PanelHeader` close button & layout awareness, `EmptyPlaceholder`)
- **Dependencies:** None
- **Schema/Server changes:** None
- **UI details:**
  - In `RightPanel.tsx` (`DrawerDialog`), update `w-[440px] rounded-l-hero` to `w-[420px] rounded-l-sheet` (`28px` left corners).
  - In `PanelHeader`, when rendered inside `"drawer"` or `"sheet"` layout: style close button as `size-11 rounded-pill bg-surface-muted-2 text-text` (instead of transparent + `<Kbd>Esc</Kbd>`), and support optional `subtitle` (used by `T30` Manage members) and `badge` (used by `T31` Payment details) props.
  - In `EmptyPlaceholder`, centre content (`py-8 text-center`) and use `Button variant="soft" inPanel size={44} kbd="N"`.
- **Done when:**
  - [ ] Tablet (`820×1100`, light and dark) matches Boards `58`/`66`: 420px drawer, `28px` left radius, round tonal `×` button without `Esc`.
  - [ ] Desktop empty right panel (`1280×920`, light and dark) matches Boards `07`/`24`/`43` (centred copy + `44px` tonal `"Add expense [N]"`).
  - [ ] Phone details sheet (`390×844`, light and dark) header matches Board `44`/`50` (`44×44` round tonal close button).
  - [ ] `npm test && npm run lint && npx tsc --noEmit && npm run build` pass.

#### T28 · Viewing-as menu theme control & first-visit prompt (`ViewerSwitcher`, `ViewerChoices`, `BalanceHero`, `ShareOfSpendCard`, `LedgerTable`, `LedgerList`)
- **Status:** **Ready now** (flag **C8** `"Trip so far"` vs `"So far"` & **C12** phone list behind scrim; default keeps `"So far"` and blank pre-viewer list per `round-2/README.md`)
- **Size:** M · **Review**
- **Goal:** Replace the centred `WhichOneAreYou` desktop modal with auto-opening the header's viewing-as popover/sheet in first-visit mode, show pre-viewer group totals + blank impact/balance rows behind it, and restyle the Theme segmented control in `ViewerChoices.tsx`.
- **Boards:** [`07-which-one-light.html`](./html/07-which-one-light.html) (`1280×920`), [`08-which-one-phone-light.html`](./html/08-which-one-phone-light.html) (`390×844`), [`15-which-one-dark.html`](./html/15-which-one-dark.html), [`16-which-one-phone-dark.html`](./html/16-which-one-phone-dark.html), [`26-viewer-menu-theme-light.html`](./html/26-viewer-menu-theme-light.html) (`1280×920`), [`32-viewer-menu-theme-dark.html`](./html/32-viewer-menu-theme-dark.html)
- **Files to touch:**
  - `src/components/glow/ViewerSwitcher.tsx`
  - `src/components/glow/ViewerMenu.tsx`
  - `src/components/glow/ViewerSheet.tsx`
  - `src/components/glow/ViewerChoices.tsx`
  - `src/components/glow/ViewerPill.tsx`
  - `src/components/glow/WhichOneAreYou.tsx` (deprecate/remove modal dialog rendering from `GroupFrame.tsx`)
  - `src/components/glow/BalanceHero.tsx` & `src/lib/glow/hero.ts`
  - `src/components/glow/ShareOfSpendCard.tsx`
  - `src/components/glow/LedgerTable.tsx`, `src/components/glow/LedgerList.tsx`, `src/components/glow/useLedgerView.ts`
  - `src/app/ledger/[id]/GroupFrame.tsx`
- **Dependencies:** `T27` (sheet close button styling)
- **Schema/Server changes:** None
- **UI & calculation details:**
  - `ViewerPill`: omit `"Viewing as"` micro-label when `viewer === null` (`? Choose person`).
  - `ViewerSwitcher` / `ViewerMenu` / `ViewerSheet`: support `promptMode` (`showPrompt`) auto-opening header menu on desktop (`340px`, top-right anchored) and `ViewerSheet` on phone with heading `"Which one are you?"`, subtitle `"Pick yourself so balances are shown from your side. You can change this any time."`, member nets, divider, and footer `"Bookmark this page. The link is the only way back to the group."` (hide Manage members + Theme in prompt mode).
  - `ViewerChoices`: restyle `"Theme"` label (`text-[length:var(--text-meta)] font-semibold text-text`, sentence case) and segmented track (`bg-surface-muted-2 rounded-chip p-1`, buttons `h-10 rounded-input`) while retaining `role="menuitemradio"` / `aria-checked`.
  - Pre-viewer group state (`!viewerId`): `BalanceHero` shows `"Group spent"`, total group expense spend (sum of `expense.amount_cents`), and `"Pick who you are to see your balance"`. `ShareOfSpendCard` shows `"Group spent {total}"` + empty 12px bar (`0%`). `LedgerTable` & `LedgerList` render all rows with neutral third-person payment titles (`"{payer} paid {payee}"`) and blank `Your impact` / `Balance` cells (do not hide rows under `<LedgerEmpty>`).
- **Done when:**
  - [ ] First visit at `1280×920` & `390×844` (light and dark) opens the popover/sheet without any centred modal, matching Boards `07`/`08`/`15`/`16` numbers (`Group spent CA$492.52`, blank Impact/Balance columns).
  - [ ] Viewing-as menu theme row matches Boards `26`/`32` at `1280×920` (light and dark) and passes Arrow/Home/End/`menuitemradio` keyboard navigation checks.
  - [ ] `npm test && npm run lint && npx tsc --noEmit && npm run build` pass.

#### T29 · Invite popover and phone sheet (`InvitePopover`)
- **Status:** **Ready now**
- **Size:** S
- **Goal:** Redesign the Invite flow to show the `"Group link"` field, `"Copy link"` → `"Link copied"` tonal button swap, and persistent `"Don't lose this link"` warning strip, using a `340px` popover on desktop and a modal bottom sheet `<dialog>` on phone.
- **Boards:** [`24-invite-light.html`](./html/24-invite-light.html) (`1280×920`), [`25-invite-phone-light.html`](./html/25-invite-phone-light.html) (`390×844`), [`30-invite-dark.html`](./html/30-invite-dark.html), [`31-invite-phone-dark.html`](./html/31-invite-phone-dark.html)
- **Files to touch:**
  - `src/components/glow/InvitePopover.tsx`
- **Dependencies:** None
- **Schema/Server changes:** None
- **UI details:**
  - Heading `"Invite people"`, subtitle `"Anyone with the link can view the group and add expenses."`.
  - `"Group link"` (`13px font-semibold`), `44px` `bg-surface-sunken rounded-input` mono URL box (`${location.origin}/ledger/${ledgerId}` truncated with `text-ellipsis`).
  - `48px` full-width button: primary `"Copy link"` initially, switching to tonal (`variant="soft" inPanel`) `"Link copied"` after successful copy (keep `role="status"` failure/screen-reader message).
  - Bottom `bg-negative-soft rounded-tile` warning box: `"Don't lose this link"` + `"There are no accounts, so it's the only way back to the group. Bookmark this page."`.
  - Below `640px`: render inside a native modal `<dialog>` bottom sheet (`rounded-t-sheet`, grabber, `"Invite people"` + `44×44` round tonal close button) with Escape + backdrop click + focus return to `"Invite"`.
- **Done when:**
  - [ ] Desktop popover (`1280×920`) and phone bottom sheet (`390×844`) match Boards `24`, `25`, `30`, `31` in light and dark, including both before-copy (`"Copy link"`) and after-copy (`"Link copied"`) states.
  - [ ] Focus moves into sheet/popover on open and returns to `"Invite"` trigger on close.
  - [ ] `npm test && npm run lint && npx tsc --noEmit && npm run build` pass.

#### T30 · Manage members in right panel and phone sheet (`ManageMembersPanel`)
- **Status:** **Ready now**
- **Size:** M · **Review**
- **Goal:** Move member management out of `UserManagementModal.tsx` into the right panel (`?panel=members`, 400px basis on desktop, drawer on tablet, full-height sheet on phone) matching Boards `21`–`23` & `27`–`29`.
- **Boards:** [`21-members-light.html`](./html/21-members-light.html) (`1280×920`), [`22-members-states-light.html`](./html/22-members-states-light.html) (`440×860`), [`23-members-phone-light.html`](./html/23-members-phone-light.html) (`390×844`), [`27-members-dark.html`](./html/27-members-dark.html), [`28-members-states-dark.html`](./html/28-members-states-dark.html), [`29-members-phone-dark.html`](./html/29-members-phone-dark.html)
- **Files to touch:**
  - `src/components/glow/ManageMembersPanel.tsx` (new, replacing `UserManagementModal.tsx`)
  - `src/app/ledger/[id]/UserManagementModal.tsx` (delete or keep stub unused; remove import)
  - `src/lib/glow/panel.ts` (add `{ kind: "members" }`, `?panel=members` URL parsing/formatting, `panelIsDirty`) & `src/lib/glow/panel.test.ts`
  - `src/components/glow/usePanel.ts` (`openMembers`)
  - `src/components/glow/PanelContent.tsx` (`usePanelTitle` + subtitle `"{n} people in this group"` + `PanelBody` route)
  - `src/app/globals.css` (add `[data-panel-kind="members"]` to `[data-slot="panel"]:has(...)` 400px rule)
  - `src/app/ledger/[id]/GroupFrame.tsx` (wire `onManageMembers` → `openMembers()`, drop `modal === "members"` state)
- **Dependencies:** `T24` (`ConfirmStrip`), `T27` (header subtitle & sheet/drawer close button)
- **Schema/Server changes:** None (reuses `addMember`, `renameMember`, `removeMember`, `restoreMember` in `src/app/ledger/[id]/actions.ts`)
- **UI & A11y details:**
  - Flat `min-h-12 border-t border-line` active rows (`Avatar` size 32 / 36 on phone, `"You"` pill on viewer, `"Rename"` `text-positive`, `"Remove"` `text-negative`).
  - Inline rename (`22`/`28`): `40px` sunken input (`outline-2 outline-accent`), `44px` tonal `"Save"`, `44px` muted `"Cancel"`; `Escape` cancels rename and restores focus to row's `"Rename"` button without closing panel.
  - Inline remove (`22`/`28`): member avatar + name stay above `<ConfirmStrip>` (`"Remove {name} from the group?"`, explanation, `"Cancel"` / `"Remove {name}"`); `Escape` cancels strip and restores focus to row's `"Remove"` button. Note: handle attempting to remove the last remaining active member cleanly (block or warn).
  - `"Removed"` section (`12px uppercase tracking-[0.06em]`): full-opacity avatar + muted name + `"Still on past expenses"` + `"Restore"` (`text-positive`).
  - Inline bottom add form: `48px` `"Add a name"` input + `48px` primary `"Add member"` + caption `"New members can be put on expenses straight away."`.
- **Done when:**
  - [ ] Desktop (`1280×920`), narrow panel (`440×860`), and phone sheet (`390×844`) match Boards `21`–`23` & `27`–`29` in light and dark, including active, rename, remove-confirm, removed/restore, and add states.
  - [ ] `?panel=members` survives refresh; Escape backs out of inline rename/remove before closing panel and returns focus cleanly.
  - [ ] `npm test && npm run lint && npx tsc --noEmit && npm run build` pass.

#### T31 · Payments: composer impact strip, pills, and payment details (`PaymentComposer` & `PaymentDetails`)
- **Status:** **Ready now** (with **C7** open on `"added by"` column in `PaymentDetails`; display omitted or derived until **T23/C7** decides)
- **Size:** M
- **Goal:** Bring `PaymentComposer` and `PaymentDetails` up to Boards `33`–`38` (compact gradient card, custom pill pickers, live viewer balance impact strip, header `"{payer} paid {payee} [Payment]"` title, `"in/out"` strip, recessed Summary + Pairwise remaining balance card, and `ConfirmStrip` delete).
- **Boards:** [`33-add-payment-light.html`](./html/33-add-payment-light.html) (`1280×920`), [`34-add-payment-phone-light.html`](./html/34-add-payment-phone-light.html) (`390×844`), [`35-payment-details-light.html`](./html/35-payment-details-light.html) (`440×560`), [`36-add-payment-dark.html`](./html/36-add-payment-dark.html), [`37-add-payment-phone-dark.html`](./html/37-add-payment-phone-dark.html), [`38-payment-details-dark.html`](./html/38-payment-details-dark.html)
- **Files to touch:**
  - `src/components/glow/PaymentComposer.tsx`
  - `src/components/glow/PaymentDetails.tsx`
  - `src/components/glow/PanelContent.tsx` (`usePanelTitle` → `"{payer} paid {payee}"` + inline `Payment` tag in `PanelHeader`)
  - `src/components/glow/StatusStrip.tsx` (add `"neutral"` tone if third-party payment renders a neutral strip, or reuse `bg-surface-sunken`)
  - `src/lib/glow/payment.ts` + `src/lib/glow/payment.test.ts` (live viewer balance impact helper & pairwise remaining balance helper)
  - `src/components/glow/ExpenseComposer.tsx` (share `PillPopover` helper cleanly rather than duplicating it)
- **Dependencies:** `T24` (`ConfirmStrip` for payment delete)
- **Schema/Server changes:** None (reads `payments.created_by` if added by `T23`)
- **UI & calculation details:**
  - `PaymentComposer`: `--gradient-glow-compact` (`rounded-card p-4`), fixed currency pill, inline `"From [●] to [●] on [Today ▾]"` using shared `PillPopover` (replacing native `<select>`/`<input type="date">`), borderless `40px` sunken note input with `n/50` counter, live `<StatusStrip>` showing viewer impact (positive when viewer pays someone, warning when viewer is paid, neutral when third parties pay), and `48px` tonal `"Cancel"` + primary `"Save payment [⌘↵]"`.
  - `PaymentDetails`: header `"{payer} paid {payee}"` with `Payment` tag (`bg-positive-tag-bg text-positive-tag-fg`), `"CA$3.75"` (`44px`), `"Sep 17 ..."` meta, `18px/800` `"CA$3.75 in"` / `"CA$X out"` impact strip, `{payer} paid {payee}` pills (`36px bg-surface-muted-2`), recessed `bg-surface-sunken rounded-chip p-4` card showing `Note` row (when present) and pairwise remaining balance from `forViewer.pairs` (`"Matthew still owes you CA$25.04"` / `"You still owe X"` / `"Settled up with X"`), plus `ConfirmStrip` for delete.
- **Done when:**
  - [ ] Light and dark screenshots of Add payment (`1280×920`, `390×844`) and Payment details (`440×560`) match Boards `33`–`38` (including live impact strip `"You pay Stephen · You'll be owed CA$16.38 more"` and pairwise card `"Matthew still owes you CA$25.04"`).
  - [ ] No native `<select>` dropdowns remain in `PaymentComposer`; shared popover picker handles Arrow/Escape keys.
  - [ ] Unit tests in `payment.test.ts` + `npm test && npm run lint && npx tsc --noEmit && npm run build` pass.

#### T32 · Expense composer: Shares restyle, Edit disabled-until-dirty, Delete & Discard strips (`SplitBodies`, `ExpenseComposer`, `ExpenseDetails`, `RightPanel`)
- **Status:** **Shares / Edit disabled-state / Delete strip Ready now** · **Discard strip Blocked by B4** · **Pending C9** (legacy `split_mode: null` reopen mode)
- **Size:** M · **Review**
- **Goal:** Update `SharesBody` layout/stepper/remainder footnote, disable Edit submit with `"No changes yet"` until dirty, migrate Delete confirmation to `ConfirmStrip` with balance-delta warning copy, and wire inline Discard `ConfirmStrip` once **B4** decides.
- **Boards:** [`39-edit-expense-light.html`](./html/39-edit-expense-light.html) (`440×900`), [`40-shares-light.html`](./html/40-shares-light.html) (`440×920`), [`41-delete-confirm-light.html`](./html/41-delete-confirm-light.html) (`440×780`), [`42-discard-light.html`](./html/42-discard-light.html) (`440×960`), [`45`–`48` dark twins](./html/45-edit-expense-dark.html)
- **Files to touch:**
  - `src/components/glow/SplitBodies.tsx` (`SharesBody`)
  - `src/lib/glow/composerSplit.ts` & `src/lib/glow/composerSplit.test.ts` (shares summary counts, per-share remainder note helper; legacy reopen if **C9** changes)
  - `src/components/glow/ExpenseComposer.tsx` (`"No changes yet"` disabled submit when clean; delete via `ConfirmStrip`; inline discard slot if **B4**)
  - `src/components/glow/ExpenseDetails.tsx` (use `ConfirmStrip` with viewer balance-change copy `"It'll be removed for everyone, and you'll be owed {amount} less."`)
  - `src/components/glow/RightPanel.tsx` & `src/components/glow/panelStore.ts` (inline discard strip trigger if **B4** picks inline strip)
- **Dependencies:** `T24` (`ConfirmStrip`)
- **Schema/Server changes:** None
- **UI & calculation details:**
  - `SharesBody` (`40`/`46`): top row `"{totalShares} shares between {includedCount} people"` + `"One share each"` (`variant="text" tone="positive"`); grid columns `grid-cols-[32px_minmax(0,1fr)_auto_76px]` (`[Avatar] [Name] [Stepper −/n/+] [Amount]`); `44×44` round tonal buttons (`bg-surface-muted-2 rounded-pill`) with minus/plus SVGs; `0`-share rows show muted name and `"not included"`; remainder footnote below list when `totalCents % totalShares !== 0` (exact formula from `splitByWeight`: per-share unrounded string + first recipient receiving extra cent).
  - Edit mode (`39`/`45`): `"No changes yet"` disabled button (`aria-disabled="true"`) when `!dirty`; enables `"Save changes [⌘↵]"` once modified. Status strip displays live change impact (`"This doesn't change your balance"` when clean).
  - Delete confirm (`41`/`47`): `ConfirmStrip` with `"Delete this expense?"`, dynamic viewer balance delta (`"you'll be owed X less"` / `"you'll owe X less"` / `"It'll be removed for everyone."`), `"Cancel"` / `"Delete expense"`. Copy adjusts for `B3` (**C1**) on `"This can't be undone"`.
  - Discard (`42`/`48`, gated by **B4**): inline `ConfirmStrip` (`"Discard changes?"`, field-aware or clear unsaved copy, `"Keep editing"` / `"Discard"`) replacing `DiscardDialog`.
- **Done when:**
  - [ ] Boards `39`–`42` & `45`–`48` matched at `440px` width in light and dark: Shares `"64.50"` ÷ 4 → `32.25 / 16.13 / 16.12` + `"not included"` + remainder note; clean Edit shows `"No changes yet"`; Delete confirm strip shows exact balance delta.
  - [ ] Unit tests for share remainder text + `npm test && npm run lint && npx tsc --noEmit && npm run build` pass.

#### T33 · Empty, settled, loading, and phone search states (`BalanceHero`, `SettleUpPlan`, `LedgerEmpty`, `loading.tsx`, `ActivityToolbar`, `SearchField`)
- **Status:** **Empty, Settled Plan & Loading Ready now** · **Pending C4, C5, C6** (Hero `0.00` + zero chips + Phone search/filter)
- **Size:** M
- **Goal:** Restyle `LedgerEmpty`, `SettleUpPlan` settled state, and `loading.tsx` neutral skeletons; implement hero zero/settled adjustments and phone search + horizontal filter strip pending **C4/C5/C6** owner confirmation.
- **Boards:** [`51`–`57` light](./html/51-hero-states-light.html) (`900×760`, `1280×760`, `390×844`, `1280×920`), [`59`–`65` dark](./html/59-hero-states-dark.html)
- **Files to touch:**
  - `src/app/ledger/[id]/loading.tsx`
  - `src/components/glow/LedgerEmpty.tsx`
  - `src/components/glow/LedgerTable.tsx` & `src/components/glow/LedgerList.tsx` (`44px` tonal action buttons)
  - `src/components/glow/SettleUpPlan.tsx` (`planSubtitle`, hide switch when empty, centred single-line body)
  - `src/components/glow/SearchField.tsx` (`44×44` `"Clear search"` `×` button when `value` non-empty)
  - `src/components/glow/ActivityToolbar.tsx` & `src/app/ledger/[id]/GroupFrame.tsx` (phone horizontal chips + `"k of n match"` count + phone hero collapse if **C6** confirmed)
  - `src/lib/glow/hero.ts` + `src/lib/glow/ledger.ts` (if **C4**/`C5` overrides **D11**/`docs/03`)
- **Dependencies:** None (read `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/loading.md` first)
- **Schema/Server changes:** None
- **UI details:**
  - `loading.tsx` (`55`, `56`, `63`, `64`): `--surface-muted-2` bones inside **neutral `bg-surface rounded-hero`** hero card (no gradient), desktop 2-column top row + toolbar + 6-row table skeleton + right panel skeleton + shortcut footer; phone `5` chip bones (`h-[88px]`) + `4` list row bones (`h-16`) + bottom action bar. *(Document in PR if header title bone stays generic because `[id]/loading.tsx` streams before `page.tsx` fetches title/emoji.)*
  - `LedgerEmpty` (`52`–`54`, `60`–`62`): `py-8 px-4 gap-3`, `14px/700` title + muted subtitle (`gap-0.5`), `44px` tonal button (`variant="soft" inPanel size={44}`, no `N` kbd on phone).
  - `SettleUpPlan` (`51`, `59`): when `entries.length === 0`, subtitle `"Nothing to settle"`, hide `"Simplify debts"` switch, single centred line `"Nobody owes anybody. Add an expense and the plan updates."` (`py-8 text-center text-text-muted`, remove check icon & extra heading).
  - `SearchField` (`57`, `65`): show `44×44` `"Clear search"` `×` button when `value !== ""` (replacing `/` badge).
- **Done when:**
  - [ ] Light and dark screenshots verify settled plan (`900×760`), empty group (`1280×760` & `390×844`), no results (`1280×760`), loading (`1280×920` & `390×844`), and (if C6 approved) phone search (`390×844`).
  - [ ] All interactive targets on phone search (`×` clear, horizontal chips) are `>= 44px` and keyboard-accessible.
  - [ ] `npm test && npm run lint && npx tsc --noEmit && npm run build` pass.

---

### Phase 4 — New Pages (Create Group UI, Phone Groups List, Landing Page)

#### T34 · Create group page redesign (`src/app/create-group/page.tsx`)
- **Status:** **Blocked by B1** (and clarify **C10** title max 50 vs 100, **C11** phone `"What happens next"` card)
- **Size:** M · **Review**
- **Goal:** Rebuild `/create-group` to match Boards `05`, `06`, `13`, `14`, letting the creator name the group, pick emoji & currency, add/remove initial members (with row 0 tagged `"You"`), store themselves as viewer, and navigate straight to the new group.
- **Boards:** [`05-create-group-light.html`](./html/05-create-group-light.html) (`1280×820`), [`06-create-group-phone-light.html`](./html/06-create-group-phone-light.html) (`390×900`), [`13-create-group-dark.html`](./html/13-create-group-dark.html), [`14-create-group-phone-dark.html`](./html/14-create-group-phone-dark.html)
- **Files to touch:**
  - `src/app/create-group/page.tsx`
  - `src/lib/currencies.ts` (sentence-case currency names or display helper if matching `"Canadian dollar"`)
  - `src/lib/glow/viewer.ts` (reuse `writeStoredViewer`)
- **Dependencies:** `T22` (atomic `createLedger` returning `{ id, creatorUserId }`)
- **Schema/Server changes:** None (handled in `T22`)
- **UI details:**
  - Header: Potluck wordmark (`href="/"`) + `"Back to home"` secondary pill on desktop (`44×44` back chevron on phone `06`/`14`).
  - Desktop (`max-w-[1040px]`): main `rounded-hero bg-surface` card (`flex: 2 1 480px`) + `"What happens next"` aside (`flex: 1 1 300px`, numbered `1`–`3` in `text-positive`).
  - `--gradient-glow` card (`--gradient-glow-compact` on phone): `64×64` emoji trigger (`emoji-picker-react` themed for light/dark as in T20) + `32px/800` title input with `n/50` counter.
  - Currency row: `"Track balances in"` + `44px` `bg-surface-muted-2` pill selector (`[CAD ▾]`) + currency label (`"Canadian dollar"`).
  - `"Who's in it"`: `4 people` counter, `Avatar` (`slots 1..6`), row 0 tagged `"You"`, `"Remove"` (`text-negative`), `44px` sunken `"Add a name"` input + `44px` tonal `"Add"` button (`Enter` adds member; block duplicate/empty names inline).
  - Actions: `48px` tonal `"Cancel"` + primary `"Create group [⌘↵]"` on desktop; full-width pinned `52px` `"Create group"` footer on phone. On success, call `writeStoredViewer(res.data.id, res.data.creatorUserId)` and `router.push(\`/ledger/\${res.data.id}\`)`.
- **Done when:**
  - [ ] Desktop (`1280×820`) and phone (`390×900`) match Boards `05`, `06`, `13`, `14` in light and dark, including emoji picker contrast in both themes.
  - [ ] Creating a group with multiple members lands on `/ledger/[id]` already viewing as the creator (no first-visit prompt), then clean up any throwaway test group from dev DB.
  - [ ] `npm test && npm run lint && npx tsc --noEmit && npm run build` pass.

#### T35 · Phone groups list & header back button (`src/app/groups/page.tsx`, `GroupHeader.tsx`, `viewer.ts`)
- **Status:** **Blocked by B2** (reverses Round 1 **D19** / **C3**)
- **Size:** M · **Review**
- **Goal:** Record visited groups on this device in `localStorage`, render the phone `"Your groups"` page with member counts, viewer name, and live viewer net, and restore the `"Back to groups"` button in `GroupHeader.tsx`.
- **Boards:** [`12-groups-phone-light.html`](./html/12-groups-phone-light.html) (`390×844`), [`20-groups-phone-dark.html`](./html/20-groups-phone-dark.html) (`390×844`), plus phone headers in `08`, `23`, `25`, `34`, `44`, `53`, `56`, `57`
- **Files to touch:**
  - `src/app/groups/page.tsx` (new)
  - `src/app/groups/actions.ts` (new server loader computing `{ id, title, emoji, memberCount, viewerNet }` for known `[ledgerId, viewerId]` pairs)
  - `src/lib/glow/viewer.ts` & `src/lib/glow/viewer.test.ts` (read/write `potluck:groups` localStorage index cleanly, pruning deleted/404 ledgers)
  - `src/components/glow/ViewerProvider.tsx` or `GroupFrame.tsx` (register group visit in `localStorage`)
  - `src/components/glow/GroupHeader.tsx` (restore `44×44` `<Link href="/groups" aria-label="Back to groups">` chevron on `max-sm:inline-flex`, hidden if **B2** keeps desktop without link)
- **Dependencies:** None
- **Schema/Server changes:** None (new server loader reads existing `ledgers`, `users`, `expenses`, `splits`, `payments` tables via `src/lib/server/supabase.ts` and `src/lib/balances.ts` — verify security so only passed `ledgerId`s are queried with UUID validation)
- **UI details:**
  - Phone (`390×844`): Potluck wordmark header, `"Your groups"` (`20px/800`) + `"Groups you've opened on this device"` (`13px text-text-muted`), `rounded-card bg-surface` list rows (`36px` emoji pill `bg-surface-muted-2`, group title + `"{n} people · viewing as {name}"`, right-aligned signed net `"+CA$51.91 / you're owed"` in `text-positive`, `"−CA$X / you owe"` in `text-negative`, or `"settled up"` in `text-text-muted`), footer note `"This list lives in this browser only. To open a group somewhere else, use its link."`, and bottom `52px` `"Create a group"` primary link. Include empty state if no groups visited yet.
- **Done when:**
  - [ ] Visiting two groups on dev populates `/groups` accurately matching Boards `12`/`20` (`390×844` light & dark), showing live computed nets from the server loader.
  - [ ] Phone header `"Back to groups"` chevron navigates to `/groups` with `44×44` target.
  - [ ] `npm test && npm run lint && npx tsc --noEmit && npm run build` pass.

#### T36 · Landing page and screenshot capture (`src/app/page.tsx`, `public/screenshots/`)
- **Status:** **Layout Ready now** / **Real screenshots Blocked by B7** (and best run after `T27`–`T33` so screenshots reflect Round 2 UI; clarify **C14** links + RLS copy)
- **Size:** L · **Review**
- **Goal:** Replace the temporary hero in `src/app/page.tsx` with the complete Glow landing page (`01`–`04`) and generate/wire theme-aware product screenshots from the seeded Veld 2026 group.
- **Boards:** [`01-landing-desktop-light.html`](./html/01-landing-desktop-light.html) (`1440×3682`), [`02-landing-phone-light.html`](./html/02-landing-phone-light.html) (`390×5630`), [`03-landing-desktop-dark.html`](./html/03-landing-desktop-dark.html), [`04-landing-phone-dark.html`](./html/04-landing-phone-dark.html)
- **Files to touch:**
  - `src/app/page.tsx`
  - `src/components/glow/LandingScreenshots.tsx` (or small client/theme-aware image helper rendering light/dark screenshots via CSS `[data-theme]` rules + `<picture>`/`prefers-color-scheme`, avoiding hydration flash)
  - `public/screenshots/*.png` (or `.webp` — 12 files: `laptop`, `phone`, `hero`, `composer`, `plan`, `viewer` × `light`/`dark`)
- **Dependencies:** `T27`–`T33` (for final in-app screenshot fidelity), confirm **B7** & **C14**
- **Schema/Server changes:** None
- **UI details:**
  - Exact single fluid container (`max-w-[1200px]`, `px-6 pb-12 gap-24` desktop; `px-4 pb-8 gap-14` phone) across `#top`, `#features`, `#how`, `#why`, `#github`, `#create`, footer.
  - Reuse `Avatar` (slot 1 `"J"`, `"Jacky · Creator · CS student at UBC."`), `<Kbd>` inside `"Keyboard shortcuts"` mini-card, `--gradient-glow` / `--gradient-glow-compact` on `#create` banner.
  - Phone bezel around `phone-<theme>.png` uses `#14142B` (`bg-text` in light) / `#33334D` (`border-line-strong` token equivalent) — confirm token usage avoids raw hex in dark mode (`#33334D` equals `--line-strong` / `--bar-track` in dark `tokens.css`!).
  - Check all `"Create a group"` CTA targets (`#create` vs `/create-group` per **C14**) and optimize screenshot file sizes (`<img>` / `next/image` with explicit dimensions, `priority` only on above-the-fold laptop/phone hero images).
- **Done when:**
  - [ ] Desktop (`1440` wide) and phone (`390` wide) match Boards `01`–`04` in light and dark, with crisp theme-aware screenshots of Veld 2026 (no grey placeholders, no broken images on theme toggle).
  - [ ] Zero console/hydration errors; all nav links, `/create-group`, and GitHub links work; page weight is lean.
  - [ ] `npm test && npm run lint && npx tsc --noEmit && npm run build` pass.
