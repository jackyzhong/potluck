# Glow build plan

How the Glow redesign gets built, one small task per session. This file says
**what to do and in what order**. The spec in `docs/01`–`08` says **what it
should look like and compute**. [`PROGRESS.md`](./PROGRESS.md) says **where
the work stands**.

Written 2026-11-13 against `main` at `7b98618` (after the access-model and
archive-members PRs). Change this file only when a decision changes or a
task's scope has to change, and say so in the PROGRESS log when you do.

---

## How to work a task

1. **Read [`PROGRESS.md`](./PROGRESS.md) first.** Take the first task in the
   board whose status is `todo` and whose dependencies are all `done`. Don't
   start a task another session has `in progress`.
2. **Mark it claimed.** Set its status to `in progress` with your branch name,
   commit just that change, and push.
3. **Read only what the task lists**, plus "Rules for every task" below. The
   spec is about 14k words; a task needs a few sections of it, not all of it.
4. **Build it.** Stay inside the files the task names. If you have to touch
   something else, say why in your log entry.
5. **Check every "Done when" item.** If you can't check one (no browser, no
   dev database), say so in the log. Never report something as checked when
   it wasn't.
6. **Update `PROGRESS.md` in the same PR:**
   - Set the task's status to `in review` with the PR link.
   - Add a log entry using the template there.
   - Add anything you found wrong in the spec under "Spec corrections".
7. **Open a PR into `glow`** (not `main`). One task per PR.

