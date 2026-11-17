# Potluck Glow Round 2 — Codebase & Board Audit

Audited against branch `glow` (commit `8eef590`) and the 66 Round 2 design boards in [`round-2/`](./README.md) on `2026-11-16`.

This audit is **read-only planning documentation**. It verifies `"code_today"` in [`screens/manifest.json`](./screens/manifest.json) against the actual `glow` codebase, maps every board onto existing [`src/components/glow/`](../../../src/components/glow/index.ts) primitives and [`src/app/tokens.css`](../../../src/app/tokens.css) utilities, and surfaces every contradiction (`C1`–`C14`) between Round 2 boards, the existing codebase, and Round 1 decisions (`D1`–`D22`).

---

## 1. Executive Summary & Existing Primitives

Round 2 covers **66 boards** (33 light + 33 dark twins) across 5 feature areas:

1. **Home / Landing Page (`01`–`04`)** — New public landing page replacing the Round 1 placeholder in `src/app/page.tsx`.
2. **Getting Started & Errors (`05`–`20`)** — Create group with initial members, first-visit `"Which one are you?"` prompt inside the header menu/sheet + pre-viewer ledger state, custom `not-found` and `error` boundaries, and phone groups list.
3. **Members, Invite & Theme (`21`–`32`)** — Moving Manage members out of a centred modal into the right panel / phone sheet with inline rename/remove/restore/add, redesigned Invite popover & phone sheet, and restyled Theme control.
4. **Payments & Expense States (`33`–`50`)** — Payment composer & details panels, Edit expense `"No changes yet"` disabled state, Shares split layout & remainder note, inline Delete & Discard strips, pill Undo toast, and phone sheet header polish.
5. **States, Search & Responsive Sizes (`51`–`66`)** — Balance hero states (owes, settled, zero chips), settled settle-up plan, empty/no-results states, neutral loading skeletons, phone search & filter strip, and 820px tablet drawer.

### Existing `src/components/glow/` Primitives & Tokens to Reuse
- **Core primitives:** `Avatar` (`variant="you" | "member"`, 6 palette slots in `--member-1..6-*`), `Button` (`variant="primary" | "secondary" | "soft" | "text" | "icon"`, `size={44 | 48 | 52}`, `inPanel`, `tone`, `kbd`, `disabled` via `aria-disabled`), `Kbd`, `Money` (`signed`, `tone`), `StatusStrip` (`tone="positive" | "warning"`, `message`, `detail`), `SegmentedControl` (`variant="pill" | "split"`), `Switch`.
- **Overlays & chrome:** `Toast` + `ToastProvider`, `GroupHeader`, `GroupTabs`, `InvitePopover`, `ViewerSwitcher` / `ViewerMenu` / `ViewerSheet` / `ViewerChoices` / `ViewerPill` / `WhichOneAreYou`, `RightPanel` (`PanelShell` / `DrawerDialog` / `SheetDialog`) + `PanelHeader` / `PanelBody`, `PhoneActionBar`, `ShortcutFooter`.
- **Feature modules:** `BalanceHero`, `PersonChips`, `ShareOfSpendCard`, `ActivityToolbar`, `SearchField`, `FilterChips`, `FilteredHero`, `LedgerTable`, `LedgerList`, `LedgerEmpty`, `SettleUpPlan`, `EveryoneBreakdown`, `ExpenseComposer`, `SplitBodies`, `ExpenseDetails`, `PaymentPanel`, `PaymentComposer`, `PaymentDetails`.
- **Tokens (`src/app/tokens.css` & `src/app/globals.css`):** Semantic color, radius (`hero=24px`, `card=20px`, `chip=16px`, `tile=14px`, `input=12px`, `sheet=28px`, `pill=999px`), shadow, and gradient utilities (`--gradient-glow`, `--gradient-glow-compact`, `bg-surface`, `bg-surface-sunken`, `bg-surface-muted`, `bg-surface-muted-2`, `bg-negative-soft`, `bg-positive-soft`, `border-line`, `border-line-strong`). Note `--menu-border` (`none` in light, `1px solid #33334D` in dark) and `--accent` in dark mode (`#6A55F5` per Round 1 T19 accessibility fix, vs `#B3A6FF` on `28-members-states-dark` focus outline).

---

## 2. Corrected `"Code today"` Mappings (`manifest.json` Audit)

The table below lists every discrepancy where `manifest.json`'s `"code_today"` omitted affected files, misidentified which component owns the UI, or missed required server/calculation changes.

