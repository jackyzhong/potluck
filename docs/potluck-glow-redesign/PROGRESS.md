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
| T01 | Seed script | T00b | done | [PR #12](https://github.com/jackyzhong/potluck/pull/12) |
| T02 | Tokens, font, theme plumbing | T00a | done | [PR #15](https://github.com/jackyzhong/potluck/pull/15) |
| T03 | Viewer calculation layer | T00a | done | [PR #14](https://github.com/jackyzhong/potluck/pull/14) |
| T04 | Schema: split mode, weights, created_by | T00a | done | [PR #13](https://github.com/jackyzhong/potluck/pull/13) |
| T05 | Foundation components | T02 | done | [PR #18](https://github.com/jackyzhong/potluck/pull/18) |
| T06 | Viewer state, first-visit prompt | T03, T05 | done | [PR #19](https://github.com/jackyzhong/potluck/pull/19) |
| T07 | Page frame, viewing-as switcher | T06 | done | [PR #20](https://github.com/jackyzhong/potluck/pull/20) |
| T08 | Activity hero, share card | T07 | done | [PR #22](https://github.com/jackyzhong/potluck/pull/22) |
| T09 | Ledger table and list | T07 | done | [PR #21](https://github.com/jackyzhong/potluck/pull/21) |
| T10 | Search and filters | T08, T09 | done | [PR #24](https://github.com/jackyzhong/potluck/pull/24) |
| T11 | Right panel, drawer, sheet | T07 | done | [PR #23](https://github.com/jackyzhong/potluck/pull/23) |
| T12 | Expense details | T09, T11, T04 | in progress (`glow-T12-details`) | |
| T13 | Composer: shell, Equally | T11, T04, T05 | todo | |
| T14 | Composer: Exact, Percent, Shares, Edit | T13 | todo | |
| T15 | Payments: add, details, edit | T11, T09 | todo | |
| T16 | Balances tab | T07, T15 | todo | |
| T17 | Keyboard shortcuts | T10, T12, T14, T16 | todo | |
| T18 | States and edge cases | T16 | todo | |
| T19 | Accessibility and motion pass | T18 | todo | |
| T20 | Home and create-group restyle | T02 | done | [PR #17](https://github.com/jackyzhong/potluck/pull/17) |
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

Coordinator sessions (dispatching, reviewing, merging) use this instead:

```
### YYYY-MM-DD · review T##[–T##] · <model>
**Status:** what was merged into `glow` (PR links), sent back, or dispatched.
**Changed:** anything the coordinator changed itself (fixes on a PR, baseline fixes, PLAN.md).
**Checked:** test / lint / build on merged `glow`; what you re-checked yourself, beyond the workers' logs.
**Next session should know:** what's unblocked, what's in flight (branches, sessions), what waits on the owner.
```

Keep it short. Facts, not a narrative. If something wasn't checked, say so.

---

### 2026-11-13 · review T10, T11 · claude-opus-5-5
**Status:** T11 ([PR #23](https://github.com/jackyzhong/potluck/pull/23)) and T10 ([PR #24](https://github.com/jackyzhong/potluck/pull/24)) merged into `glow`. T12, T13 and T15 dispatched.
**Changed:** resolved the merge conflicts in `page.tsx` and both barrels (`src/components/glow/index.ts`, `src/lib/glow/index.ts`), keeping every side. `FilterProvider` (T10) wraps `GroupFrame`; the `panel` (T11) and `toolbar` (T10) props are both filled.
**Checked:**
- Merged `glow`: npm test ✓ (147 pass) · lint ✓ · tsc ✓ · build ✓.
- Rendered at 1280 with `?e=` set: hero, toolbar, table with the selected row, and the details panel shell all sit as on board 03.
- Panel width: 300px is right for details. docs/03 gives a 400px basis for the composer, which T13 sets.
**Decided:**
- Accepted `history.replaceState` for panel URLs, so browser Back leaves the page rather than closing the panel. The spec doesn't say either way. Revisit in T19 if it feels wrong on phones.
- Accepted T10's call that the phone list ignores filters (D20 gives phones no filter controls).
**Next session should know:**
- T12, T13 and T15 each fill one case in `PanelContent.tsx`, and will conflict there. Keep every side.
- Workers can't name branches `glow/…` (git refuses them while `glow` exists). PLAN allows any name containing the task id.

### 2026-11-13 · T10 · claude-sonnet-5-5
**Status:** done → in review ([PR #24](https://github.com/jackyzhong/potluck/pull/24), branch `glow-T10-search`).
**Changed:**
- `src/lib/glow/filter.ts` + `filter.test.ts` (new, exported from the index): `filterLedger`, `matchesQuery`, `amountQuery`, `participantsByRow`, `resetForViewerChange`. Runs on the rows `viewerLedger` already built, so balances are untouched.
- `src/components/glow/`: `FilterProvider` (+ `useFilters`, one small context holding kind, "with {name}" person and search text, with a 150ms debounce), `ActivityToolbar` (search, filter chips, removable "With {name}" chip), `FilteredHero` (hero with chips wired). `useLedgerView` filters its rows and re-derives the day grouping, so the date shows on the first visible row of each day. `LedgerTable`: empty state and a Balance header tooltip while filtered. `LedgerList`: calls `useLedgerView({ applyFilters: false })`.
- `page.tsx`: `FilterProvider` wraps `GroupFrame`, `toolbar` prop filled, `<BalanceHero />` became `<FilteredHero />`.
**Checked:** npm test ✓ (128 pass) · lint ✓ · build ✓ · seeded Veld on `npm run dev` (port 3217), own browser tab, driven by script:
- As Jacky: `109`, `$109`, `109.74` each leave only Pizza Badiali, balance still CA$78.65 (its full-history value). `write` finds the payment by note. A search with no match shows the empty state; the Balance header gets the tooltip.
- Pressing the Alvin chip shows 5 rows and a "With Alvin" pill (chip `aria-pressed`); the pill clears it. With "Involving me" + "pizza" + the Alvin chip on, switching to Stephen cleared search and person and left "Involving me" on.
- Visual: Stephen with the Alvin filter, light and dark. The browser pane rendered at about 800px wide despite the 1280 emulation, so it is NOT a true 1280 shot; toolbar compared by eye with boards 03/04/23/24 only loosely. Not checked: the exact 1280 layout, a screen reader, keyboard-only use.
**Differs from the boards:** the "With {name}" chip is not drawn on any board (suggested copy in docs/06); I styled it `positive-soft`.
**Decided:**
- Amount queries match from the start of the total (`109` finds 109.74 and 1090.00, `74` finds nothing), over the row total only, not the viewer's impact.
- "With {name}" = viewer involved and the person is the payer, in the split, or the payment's other side.
- The phone list ignores filters (D20 gives no phone controls), so a chip pressed on a phone can't leave a hidden filter on. It also means chips do nothing visible on a phone.
- `FilterProvider` sits in `page.tsx` inside `ViewerProvider`; T11 should add its own wrapper beside it, not replace it.
**New copy:** `Nothing matches these filters.` (empty with filters but no search text); the pill's aria-label `Clear filter: with {name}`.
**Next session should know:** T17's `/` can focus the field through `SearchField`'s `inputRef` (the toolbar doesn't pass one yet). A selected row hidden by a filter stays in `?e=`.

### 2026-11-13 · T11 · claude-sonnet-5-5
**Status:** in progress → in review ([PR #23](https://github.com/jackyzhong/potluck/pull/23)).
**Changed:**
- `src/lib/glow/panel.ts` + `panel.test.ts` (new, pure; 19 tests): `PanelState`, `parsePanel`, `withPanelState`, `transition`, `needsDiscardPrompt`, `discardTitle`, `layoutForWidth`, `isPanelVisible`. Exported from `src/lib/glow/index.ts`.
- `src/components/glow/` (new): `RightPanel` (the three shells and the Discard dialog), `PanelContent` (`PanelHeader` and the placeholder bodies), `usePanel` (`usePanelState`, `usePanelNav`), `panelStore` (dirty flag, pending prompt, opener). Added to the barrel.
- `src/lib/useModalKeyboard.ts`: extended, still backward compatible. New optional third argument `{ escape: "document"|"inside"|"none", trapFocus, getOpener, skipInitialFocus }`, a generic ref type, and a `data-autofocus` preference on open. The opener is now captured once per open in a layout effect (before a native dialog's `showModal()` moves focus), which also fixes it under React's dev double-mount. The old modals are unchanged in behaviour (defaults).
- `page.tsx`: only the `panel` prop (plus one import). `globals.css`: one rule hiding `[data-slot="panel"]` below 1024px (outside the task's file list; see Decided).
**How it works (for T09, T12, T13, T14, T15, T17):**
- **URL shape (D18):** `?e=<id>` is details, `?panel=add` is add, `?e=<id>&panel=edit` is edit. Written with `history.replaceState(null, …)`, which Next syncs into `useSearchParams` with no server round trip. It must be `null` state: passing `history.state` makes Next skip the sync.
- **Rows (T09):** call `usePanelNav().openDetails(id)`. Setting `?e=` by hand also works, and even a dirty form is guarded then (the panel puts the URL back and asks), but `openDetails` is the clean path.
- **Add expense / N / Duplicate (T13, T12, T17):** `nav.openAdd()`. **Edit / E:** `nav.openEdit()`. **After a save:** `nav.dispatch({ type: "saved", id, another? })`; after a delete `{ type: "deleted" }`. Both clear the dirty flag first, so no prompt.
- **Dirty forms (T13, T14):** call `usePanelDirty(isDirty)` in the form. Close, Esc, scrim, swipe down and a row click then ask "Discard this expense?" (add) or "Discard changes?" (edit) with Keep editing / Discard (docs/06).
- **Content (T12/T13):** edit `PanelBody` in `PanelContent.tsx`. Put `data-autofocus` on the first control (details title, composer amount). Use `PanelHeader` for the title row.
- **Layout:** `usePanelLayout()` (inline / drawer / sheet). One shell is mounted at a time; the drawer and sheet are native modal `<dialog>`s in a portal, so focus trap, inert background and Esc come from the browser, and Esc is routed through the guarded close.
**Checked:** npm test ✓ (128 pass, 1 skipped as before; 19 new) · lint ✓ · build ✓ · browser, the built-in one, on the seeded Veld group with `npm run dev` (port 3111, stopped afterwards), with `?e=` set by hand (T09 isn't merged):
- **docs/04 table:** empty to add (the empty card's button); add to empty on Esc/close; empty to details; details to another details; details to edit (Edit button); edit to details on close; close from details to empty. Add from details, Duplicate and "Save and add another" are covered by the unit tests only, because nothing in the page calls them yet.
- **Refresh keeps state:** reloaded on `?e=` at 1280 (inline card) and at 800 (drawer opens on load). A stale `?e=` is dropped from the URL.
- **Focus, inline (1280):** moves to the title on open from a button, returns to the opener on Esc and on close, does not steal focus on a page load, and Esc is ignored when focus is outside the panel.
- **Focus, drawer (800):** into the title on open; back to the opener on Close, Esc (`cancel`) and a scrim click.
- **Focus, sheet (375):** into the title; back to the opener on close; focusing a button behind the sheet is refused (inert); edit opens with focus in the field.
- **Discard prompt:** Esc on a dirty edit (inline), a swipe down on a dirty edit (sheet) and a hand-set `?e=` change while dirty all open it. Esc on the prompt keeps editing, and focus goes back to the field. Discard moves on.
- **Swipe down:** synthetic pointer events only (the pane can't send a touch drag): translateY follows the drag and releasing past 80px closes.
- Not checked: a real touch swipe, a screen reader, Tab cycling by hand (it is the native dialog's trap), light mode, the panel at 1280/390 against boards 15/17 side by side (see Differs), the drawer and sheet transitions (there are none), resizing across a breakpoint with a form open.
**Differs from the boards:**
- Contents are placeholders: details shows only the title, the amount and an Edit button; no impact strip, sentence or split rows (T12). The add and edit bodies are a labelled stub field.
- The inline card is a plain `rounded-hero bg-surface p-5 shadow-card` at the slot wrapper's width (about 300px of the row). Board 15 shows a 440px-wide details panel and docs/03 wants 400px for the composer. The slot wrapper is `flex: 1 1 300px` (T07) and I didn't change it. T13 should size the composer by giving the wrapper or the card a wider basis.
- Seen only in dark, because the dev machine's system theme was dark.
- The sheet has a grabber and no board for the details sheet; boards 17/18 show a padded card on the page background instead. I used the plan's grabber and a full-bleed sheet with a 28px top radius.
- No slide or fade transitions on the drawer or sheet (docs/04 asks for reduced motion to be respected; there is no motion yet).
**Decided:**
- **Branch name:** `glow/T11-panel` can't exist because a local `glow` branch does, so `claude/glow-t11-panel`.
- **Edit URL:** D18 only names `?e=` and `?panel=add`, so edit is `?e=<id>&panel=edit`.
- **A row click while adding or editing:** `?panel=add` next to a new `?e=` means a row was clicked, and details wins. For edit, the id the edit was opened with is remembered in memory; a different `?e=` with `panel=edit` also means a row click. After a refresh the URL is trusted.
- **Close from add** goes back to the details it was opened from, remembered in memory only. After a refresh it goes to empty.
- **replaceState, not push:** opening and closing the panel doesn't add history entries, so the browser Back button leaves the page, not the panel. D19 (no phone back) is separate. Say if Back should close the sheet.
- **Server round trips:** none for panel changes. Tab switching (T07's `router.replace`) still re-renders on the server.
- **Slot wrapper below 1024:** the drawer and sheet render in a portal, so the slot's own wrapper would still reserve a 300px basis. A rule in `globals.css` hides `[data-slot="panel"]` under 1024px. The server render always draws the inline card (the width is unknown there) and CSS hides it on narrow screens, so a phone never sees a flash of it.
- **A breakpoint resize remounts the shell**, so an open form loses its state. Rare; T13 may want to lift the form state into `panelStore` if it matters.
- **Escape:** inline, only when focus is inside the panel (T17's "close the menu, then the panel, then clear search" order is still to build). Drawer, sheet and the Discard dialog use the native `cancel` event, so only the top one closes.
- **`beforeunload`** is armed while a form is dirty (reload and tab close). The browser Back button isn't guarded.
**New copy:** the empty panel's "Add expense" button is docs/06's label; "Select an expense to see how it was split." is docs/06's. Placeholder only: "Placeholder field (the composer arrives in T13)", and "Details" / "Payment" as fallback titles. "Discard this expense?", "Discard changes?", "Keep editing" and "Discard" are docs/06's.
**Next session should know:**
- T09 must show `aria-selected` and highlight from `?e=` (use `usePanelState()` or read the param). Add shows no selection by design: `?panel=add` has no `e`.
- Dev data: the seeded group was reseeded at the start (`seed-dev.mjs`) and not modified since.
- The browser pane is shared with other workers; one of my tabs showed another worker's port. I only drove my own (port 3111).

### 2026-11-13 · review T08 · claude-opus-5-5
**Status:** T08 ([PR #22](https://github.com/jackyzhong/potluck/pull/22)) merged into `glow`. T11 is still running.
**Changed:** resolved the merge conflict with T09 in `page.tsx` (imports, and the slot comment) and in `src/components/glow/index.ts`, keeping both sides.
**Checked:**
- Merged `glow`: npm test ✓ (117 pass) · lint ✓ · build ✓.
- Rendered the merged page at 1280 as Jacky. The hero (CA$51.91, five chips), "So far" and the ledger table sit together as on board 03. Only search and the panel are missing.
**Decided (accepting the worker's call):**
- A net of 0 caused by offsetting debts shows "You're all settled" with no amount but keeps the chips and sub-line, rather than hiding real debts.
- The phone hero shows the sub-line (docs/07 A3).
**Next session should know:** T10 passes `onSelectPerson` and `selectedPersonId` to `BalanceHero` to wire the chip filter.

### 2026-11-13 · T08 · claude-sonnet-5-5
**Status:** done → in review ([PR #22](https://github.com/jackyzhong/potluck/pull/22)).
**Changed:**
- `src/components/glow/`: `BalanceHero`, `PersonChips`, `ShareOfSpendCard` (all in the barrel). `BalanceHero` and `ShareOfSpendCard` read `useViewer()` / `useGlowData()` themselves; `PersonChips` is presentational (`chips`, `members`, `currency`, `onSelect`, optional `selectedId`).
- `src/lib/glow/hero.ts` + `hero.test.ts`: `heroCopy` (label and sub-line for owed, owe, settled; docs/06) and `heroScale` (amount shrinks past 9 characters). One export line added to `src/lib/glow/index.ts`.
- `page.tsx`: only the `summary` prop (hero and share card on the Activity tab).
- Branch is `glow-T08-hero`, not `glow/T08-hero`: git can't create a ref under `glow/` while the branch `glow` exists.
**Checked:** npm test ✓ (117 pass, 1 skipped) · lint ✓ · build ✓ · visual, seeded Veld on `npm run dev`, built-in browser:
- Jacky desktop 1280 dark and Stephen desktop 1280 light; Jacky phone 390 light; Alvin phone 390 dark (owe state, shortfall bar). Not shot: desktop 1280 in the other theme for each viewer, phone light for Stephen.
- Numbers read from the DOM: Jacky hero CA$51.91, "4 people owe you · you owe Stephen", chips +28.79 +25.04 +7.80 +6.66 −16.38, bar aria "You paid CA$151.74 of the group's CA$492.52; your share is CA$85.59", widths 17.4% + 13.4%. Stephen CA$185.41, "Everyone else owes you", chips +45.17 +45.16 +45.16 +33.54 +16.38, 17.4% + 37.6%, paid CA$271.00. Both match boards 03/23 and docs/01.
- Owe chip avatar uses the dark tile colour; no horizontal overflow at 390. Font size 60px desktop, 54px phone; with `--hs` 0.75 it gives 40.5px (scaling CSS works). Scaling math is unit-tested.
- Neutral state (no viewer yet) seen: "Choose who's viewing", and the share card says to pick someone. The loading skeleton is written but I never caught it by eye.
- Not checked: the settled state (the seed has nobody settled) and long amounts in the browser, both covered by unit tests only; chip click does nothing yet (by design); a screen reader; keyboard focus rings by eye.
**Differs from the boards:** board 01/02 has no hero sub-line on phone; I show it (docs/07 A3). Not compared pixel for pixel. Fewer than 5 chips sit in the left columns of the 5-column grid (spec).
**Decided:**
- Net 0 with offsetting debts: label "You're all settled", no amount, but chips and the owes/owe sub-line stay (the doc says no chips; hiding real debts seemed worse).
- "Everyone else" counts other members except archived ones the viewer is square with; two-person groups use the name instead.
- "Still to cover" is a hatched segment of the bar; the "You paid" legend loses the positive colour in that case.
**New copy:** "Choose who's viewing", "Pick a person to see who owes whom.", "Choose who's viewing to see your share.", "You owe everyone else" (mirror of docs/06), chip aria-label "{name}, owes you {x}" / "{name}, you owe {x}", bar label suffix ", and {x} of it is still to cover", list label "Balances by person, press to filter".
**Next session should know:**
- The Browser pane is shared between parallel workers: another session's navigation moved my tab mid-check. Open your own tab (`tabs_create`) and pass its `tabId` on every call.
- T10: pass `onSelectPerson` and `selectedPersonId` to `BalanceHero`; today the page renders it with no props.
- The gradient tokens include a base colour layer, so use `[background:var(--gradient-glow)]`, not `bg-[image:...]`.

### 2026-11-13 · review T09 · claude-opus-5-5
**Status:** T09 ([PR #21](https://github.com/jackyzhong/potluck/pull/21)) merged into `glow`. T08 and T11 are still running.
**Checked:**
- Merged `glow`: npm test ✓ · lint ✓ · build ✓.
- Rows come from `forViewer.ledger`, nothing is recomputed, `<Money>` is used throughout, and selection only writes `?e=` while keeping other params.
**Next session should know:**
- Until T12 and T15 land, `glow` has no way to edit or delete an expense or payment, because the old cards that did it are gone. That's expected on the integration branch. Don't ship before T12 and T15.
- Workers were sent here as background subagents, not sessions, because sessions can't be started from an automatic turn. Several workers share one browser pane: open your own tab and batch navigate+actions.

### 2026-11-13 · T09 · claude-sonnet-5-5
**Status:** done → in review ([PR #21](https://github.com/jackyzhong/potluck/pull/21)).
**Changed:**
- `src/components/glow/`: `LedgerTable` (desktop, a real `<table>`), `LedgerList` (phone), `useLedgerView` (shared: rows from `useGlowData().forViewer.ledger`, day grouping, titles, `?e=` read and write), `LedgerEmpty`. Exported from the barrel.
- `src/app/ledger/[id]/page.tsx`: only the `ledger` prop now renders `LedgerTable` (hidden below 640px) and `LedgerList` (hidden from 640px). Removed the `ExpenseCard`/`PaymentCard` render and the lines that only fed it (`activity`, `splitsByExpense`, and the `Expense`, `Payment` imports). The card files are still in place for T21.
- Clicking a row (or its description button) does `router.replace` with `scroll: false`, sets `?e=<id>` and keeps other params. The row whose id matches `?e=` gets the selected styling. Nothing opens: T11 does.
**Checked:** npm test ✓ (108 pass, 1 skipped) · lint ✓ · build ✓ · tsc ✓.
- Ran against the seeded dev group on port 3190. Every row's date, payer, total, impact and balance match `fixtures/expected.json` for Jacky (7 rows) and Stephen (7 rows, two "not involved"). Payments show "CA$x in" per docs/05, where expected.json holds the signed value.
- Visual: Stephen, desktop 1280 in light and dark, and phone 390 in light and dark, with a selected row. Compared by eye with boards 23/24 and 01/02. Not checked: Jacky's view by screenshot (numbers only), board 03/04 side by side at pixel level.
- At 660px the table wrapper scrolls (scrollWidth 616 over clientWidth 612) and the document doesn't overflow. Table `min-width` is 600px.
**Differs from the boards:** nothing noticed beyond what T08/T10/T11 still have to fill (hero, toolbar, panel). Dates use the browser's local timezone.
**Decided:**
- Branch is `claude/glow-t09-ledger`: git refuses `glow/T09-ledger` while a `glow` branch exists.
- Both layouts are in the DOM, switched by CSS, so there is no flash on load. The ledger renders an empty card until the saved viewer is read.
- Selection uses `aria-selected` on the table row as docs/03 says (a bare `<tr>` doesn't strictly allow it; T19 may revisit) and `aria-current` on the phone row button.
- Impact "in"/"out" comes from whether the viewer is the payee/payer.
**New copy:** "Pick who you are to see your numbers." (shown when the first-visit prompt was dismissed and nobody is picked). "Nothing here yet. Start by adding an expense!" is the old page's string, kept.
**Next session should know:**
- Until T12 and T15, the page has no edit or delete for expenses and payments (those lived on the removed cards).
- No pagination or virtualisation yet (docs/03 asks to plan for it).
- The browser pane is shared: other sessions navigate its default tab. Use your own tab and put navigate plus JS in one `browser_batch`.

### 2026-11-13 · review T07 · claude-opus-5-5
**Status:** T07 ([PR #20](https://github.com/jackyzhong/potluck/pull/20)) merged into `glow`. T08, T09 and T11 dispatched in parallel.
**Checked:**
- Merged `glow`: npm test ✓ (108 pass) · lint ✓ · build ✓.
- Ran the branch myself at 1280. The header matches board 03's layout, and the viewer menu in dark matches board 20 (rows, nets, the tick on the current viewer).
- I didn't check the phone sheet in dark or the swipe gesture. The worker didn't either.
**Next session should know:**
- T08, T09 and T11 each fill one `GroupFrame` slot prop in `page.tsx` (see T07's log). Expect small `page.tsx` conflicts when merging them: keep every side's slot.
- T07 changed `Button` to pass `ref` through.

### 2026-11-13 · T07 · claude-sonnet-5-5
**Status:** done → in review ([PR #20](https://github.com/jackyzhong/potluck/pull/20)).
**Changed:**
- `src/app/ledger/[id]/GroupFrame.tsx` (new, client): the page frame. Header, tabs, the slots (below), `PhoneActionBar`, `ShortcutFooter`, and the open state of the three old modals (Add expense, Add payment, Manage members). `page.tsx` now returns `<ViewerProvider><GroupFrame …/></ViewerProvider>` and fills the slots with today's content.
- `src/components/glow/` (new): `GroupHeader`, `GroupTabs` (+ `useGroupTab`, `parseTab`), `InvitePopover`, `PhoneActionBar`, `ShortcutFooter`, `ViewerPill` (+ `ViewerAvatarButton`), `ViewerMenu`, `ViewerSheet`, `ViewerChoices` (the list both share), `ViewerSwitcher` (state and focus return), `useDismiss`, `useIsPhone`. Added to the barrel; three icons added to `icons.tsx` (chevron, close, people).
- `UserManagementModal.tsx`: restyled with token utilities, `Avatar` for the members, 44px buttons. The state, handlers, server actions, `alert()`/`confirm()` and `useModalKeyboard` use are untouched.
- Removed `ActionMenu.tsx` and `LedgerTabs.tsx` (both replaced).
- Outside the task's file list, one line: `Button.tsx` takes a `ref` prop (React 19 passes it through to the `<button>`), because the Invite popover and the viewer menu return focus to a Button.
**Slots (for T08, T09, T10, T11, T16).** `GroupFrame` props. Each task fills one and edits only that prop in `page.tsx`:
- `summary` (T08): wrapper is `flex flex-wrap gap-4 px-6`. Give the hero `flex: 3 1 560px` and the share card `flex: 1 1 280px`.
- `toolbar` (T10): wrapper is a wrapping flex row, hidden below 640px (D20).
- `ledger` (T09): wrapper is `flex: 999 1 560px; min-width: 0`. It holds today's card list in a `max-w-2xl` column. Replace it, and drop that column.
- `panel` (T11): wrapper is `flex: 1 1 300px`, rendered only when you pass something. T11 decides what shows at each width, so the wrapper doesn't hide itself below 1024px.
- `balances` (T16): the whole Balances tab, in a `max-w-2xl` column today.
- `tab` is the server's reading of `?tab=`, and the page passes only the active tab's nodes.
**Checked:** npm test ✓ (108 pass, 1 skipped as before) · lint ✓ · build ✓ · visual, on the seeded Veld group with `npm run dev`, in the built-in browser:
- Desktop at 1280 (emulated, shown scaled to the pane): header in light and dark, viewer menu open in light and dark. Compared with boards 03/04 and 19/20: pill, buttons, divider, tabs, menu size, rows, ticks and every net figure match (Jacky +51.91, Stephen +185.41, Angus −5.31, Alvin −64.60, Matthew −81.83, Jonah −85.58).
- Phone at 390: header and the action bar in light and dark, the viewer sheet in light, the Invite popover, the Manage members modal, Balances. Compared with boards 01/02 and 21: header, tab row, sheet radius, grabber, 44px close, 56px rows, bar all match.
- Also seen at 760 (wraps as docs/04 describes, no footer, no horizontal scroll).
- Done when:
  - **Switcher:** picking a person closes the menu, saves the viewer, announces "Now viewing as …", and puts focus back on the pill. Esc and an outside press also close it. Arrow keys, Home/End and type-ahead work (`m` → Matthew). On a phone it opens the sheet, and Esc returns focus to the avatar button.
  - **Tabs:** `?tab=balances` switches the tab and survives a reload. Other params are kept when switching.
  - **Theme:** System/Light/Dark switches `data-theme`, saves `potluck:theme`, and the menu reflects the saved value on reopening.
  - **Manage members:** from the menu on desktop and from the sheet on phone. Add (Zed), rename (Jonah → Jonah B → Jonah), remove, and restore (Angus, who has history) all work. Removing Zed, who had no history, deleted him outright, as `remove_member` does. Esc closes the modal and returns focus to the avatar button.
  - **Old modals:** Add expense and Add payment both open from the phone bar. The bar hides while a sheet or modal is open.
  - **Invite:** the popover shows the link and the reminder. "Copy link" shows "Link copied" with the docs/06 status line (checked with a stubbed clipboard, because the pane's own clipboard refused the write, which exercised the "Couldn't copy" fallback too).
- Not checked: a screen reader; the sheet's swipe-down (the pane can't send touch drags; the pointer handlers are written but untested); the phone sheet and the Invite popover in dark; focus rings by eye; the footer's `hover: none` rule on a real touch device; the page with a hover-less pointer at ≥1024.
**Differs from the boards:**
- The content below the header is still today's old cards (zinc-era styling in white cards, which stay white in dark), until T08/T09/T11 land.
- No back button on phone (D19), so the emoji sits at the left edge.
- Tabs on phone sit inside the same header element, so the side margin is the header's 16px, not a separate margin. Same pixels.
- Boards don't draw the Invite popover, the Theme row, or the no-viewer states. They are my designs from the tokens.
- No slide-up animation on the sheet, and no popover fade (docs/04 wants reduced motion respected; there is none to respect yet).
- The "Manage members" modal has no board. Its sheet-like phone placement is my choice.
**Decided:**
- **Theme row** sits under "Manage members" in both the menu and sheet, as three `menuitemradio` buttons in a group (a real tablist can't live inside `role="menu"`). Arrow keys move through it like the member rows.
- **No viewer yet / still loading:** the pill shows a neutral "?" avatar. While `status === "loading"` it prints no name, so a returning visitor never sees a flash of wrong wording. With nothing picked it says "Choose person", and the phone sub-line under the title is left out. Both are a viewer-less state docs/06 doesn't cover.
- **Menu vs sheet** is chosen by `useIsPhone()` (matchMedia, < 640) only when something is opened; the pill/avatar button and every layout difference are CSS.
- **Two `SegmentedControl`s** (desktop 40px, phone 44px full width) shown by CSS, because the control takes its size as a prop. The hidden one is `display: none`.
- **`UserManagementModal`'s title** is now "Manage members" (matches the menu entry), and its buttons are sentence case ("Add group member"). The member avatars use `memberSlots()` directly, so the modal doesn't need the viewer context.
- **Footer** shows at ≥1024 with a hover-capable pointer only, as docs/03 says (hidden below the desktop breakpoint and on touch).
**New copy:** Invite popover: "Share this group", "Anyone with the link can view and add expenses. Don't lose the link to this page: bookmark it.", "Copy link", "Link copied", "Couldn't copy. Select the link above and copy it." ("Link copied. Anyone with it can view and add expenses." is docs/06's). "Theme", "System", "Light", "Dark". "Choose person" and the aria-label "Choose who is viewing, switch person". "Group link" (the readonly input's label). "Manage members" as the modal title.
**Next session should know:**
- T08/T09/T11 only edit their own prop in `page.tsx`. `GroupFrame` is a client component, but the nodes you pass in are server-rendered, so a slot component can be a server or client component.
- The members modal's `Escape` and `useModalKeyboard` return focus to whatever had focus when it opened. `ViewerSwitcher` makes that the avatar button on purpose (it waits for the menu or sheet to close first); keep that order if you move the modal.
- Removing a member with no expenses or payments deletes them (the `remove_member` function); only members with history are archived. Test archive/restore with someone who has rows.
- I reseeded Veld after testing (added and renamed members), so the dev group is back to the fixture.
- Dev server was started and stopped by port (3107).

### 2026-11-13 · review T06 · claude-opus-5-5
**Status:** T06 ([PR #19](https://github.com/jackyzhong/potluck/pull/19)) merged into `glow`. T07 dispatched.
**Changed:**
- **Coordinator slip, now fixed.** The first merge attempt used the branch name from the worker's note, which was missing its `-impl` suffix. The merge silently did nothing, and commit `d5d045c` marked T06 done without its code. It was then merged for real. Coordinators: take the branch from `gh pr view N --json headRefName`, never from a report, and check `git merge-base --is-ancestor origin/<branch> HEAD` before marking anything done.
- `scripts/resolve-progress-conflicts.py`: board conflicts now go to the side that is further along (todo < blocked < in progress < in review < done), instead of refusing whenever both sides changed a row.
**Checked:**
- Merged `glow`: npm test ✓ (108 pass) · lint ✓ · build ✓.
- The saved viewer is read through `useSyncExternalStore`: the server render shows `loading`, so there's no hydration mismatch.
- Only the per-viewer numbers rerun when the viewer changes.
- `setViewer` refuses archived and foreign ids.
**Next session should know:**
- Use `useViewer().status === "loading"` to keep wording neutral before the saved viewer is read.
- `useGlowData().forViewer` is null until a viewer is picked.

### 2026-11-13 · T06 · claude-sonnet-5-5
**Status:** done → in review ([PR #19](https://github.com/jackyzhong/potluck/pull/19)).
**Changed:**
- `src/lib/glow/viewer.ts` + `viewer.test.ts` (new, pure): `viewerStorageKey`, guarded `readStoredViewer` / `writeStoredViewer` / `browserStorage`, `buildMemberOrder`, `pickableViewers`, `resolveViewer` (the docs/04 fallback rules). Re-exported from `src/lib/glow/index.ts`.
- `src/components/glow/ViewerProvider.tsx` (client): `ViewerProvider`, `useViewer()`, `useGlowData()`.
- `src/components/glow/WhichOneAreYou.tsx` (client): the D3 first-visit sheet, self-contained. Both are in the `components/glow` barrel.
- `src/app/ledger/[id]/page.tsx`: wrapped the returned tree in `<ViewerProvider>` (import plus one wrapper; the page is still a server component and still does the reads; inner JSX not re-indented, to keep the diff small for T07).
**Checked:** npm test ✓ (108 pass, 1 skipped as before; 18 new) · lint ✓ · build ✓ · visual:
- Prompt compared with board 21 (phone sheet) at 390 wide, light and dark: layout, 36px avatars, 56px rows, 44px close, grabber, 28px top radius all match. Desktop card seen at about 800 wide, dark. Not shot at 1280 or on phone with the OS in dark.
- Done-when, on the seeded Veld group with `npm run dev`:
  - Prompt shows with nothing stored, not with a valid stored viewer, after a reload too.
  - Picking Stephen saves `potluck:viewer:{id}`, shows no prompt, and the numbers equal the board 23 values (chips 45.17 / 45.16 / 45.16 / 33.54 / 16.38, bar 17.4% + 37.6%, paid CA$271.00).
  - Switching to Alvin changed top-row balance, impact, share bar and chips with 0 fetches and 0 new resource requests. (Checked with a throwaway probe component calling `useViewer()` / `useGlowData()`; deleted before commit.)
  - Stored unknown id, and a stored archived member (archived Angus in dev, then reseeded): no crash, prompt shows, `memberOrder` still has all 6, the archived member isn't offered.
  - Storage that throws on read and write: no error, and a pick still applies for the visit (in-memory fallback).
  - Esc dismisses the prompt and stores nothing; the old Add Expense modal still opens afterwards.
- Not checked: a screen reader (the "Now viewing as …" live region is in the DOM and its text was read back); focus return after the prompt closes (nothing opened it, so there is nothing to return to).
**Differs from the boards:** the prompt has no board. It follows board 21 with the heading, hint and a bookmark line; the desktop card is my choice. No swipe-down to close (T11/T07 own the shared sheet).
**Decided:**
- **Archived or deleted stored viewer shows the prompt**, like "nothing stored" (docs/04: "fall back as below"). I don't silently pick another member, because that would show someone else's balances as "yours". The stale value is left in storage until a pick overwrites it.
- **Dismissing** (Esc, scrim, ✕) hides the prompt for this page load only and stores nothing; `viewerId` stays null and the page keeps neutral wording (D3). T07's pill should offer a way back to picking.
- **`status: "loading"`** on the server render and first client render (storage isn't readable there). The saved id is read through `useSyncExternalStore`, so no hydration mismatch and no effect+setState. Viewer-relative UI should show neutral wording while `loading`. It also syncs across tabs via the `storage` event.
- **`useGlowData()`** returns `{ data, currency, slots, totals, forViewer }`. `data`, `slots`, `totals` depend only on the rows; `forViewer` is `null` with no viewer, else `{ ledger, pairs, chips, counts, share }` from T03, recomputed only when the viewer or rows change. `memberOrder` is built from `users` with archived members included, in the same order as the avatar colours (`memberSlots`).
- `setViewer(id)` ignores ids that aren't a current member and announces "Now viewing as {name}" in an `aria-live` region (docs/04), so T07's menu gets the announcement by calling it.
- The sheet shows each member's group net ("gets back …" / "owes …" / "settled up", docs/06) like the viewer menu, using `Money`.
- The page passes the same rows to `ViewerProvider` as to the existing client components, so they are serialised twice. Fine at this size.
**New copy:** "Bookmark this page. The link is how you get back to this group." (D2 says the prompt mentions bookmarking; docs/06 has no string). The heading, hint, "gets back / owes / settled up", "Close" and "Now viewing as {name}" are from docs/06.
**Next session should know:**
- T07: use `useViewer()` for the pill (`viewer`, `pickable`, `setViewer`) and `useGlowData().totals` for each member's net. The first-visit sheet stays separate from your `ViewerSheet`; delete or fold it in later if you want one component.
- T08 and the rest: numbers come from `useGlowData().forViewer` (null until a viewer exists). `forViewer.ledger` is `viewerLedger`'s output, in that function's order.
- Dev server was started by port (`PORT=3106`) and stopped by port.

### 2026-11-13 · review T05, T20 · claude-opus-5-5
**Status:** T05 ([PR #18](https://github.com/jackyzhong/potluck/pull/18)) and T20 ([PR #17](https://github.com/jackyzhong/potluck/pull/17)) merged into `glow`. T06 dispatched.
**Changed:** nothing beyond the merges. The only conflict was the PROGRESS.md board, resolved by script.
**Checked:**
- Merged `glow`: npm test ✓ (91 pass) · lint ✓ · build ✓.
- T05:
  - The gallery is gated on `VERCEL_ENV`.
  - `formatMoney` throws on non-integer cents and uses U+2212.
  - `memberSlots` counts archived members.
- T20: no raw colour classes left in `/` or `/create-group`, and layout and copy are unchanged.
- Not re-checked by eye: the T05 gallery in dark at 1280 (the worker didn't either). It's on the `glow` Preview at `/dev/glow` for the owner.
**Next session should know:**
- `memberSlots` sorts `created_at` as strings, while T03's `events` parses instants. Both are fine for rows from one database. If an avatar order ever looks wrong, that's why.
- T07 is next after T06.

### 2026-11-13 · T20 · claude-sonnet-5-5
**Status:** done → in review (PR link on the board row).
**Changed:**
- `src/app/page.tsx`, `src/app/create-group/page.tsx`: every `zinc-*`, `white`, `black` and `green-*` class is now a token utility (`bg-bg`, `bg-surface`, `bg-surface-sunken`, `text-text`, `text-text-muted`, `border-line-strong`, `shadow-card`, `shadow-menu`, `bg-button-primary-bg`, `bg-button-disabled-bg`, …). Layout, copy and radii are unchanged (D22). No `dark:` variants.
- Create-group: the emoji picker is third-party and can't read tokens, so the page tells it which theme is showing when it opens (`data-theme` on `<html>` if set, else the OS).
**Checked:** npm test ✓ (77 pass, 1 skipped) · lint ✓ · build ✓ · visual:
- `/` at 1280 and 390, light and dark (`data-theme` set by hand); `/create-group` at 390 dark and 1280 light, plus the currency dropdown and emoji picker open in light and dark.
- OS dark with nothing stored (`potluck:theme` removed, reloaded): `--bg` is `#0F0F1A`, emoji picker is dark.
- Plus Jakarta Sans shows on both pages.
- Created a group through the UI against dev, which redirected to its ledger page. Deleted it afterwards (dev's only ledger is "Veld 2026"). Production not touched.
- Not checked: `/create-group` at 1280 dark and 390 light as separate screenshots (same classes, covered by the others); keyboard focus order beyond the focus rings seen.
**Differs from the boards:** n/a, no boards for these pages.
**Decided:**
- The "v0.1.0 Alpha" pulse dot was green, which the tokens don't have. It's `accent` (violet) now, in line with the "no green and red" rule in docs/02.
- Shadows: the old `shadow-xl shadow-zinc-200` on the two primary buttons became `shadow-button`; the card uses `shadow-card`; the dropdown and emoji picker use `shadow-menu`.
- Primary button hover is `hover:opacity-90` (there's no hover token).
- Added `placeholder:text-text-muted` and `text-text` on the inputs, because the old hard-coded `text-black` would be unreadable on a dark field.
**New copy:** none.
**Next session should know:** the emoji picker's own palette (grey in dark) isn't a Glow token; replacing it is out of scope. The picker is placed with the existing `absolute mt-32` and overlaps the card at 390 wide, as it did before.

### 2026-11-13 · T05 · claude-sonnet-5-5
**Status:** done → in review ([PR #18](https://github.com/jackyzhong/potluck/pull/18)).
**Changed:**
- `src/components/glow/`: `Avatar`, `Money`, `Kbd`, `Button`, `SegmentedControl`, `FilterChips`, `SearchField`, `Switch`, `StatusStrip`, `Toast`, plus `icons.tsx` (search, check, alert) and an `index.ts` barrel. Only `SegmentedControl` is a client component (`"use client"`, for roving focus); the rest have no hooks and work from server or client code.
- `src/lib/glow/money.ts` + `money.test.ts`: `formatMoney(cents, { currency, signed, compact })` and `moneyTone`. Integer cents in, U+2212 minus, throws `RangeError` on a non-integer.
- `src/lib/glow/avatar.ts` + `avatar.test.ts`: `memberSlots(members)` (slot 1–6 by `created_at` order, id as tie-break), `fallbackSlot(id)`, `initialOf(name)`.
- `src/lib/glow/index.ts`: two `export *` lines for the above. (T03's file; the only change outside the task's own files.)
- `src/app/dev/glow/page.tsx` (the gate) and `gallery.tsx` (client; every variant, drawn in a light panel and a dark panel, each pinning its own `data-theme`).
- `globals.css` and `tokens.css` untouched.
**Checked:**
- npm test ✓ (91 pass, 1 skipped as before; 14 new) · lint ✓ · build ✓.
- Gate, with `next start` on real builds: unset `VERCEL_ENV` 200 · `VERCEL_ENV=preview` 200 · `VERCEL_ENV=production` 404.
- Gallery, in the built-in browser, at 1280 and 390, light and dark: every variant renders and there is no horizontal overflow at either width. No console errors. Setting `data-theme` on `<html>` switches the page chrome (`--bg`, `--text`).
- Measured in the page: `Money` text is U+2212 with `font-variant-numeric: tabular-nums` and no hyphen-minus; buttons are 44/48/52 high, tabs 40/44, icon button 44 × 44, switch 46 × 28.
- Behaviour, tried in the page: Left/Right/End/wrap on the tablist with roving tabindex; the switch toggles `aria-checked`; a disabled button keeps `aria-disabled`, stays focusable and ignores clicks; `StatusStrip` and `Toast` carry `role="status"` and `aria-live="polite"`, the error toast `role="alert"`.
- Not checked: a screen reader; the focus ring by eye; contrast numbers (relied on the tokens' documented AA pairs, except the switch's off track, below).
**Differs from the boards:**
- 1280 screenshots: the Browser pane is about 800px wide and crops an emulated 1280 viewport, so I saw the left (light) column of the two-column gallery and checked the dark column at 390. Layout at 1280 was measured, not seen.
- Not compared pixel for pixel with `screens/*.png`: no board shows these components in isolation. Sizes, radii, weights and spacing were taken from the `html/` boards (03, 05, 07, 09, 11, 15, 17).
- Nothing else noticed.
**Decided:**
- **Avatar:** takes `name` and `slot` (from `memberSlots()` over every member, archived ones included), not a `Member` object, so it stays presentational. The caller computes the slot map once per group. Without a slot it falls back to a stable hash of `id`.
- **Money:** `compact` implies a sign ("+28.79", "−16.38"), matching docs/05. Leaving `tone` out inherits the surrounding colour, which the gradient card needs.
- **Button:** `disabled` sets `aria-disabled` rather than the native attribute, per docs/03. It swallows `onClick` and `preventDefault`s so a disabled submit button doesn't submit. `inPanel` picks the `--surface-muted-2` fill for `soft`. `kbd="N"` draws a hidden-from-AT key cap. `variant="icon"` requires `aria-label` in the types.
- **SegmentedControl:** arrow keys select as well as move focus. `variant="pill"` (`size` 40/44, `fill`) and `variant="split"` cover the two designs. `id` is optional; when set it wires `aria-controls` for a panel.
- **Switch off state:** the boards draw only the on state. Off is `--text-muted` track with a `--surface` knob, which keeps the track 3:1 against the page in both themes. Change it if the owner draws something else.
- **Toast:** `success` (polite status, inverse colours with a check) and `error` (assertive alert). D15 keeps errors inline this round, so `error` is unused for now. It doesn't position, time out or queue; T18 does that.
- **Branch name:** `glow/T05-…` can't exist next to the `glow` ref, so this uses the harness branch `claude/glow-t05-components-1b2e26`, which PLAN allows.
**New copy:** none in the product. Gallery-only text: "Couldn't save. Try again" (error toast demo), "Expense added" (from docs/06), and the gallery's own headings and notes.
**Next session should know:**
- **The gradient tokens only work in the `background` shorthand.** `--gradient-glow` and `--gradient-glow-compact` end in a bare colour layer (`…, var(--glow-base)`), which `background-image` rejects, so `bg-[image:var(--gradient-glow)]` silently renders nothing. Use `[background:var(--gradient-glow)]` (as the gallery does). T08 and T13 need this.
- No type-size utilities exist. Components use `text-[length:var(--text-body)]` and the like; a few use the plain Tailwind sizes only where a token exists as a utility (`rounded-md` for kbd, `size-7/8/9`).
- Add new components to the barrel `src/components/glow/index.ts` and a section to the gallery's `Everything` component. Each section renders twice (light and dark), so keep state inside it.
- Hide-on-touch for `Kbd` is `@media (hover: none)`, so it also hides under the Browser pane's mobile emulation. That is why 390 screenshots show no key caps.
- `Money` throws on a fractional amount. That is deliberate (T03's functions return integers), but a bug upstream will show as a crashed render, not a rounded number.
- Dev server, if started by hand, must be stopped by port (`lsof -tiTCP:<port>`), not `pkill -f "next dev"`, which kills other sessions' servers.

### 2026-11-13 · coordinator docs · claude-opus-5-5
**Status:** done. No product code changed. The build no longer depends on any chat thread.
**Changed:**
- PLAN.md:
  - "Start here" (the two roles).
  - "Coordinating the build": finding the state, choosing tasks, the collision table, the brief template, the review checklist, merging, before you stop, and what only the owner does.
  - "Access and tools": GitHub, env vars, Supabase including four ways to apply a migration to dev or hand it to the owner, Vercel, and what to do when a tool is missing.
  - Branch names may carry a harness prefix.
- `scripts/resolve-progress-conflicts.py`: the PROGRESS.md conflict resolver used for the T01–T04 merges.
- `scripts/check-dev-env.mjs`: confirms `.env.local` points at dev and the key works, without printing it.
- Coordinator log template above.
- `AGENTS.md`, `docs/HANDOFF.md`, the Glow `README.md`: point at the above.
**Checked:**
- Resolver tested on a synthetic conflict. `check-dev-env.mjs` passes against dev.
- Vercel is the only check on PRs (no `.github/`).
- A fresh Sonnet agent with no chat history coordinated from the repo alone. It found the state, picked T05, and wrote a correct brief. It also reported gaps, and these are fixed in this commit:
  - **Board edits:** claiming now happens on the task branch only. The coordinator no longer edits a task's row on `glow` before merging, so the same row is never changed on both sides.
  - **Dev page:** T05's gallery is gated on `VERCEL_ENV`, not `NODE_ENV`. Previews are production builds, so it would otherwise 404 on the `glow` Preview.
  - **T05 scope:** avatar colours count archived members; `Toast` is presentational only (T18 wires it).
  - **Collision table:** rows for `src/components/glow/` and the gallery, plus a rule for `globals.css`.
  - **Worktrees:** what to do when `glow` is checked out in another worktree.
  - **Migrations:** the history row's `name` and `statements`, a `psql` option, and "ask the owner" as the fallback.
  - **Smaller fixes:** model names, a stale header line, and the empty-decisions case in the brief template.
**Next session should know:** a coordinator in any harness starts at `AGENTS.md`. Next up is T05, with T20 alongside if wanted. The finished T01–T04 worktrees under `.claude/worktrees/` can be removed.

### 2026-11-13 · review T01–T04 · claude-opus-5-5
**Status:** T01–T04 merged into `glow` (PRs #12–#15).
**Changed:**
- Before merging, made lint a clean gate on `glow`: a scoped `eslint-disable` around the one `ExpenseModal` effect (KNOWN-ISSUES 5.2, updated). All four PRs had reported that error; it predates them. Delete the modal and the comment together when T13/T14 replace it.
- Merged #14, #13, #12, #15 in that order. The only conflicts were in this file (board rows and new log entries), resolved by keeping both sides.
**Checked:**
- On merged `glow`: npm test ✓ (77 pass, 1 skipped, the existing multi-currency skip) · lint ✓ (clean) · build ✓.
- Reviewed each diff against its "Done when". The calc layer is integer-exact and conserves cents. `save_expense` checks match `parseExpenseInput`, and an omitted weight is accepted for non-weighted modes. The seed refuses any host except the dev project.
- Dev database: `20261113224445_split_mode_weights_created_by` applied, with the version matching the file. One `save_expense` overload. One Veld group (5 expenses, 2 payments), and T04's throwaway group is gone. Production's migration list doesn't include it.
**Next session should know:**
- The seed writes no `split_mode` yet (Veld rows read as "custom split" until it does). Set `split_mode = 'equal'` in `scripts/seed-dev.mjs` when T12 needs it.
- T05 (needs T02) can start now. T06 needs T03 and T05.

### 2026-11-13 · T02 · claude-sonnet-5-5
**Status:** done → in review ([PR #15](https://github.com/jackyzhong/potluck/pull/15)).
**Changed:**
- `src/app/tokens.css`: verbatim copy of `tokens/tokens.css`.
- `src/app/globals.css`: imports it, maps colour roles, shadows and radii with `@theme inline` (`bg-surface`, `text-text-muted`, `border-line`, `shadow-card`, `rounded-hero`, `bg-member-1-bg`, …), and puts the next/font variable first in `--font-sans`. Body uses `--bg` and `--text`.
- `src/app/layout.tsx`: Plus Jakarta Sans (variable font, weights 200–800) replaces Geist and Geist Mono. Adds the theme init script in `<head>` and `suppressHydrationWarning` on `<html>`.
- `src/lib/theme.ts` + `theme.test.ts`: `Theme` type, `getStoredTheme`, `setTheme`, `applyTheme`, `themeInitScript`. Storage key `potluck:theme`.
**Checked:** npm test ✓ (6 new tests) · build ✓ · lint ✗ (see below) · visual: home and the seeded Veld 2026 ledger page render in Plus Jakarta Sans. Boards not compared, because T02 changes no component.
- Lint has one error, `ExpenseModal.tsx:80` `set-state-in-effect`. It is KNOWN-ISSUES 5.2, was there before this task, and goes away when T14 removes `ExpenseModal`. T02's files lint clean.
- With the OS in light mode and nothing stored, `--bg` is `#f7f7fa`. With the OS in dark mode and nothing stored, it is `#0f0f1a`.
- Setting `data-theme` by hand to light, dark and system switches `--bg`, `--surface` and `color-scheme`. Dark: `#0F0F1A` / `#1C1C2E`. Light: `#F7F7FA` / `#FFF`.
- A stored `dark` beats a light OS after a reload, with no console errors.
- In the delivered HTML the init script comes before `<body>`, so the first paint uses the stored theme.
- Not checked: a frame-by-frame flash capture.
**Differs from the boards:** nothing to compare yet.
**Decided:**
- `data-theme` is written as `system`, `light` or `dark`. With nothing stored it is left unset. Both unset and `system` follow the OS in `tokens.css`.
- The font loads as the variable font (no `weight` list) because the docs recommend it. It gives 400–800 from one file set.
- The next/font variable is `--font-plus-jakarta`, so it doesn't collide with `--font-sans` from `tokens.css`.
- `tokens.css` is unedited. Typography sizes aren't mapped into `@theme`: they'd clash with Tailwind's `text-*` size namespace. Components use `text-[length:var(--text-hero)]` or arbitrary values until a later task needs a utility.
- `tw-check`, a throwaway page used to inspect the generated CSS, was deleted before commit.
**New copy:** none.
**Next session should know:**
- **Dark mode on old screens.** Existing pages hard-code light colours (`bg-white`, `zinc-*`). With the OS in dark mode, or after `setTheme("dark")`, body text becomes near-white. Form inputs inherit it, so on the old Add expense modal their text is hard to read on the white fields. Cards and headings keep their own colours. This goes away as T07–T16 and T20 restyle those screens. Check dark mode in `glow` previews only from T07 on.
- Tailwind writes `--shadow-card: var(--shadow-card)` into a layer, and the unlayered `tokens.css` values win over it. This is harmless; don't rename tokens to avoid it (comment in `globals.css`).
- The path alias is `@/src/...` in this repo, not `@/...`.
- T07 adds the System / Light / Dark control. It should call `setTheme()` and `getStoredTheme()` from `src/lib/theme.ts`. A theme change in another tab isn't synced yet.

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