If something blocks you (a decision this plan doesn't cover, a test you can't
make pass, or a spec contradiction you can't settle from this file), stop.
Write it under "Open questions" in `PROGRESS.md` and end the session; don't
guess. A guess made in one session gets undone in the next.

### Branches

- `glow` is the integration branch, cut from `main`. Every task PR targets it,
  so production stays on the current UI until the whole redesign is ready.
- Task branches are named `glow/T07-page-frame`, cut from the latest `glow`.
- When the board is all `done`, `glow` merges to `main` in one PR (task T21).
- If `main` moves (realtime, fixes), merge `main` into `glow`; never rebase
  `glow`.

---

## Rules for every task

**Next.js.** This project runs Next.js 16 with breaking changes from what you
know (see AGENTS.md). Before writing Next-specific code, read the doc for the
API you're about to use, under `node_modules/next/dist/docs/01-app/`. The ones
this redesign needs:

| You're doing | Read |
|---|---|
| Server/client component boundary | `01-getting-started/05-server-and-client-components.md` |
| Calling a server action, forms, pending state | `01-getting-started/07-mutating-data.md`, `02-guides/forms.md` |
| Refreshing after a write | `03-api-reference/04-functions/refresh.md` (server side), `use-router.md` (client side) |
| `?tab=` / `?e=` / `?panel=` state | `03-api-reference/04-functions/use-search-params.md` |
| Fonts | `01-getting-started/13-fonts.md`, `03-api-reference/02-components/font.md` |
| Loading skeletons | `03-api-reference/03-file-conventions/loading.md` |

Page `params` and `searchParams` are Promises (see `src/app/ledger/[id]/page.tsx`).

**Data access.** The browser never talks to Supabase. The public key has no
table access at all.
- Reads happen in the server component `src/app/ledger/[id]/page.tsx`.
- Writes go through the server actions in `src/app/ledger/[id]/actions.ts`.
  Each one parses its input with `src/lib/validation.ts` and scopes every row
  to `ledgerId`. A new write follows the same pattern: validate first, scope to
  the ledger, `.select()` the result, and return an `ActionResult`.
- Never import `src/lib/server/supabase.ts` from a client component. The build
  fails if you do.
- After a write, call `router.refresh()` in the client, as the app does today.
  Everything on screen recomputes from the refreshed data.

**Calculations.** Viewer-relative numbers come from the pure functions in
`src/lib/glow/` (built in T03). Components never do money arithmetic inline.
Money is integer cents end to end and is formatted only at render, through
`<Money>`.

**Styling.**
- Tailwind v4 classes backed by the Glow tokens (set up in T02).
- Use semantic token names only. No raw hex, no Tailwind palette colours
  (`zinc-500` and similar) in new code.
- Light and dark come from tokens. Don't write `dark:` variants by hand.
- Pixel values (sizes, radii, padding) come from `docs/01-screens.md`, or from
  the inline styles in `html/NN-*.html` when the doc is vague. The HTML files
  are the exact source of truth for values.

**Copy.** Every user-visible string comes from `docs/06-copy.md`. If a string
you need isn't there, write it in the same voice and list it in your log entry.

**Components.**
- New components live in `src/components/glow/`, one per file, named as in
  `docs/03-components.md`.
- Don't add npm dependencies. If a task truly needs one, stop and ask in
  "Open questions".

**Accessibility.**
- Follow each component's accessibility notes in `docs/03`.
- Touch targets are at least 44px.
- Every interactive element is reachable and usable by keyboard.

**Tests and checks.** Before opening a PR, all three must pass:

```
npm test
npm run lint
npm run build
```

Logic goes in `src/lib/**` with a `*.test.ts` beside it. The test runner is
Node's built-in one: `node --test`, with type stripping and no test
libraries. See `src/lib/balances.test.ts` for the style.

**Visual check.** Any task that changes what's on screen has to be compared
against its boards:
1. Run `npm run dev` against the **dev** database (see "Local setup").
2. Open the seeded "Veld 2026" group and screenshot at 1280 wide and 390 wide,
   in light and in dark.
3. Compare each screenshot with the PNGs in `screens/`, and list in your log
   entry what still differs.

If your session has no browser tool, write "visual check not done" in the log.

**Never touch production.** Don't run migrations, seed scripts or test writes
against the production Supabase project. Schema changes are migration files
plus an apply to the **dev** project. The owner applies them to production
when `glow` ships (T21).

---

## Local setup

`.env.local` is not committed, and worktrees don't get a copy. In a new
worktree, copy the main checkout's file:

```bash
cp "$(git rev-parse --path-format=absolute --git-common-dir)/../.env.local" .env.local
```

That file must point at the **dev** Supabase project (task T00b). If
`NEXT_PUBLIC_SUPABASE_URL` contains the production project ref, stop: don't
run the app against it.

Seed the sample group with `node scripts/seed-dev.mjs` (built in T01). It
prints the group's URL.

---

## Decisions

The spec leaves these open (docs/07 §B and §C). Each one is settled here so
sessions don't each guess differently. Status `proposed` means the owner
hasn't confirmed it yet. **No build task starts until T00a marks all of
them `confirmed`.**

| # | Question | Decision | Status |
|---|---|---|---|
| D1 | Hero chips (pairwise) vs. the simplified plan can disagree (07 B1) | Activity shows pairwise; Balances shows the simplified plan with the caption "Simplified: fewer payments, same totals" | proposed |
| D2 | "Don't lose the link" warning vs. Invite (07 B2) | Invite opens a popover with Copy link plus the reminder text. The first-visit prompt also mentions bookmarking | proposed |
| D3 | First-visit "Which one are you?" prompt (07 B3) | Build it. Until someone picks, use neutral wording (no "you") | proposed |
| D4 | Theme control (07 B4) | Follow the system by default. Add System / Light / Dark to the viewing-as menu, saved per device | proposed |
| D5 | Equal-split remainder (07 B5) | The first members in ledger order take the extra cents. This is already the app's rule; keep it | proposed |
| D6 | Percent rounding: the spec uses largest remainder, the app gives the leftover to the last person | Use largest remainder (`splitByWeight` in `fixtures/reference.mjs`) for Percent and Shares. It only affects new saves | proposed |
| D7 | Date vs. date-time (07 B6) | Date picker, still written to `expenses.created_at`. "Today" uses the current time; any other day uses local noon. No new column | proposed |
| D8 | Multi-currency (07 B7) | Out of scope. The currency pill works as today's select does. No conversion work | proposed |
| D9 | Signed-in "view as" (07 B8) | Not applicable yet. Keep the viewer behind `useViewer()` so accounts can replace it later | proposed |
| D10 | "Trip so far" title (07 B9) | "So far" | proposed |
| D11 | Zero-value chips (07 B10) | Hide members who are square with the viewer | proposed |
| D12 | "Added by" in details (05 gap 2) | Add `expenses.created_by` (nullable), set from the viewer at save. Older rows show no "added by" | proposed |
| D13 | Reopening the split mode on edit (05 gap 1, KNOWN-ISSUES 1.2) | Add `expenses.split_mode` and `splits.weight`. Old rows (no mode) open in Exact | proposed |
| D14 | Delete confirmation and Undo (07 C) | Delete asks first, inline in the panel: "Delete this expense? This can't be undone." No Undo on delete | proposed |
| D15 | Toasts (07 C) | One polite toast for success messages, no Undo in this round. Errors show inline, replacing every `alert()` | proposed |
| D16 | Add payment panel (07 C) | Use the composer shell: "From [●] to [●]", amount on the gradient card, date, note, Save. Mark paid opens it prefilled | proposed |
| D17 | Shares split body (07 C) | Integer steppers per member, default 1, minimum 0 | proposed |
| D18 | URL shape (04 suggests `/g/[id]`) | Keep `/ledger/[id]`. Add `?tab=`, `?e=` (selected expense) and `?panel=add` | proposed |
| D19 | Phone back button (no groups list exists) | Leave it out for now | proposed |
| D20 | Phone search and filters | Not in this round (desktop and tablet only) | proposed |
| D21 | Keyboard shortcuts | Build the full table in docs/04. The spec says some already exist; only Escape does | proposed |
| D22 | Home page and create-group page | Out of scope, apart from picking up the new font and tokens (T20) | proposed |

---

## Spec facts that changed after it was written

The spec was written against the code before PRs #7 and #8. Where it
disagrees with what's below, this list wins:

- **Deletes already exist.** `deleteExpense` and `deletePayment` are in
  `actions.ts`, so 05 gap 5 is done.
- **Saving already happens in one transaction.** `saveExpense` calls the
  `save_expense()` database function. Extend it; don't add a second save path.
- **Archived members exist.** `users.archived_at` is in the schema, and
  `src/lib/members.ts` has `activeMembers()` and `pickableMembers()`. Use them
  for pickers and default participants (05 gap 8).
- **`users.device_token` is unused** (KNOWN-ISSUES §6). The viewer lives in
  `localStorage` only (05 gap 7).
- **The settle-up algorithms** are `getSimplifiedDebts` and
  `getUnsimplifiedDebts` in `src/lib/balances.ts`. The per-member breakdown is
  `getMemberBreakdown`. Reuse them; don't port the reference's versions.
- **RLS:** the public key can read nothing (see "Data access" above).

---

## Tasks

Size: **S** is under an hour, **M** is a few hours, **L** is most of a session.
"Review" marks the tasks where the logic is subtle enough that the owner
should read the diff closely, or run the task on a stronger model.

### Phase 0: owner, before any build task

**T00a · Confirm the decisions.** The owner reads "Decisions" and marks each
one `confirmed`, or edits it. Done when no row says `proposed`.

**T00b · Dev database.** The owner sets up a dev database:
1. Create a second Supabase project, `potluck-dev`. The free tier allows two
   projects.
2. Apply every file in `supabase/migrations/` to it, in order.
3. Point the main checkout's `.env.local` at it: its URL and its secret key.
4. In Vercel, change the **Preview** environment's `NEXT_PUBLIC_SUPABASE_URL`
   and `SUPABASE_SECRET_KEY` to the dev project, so `glow` previews never
   write to real groups.
5. Create the `glow` branch from `main`.

Done when `npm run dev` in a fresh worktree, with the copied `.env.local`,
shows the home page, and the dev project's URL appears in `.env.local`.

### Phase 1: foundations (T01–T04 can run in parallel)

**T01 · Seed script** · S · depends on T00b
- **Build:** `scripts/seed-dev.mjs`, which loads `fixtures/veld-2026.json` into
  the database named in `.env.local` and prints the group's URL.
  - It refuses to run if `NEXT_PUBLIC_SUPABASE_URL` contains the production
    ref `xjkvjfmdljdpynlumszz`.
  - It's idempotent: re-running replaces the Veld group instead of adding a
    second one.
- **Read:** `fixtures/veld-2026.json`, `supabase/migrations/`, README "Folder map".
- **Done when:** the printed URL opens in today's UI and shows 5 expenses and
  2 payments. Running it twice still leaves one Veld group.

**T02 · Tokens, font, theme plumbing** · M · depends on T00a
- **Build:**
  - Bring in `tokens/tokens.css` (copy it into `src/app/`, not a cross-folder
    import) and map the roles into Tailwind v4 with `@theme inline` in
    `globals.css`, e.g. `--color-surface: var(--surface)`.
  - Swap Geist for Plus Jakarta Sans via `next/font/google` in
    `src/app/layout.tsx`.
  - Add `src/lib/theme.ts`: read and write the stored theme (D4) and set
    `data-theme` on `<html>`, with an inline script so the page doesn't flash
    the wrong theme on load.
- **Read:** `docs/02-design-tokens.md`, `tokens/tokens.css`, and the CSS and
  fonts Next docs.
- **Done when:**
  - Existing pages still render.
  - Setting `data-theme="dark"` by hand switches `--bg` and `--surface`.
  - With no setting stored, the theme follows the OS.
  - `npm run build` passes.

**T03 · Viewer calculation layer** · M · Review · depends on T00a
- **Build:** `src/lib/glow/`, a TypeScript port of `fixtures/reference.mjs`:
  - `splitEqually`, `splitByWeight` (D6), `impact`, `viewerLedger` (impact
    and running balance per row), `pairwise`, `shareOfSpend`, `memberTotals`,
    the composer impact line, and the hero sub-line counts.
  - The types take the app's row types (`Expense`, `Split`, `Payment` from
    `page.tsx` and `balances.ts`), not the fixture's shape. A small adapter in
    the test turns the fixture into those types.