| Boards | Area | `manifest.json` `"code_today"` | Corrected Codebase Mapping on `glow` |
|---|---|---|---|
| `01`–`04` | Landing page | `src/app/page.tsx (old hero, recoloured in T20)` | `src/app/page.tsx` (currently a 52-line `"v0.1.0 Alpha"` card) + **new `public/screenshots/`** (12 static PNGs: `laptop`, `phone`, `hero`, `composer`, `plan`, `viewer` in light/dark) |
| `05`, `06`, `13`, `14` | Create group | `src/app/create-group/page.tsx + actions.ts (name, emoji, currency only)` | Also touches `src/lib/validation.ts` (`parseLedgerInput`, `LIMITS.title`), `src/lib/currencies.ts` (`CAD.name` casing), `src/lib/glow/viewer.ts` (`writeStoredViewer`), and **new SQL migration** (atomic `create_ledger` RPC in `supabase/migrations/`) |
| `07`, `08`, `15`, `16` | First visit `"Which one are you?"` | `WhichOneAreYou.tsx` and `ViewerSheet.tsx` | Touches **8 files**: `WhichOneAreYou.tsx` (replaced/folded into `ViewerSwitcher.tsx`), `GroupFrame.tsx`, `ViewerPill.tsx`, `ViewerMenu.tsx`, `ViewerSheet.tsx`, `ViewerChoices.tsx`, `BalanceHero.tsx` + `src/lib/glow/hero.ts`, `ShareOfSpendCard.tsx`, `LedgerTable.tsx` + `LedgerList.tsx` + `useLedgerView.ts`, `PanelContent.tsx` (`EmptyPlaceholder`) |
| `09`–`11`, `17`–`19` | Not found & load error | `none: Next default 404` / `none: no error.tsx` | Verified accurate (`src/app/ledger/[id]/not-found.tsx`, `src/app/not-found.tsx`, `src/app/ledger/[id]/error.tsx` do not exist). Shared `StatusCard` helper recommended |
| `12`, `20` | Groups list (phone) | `none (phone back button was dropped, D19)` | **Blocked by B2.** If built: new `src/app/groups/page.tsx` + server batch loader (`src/app/groups/actions.ts`), `src/lib/glow/viewer.ts` (`potluck:groups` localStorage index), and `src/components/glow/GroupHeader.tsx` (phone back button) |
| `21`–`23`, `27`–`29` | Manage members | `src/app/ledger/[id]/UserManagementModal.tsx (centred modal)` | Touches **7 files**: replaces `UserManagementModal.tsx` with `src/components/glow/ManageMembersPanel.tsx`, adds `"members"` to `src/lib/glow/panel.ts`, `src/components/glow/usePanel.ts`, `PanelContent.tsx`, `RightPanel.tsx`, `src/app/globals.css` (`[data-slot="panel"]:has(...)`), and removes modal state from `GroupFrame.tsx` |
| `24`, `25`, `30`, `31` | Invite | `src/components/glow/InvitePopover.tsx` | Verified (`InvitePopover.tsx`); needs both desktop popover redesign and a native `<dialog>` bottom sheet on phone (`< 640px`), plus `GroupHeader.tsx` already mounts it |
| `26`, `32` | Viewer menu + theme | `ViewerMenu.tsx / ViewerSheet.tsx theme row` | **Correction:** theme switcher markup lives in **`src/components/glow/ViewerChoices.tsx`** (lines 165–195), shared by both `ViewerMenu` and `ViewerSheet` |
| `33`–`38` | Payments | `PaymentComposer.tsx` and `PaymentDetails.tsx` | Also touches `src/components/glow/PanelContent.tsx` (`usePanelTitle` + header `Payment` tag slot), `src/lib/glow/payment.ts` (live viewer impact & pairwise remaining balance), and potentially `supabase/migrations/` + `actions.ts` (`payments.created_by`, see **C7**) |
| `39`, `45` | Edit expense | `ExpenseComposer.tsx edit mode` | Also touches `src/lib/glow/composerValidation.ts` (clean vs dirty submit state) and `src/lib/glow/composerSplit.ts` (`reopenSplit` vs legacy equal rows, see **C9**) |
| `40`, `46` | Shares split | `SplitBodies.tsx shares body` | Also touches `src/lib/glow/composerSplit.ts` (`totalShares`, included people count, remainder message) and `ExpenseComposer.tsx` (passing remainder / reset metadata) |
| `41`, `47` | Delete confirmation | `ExpenseDetails.tsx inline confirm (D14)` | Also affects `ExpenseComposer.tsx` (Edit delete button) and `PaymentDetails.tsx` (`round-2/README.md` notes payment delete reuses expense confirm). Extracted as shared `ConfirmStrip.tsx` |
| `42`, `48` | Discard prompt | `RightPanel.tsx DiscardDialog (a dialog)` | **Blocked by B4.** If inline strip is chosen: touches `RightPanel.tsx`, `panelStore.ts`, `ExpenseComposer.tsx`, `PaymentComposer.tsx`, and `ConfirmStrip.tsx` |
| `43`, `49` | After delete toast + Undo | `ToastProvider.tsx / Toast.tsx (no Undo, D15)` | Visual restyle touches `Toast.tsx` + `ToastProvider.tsx`; **Undo behavior is Blocked by B3** and also touches `supabase/migrations/`, `src/app/ledger/[id]/actions.ts`, `ExpenseDetails.tsx`, `PaymentDetails.tsx`, `usePanel.ts` (`useDeletedToast`) |
| `44`, `50` | Expense details (phone sheet) | `ExpenseDetails.tsx in the sheet` | Close button (`44×44` round `bg-surface-muted-2`) lives in **`PanelContent.tsx` (`PanelHeader`)** and `RightPanel.tsx` (`SheetDialog`) |
| `51`, `59` | Balance card states | `BalanceHero.tsx / SettleUpPlan.tsx` | Also touches `src/lib/glow/hero.ts` (`showAmount` on settled, **C5**), `src/lib/glow/ledger.ts` (`visibleChips` filtering 0.00 chips, **C4**), `SettleUpPlan.tsx` (`planSubtitle` and settled empty body) |
| `52`–`54`, `60`–`62` | Empty group & No results | `LedgerEmpty.tsx` | Also touches `LedgerTable.tsx` and `LedgerList.tsx` (which pass `title`, `children`, and `44px` tonal `action` button props) |
| `55`, `56`, `63`, `64` | Loading | `src/app/ledger/[id]/loading.tsx` | Verified (`loading.tsx`), plus notes a Next.js App Router constraint: `[id]/loading.tsx` cannot read the fetched group title/emoji `"Veld 2026"` shown in boards `55`/`56` |
| `57`, `65` | Search & filters, phone | `ActivityToolbar.tsx / SearchField.tsx` | Touches `GroupFrame.tsx` (currently hides toolbar with `max-sm:hidden`), `LedgerList.tsx` (`applyFilters: false`), `ActivityToolbar.tsx`, `SearchField.tsx` (needs clear `×` button), and `BalanceHero.tsx` / phone hero collapse (`D20` conflict **C6**) |
| `58`, `66` | Tablet drawer | `RightPanel.tsx drawer (640–1023)` | Also touches `PanelContent.tsx` (`PanelHeader` close button: `44×44` round tonal button, no `Esc` kbd in drawer) |

