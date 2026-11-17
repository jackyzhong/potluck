# Potluck Glow, round 2: implementation handoff

Round 1 of the Glow redesign (tasks T00–T21 in `docs/potluck-glow-redesign/PLAN.md`) built the group page from 24 boards. The screens those boards didn't cover were built by agents without a design, as stand-ins. This folder holds the designs for those screens, plus the new landing page. Nothing here is implemented yet.

It is written for a coding agent whose first job is to **compare these boards with the code on `glow` and write a round-2 task plan**, in the same style as round 1.

## Where this sits

- **Branch state (2026-11-16):** `glow` is not merged into `main` yet. T21 ("Ship") is waiting on the owner. Production's database already has the T04 migration.
- **Round 1 docs:** `docs/potluck-glow-redesign/` on `glow` (README, `docs/01`–`08`, `PLAN.md`, `PROGRESS.md`, `tokens/`). Round 2 reuses all of it: the tokens, components, copy rules and procedures are unchanged.
- **Design language:** the rules in `docs/potluck-glow-redesign/docs/02-design-tokens.md` and `03-components.md` apply. The owner also keeps a "Glow Design Language System" doc (claude.ai, owner-only). Its main rules are summarised under "Design rules" below.
- **Design canvases (owner-only links, for the human):**
  - Landing page: https://claude.ai/artifact/HC6K9TznsHRbjy6Te443hy
  - Remaining screens: https://claude.ai/artifact/6kQjqcWV1ySiz8KCLoYuET

## Folder map

```
README.md          this file: inventory, per-area notes, decisions needed
PROMPT.md          the prompt the owner pastes to start the planning agent
index.html         gallery of all 66 renders (open in a browser)
html/              66 standalone boards (light and dark), inline styles = exact values
screens/           the same 66 boards as PNG (desktop pages at 1x, narrow boards at 2x)
  manifest.json    id, area, theme, viewport, code-today and effort for every board
```

The boards are static HTML with inline styles: read values from them, don't copy their markup. Rebuild with the components in `src/components/glow/` and the token utilities in `src/app/tokens.css`. Every colour in the boards is a token value; where a light and a dark board differ, it's only by token.

All boards use the round-1 sample group "Veld 2026" (`docs/potluck-glow-redesign/fixtures/`), viewed as Jacky unless noted. Numbers that differ from the fixture are worked through under the area that uses them.

## Inventory

Board ids are `NN-name-theme`; each board has a light and a dark twin (the second number). **Effort:** Restyle = same behaviour, new look · Restructure = same data, different container or flow · New = new behaviour, data or page.