- **Read:** `docs/05-data-and-calculations.md` (all of it),
  `fixtures/reference.mjs`, `fixtures/expected.json`, `src/lib/balances.ts`.
- **Done when:**
  - `src/lib/glow/*.test.ts` asserts every value in `expected.json`, for both
    Jacky and Stephen.
  - It also has property tests in the style of `balances.test.ts`: nets sum to
    0, chips sum to the viewer's net, the newest row's running balance equals
    the net, and every split mode's cents sum to the total.
  - `npm test` passes.

**T04 · Schema: split mode, weights, created_by** · M · Review · depends on T00a
- **Build:**
  - A migration adding:
    - `expenses.split_mode text null check (split_mode in ('equal','exact','percent','shares'))`
    - `splits.weight numeric null`
    - `expenses.created_by uuid null references users(id)`
  - Extend `save_expense()` to take and store all three, still checking that
    `created_by` belongs to the ledger.
  - Extend `parseExpenseInput` and `saveExpense` to match.
  - The current `ExpenseModal` keeps working: it sends no mode, which is stored
    as null.
- **Read:** 05 "Gaps" rows 1–2, `supabase/migrations/20261105233937_save_expense_function.sql`,
  `src/lib/validation.ts`, `actions.ts`.
- **Done when:**
  - Validation tests cover the new fields: a bad mode is rejected, a weight is
    required for percent and shares, and a foreign `created_by` is rejected.
  - The migration applies cleanly to the dev project, and today's UI still
    saves an expense against it.
  - The migration is **not** applied to production.