---

## 3. Area-by-Area Detailed Audit

### Area 1 — Landing Page (`01`–`04`)
- **Boards:** `01-landing-desktop-light` / `03-landing-desktop-dark` (`1440×3682`, fluid `max-width: 1200px`), `02-landing-phone-light` / `04-landing-phone-dark` (`390×5630`).
- **Today on `glow`:** `src/app/page.tsx` renders a single centred card with the `"v0.1.0 Alpha"` pill and `"Potluck"` heading.
- **Board layout & components:**
  - Single fluid page (`max-w-[1200px]`, `px-6 pb-12 gap-24` on desktop; `px-4 pb-8 gap-14` on phone).
  - Top header with Potluck wordmark (`#top`) and desktop nav links (`#features`, `#how`, `#why`, `#github`, plus pill CTA `"Create a group"`); phone keeps only the `"Create a group"` pill CTA.
  - Hero split (`"Beta"` pill `bg-positive-tag-bg text-positive-tag-fg`, `h1` `72px/800` desktop / `40px/800` phone `"Split the bill. / Zero friction."`, right column copy + `52px` primary `"Create a group →"` + `52px` secondary `"See how it works"`). Below it: 16:10 framed laptop placeholder + `264px` (`210px` on phone) phone bezel (`#14142B` light / `#33334D` dark) holding 390×844 preview.
  - `#features`: `"What Potluck does"` — 2×2 grid of large feature cards (`min-w-[min(480px,100%)]`, `340px` desktop / `300px` phone recessed screenshot wells for `hero`, `composer`, `plan`, `viewer`) + 3-column mini card grid (`"No ads"`, `"Keyboard shortcuts"` reusing `<Kbd>`, `"Light and dark modes"`).
  - `#how`: `"How it works"` — 3 cards numbered `1`, `2`, `3` (`44px/800 text-positive`).
  - `#why`: `"Why I built Potluck"` prose + creator credit with `Avatar` (slot 1 `"J"`, `"Jacky · Creator · CS student at UBC."`) beside `"Under the hood"` card (`Next.js`, `Supabase`, `Vercel`, `Two settlement algorithms`, `Whole cents`, and tonal `"View the code on GitHub →"` button `#github`).
  - `#create`: `--gradient-glow` (desktop, `p-10 rounded-hero`) / `--gradient-glow-compact` (phone, `p-6 rounded-hero`) banner with `"Split your next bill"` and white pill CTA `href="/create-group"`.
  - Footer: `"Potluck Beta"` on left, `"Built in Vancouver 🇨🇦 · GitHub"` on right.
- **Screenshots (`data-screenshot="screenshots/<key>-<theme>.png"`):** Six keys (`laptop`, `phone`, `hero`, `composer`, `plan`, `viewer`) in both `light` and `dark` (`12` PNGs in `public/screenshots/`). Must be theme-aware (`[data-theme="dark"]` / `prefers-color-scheme`) when rendered.
- **Conflicts surfaced:** **C14** (header/hero `"Create a group"` links point to `#create` in the HTML vs `/create-group` in `round-2/README.md`) and landing copy saying `"Supabase: Postgres database with row-level security"` despite `0 RLS policies` in `PROGRESS.md`.

### Area 2 — Create Group, First Visit, Not Found / Error & Groups List (`05`–`20`)

