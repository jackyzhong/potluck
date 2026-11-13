# 04 · Interactions and behaviour

## Page model

The group page has two tabs, **Activity** and **Balances**, under one header. Suggested URL shape (adjust to the existing routes): `/g/[ledgerId]?tab=balances&e=[expenseId]&panel=add`. That makes the selected expense and an open composer survive a refresh and be linkable. The viewer is *not* in the URL (it's per-device; see "Viewer model").

### Desktop: two columns with a right panel

```
┌ header ─────────────────────────────────────────────────────────────┐
│ summary row:  [ hero (flex 3) ][ share card (flex 1) ]              │
│ toolbar:      [ search ][ All | Expenses | Payments | Involving me ]│
│ content:      [ ledger table (flex 999, min 560) ][ right panel ]   │
└ footer: shortcut hints ─────────────────────────────────────────────┘
```

The right panel is one state machine:

| State | Entered by | Panel content | Ledger |
|---|---|---|---|
| `empty` | page load with nothing selected; closing a panel | prompt + Add expense (not designed) | no selection |
| `details(expenseId)` | click a row, Enter on the focused row | `ExpenseDetails` | row highlighted |
| `add` | Add expense button, `N`, Duplicate (prefilled) | `ExpenseComposer mode="add"` | selection cleared |
| `edit(expenseId)` | Edit button or `E` while details are open | `ExpenseComposer mode="edit"` prefilled | row stays highlighted |

- Saving in `add` → `details(newId)` (or stays in `add`, cleared, with "Save and add another"); the new row is scrolled into view and highlighted briefly.
- Saving in `edit` → `details(id)`.
- Esc or Close in `add`/`edit` → back to the previous state. If the form is dirty, ask first ("Discard this expense?" / "Discard changes?"; not designed).
- Switching tabs keeps the panel state (Activity only; the panel is hidden on Balances).
- **Wide enough for both:** the content row wraps once the ledger would drop below 560px. Below roughly 1024px viewport width, turn the panel into an overlay drawer from the right (same content, 400–440px wide, scrim behind) instead of letting it wrap under the table.

### Phone: list plus sheets

- Tapping a ledger row opens **ExpenseDetails as a full-height sheet**. The details panel was designed at panel width; on phone it fills the sheet the same way the composer does (boards 17/18).
- Add expense (bottom bar) opens the composer sheet. Edit from details swaps the sheet content to the composer.
- The viewing-as switcher is a bottom sheet (boards 21/22).
- Sheets: a top grabber, a close button, swipe-down to close (asking first if dirty), focus trapped inside, background inert, and the bottom action bar hidden while open.

### Breakpoints (suggested; the mockups are fluid)

| Width | Layout |
|---|---|
| ≥ 1024 | Desktop: two columns with an inline right panel, table ledger, footer hints, kbd hints in buttons |
| 640–1023 | Desktop header and summary (wrapping), table ledger, right panel as an overlay drawer, no footer hints |
| < 640 | Phone: phone header + tab row, compact hero, list ledger, bottom action bar, sheets |

Make the hero and summary-row widths flex-based as drawn (`flex: 3 1 560px` / `1 1 280px`), so they reflow without extra breakpoints.

## Keyboard shortcuts (desktop)

Potluck already has desktop shortcuts (friends asked for them). **Reconcile this table with the keys that exist today**: keep existing bindings where they differ, and update the hint labels to match. These shortcuts are ignored while typing in an input, except the ones marked †.

| Key | Action | Where |
|---|---|---|
| `N` | Open Add expense | Activity, Balances |
| `P` | Open Add payment | Activity, Balances (panel not designed) |
| `/` | Focus search | Activity |
| `J` / `K` | Next / previous row (Activity) or person (Balances) | |
| `Enter` | Open the focused row in details / expand the focused person | |
| `E` | Edit the expense shown in details | Activity |
| `D` | Toggle "Simplify debts" | Balances |
| `Esc` † | Close the menu → close the panel → clear search, in that order | everywhere |
| `⌘↵` / `Ctrl↵` † | Save the composer | composer |

Suggested extras: `1`/`2` to switch tabs, `V` to open the viewing-as menu. Show shortcuts as `<kbd>` only on devices with a fine pointer.

## Filtering and search (Activity)

- Filters are single-select: **All** · **Expenses** (expenses only) · **Payments** (payments only) · **Involving me** (rows where the viewer paid, is in the split, sent or received).
- A **person chip** click in the hero adds a second, removable filter "with {name}": rows where both the viewer and that person are involved (the rows that make up that chip's number). Click the chip again or the ✕ to clear it.
- Search matches, case-insensitive: the description, the payer/payee names, the payment note, and amounts (typing `109.74`, `109`, or `$109` matches CA$109.74). Debounce 150ms. While searching, show an empty state if nothing matches (not designed).
- **The running balance always reflects the full history**, not the filtered view. Rows keep their own `balanceAfter` value when others are filtered out. Say so in a tooltip on the Balance column header, or hide the column while a filter is active; either is fine, but don't recompute it over filtered rows.
- Filters and search reset when the viewer changes, except "Involving me", which re-applies to the new viewer.

## Viewer model ("Viewing as")

Potluck has no accounts (`users.auth_user_id` exists but isn't used for this yet). The redesign makes every number viewer-relative, so the app needs a current viewer.

- **State:** `viewerId` per group, kept on the device in `localStorage` under `potluck:viewer:{ledgerId}`. Read it on load. If it's missing, or points to an archived or deleted member, fall back as below.
- **First visit with no stored viewer (recommended, not drawn):** before showing balances, show the viewer sheet titled "Which one are you?" with the same member list. Picking a member stores it. Until a member is picked, show the group with neutral wording (no "you").
  - Fallback if that prompt isn't built: default to the first member in ledger order, and show the "Viewing as" label prominently.
- **Switching:** pick a member in the menu or sheet → set `viewerId` → recompute every derived number client-side from the same fetched data (no refetch needed) → keep the tab, selected row, and scroll position.
- **Everything that depends on the viewer:** hero label, amount, sub-line and chips · share bar and legend · the ledger's "Paid by You", impact, running balance, and "paid you" wording · "Involving me" · the details impact strip and split wording · the Balances stat tiles, the "Involving you" section and "You" labels · the composer's default payer and its "You'll be owed …" line.
- **What doesn't change:** the group data itself, the settle-up plan's transfers (only their grouping and wording), and member colours.
- **`users.device_token` already exists.** The coding agent should check what it's used for; if it already identifies a device's member, it can seed `viewerId`.
- **Future accounts:** when signed in, `viewerId` = the member linked to the signed-in user (`users.auth_user_id`), and the pill becomes the account menu (docs/03). Keep the viewer as one piece of state behind a hook (e.g. `useViewer()`) so this swap only touches one place.

## Composer behaviour

### Defaults (add)
- Payer: the current viewer. Date: today. Currency: `ledgers.base_currency`. Mode: Equally, with all non-archived members included.
- Focus the **amount** first (it's the one required field); the description is optional, as it is today. If the description is left blank, save it as null and show "Untitled expense" in lists (or keep whatever the app does today).
- Remember the last-used mode and participants per group for the next add (suggested; docs/07).

### Validation per mode
| Mode | Valid when | Status strip when valid | When invalid |
|---|---|---|---|
| Equally | amount > 0 and ≥ 1 person included | "Fully assigned" · "You'll be owed CA$X more" | 0 included → "Pick at least one person" (warning) |
| Exact | the sum of entries equals the amount, to the cent | "Fully assigned" · impact | "CA$X left to assign" · "CA$sum of CA$total"; over → "CA$X too much" · same right side |
| Percent | the percentages sum to exactly 100 | "100% assigned" · impact | "X% left to assign" / "X% too much" · "sum% of 100%" |
| Shares | total shares ≥ 1 | "Fully assigned" · impact | "Add at least one share" |

- With no amount yet: hide the strip and disable Save with the label "Enter an amount".
- The blocked Save button states its reason ("Assign CA$20.00 more to save"); don't show a separate error.
- The impact line is the viewer's effect: "You'll be owed CA$X more" (viewer paid), "You'll owe CA$X more" (viewer is in the split but didn't pay), "This doesn't change your balance" (viewer not involved). Computation in docs/05.
- Edits recompute live; nothing validates on blur only.

### Saving
- Save writes the expense and its splits as one transaction (one RPC or a server action), so a half-written expense can't exist. Store the split mode and inputs too (docs/05).
- On success: switch the panel/sheet to details (or reset for "Save and add another"), highlight the new row, and show a toast "Expense added" with Undo (toast not designed).
- On failure: keep the form, show the error inline above the actions, and re-enable Save.

### Edit
Same form, prefilled. The title is "Edit expense" and the primary button "Save changes", with Delete available. If the stored split mode is unknown (old rows saved before split mode was stored), open in **Exact** with the stored split amounts. That always reproduces the saved numbers.

## Balances behaviour
- The Simplify switch writes `ledgers.simplify_debts` (group-wide). Re-render the plan immediately; the subtitle updates its count.
- Mark paid → records a payment for that transfer → hero, plan, ledger and breakdown recompute. Offer Undo.
- The Everyone accordion keeps its open rows when the viewer changes. On desktop the expanded row shows the itemised lists directly; on phone "Show N expenses" reveals them inside the expanded box. N = the number of line items listed (paid-for lines + share lines).

## Focus and accessibility
- After opening a panel or sheet, focus its first meaningful control (the amount in the composer, the title in details). After closing, return focus to what opened it.
- Menus: arrow keys, Home/End, type-ahead by name, Esc to close.
- Live regions: the status strip (polite), toasts (polite), and a short announcement when the viewer changes ("Now viewing as Stephen").
- Touch targets are ≥ 44px everywhere in the mockups. Keep that when building.
- Respect `prefers-reduced-motion` for panel and sheet transitions.