| Area | Boards (light, dark) | Code today on `glow` | Effort |
|---|---|---|---|
| Landing page, desktop | 01, 03 | `src/app/page.tsx` (old hero, recoloured in T20) | Restructure + new content |
| Landing page, phone | 02, 04 | same | same |
| Create group, desktop | 05, 13 | `src/app/create-group/page.tsx` + `actions.ts` (name, emoji, currency) | Restructure + **New** (members) |
| Create group, phone | 06, 14 | same | same |
| First visit "Which one are you?", desktop | 07, 15 | `WhichOneAreYou.tsx` (improvised desktop card) | Restyle |
| First visit, phone | 08, 16 | `WhichOneAreYou.tsx`, `ViewerSheet.tsx` | Restyle |
| Group not found, desktop / phone | 09, 17 / 10, 18 | Next's default 404 via `notFound()` in `ledger/[id]/page.tsx` | **New** |
| Group failed to load | 11, 19 | none (no `error.tsx`) | **New** |
| Groups list, phone | 12, 20 | none | **New** (decision B2) |
| Manage members, desktop panel | 21, 27 | `ledger/[id]/UserManagementModal.tsx` (centred modal) | Restructure |
| Manage members: rename and remove | 22, 28 | same (inline rename, inline remove confirm, restore) | Restyle |
| Manage members, phone sheet | 23, 29 | same | Restructure |
| Invite popover, desktop | 24, 30 | `InvitePopover.tsx` | Restyle |
| Invite sheet, phone (link copied) | 25, 31 | `InvitePopover.tsx` | Restyle |
| Viewing-as menu with theme setting | 26, 32 | `ViewerMenu.tsx` / `ViewerSheet.tsx` theme row | Restyle |
| Add payment, desktop / phone | 33, 36 / 34, 37 | `PaymentComposer.tsx` | Restyle + New (impact strip) |
| Payment details | 35, 38 | `PaymentDetails.tsx` | Restyle + New (pair balance line) |
| Edit expense | 39, 45 | `ExpenseComposer.tsx` edit mode | Restyle + small New (save disabled until changed) |
| Shares split | 40, 46 | `SplitBodies.tsx` | Restyle |
| Delete confirmation | 41, 47 | `ExpenseDetails.tsx` inline confirm (D14) | Restyle |
| Discard changes prompt | 42, 48 | `RightPanel.tsx` `DiscardDialog` | Restructure (decision B4) |
| After delete: toast with Undo | 43, 49 | `ToastProvider.tsx`, `Toast.tsx` (no Undo, D15) | Restyle + **New** Undo (decision B3) |
| Expense details, phone sheet | 44, 50 | `ExpenseDetails.tsx` in the sheet | Restyle |
| Balance card states (owe, settled, nothing to settle) | 51, 59 | `BalanceHero.tsx`, `SettleUpPlan.tsx` | Restyle |
| Empty group, desktop / phone | 52, 60 / 53, 61 | `LedgerEmpty.tsx` | Restyle |
| No search results | 54, 62 | `LedgerEmpty.tsx` | Restyle |
| Loading, desktop / phone | 55, 63 / 56, 64 | `ledger/[id]/loading.tsx` | Restyle |
| Search and filters, phone | 57, 65 | `ActivityToolbar.tsx`, `SearchField.tsx` (check what phone shows today) | Restructure or New |
| Tablet: details as a drawer | 58, 66 | `RightPanel.tsx` drawer (640–1023) | Restyle |

"Code today" is a starting point from a quick read, not an audit. Confirm each one before planning.

## Notes by area

### Landing page (01–04)