#### Create Group (`05`, `06`, `13`, `14`)
- **Boards:** `05`/`13` (`1280×820`), `06`/`14` (`390×900`).
- **Today on `glow`:** `src/app/create-group/page.tsx` only collects `title`, `emoji`, and `baseCurrency`; `createLedger` in `src/app/create-group/actions.ts` inserts one row into `public.ledgers`.
- **Required changes:**
  - **Schema + Server Action + Validation (`T22`):** Add atomic SQL RPC (e.g., `create_ledger(p_title, p_emoji, p_base_currency, p_members)` granted to `service_role` only, inserting into `ledgers` and `users`) or transactional helper returning `{ id, creatorUserId }`. Extend `parseLedgerInput` in `src/lib/validation.ts` to accept `members: string[]` (at least 1 non-empty trimmed member, each validated via `parseMemberName` / `LIMITS.memberName = 50`, trimmed case-insensitive duplicate rejection). Client saves `writeStoredViewer(id, creatorUserId)` (`src/lib/glow/viewer.ts`) before `router.push`.
  - **UI (`T34`):** Desktop 2-column layout (`max-w-[1040px]`): main `bg-surface rounded-hero` card (`flex: 2 1 480px`) + aside `"What happens next"` card (`flex: 1 1 300px`, numbered `1`, `2`, `3` in `text-positive`). Gradient card (`--gradient-glow` / `--gradient-glow-compact`) holds `64×64` emoji trigger (`emoji-picker-react` already installed and themed in T20) + `32px/800` title input with `n/50` counter. `"Track balances in [CAD ▾] Canadian dollar"` (`src/lib/currencies.ts` uses Title Case `"Canadian Dollar"` today). `"Who's in it"` list shows `32px` `Avatar` slots 1–6 by order, `"You"` badge on index 0 (`bg-positive-tag-bg text-positive-tag-fg`), `"Remove"` text button (`text-negative`) on members (prevent removing last member client-side), plus `44px` sunken `"Add a name"` input + `44px` tonal `"Add"` button. Phone pins `52px` `"Create group"` button at bottom.
- **Conflicts surfaced:** **C10** (`LIMITS.title` is `100` in `validation.ts` vs `n/50` counter on `05`/`06`) and **C11** (`06`/`14` omit `"What happens next"` on phone vs `round-2/README.md` line 85 stating phone stacks it).

#### First Visit — "Which one are you?" (`07`, `08`, `15`, `16`)
- **Boards:** `07`/`15` (`1280×920`), `08`/`16` (`390×844`).
- **Today on `glow`:** `WhichOneAreYou.tsx` renders an independent centred modal `<dialog>` on desktop (`sm:left-1/2 sm:top-1/2 sm:w-[440px]`), `ViewerPill.tsx` shows two lines (`"Viewing as"` + `"Choose person"`), `BalanceHero.tsx` shows `"Choose who's viewing"` without an amount, `ShareOfSpendCard.tsx` shows no total spend, and `LedgerTable.tsx` / `LedgerList.tsx` replace the ledger rows with `<LedgerEmpty title="Pick who you are to see your numbers." />`.
- **Target behavior:**
  - `ViewerSwitcher.tsx` auto-opens the header's own `ViewerMenu` (`340px` desktop popover) or `ViewerSheet` (phone bottom sheet) when `showPrompt` is true, showing `"Which one are you?"`, subtitle `"Pick yourself so balances are shown from your side. You can change this any time."`, member `menuitemradio` rows with nets, divider, and `"Bookmark this page. The link is the only way back to the group."` (omitting `"Manage members"` and `"Theme"` during first-visit prompt mode). Centred `WhichOneAreYou.tsx` modal is retired.
  - `ViewerPill.tsx` hides `"Viewing as"` micro-label when `viewer === null` (single-line `? Choose person`).
  - `BalanceHero.tsx` displays `"Group spent"`, total group spend (`CA$492.52`), and `"Pick who you are to see your balance"` with no chips.
  - `ShareOfSpendCard.tsx` displays `"Group spent {total}"` and empty `12px` track (`0%` segments, no `"Your share"` / `"You paid"` row).
  - `LedgerTable.tsx` / `LedgerList.tsx` / `useLedgerView.ts` render all rows with third-person payment titles (`"Matthew paid Jacky"`), member avatars (no `"You"`), and blank Impact/Balance cells.
  - `PanelContent.tsx` (`EmptyPlaceholder`) centres its text (`py-8 text-center`) and uses a `44px` tonal `"Add expense [N]"` button.
