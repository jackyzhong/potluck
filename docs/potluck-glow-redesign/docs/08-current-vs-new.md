# 08 · Current UI vs the redesign

Screenshots of today's app are in `reference/current-ui/` (taken from two real groups, "Veld 2026" and "Martin Garrix at the Gorge"). Use this page to scope the work: what's a restyle, what's restructuring, and what's new logic.

Effort key: **Style** = same behaviour, new look · **Restructure** = same data, different layout or flow · **New** = new logic or data.

## Group page frame

| Area | Today (`01-activity.png`) | Redesign | Effort |
|---|---|---|---|
| Layout | Single centred column of cards, lots of empty side space on desktop | Full-width desktop page: summary row, toolbar, ledger + right panel | Restructure |
| Header | Emoji, large title, "Don't lose the link to this page! Share the link to invite others." | Emoji + title, tabs and actions on one row; Invite button replaces the sentence (see docs/07 B2) | Restructure |
| Tabs | Centred Activity / Balances segmented control | Same control, moved into the header | Style |
| Actions | Floating stacked buttons bottom-right: Manage Users, Add Payment, Add Expense | Header buttons on desktop (`Add expense [N]`, `Add payment [P]`, Invite); a sticky bottom bar on phone; Manage members inside the viewing-as menu | Restructure |
| Perspective | None; amounts are neutral ("Paid by Stephen", totals only) | Everything relative to the selected member ("You") | **New** |
| Theme | Light only | Light + dark from shared tokens | New (tokens) |
| Colour for money | Green (gets back) / red (owes) | Violet (owed to you) / orange (you owe), always with a sign or word | Style |

## Activity tab

| Area | Today | Redesign | Effort |
|---|---|---|---|
| Summary | None | Gradient hero: your net, pairwise per-person chips (click to filter); share-of-spend card | **New** (calculations in docs/05) |
| Rows | White cards: title, "Paid by X", amount, date | Table on desktop (Date, Description, Paid by + avatar, Total, Your impact, Balance); a compact list on phone | Restructure + **New** (impact, running balance) |
| Payments | Cards tagged "Settlement", "Alvin paid Stephen", optional note | Rows tagged "Payment", "{payer} paid you"; the note inline; "in"/"out" impact; "not involved" when relevant | Style + New wording |
| Search / filters | None | Search (`/`) + All / Expenses / Payments / Involving me + person filter | **New** |
| Selection | Click → "Expense Details" modal | Click → right panel (desktop) / sheet (phone), the row stays highlighted | Restructure |

## Balances tab (`02-balances.png`)

| Area | Today | Redesign | Effort |
|---|---|---|---|
| Container | One card "Balances – How much people owe each other" | Gradient hero with stat tiles + Settle-up plan card + Everyone card | Restructure |
| Simplify Debts toggle | Top-right of the card | In the Settle-up plan header; still bound to `ledgers.simplify_debts` | Style |
| Per-person list | "OVERALL" list, triangle expanders, "gets back CA$280.01" / "settled up" / "owes CA$42.94" | Everyone accordion (phone) / grid table with Paid, Share, Payments, Net (desktop) | Restructure |
| Expanded person | Internal scrolling box with "PAID FOR THE GROUP" / "THEIR SHARE" link lists, then Total paid / Total share / Payments received / Net | Phone: totals + "Show N expenses" (no nested scroll). Desktop: three columns side by side | Restructure |
| Who pays whom | Not shown as a list (only nets) | Settle-up plan: transfers split into "Involving you" / "Rest of the group", each with **Mark paid** | **New** (UI over the existing algorithms; Mark paid inserts a payment) |

## Add / edit expense (`03`–`06`)

| Area | Today | Redesign | Effort |
|---|---|---|---|
| Container | Centred modal, shared by Add and Edit | Right panel on desktop, full-height sheet on phone; shared by Add and Edit | Restructure |
| Steps | Two steps: details → "Next: Split Expense" → split → Back / Confirm & Save | One form; everything visible at once | Restructure |
| Paid by | Dropdown | "Paid by [● You ▾]" picker in a sentence, defaults to the viewer | Style + New default |
| Description | "Description (Optional)", 0/50 counter | "What was it for?" with an n/50 counter, on the gradient card | Style |
| Amount | Number input with spinner arrows | Large 48px text input (decimal keypad), no spinners | Style |
| Currency | Select (USD shown) | Pill on the amount card | Style (see docs/07 B7) |
| Date | `datetime-local` input ("11/12/2026, 10:29 PM") | "on [Today ▾]" date picker | Style + decision (docs/07 B6) |
| Split modes | Equally / Exact Amount / Percentage | Equally / Exact / Percent / **Shares** | Style + New (Shares) |
| Equal split | Checkbox list, "Total to split: $20.00" | Checkbox rows with each person's live amount, "k of n included", Include everyone, remainder note | Style + New (live amounts) |
| Exact / Percent | Inputs in an internally scrolling list; red "remaining" box; disabled Confirm | Inputs inline (no nested scroll); status strip with remaining or too-much; "Split across blank rows" helper; the blocked Save explains why; computed amounts shown beside percentages | Style + New (helper, live amounts) |
| Feedback | None about your balance | "You'll be owed CA$48.37 more" | **New** |
| Save | Confirm & Save | Save expense (`⌘↵`) + **Save and add another** | New (add another) |
| Edit | Same modal, prefilled | Same panel, prefilled, reopening the original split mode | **New data** (store split mode: docs/05 gap #1) |

## Expense details (`07-expense-details.png`)

| Area | Today | Redesign | Effort |
|---|---|---|---|
| Container | Modal | Right panel / sheet | Restructure |
| Content | Description, Paid by, Total Amount, full timestamp, Splits list | Title, big amount, "date · added by", **impact strip**, "Paid by … split equally, 6 ways", splits written from the viewer's side ("owes you", "you owe …") | Style + New (impact, wording; "added by" needs data) |
| Actions | Close · Edit Expense | Edit (`E`) · **Duplicate** · **Delete** · Close/Esc | New (Duplicate, Delete) |

## Suggested order of work (input for the plan, not a mandate)

1. **Tokens + theme plumbing** (tokens.css, the font, a dark-mode switch mechanism). Everything else depends on these.
2. **Viewer state + calculation layer**: a `useViewer()` hook and pure functions for impact, running balance, nets, pairwise and share of spend, tested against `fixtures/expected.json`. This is UI-independent and unlocks every screen.
3. **Group page frame** (header, tabs, viewing-as menu/sheet, phone action bar) and the **Activity tab** (hero, share card, ledger table/list, filters/search).
4. **Right panel / sheet infrastructure** + **Expense details**.
5. **Composer** (replacing the two-step modal), plus the split-mode storage migration.
6. **Balances tab** (tiles, settle-up plan with Mark paid, Everyone breakdown).
7. Not-yet-designed pieces with sensible defaults (Add payment panel, empty/loading states, toasts), then polish (keyboard map, motion, accessibility pass).