### Phase 2: building blocks

**T05 · Foundation components** · M · depends on T02
- **Build:** in `src/components/glow/`:
  - `Avatar` (palette from docs/02 "Member avatar palette", colour derived
    from the member's position in ledger order)
  - `Money`, `Kbd`, `Button`, `SegmentedControl`, `FilterChips`,
    `SearchField`, `Switch`, `StatusStrip`, `Toast`
  - a dev-only preview page, `src/app/dev/glow/page.tsx`, that calls
    `notFound()` in production and shows every variant.
- **Read:** `docs/03-components.md` "Foundations", `docs/02`.
- **Done when:**
  - The preview page shows every variant in light and dark.
  - `Money` renders a real minus sign (U+2212) and tabular numerals.
  - Unit tests cover `Money`'s formatting function.

**T06 · Viewer state and first-visit prompt** · M · depends on T03, T05
- **Build:**
  - `useViewer()` plus a provider: `localStorage` key
    `potluck:viewer:{ledgerId}`, with the fallback rules from docs/04 "Viewer
    model".
  - The "Which one are you?" sheet (D3).
  - A `useGlowData()` hook that runs the T03 functions for the current viewer,
    memoised.
  - Wrap the ledger page's client tree in both.
- **Read:** docs/04 "Viewer model", docs/06 "Viewer switcher".
- **Done when:**
  - Switching the stored viewer recomputes every number with no refetch.
  - An archived or deleted stored viewer falls back cleanly.
  - The prompt shows only when nothing is stored.

### Phase 3: the group page

**T07 · Page frame and viewing-as switcher** · L · depends on T06
- **Build:**
  - `GroupHeader` (desktop and phone), tabs driven by `?tab=`,
    `PhoneActionBar`, `ShortcutFooter` (labels only; keys come in T17).
  - The Invite popover (D2).
  - `ViewerPill` / `ViewerMenu` / `ViewerSheet`, with the theme setting (D4)
    and "Manage members". That opens the existing `UserManagementModal`,
    restyled with tokens; keep its logic.
  - Remove the floating `ActionMenu`. Its Add expense and Add payment open the
    old modals until T13 and T15 replace them.
- **Boards:** 01, 03, 19, 20, 21, 22.
- **Read:** docs/01 "Shared page frame" and "Viewing-as switcher", docs/03
  "Page frame" and "Viewing-as switcher", docs/04 breakpoints.
- **Done when:**
  - The header and switcher match the boards at 1280 and 390, light and dark.
  - Manage members still adds, renames, removes and restores.
  - The old modals still open.

**T08 · Activity summary: hero and share card** · M · depends on T07
- **Build:**
  - `BalanceHero`, including the owe and settled states from docs/06.
  - `PersonChips`: hide zeros (D11); clicking one sets the "with {name}"
    filter, which T10 wires up.
  - `ShareOfSpendCard`, with the "still to cover" style for paid < share.
- **Boards:** 01, 03, 23.
- **Done when:**
  - The numbers for Jacky and for Stephen match boards 03 and 23 exactly.
  - Large amounts scale down past 9 characters (07 C).

**T09 · Ledger table and list** · L · depends on T07
- **Build:**
  - `LedgerTable` (desktop): date shown on the first row of each day, payment
    rows with the tag and note, "not involved", running balance, selection
    styling.
  - `LedgerList` (phone).
  - Remove `ExpenseCard` and `PaymentCard` from the page. Delete the files in
    T21, not here.
  - Clicking a row sets `?e=`; T11 opens the panel.
- **Boards:** 01, 03, 23.
- **Done when:** every row's impact and balance match `expected.json` for both
  viewers, and the table scrolls sideways instead of overflowing below 560px.

**T10 · Search and filters** · M · depends on T08, T09
- **Build:** `SearchField` plus `FilterChips` in the toolbar, the "with {name}"
  chip filter, and the matching rules from docs/04 "Filtering and search".
  The rules are pure functions in `src/lib/glow/filter.ts`, with tests.
- **Done when:**
  - Typing `109`, `$109` or `109.74` finds that expense.
  - Running balances don't change when filtered.
  - Filters reset on a viewer change, except "Involving me".

**T11 · Right panel, drawer and sheet** · L · Review · depends on T07
- **Build:**
  - The panel state machine from docs/04 "Page model": empty, details, add,
    edit. It's driven by `?e=` and `?panel=`.
  - The inline panel at ≥1024px, an overlay drawer at 640–1023px, and a
    full-height sheet under 640px (grabber, close, swipe down, focus trap,
    inert background).
  - Reuse or extend `useModalKeyboard` for Escape and focus return.
  - The dirty-form "Discard…?" prompt.
- **Done when:**
  - Every transition in the docs/04 table works.
  - Refreshing the page keeps the panel state.
  - Focus moves into the panel on open and back to the opener on close, at
    all three widths.

**T12 · Expense details** · M · depends on T09, T11, T04
- **Build:**
  - `ExpenseDetails` from boards 15/16: the impact strip, the "paid by … split
    …" sentence (it uses `split_mode`; old rows say "custom split"), and split
    rows worded from the viewer's side.
  - Actions: Edit (opens the old edit modal until T14), Duplicate (opens add,
    prefilled), and Delete with the D14 confirmation.
  - Replace `ExpenseDetailsModal`.
- **Boards:** 15, 16, 23 (details panel).
- **Done when:**
  - The wording matches docs/06 for "viewer paid", "viewer in split" and
    "viewer not involved".
  - Delete removes the expense and returns the panel to empty.

**T13 · Composer: shell and Equally** · L · Review · depends on T11, T04, T05
- **Build:**
  - `ExpenseComposer` in add mode: the gradient card (description with
    counter, 48px amount, currency pill), the "Paid by [●] on [date]" sentence
    (D7), split-mode tabs, the Equally body with live per-person amounts and
    the remainder note, the status strip with the impact line, and the Save
    button with its blocked reason.
  - "Save and add another".
  - Saves through `saveExpense` with `split_mode`, `weight` and `created_by`.
- **Boards:** 09, 10, 17, 18.
- **Read:** docs/01 "Add expense", docs/03 `ExpenseComposer`, docs/04
  "Composer behaviour", docs/06 "Composer".
- **Done when:**
  - The 6450 ÷ 4 example matches the board, including the note and the
    "+CA$48.37" impact.
  - ⌘↵ saves.
  - A failed save shows the error inline and keeps the form.

**T14 · Composer: Exact, Percent, Shares, Edit** · L · Review · depends on T13
- **Build:**
  - The Exact and Percent bodies, with live computed amounts and the
    "Split CA$X across the N blank rows" helper.
  - The Shares body (D17).
  - Edit mode: "Edit expense", "Save changes", Delete, and reopening the
    stored mode (old rows open in Exact).
  - Remove `ExpenseModal`.
- **Boards:** 11, 12, 13, 14.
- **Done when:**
  - Every validation row in docs/04 "Validation per mode" behaves as
    written.
  - Editing a percent expense reopens as percent with the same numbers
    (KNOWN-ISSUES 1.2 is fixed).

**T15 · Payments: add, details, edit** · M · depends on T11, T09
- **Build:**
  - The Add payment panel (D16) through `savePayment`.
  - Selecting a payment row shows its details, with Edit and Delete.
  - Remove `PaymentModal`.
- **Boards:** none (not designed). Match the composer's shell and tokens.
- **Done when:**
  - A payment can be added, edited and deleted from both Activity and phone.
  - Ledger rows read "{payer} paid you" with the "in"/"out" impact.

**T16 · Balances tab** · L · depends on T07, T15
- **Build:**
  - The hero with `StatTiles`.
  - `SettleUpPlan`: the Simplify switch bound to `setSimplifyDebts`, the
    "Involving you" and "Rest of the group" sections, the D1 caption, and
    Mark paid, which opens the T15 panel prefilled.
  - `EveryoneBreakdown`: an accordion on phone; on desktop, a grid with a
    three-column expanded row.
  - Remove `BalancesView`.
- **Boards:** 05, 06, 07, 08.
- **Done when:**
  - The tiles add up to the hero.
  - Mark paid records the payment and every number updates.
  - Toggling Simplify changes the plan and its subtitle count.

### Phase 4: finish

**T17 · Keyboard shortcuts** · M · depends on T10, T12, T14, T16
- **Build:** the docs/04 shortcut table (D21), ignored while typing except for
  Esc and ⌘↵, plus `<kbd>` hints shown only for fine pointers. Also `1`/`2`
  for tabs and `V` for the viewer menu.
- **Done when:** every key in the table works on Activity and Balances, and
  nothing fires while the cursor is in a text field.

**T18 · States and edge cases** · M · depends on T16
- **Build:**
  - Empty states: no expenses, no search results, an empty panel, everyone
    settled.
  - `loading.tsx` skeletons for the hero and the rows.
  - Inline errors plus the toast (D15), replacing every remaining `alert()`
    (KNOWN-ISSUES 4.3).
  - Long names and long descriptions.
  - More than 5 other members in the chip row.
- **Done when:** `grep -rn "alert(" src` returns nothing, and each state has
  been seen in a screenshot.

**T19 · Accessibility and motion pass** · S · depends on T18
- **Check:** the docs/04 "Focus and accessibility" list, `prefers-reduced-motion`,
  and contrast spot checks in dark mode.
- **Done when:** every item on that list is checked off in the log entry.

**T20 · Restyle the home and create-group pages** · S · depends on T02
- **Build:** apply the font, the tokens and dark mode to `/` and
  `/create-group`, with no layout redesign (D22).

**T21 · Ship** · M · owner and an agent · depends on everything above
- **Agent:**
  - Delete the now-unused old components.
  - Make sure `npm run lint` is clean (KNOWN-ISSUES 5.2 should be gone with
    `ExpenseModal`).
  - Update `features.md`, `db-chart.md` and `KNOWN-ISSUES.md` (remove 1.2,
    4.3 and 5.2).
  - Do a final screenshot pass against all 24 boards.
- **Owner:**
  - Apply the T04 migration to production.
  - Merge `glow` into `main`.
  - Check production.

---

## Order at a glance

```
T00a, T00b (owner)
  ├─ T01 seed           ┐
  ├─ T02 tokens ── T05 components ─┐
  ├─ T03 calc layer ───────────────┼─ T06 viewer ── T07 frame ─┬─ T08 hero ──┐
  └─ T04 schema                    │                           ├─ T09 ledger ┴─ T10 search
                                   │                           └─ T11 panel ─┬─ T12 details
                                   │                                         ├─ T13 composer ── T14 modes/edit
                                   │                                         └─ T15 payments ── T16 balances
  T20 (any time after T02)                                     T17 keys · T18 states · T19 a11y · T21 ship
```

These can run at the same time, in separate worktrees:
- T01, T02, T03 and T04;
- after T07: T08, T09 and T11;
- after T11: T13 and T15.

Two tasks that both edit `src/app/ledger/[id]/page.tsx` (T07, T08, T09,
T11) will conflict there. Keep those edits small, or run those tasks one
after another.