- **Conflict surfaced:** **C12** (phone boards `08`/`16` show Jacky's viewer numbers behind the sheet scrim while the hero shows pre-viewer `"Group spent CA$492.52"`).

#### Group Not Found & Couldn't Load Group (`09`–`11`, `17`–`19`)
- **Boards:** `09`/`17` (`1280×640`), `10`/`18` (`390×844`), `11`/`19` (`1280×640`; no phone board for load error, responsive stacking applies).
- **Next.js 16.2.4 verification (`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/`):**
  - `src/app/ledger/[id]/not-found.tsx` (and `src/app/not-found.tsx`) — Server Component; caught when `notFound()` runs in `ledger/[id]/page.tsx`.
  - `src/app/ledger/[id]/error.tsx` — `'use client'` Client Component. Per Next.js 16.2.4 `error.md`, receives `{ error, reset, unstable_retry }`; call `(unstable_retry ?? reset)()` on `"Try again"` so Server Component data re-fetches instead of only re-rendering client state.
- **Visual design:** Wordmark header + left-aligned card (`max-w-[520px]`, `rounded-hero p-5` desktop, `rounded-card px-4 py-3.5 mx-4` phone) with **no icon badge**, `24px/800` (`20px/800` phone) heading, muted body paragraph, and 2 wrapped `48px` buttons (`"Go to home"` tonal + `"Create a group"` / `"Try again"` primary).

#### Groups List, Phone (`12`, `20`) — **Blocked by B2**
- **Boards:** `12`/`20` (`390×844`).
- **Scope if approved:** `"Your groups"` page (`/groups`) reading a device-local index (`potluck:groups` in `src/lib/glow/viewer.ts`) paired with `potluck:viewer:{id}` and a lightweight server loader fetching member counts and viewer nets, plus restoring the `44×44` `"Back to groups"` chevron in `GroupHeader.tsx` (phone boards `08`, `23`, `25`, `34`, `44`, `53`, `56`, `57` all draw this back button). Contradicts Round 1 **D19** (**C3**).

### Area 3 — Members, Invite & Theme (`21`–`32`)

#### Manage Members (`21`, `22`, `23`, `27`, `28`, `29`)
- **Boards:** `21`/`27` (`1280×920`), `22`/`28` (`440×860`), `23`/`29` (`390×844`).
- **Changes:** Moves from `UserManagementModal.tsx` (centred modal) into `RightPanel` (`?panel=members`, `flex-basis: 400px` in `src/app/globals.css` via `[data-slot="panel"]:has([data-panel-kind="members"], ...)`) on desktop/tablet and `SheetDialog` on phone.
- **Exact specs in `ManageMembersPanel.tsx`:**
  - `PanelHeader` title `"Manage members"` + subtitle `"{active.length} people in this group"` (`text-[13px] text-text-muted -mt-2.5` matching board gap).
  - Active member rows: `min-h-12` flat list with `border-t border-line` (no border on index 0), `32px` (`36px` phone sheet) `Avatar`, `font-semibold` name (`"You"` badge `bg-positive-tag-bg text-positive-tag-fg` on viewer), text button `"Rename"` (`text-positive`) + `"Remove"` (`text-negative`). Note board `21`/`22` renders `"Remove"` on Jacky (`You`) too (disable or prevent removing the last remaining member).
  - Inline rename (`22`/`28`): replaces name + actions with `40px` sunken input (`outline-2 outline-offset-2 outline-accent`), `44px` tonal `"Save"` (`bg-surface-muted-2 rounded-pill`), and `44px` muted `"Cancel"`. Keep T19 Escape focus-return to the row's `"Rename"` button.
  - Inline remove (`22`/`28`): keeps member's avatar + name visible above a `ConfirmStrip` (`bg-negative-soft rounded-tile px-3.5 py-3 text-[13px]`): `"Remove {name} from the group?"`, explanation text, `44px` `rounded-pill` `"Cancel"` (`bg-surface`) + `"Remove {name}"` (`text-negative`). Keep T19 Escape focus-return.
  - `"REMOVED"` section (`12px font-bold uppercase tracking-[0.06em] text-text-muted`): archived member avatar at full opacity + name (`text-text-muted font-semibold`) + `"Still on past expenses"` + `"Restore"` (`text-positive`).
  - Bottom `"Add member"` row: `48px` sunken `"Add a name"` input + `48px` primary `"Add member"` button + caption `"New members can be put on expenses straight away."`.

#### Invite Popover & Phone Sheet (`24`, `25`, `30`, `31`)
- **Boards:** `24`/`30` (`1280×920`), `25`/`31` (`390×844`).
- **Target `InvitePopover.tsx`:**
  - Desktop: `340px` popover (`p-2`, `rounded-card`, `shadow-menu`, `border: var(--menu-border)`).
  - Phone (`< 640px`): modal bottom sheet `<dialog>` (`rounded-t-sheet`, grabber, header with `"Invite people"` + `44×44` round tonal close button).
  - Copy & states: `"Invite people"` + `"Anyone with the link can view the group and add expenses."`; `"Group link"` (`13px font-semibold`); `44px` sunken read-only box showing `${origin}/ledger/${ledgerId}` truncated with ellipsis; `48px` full-width primary `"Copy link"` turning into tonal (`bg-surface-muted-2`) `"Link copied"` once copied; persistent `bg-negative-soft rounded-tile` box `"Don't lose this link"` / `"There are no accounts, so it's the only way back to the group. Bookmark this page."`.

#### Viewing-As Menu with Theme Setting (`26`, `32`)
- **Boards:** `26`/`32` (`1280×920`).
- **Target `ViewerChoices.tsx`:** Change `"Theme"` label from uppercase micro-label to `text-[13px] font-semibold text-text` (sentence case) and restyle track from `rounded-pill bg-surface-muted` to `bg-surface-muted-2 rounded-chip p-1` (`16px` radius) with `h-10 rounded-input` (`12px` radius) buttons (`bg-segment-selected font-bold shadow-[var(--segment-selected-shadow)]` on selected). Preserve `role="menuitemradio"` / `aria-checked` inside `role="menu"` per T19 & `round-2/README.md`.

### Area 4 — Payments & Expense Form States (`33`–`50`)

#### Add Payment & Payment Details (`33`–`38`)
- **Boards:** `33`/`36` (`1280×920`), `34`/`37` (`390×844`), `35`/`38` (`440×560`).
- **Target `PaymentComposer.tsx` & `src/lib/glow/payment.ts` (`33`, `34`, `36`, `37`):**
  - Amount box uses `--gradient-glow-compact` (`rounded-card p-4`) with fixed currency pill (no dropdown).
  - Single wrapping inline row `"From [You ▾] to [Stephen ▾] on [Today ▾]"` using custom `PillPopover` controls (`44px` `bg-surface-muted-2 rounded-pill` pills with `32px` `Avatar`, replacing native `<select>` / `<input type="date">`).
  - `Note (optional)` has `n/50` counter and `40px` borderless `bg-surface-sunken rounded-input` field.
  - Add viewer-impact helper in `src/lib/glow/payment.ts` driving live `<StatusStrip>`: e.g. `"You pay Stephen"` · `"You'll be owed CA$16.38 more"`, `"Stephen pays you"` · `"You'll be owed CA$16.38 less"`, or neutral strip `"Doesn't change your balance"` when viewer is neither payer nor payee (note `StatusStrip.tsx` may need a `"neutral"` tone or `"positive"`/`"warning"` mapping).
  - Bottom actions: `48px` tonal `"Cancel"` + `48px` primary `"Save payment [⌘↵]"`.
- **Target `PaymentDetails.tsx` & `PanelContent.tsx` (`35`, `38`):**
  - `usePanelTitle` returns `"{payer} paid {payee}"` (e.g. `"Matthew paid you"`), and `PanelHeader` renders the inline `"Payment"` tag (`bg-positive-tag-bg text-positive-tag-fg rounded-pill px-2 py-0.5 text-[12px] font-semibold`).
  - Meta line shows `"{Month Day} · added by {name}"` (**Conflict C7:** `public.payments` has no `created_by` column today!).
  - Impact strip uses `18px/800` right-hand text `"CA$3.75 in"` / `"CA$X out"` (matching ledger table rows instead of `+CA$3.75`).
  - Replaces plain note paragraph with a recessed `bg-surface-sunken rounded-chip p-4` summary card holding key-value rows: `Note` (`"write off"`) and pairwise balance line from `forViewer.pairs` (`"{name} still owes you"` / `"You still owe {name}"` / `"Settled up with {name}"` + amount).
  - Delete flow uses `ConfirmStrip` (`"Delete this payment?"`).

#### Edit Expense, Shares, Delete, Discard, Undo Toast & Phone Sheet (`39`–`50`)
- **Edit expense (`39`, `45`, `440×900`):** In `ExpenseComposer.tsx` & `composerValidation.ts`, when `editing && !dirty`, submit button uses `disabled` (`aria-disabled="true"`) and reads `"No changes yet"` (no `<Kbd>`). Also surfaces **C9** (`Pizza Badiali` with `split_mode: null` reopened in `Equally` mode on the board vs `Exact` under Round 1 **D13**).
- **Shares split (`40`, `46`, `440×920`):** In `SplitBodies.tsx` (`SharesBody`) & `composerSplit.ts`:
  - Add top summary row: `"{totalShares} shares between {includedCount} people"` + `"One share each"` (`text-positive`).
  - Reorder grid from `[Avatar][Name][Amount][Stepper]` to `grid-cols-[32px_minmax(0,1fr)_auto_76px]`: `[Avatar] [Name] [Stepper] [Amount]`.
  - Restyle `−` / `+` buttons to `44×44` round tonal buttons (`bg-surface-muted-2 rounded-pill`) with `18×18` minus/plus SVG icons; keep `<input>` or accessible stepper count (`w-7 text-center font-extrabold`).
  - When shares `= 0`, keep row at full opacity, mute name (`text-text-muted`), and show `"not included"` (`13px text-text-muted`) in the `76px` amount column.
  - Render remainder footnote (`13px text-text-muted`): `"One share is {perShareAmount}, so {firstRecipient} takes the extra cent."` (computed when `totalCents % totalShares !== 0`).
- **Delete confirmation (`41`, `47`, `440×780`):** Extract reusable `ConfirmStrip` (`bg-negative-soft rounded-tile px-3.5 py-3 text-[13px]` with bold negative title, body, `44px` `rounded-pill` `bg-surface` cancel button, and `44px` `text-negative` destructive button). In `ExpenseDetails.tsx` (and `ExpenseComposer` Edit delete), body dynamically states the viewer balance change (`"It'll be removed for everyone, and you'll be owed CA$91.45 less."`). Omits `"This can't be undone"` (**C1** / **B3**).
- **Discard changes prompt (`42`, `48`, `440×960`):** **Blocked by B4 / C2.** Boards replace `RightPanel.tsx`'s centred `DiscardDialog` modal with an inline `ConfirmStrip` at the bottom of the form (`"Discard changes?"`, `"The amount you changed won't be saved."`, `"Keep editing"` / `"Discard"`).
- **After delete toast with Undo (`43`, `49`, `1280×920`):** Restyle `Toast.tsx` & `ToastProvider.tsx` to `52px` surface pill (`h-[52px] rounded-pill bg-surface text-text shadow-menu pl-5 pr-2 gap-3`, `border: var(--menu-border)`), removing `CheckIcon` on success and adding optional `36px` tonal pill action button (`bg-surface-muted-2 rounded-pill px-3.5 font-bold` for `"Undo"`). **Wiring Undo is Blocked by B3 / C1.** Note **C13** on boards `43`/`49`'s approximate ShareOfSpend bar.
- **Expense details phone sheet (`44`, `50`, `390×844`):** `RightPanel.tsx` `SheetDialog` (`top: 44px`, `rounded-t-sheet`, grabber) + `PanelHeader` updated so sheet/drawer close button is a `44×44` round tonal button (`bg-surface-muted-2 rounded-pill`) with `19px` title and no `<Kbd>Esc</Kbd>`.

### Area 5 — States, Search & Responsive Sizes (`51`–`66`)
- **Balance card states (`51`, `59`, `900×760`):**
  - Surfaces **C4** (zero-value chips `Matthew 0.00`, `Jonah 0.00` visible on Alvin's card vs Round 1 **D11** hiding zero chips) and **C5** (`CA$0.00` displayed under `"You're all settled"` vs Round 1 `docs/03` & `hero.ts` hiding the amount when `net === 0`).
  - `SettleUpPlan.tsx` when everyone is settled (`entries.length === 0`): subtitle `"Nothing to settle"`, switch hidden, body simplified to one centred muted paragraph (`py-8 text-center text-text-muted` `"Nobody owes anybody. Add an expense and the plan updates."`, removing the check icon and bold heading).
- **Empty group & No search results (`52`–`54`, `60`–`62`, `1280×760` & `390×844`):**
  - `LedgerEmpty.tsx`, `LedgerTable.tsx`, `LedgerList.tsx`: `py-8 px-4 gap-3`, `14px/700` title + muted subtitle (`gap-0.5`), and `44px` tonal button (`variant="soft" inPanel size={44}`) for `"Add expense [N]"` (omit `<Kbd>N</Kbd>` on phone) and `"Clear search and filters"`.
- **Loading state (`55`, `56`, `63`, `64`, `1280×920` & `390×844`):**
  - `src/app/ledger/[id]/loading.tsx`: use `bg-surface-muted-2` bones inside a **neutral `bg-surface rounded-hero shadow-card`** hero card (replacing the current `--gradient-glow` hero skeleton), desktop 2-column top row + toolbar + 6-row 6-column table skeleton + right panel skeleton + shortcut footer; phone `56`/`64` 5 chip bones (`h-[88px]`) + 4 list row bones (`h-16`) + bottom action bar.
  - **Technical note:** Because `loading.tsx` wraps the entire `[id]` page before `page.tsx` resolves Supabase data, `loading.tsx` cannot know the group's emoji/title (`"Veld 2026"` drawn on `55`/`56`) unless moved into a nested `<Suspense>` inside `page.tsx` (while keeping the header skeleton in `loading.tsx` as fallback).
- **Search and filters, phone (`57`, `65`, `390×844`):**
  - Contradicts Round 1 **D20** (**C6**). Touches `GroupFrame.tsx` (show toolbar below tabs on phone when searching/active), `LedgerList.tsx` (`applyFilters: true`), `ActivityToolbar.tsx` (horizontal scrolling `FilterChips` + `"k of n match “query”"` line), and `SearchField.tsx` (`44×44` `"Clear search"` `×` button replacing `/` when `value` is non-empty). Note phone boards `08`/`23`/`25`/`34`/`44`/`53` do NOT show the search bar above the hero by default—clarify whether phone search lives behind a toggle or only collapses the hero while active.
- **Tablet: details as a drawer (`58`, `66`, `820×1100`):**
  - `RightPanel.tsx` (`DrawerDialog`): change `w-[440px] rounded-l-hero` to `w-[420px] rounded-l-sheet` (`28px` radius on left corners).
  - `PanelContent.tsx` (`PanelHeader`): pass layout or hide `<Kbd>Esc</Kbd>` and use `size-11 rounded-pill bg-surface-muted-2 text-text` close button in both `drawer` and `sheet` layouts.

---

## 4. Complete Contradictions & Conflicts (`C1`–`C14`)

Per guardrail, every conflict between Round 2 boards, the existing `glow` codebase, and Round 1 decisions (`D1`–`D22`) is recorded here without choosing a winner.

| ID | Round 2 Boards / Hand-off | Existing Codebase / Round 1 Decision | Impacted Tasks |
|---|---|---|---|
| **C1 (B3)** | Undo on delete toast (`43`, `49`); `"Delete this expense?"` omits `"This can't be undone"` (`41`, `47`) | Round 1 **D14** & **D15** (`ExpenseDetails.tsx`, `PaymentDetails.tsx`, `ToastProvider.tsx`): immediate hard delete, `"This can't be undone"`, no Undo | **T23, T25, T32** |
| **C2 (B4)** | Inline orange discard strip at bottom of form (`42`, `48`) per design-language rule against centred modals | Round 1 `RightPanel.tsx` `DiscardDialog`: centred modal `<dialog>` (`w-[min(420px,...)]`) | **T32** |
| **C3 (B2)** | Phone groups list `"Your groups"` (`12`, `20`) and `"Back to groups"` chevron on every phone group header (`08`, `23`, `25`, `34`, `44`, `53`, `56`, `57`) | Round 1 **D19** (`GroupHeader.tsx` line 7): back button intentionally dropped because there is no groups list | **T35** |
| **C4** | Balance hero shows zero-value chips (`Matthew 0.00`, `Jonah 0.00` on Alvin's card, `51`/`59`) | Round 1 **D11** (`visibleChips` in `src/lib/glow/ledger.ts`): hides zero-value chips on hero | **T33** |
| **C5** | Settled hero displays `CA$0.00` in display type (`51`, `52`, `53`, `59`, `60`, `61`) | Round 1 `docs/03-components.md` & `src/lib/glow/hero.ts` (`showAmount: false` when `net === 0`) | **T33** |
| **C6** | Search field, clear button, filter chips, and `"k of n match"` count on phone (`57`, `65`) | Round 1 **D20** (`GroupFrame.tsx` `max-sm:hidden`, `LedgerList.tsx` `applyFilters: false`): phone search excluded from Round 1 | **T33** |
| **C7** | Payment details meta line shows `"Sep 17 · added by Matthew"` (`35`, `38`, `round-2/README.md`) | Database schema (`supabase/migrations/20261113224445_split_mode_weights_created_by.sql`, **T04 / D12**): only `public.expenses` has `created_by`; `public.payments` has no `created_by` column | **T23, T31** |
| **C8** | Desktop `ShareOfSpendCard` title reads `"Trip so far"` (`07`, `21`, `24`, `26`, `33`, `43`, `52`, `54`, `58`) | Round 1 **D10** (`ShareOfSpendCard.tsx`): renamed `"Trip so far"` → `"So far"` because not all groups are trips | **T28 / T33** (preserve `"So far"` or revert) |
| **C9** | Edit expense opens `Pizza Badiali` (`split_mode: null` in fixture) in **Equally** mode (`39`, `45`) | Round 1 **D13** (`reopenSplit` in `src/lib/glow/composerSplit.ts`): opens `split_mode === null` rows in **Exact** mode (`details.ts` only uses `inferSplitMode` for display) | **T32** |
| **C10** | Create group name input shows `9/50` counter (`05`, `06`, `13`, `14`) | `src/lib/validation.ts` line 16 sets `LIMITS.title = 100` (and DB constraint allows longer titles) | **T22, T34** |
| **C11** | Phone create-group boards (`06`, `14`) omit the `"What happens next"` card | `round-2/README.md` line 85 states *"Phone stacks the card and pins 'Create group' in a bottom bar (52px)"* | **T34** |
| **C12** | First-visit phone background list (`08`, `16`) renders Jacky's viewer numbers (`−CA$12.50`, `Matthew paid you`, `You`) behind the sheet scrim | `round-2/README.md` line 90 & desktop boards `07`, `15` specify blank impact/balance and third-person names until a viewer is chosen | **T28** |
| **C13** | After delete (`43`, `49`), Share card has `Your share CA$67.30` > `You paid CA$42.00`, omits the hatched shortfall segment, and colours `"You paid"` in `--positive` | `ShareOfSpendCard.tsx` (lines 58–71) & `docs/03` render the hatched shortfall segment when paid < share and colour `"You paid"` in `text-text-secondary` (`round-2/README.md` notes the board's share bar is approximate) | **Reference only (keep `ShareOfSpendCard.tsx` formula)** |
| **C14** | Landing page top nav & hero `"Create a group"` links point to `#create` (`01`–`04` HTML); `"Under the hood"` copy says `"Postgres database with row-level security"` (`01`–`04`) | `round-2/README.md` line 77 says *"Every 'Create a group' button goes to `/create-group`"*; `PROGRESS.md` & `20261113204541_revoke_public_access.sql` confirm `0 RLS policies` (server-side `service_role` only) | **T36** |