- Replaces `src/app/page.tsx`. It's a single fluid page: max-width 1200px, 24px side padding (16px on phone). Section anchors: `#features`, `#how`, `#why`, `#github`, `#create`.
- On desktop the nav has four links plus "Create a group". On phone only "Create a group" stays.
- **The screenshots are placeholders.** Each grey box is labelled with what it should show, and carries `data-screenshot="screenshots/<key>-<theme>.png"`. The six keys are `laptop`, `phone`, `hero`, `composer`, `plan` and `viewer`, each in light and dark. Capture them from the real app with the seeded Veld group (round 1's seed script, T01) at the sizes in the labels, and serve the right theme's image (`<picture>` or the theme attribute). Pick sizes and formats that keep the page light.
- The phone screenshot frame is `#14142B` in light and `#33334D` in dark. In dark, cards have no shadow (token behaviour).
- Every "Create a group" button goes to `/create-group`. GitHub links go to `https://github.com/jackyzhong/potluck`.
- Copy is final unless the owner edits it. The "Why I built Potluck" section is the owner's own text.

### Create group (05, 06)

- One card: title and caption, then one gradient card holding the emoji button (64px) and the group name (32px/800, with an n/50 counter). Then "Track balances in [CAD ▾] Canadian dollar", the "Who's in it" member list, and Cancel / Create group (`⌘↵`).
- **New behaviour: members are added at creation.** The first person defaults to the creator and is tagged "You". After creating, that person should become the stored viewer for the new group (`potluck:viewer:{ledgerId}`), so the first-visit prompt is skipped for the creator. Other members can be removed before saving.
- `createLedger` only inserts the ledger today. It needs to insert the members in the same server action, ideally atomically (a SQL function like `save_expense`, or a transaction). Validation needs at least one member, the `LIMITS.memberName` length, and trimmed duplicates.
- Desktop shows a "What happens next" card beside the form. Phone stacks the card and pins "Create group" in a bottom bar (52px).
- The emoji picker is third-party. Keep it and theme it as T20 did, opened from the emoji button.

### First visit (07, 08)

- Before anyone is picked, the hero shows "Group spent" and the group total, with the sub-line "Pick who you are to see your balance". The impact and balance columns are blank (never "N/A"), and the share card's bar is empty. The viewer pill reads "? Choose person".
- The prompt is the viewing-as menu itself, opened automatically: "Which one are you?" with each member's net, then a divider and the bookmark line. On phone it's the bottom sheet. This replaces the separate desktop card in `WhichOneAreYou.tsx`.

### Not found and load error (09–11)

- `app/ledger/[id]/not-found.tsx` and `app/ledger/[id]/error.tsx` (check how this Next version names and wires them: AGENTS.md says to read `node_modules/next/dist/docs/` first). A global `app/not-found.tsx` can reuse the same layout.
- The layout is the wordmark header plus one card: title, one sentence, and two 48px buttons. "Try again" calls the error boundary's reset.

### Groups list (12, phone only)

- "Your groups": groups opened on this device, read from `localStorage`. The app already stores `potluck:viewer:{ledgerId}`; this needs a small index of visited groups (id, title, emoji, last visit). Each row shows the group, member count, who you're viewing as, and your net in that group.
- The net for the second row ("settled up") is invented. The list needs either a light server read per group or cached nets. Plan this as new work, and don't build it until decision B2 is made.
- It restores the phone header's back button (dropped in round 1 under D19), which links here.

### Manage members (21–23)

- Moves from a centred modal into the right panel on desktop (400px basis, like the composer) and the full-height sheet on phone. The design language rules out centred modals.
- Rows: avatar, name (the viewer gets a "You" tag), then text buttons Rename (violet) and Remove (orange). Under them, a "Removed" micro-label with each archived member ("Still on past expenses") and Restore. At the bottom, an inline add field with "Add member", replacing today's separate "Add member" view.
- Board 22 shows the two in-row states. **Rename** turns the row into an input (focus ring), Save (tonal) and Cancel. **Remove** expands an orange strip: "Remove Jonah from the group?", the existing explanation, and Cancel / "Remove Jonah". Keep the current focus handling and Escape behaviour.
- "Kevin" is a sample archived member. He takes avatar slot 1, the same colour as Jacky, which is correct for slot 7.

### Invite and theme (24–26)

- Invite is a 340px popover on desktop and a sheet on phone. It has the "Group link" field (recessed, truncated), "Copy link" (primary; after copying it becomes tonal "Link copied"), and an orange strip "Don't lose this link". `[your-domain]` stands for the real origin: use `location.origin`.
- Theme: a "Theme" row at the bottom of the viewing-as menu, under Manage members, as a System / Light / Dark segmented control. Round 1 used three `menuitemradio` buttons for accessibility inside `role="menu"`. Keep those semantics; only the look changes.

### Payments (33–35)

- Add payment uses the composer shell: the gradient amount card (currency shown as a fixed pill, because a payment uses the group's currency), then "From [You ▾] to [Stephen ▾] on [Today ▾]", "Note (optional)" with an n/50 counter, a status strip with the effect on the viewer ("You pay Stephen · You'll be owed CA$16.38 more"), and Cancel / Save payment.
- The example is prefilled from "Mark paid" (Jacky owes Stephen 16.38 pairwise). Paying it moves Jacky's net from 51.91 to 68.29, so "owed CA$16.38 more" is correct.
- Payment details: the title with a Payment tag, the 44px amount, "date · added by", an impact strip ("You were paid · CA$3.75 in"), the "Matthew paid You" pills, a recessed box with the note and the pair's remaining balance ("Matthew still owes you CA$25.04", which is the hero chip value), then Edit (`E`) and Delete. Payment delete reuses the expense delete confirmation.

### Expense form (39–44)

- **Edit:** the title is "Edit expense", the form opens prefilled in its original split mode, and "Save and add another" is hidden. Delete is a text button at the left. The primary button is disabled and reads "No changes yet" until something changes, then "Save changes". The strip shows the effect of the change ("This doesn't change your balance" with no change).
- **Shares:** each row has avatar, name, a −/count/+ stepper (44px round tonal buttons) and the computed amount. 0 shares means "not included". A header line reads "4 shares between 3 people" with a "One share each" reset, then a remainder note. The example is 64.50 over 4 shares: 32.25 / 16.13 / 16.12.
- **Delete confirmation:** inline in the details panel, replacing the action row. An orange strip: "Delete this expense?", "It'll be removed for everyone, and you'll be owed CA$91.45 less.", then Cancel / Delete expense.
- **Discard prompt:** the board draws it inline at the bottom of the form, the same strip pattern ("Discard changes?" · Keep editing / Discard). Today it's a dialog. See decision B4.
- **Toast:** a 52px white pill (menu shadow, dark-theme border) centred above the footer, with message and a tonal "Undo". The board shows the page after deleting Pizza Badiali. Those numbers are recomputed and check out: net −39.54, chips sum to −39.54, group spent 382.78, running balances follow on. The share bar there is approximate. See decision B3.
- **Phone details:** the 15/16 details panel inside the full-height sheet with a grabber (round 1's Q2 option a).

### States and sizes (51–58)

- **Balance card states:** viewer owes, shown as Alvin: "You owe CA$64.60 · You owe 3 people", chips Stephen −45.17, Angus −11.63, Jacky −7.80, Matthew 0.00, Jonah 0.00, consistent with the fixture. The first three use the strong (ink) tile. Then "You're all settled" (no chips), and the Balances plan card's "Nothing to settle" empty state. Zero-value chips are shown as 0.00 (round 1's B10). Confirm whatever round 1 chose.
- **Empty group:** a centred sentence and one tonal "Add expense" in the table card. The hero shows "You're all settled".
- **No results:** "Nothing matches “sushi”", a hint, and "Clear search and filters".
- **Loading:** skeleton blocks in `--surface-muted-2` with the size and radius of what they replace; the hero skeleton is a neutral card, not the gradient. Pulse opacity 1 → 0.5 → 1 over 1.2s, only under `motion-safe`.
- **Phone search:** a search field under the tabs with a clear button, horizontally scrolling filter chips, and a "2 of 7 match" count line above the list. Check what `ActivityToolbar` shows on phone today before planning.
- **Tablet (820 wide):** the desktop page with the details in a right-hand drawer (420px) over the scrim, radius 28px on the left corners, and a round close button.

## Design rules (from the owner's design language doc)

- One gradient surface per container. Everything else is neutral and tonal. No borders on cards, buttons or inputs. The dark theme has no card or button shadows.
- Two meaning colours only: violet (`--positive`) for positive or incoming, burnt orange (`--negative`) for negative, warning or destructive. Never green or red, and always with a word or sign.
- Primary buttons are ink, never violet. Buttons are filled, tonal or text, never outlined. Every target is at least 44px tall.
- No centred modals for forms or details: side panel on desktop, sheet on phone. Confirmations are inline strips, not dialogs. That's why boards 21–23, 41 and 42 look the way they do.
- No new colours, radii, shadows or fonts. If something's missing, compose it from existing tokens.
- Sentence case, no exclamation marks, buttons one to four words, verb first.

## Decisions needed before building (owner)

| # | Question | What the boards assume |
|---|---|---|
| B1 | Add members while creating a group (needs a server change), or keep creation as name + currency only? | Members at creation |
| B2 | Build the groups list (phone, this device only)? Where does it show on desktop, if anywhere? | Phone only, device-local |
| B3 | Undo on toasts. Round 1 chose "no Undo this round" (D14/D15). Add it now? It needs a soft delete or an undo window. | Undo shown |
| B4 | Discard prompt: inline strip (board 42, per the design language) or keep today's dialog? | Inline strip |
| B5 | Round 1's Q1 (add-expense panel position) and Q2 (phone sheet shape) are still unanswered in `PROGRESS.md`. | Q2 option (a): edge-to-edge sheet |
| B6 | Build round 2 on `glow` before it merges into `main`, or merge `glow` first and start round 2 from `main`? | Owner's call |
| B7 | Landing screenshots: captured by the agent from the seeded dev group, or supplied by the owner? | Captured from the seed |

## Out of scope

- Accounts or sign-in, multi-currency conversion, receipts, edit history (round 1 docs/07 D).
- The round-1 boards themselves: they're built, and only the differences listed in `PROGRESS.md` remain.
