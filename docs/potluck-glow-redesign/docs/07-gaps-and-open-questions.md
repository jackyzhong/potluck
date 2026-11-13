# 07 · Gaps, inconsistencies and open questions

What the planning agent should flag, decide, or ask the human about before building.

## A. Inconsistencies between boards (resolve as stated)

| # | Where | Inconsistency | Resolution |
|---|---|---|---|
| A1 | Details panel | Three versions: the simple inspector (03/04), the inspector with a "Your share" strip (23/24), and the full details panel (15/16) | **Build 15/16** in the right panel on desktop and as the phone sheet. It includes the impact strip (lent / your share), the paid-by sentence, and Delete. |
| A2 | Gradient magenta stop | Phone Activity 01/02 uses #B8389A; every other board uses #A02C88 | Use **#A02C88** everywhere (better contrast for white text: 6.5:1 vs 5.2:1). |
| A3 | Hero sub-line | Desktop Activity has "4 people owe you · you owe Stephen"; phone Activity has none | Show it on both. Phone at 13px under the amount. |
| A4 | Dark "Add payment" | Board 04 gives it #26263C; other secondary buttons in dark are #1C1C2E | Use the secondary button token (`--button-secondary-bg`) for all secondary header buttons. |
| A5 | "Your share" sign | The share card shows "Your share CA$85.59"; Balances tiles show "Your share −CA$85.59" | Intentional: the tiles show the arithmetic that adds up to the hero, the card shows a quantity. Keep both. |
| A6 | Tile label | Phone "Paid back" vs desktop "Already paid back to you" | Either is fine; use the desktop wording where there's room. |
| A7 | Board width | Add-expense desktop board drawn at 1440; other desktop boards at 1280 | Same fluid layout; 1440 just shows the wider panel. No change needed. |
| A8 | "Show 7 expenses" | Counts itemised lines (2 paid-for + 5 shares), not distinct expenses | Label it with the number of lines it reveals, or reword to "Show breakdown". |

## B. Product decisions needed

1. **Hero chips vs the settle-up plan can look contradictory.** The chips show *pairwise* debts ("Jonah +28.79": Jonah owes you), while the simplified plan may route Jonah's money to Stephen instead ("Jonah pays Stephen"). Options: (a) keep pairwise chips and add a hint "before simplifying" (tooltip or caption); (b) make chips follow the simplified plan when Simplify is on (then most chips are 0 and the "who owes you" story gets thinner); (c) show pairwise on Activity, simplified on Balances, and say so. *Recommendation: (c), with a one-line caption on the Balances plan, "Simplified: fewer payments, same totals".*
2. **Remove the "Don't lose the link" warning?** The redesign replaces it with an Invite button. Without accounts, the link is the only way back into a group, so dropping the warning entirely is risky. Suggest: Invite opens a small popover with "Copy link" plus the reminder text, and the first-visit prompt mentions bookmarking.
3. **First-visit viewer prompt** ("Which one are you?"): recommended (docs/04), not drawn. Build it now or default to the first member?
4. **Theme control:** follow the system only, or add a Light / Dark / System setting? Where does it live? (Suggestion: in the viewing-as menu now, the account menu later.)
5. **Equal-split remainder rule:** the design assumes "first members in ledger order take the extra cents". If the app uses another rule, keep the app's rule and change the remainder note copy.
6. **Date vs date-time:** the current form records a time; the redesign picks a date ("Today"). Keep the time hidden but stored (`created_at`), or move to a date column (docs/05 gap #3)?
7. **Multi-currency:** what should the ledger show for a USD expense in a CAD group, and how are balances converted? (docs/05 gap #6)
8. **Signed-in "view as":** once accounts exist, can a signed-in user still view the group as someone else (read-only)? This decides whether the switcher survives inside the account menu.
9. **"Trip so far":** fixed title, or neutral ("So far") for groups that aren't trips (roommates)?
10. **Zero-value chips:** hide members who are square with the viewer, or show "0.00"?

## C. Not designed yet (needs a design pass or a sensible default)

**Flows**
- **Add payment panel** (`P`, header and phone bar buttons). Suggested: the same panel shell as the composer: "From [● ▾] to [● ▾]", the amount on the gradient card, a date, a note ("write off"), Save. When opened from Mark paid it's prefilled.
- **Payment details and edit** (selecting a payment row).
- **Shares split body** (the tab exists): integer steppers per member, default 1.
- **Edit-mode specifics**: "Edit expense" title, "Save changes", Delete placement, the discard-changes prompt.
- **Delete confirmation** and **Undo** toasts.
- **Manage members** restyle (opened from the switcher menu), **Invite** popover, **group creation**, and the **groups list** the phone back button returns to (does one exist today?).

**States**
- Hero for net < 0 ("You owe") and net = 0 ("You're all settled"). Copy is in docs/06; visuals should be the same gradient card.
- Empty group (no expenses), no search results, an empty right panel, everyone settled.
- Loading skeletons (hero, table rows) and error states (failed save, failed load).
- Groups with more than 5 other members (chip overflow), long member names, long descriptions, very large amounts (does the 60px hero fit "CA$12,345.67"? Scale down past 9 characters).
- Many rows: pagination, "load more", or virtualisation.

**Platforms**
- Tablet (640–1023): suggested drawer behaviour in docs/04.
- Phone search and filters: not on the phone boards. Suggest a search icon in the header that expands into a field, with filter chips under the tabs.
- Phone expense details: use the 15/16 panel as a full-height sheet.

## D. Feature ideas raised during design (not in the mockups; for the roadmap)

- **Remember the last split** per group ("Same people as last time").
- **Maths in the amount field** (`45+12.50`).
- **Receipt photo** on an expense, viewable from details.
- **Edit history** in details ("Amount changed from CA$60.00 by Alvin"): useful when friends dispute a number; needs an audit table.
- **Itemised split**: enter line items and assign each to people (restaurant bills).
- `V` shortcut for the viewing-as menu; `1`/`2` to switch tabs.

## E. Explicitly out of scope

- The "Afterparty" and "Sticker" looks on the same canvas (rows 2–3) were rejected or superseded. Only Glow is in this package.
- Round-1 boards A/B/C (exploration) are superseded.
