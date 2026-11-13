# 01 · Screens

## Board inventory

24 boards: every screen in light and dark. PNGs are in `screens/` (2x), standalone HTML in `html/`, both numbered as below.

| # | Canvas | Screen | Platform | Theme | Viewport | Shows |
|---|---|---|---|---|---|---|
| 01 | F | Activity | phone | light | 390 × 1100 | Activity ledger, phone |
| 02 | J | Activity | phone | dark | 390 × 1100 | same |
| 03 | H | Activity | desktop | light | 1280 × 920 | Ledger table + selected-expense inspector |
| 04 | L | Activity | desktop | dark | 1280 × 920 | same |
| 05 | M | Balances | phone | light | 390 × 1540 | Balances, Stephen expanded |
| 06 | N | Balances | phone | dark | 390 × 1540 | same |
| 07 | O | Balances | desktop | light | 1280 × 1000 | Balances, Stephen expanded |
| 08 | P | Balances | desktop | dark | 1280 × 1000 | same |
| 09 | Q | Add expense | desktop | light | 1440 × 1040 | Activity page with the add panel open, split equally |
| 10 | V | Add expense | desktop | dark | 1440 × 1040 | same |
| 11 | R | Add expense | panel | light | 440 × 1000 | Panel only: exact amounts, CA$20 unassigned (blocked state) |
| 12 | W | Add expense | panel | dark | 440 × 1000 | same |
| 13 | S | Add expense | panel | light | 440 × 940 | Panel only: split by percentage |
| 14 | X | Add expense | panel | dark | 440 × 940 | same |
| 15 | T | Expense details | panel | light | 440 × 700 | Details panel (canonical) |
| 16 | Y | Expense details | panel | dark | 440 × 700 | same |
| 17 | U | Add expense | phone | light | 390 × 960 | Add form as a full-height phone sheet |
| 18 | Z | Add expense | phone | dark | 390 × 960 | same |
| 19 | AA | Viewer switcher | desktop | light | 1280 × 920 | "Viewing as" menu open |
| 20 | AD | Viewer switcher | desktop | dark | 1280 × 920 | same |
| 21 | AB | Viewer switcher | phone | light | 390 × 844 | Bottom sheet open over Activity |
| 22 | AE | Viewer switcher | phone | dark | 390 × 844 | same |
| 23 | AC | Viewing as Stephen | desktop | light | 1280 × 920 | Activity recomputed from Stephen's perspective |
| 24 | AF | Viewing as Stephen | desktop | dark | 1280 × 920 | same |

"Panel" boards show the right-hand panel on its own at the width it gets on desktop. On phone the same content fills a full-height sheet (boards 17/18).

Desktop boards are fluid pages drawn at 1280 (1440 for the add-expense page). Phone boards are drawn at 390 wide; their heights are content height, not a device viewport, except 21/22, which are exactly one 390 × 844 screen.

---

## Shared page frame

### Desktop header (boards 03, 07, 09, 19, 23)

One row, `padding: 16px 24px`, `flex-wrap: wrap`, `gap: 12px 16px`, three groups:

1. **Group identity** (grows, min 200px): emoji 28px + group title, 24px / 800, letter-spacing −0.02em.
2. **Tabs**: segmented control "Activity | Balances". Track `--surface-muted`, 4px padding, pill radius. Segments are 40px tall, `padding: 0 20px`. The selected one has `--segment-selected` + `--segment-selected-shadow`, 700 weight; the other is `--text-secondary`, 600.
3. **Actions** (right-aligned, wraps): `Invite` (secondary) · `Add payment [P]` (secondary) · `Add expense [N]` (primary) · a 1 × 28px divider in `--line-strong` · the **Viewing-as pill**. All 44px tall, pill radius, 700 weight. Secondary buttons are `--surface` with `--shadow-button`; primary is `--button-primary-bg/fg`. The `[P]`/`[N]` are `<kbd>` hints inside the button.

There is no "Members" button any more; "Manage members" lives inside the viewing-as menu.

### Phone header (boards 01, 05, 21)

`padding: 12px 12px 12px 4px`, gap 8px:

back button (44 × 44, chevron-left) · emoji 24px · title block (grows, min-width 0): group title 20px / 800 with "Viewing as Jacky" under it (12px / 600, `--text-muted`) · `Invite` (44px pill, secondary) · **viewer avatar button** (44px tall pill: 36px avatar + chevron-down, `padding: 0 8px 0 4px`).

Below the header: full-width tabs "Activity | Balances", 16px side margin, 44px segments.

### Phone bottom action bar (boards 01, 05)

Pinned to the bottom of the page (`margin-top: auto` in the mockup; implement as sticky/fixed with a safe-area inset). `padding: 12px 16px 20px`, gap 10px: `Add payment` (secondary, white with shadow) and `Add expense` (primary), equal width, 52px tall.

### Desktop footer (boards 03, 07, 09, 19, 23)

A row of keyboard hints in `--text-muted`, 13px: `[J][K] move between rows · [Enter] open · [E] edit · [/] search · [N] add expense · [P] add payment`. On Balances: `[J][K] move between people · [Enter] expand · [D] simplify debts on or off · [N] · [P]`.

---

## Activity, desktop (03/04; with panel variants 09/10, 19/20, 23/24)

Top to bottom inside the page (`padding: 0 24px`):

**1. Summary row**: flex, wrap, gap 16px.
- **Hero balance card** (`flex: 3 1 560px`): `--gradient-glow`, radius 24, padding 20, `--shadow-glow`, white text. Two parts in a wrapping row (gap 16px 24px):
  - Left (`flex: 1 1 240px`): "You're owed" 14/600 · amount 60/800, line-height 1.05, tracking −0.03em, tabular · sub-line 13px, "4 people owe you · you owe Stephen".
  - Right (`flex: 2 1 360px`): a 5-column grid (gap 6) of **person chips**, one per other member, sorted by amount descending. Each chip is a button: radius 16, `padding: 10px 0`, background `--on-glow-tile`; 38px white avatar with the initial in `--on-glow-avatar-fg`; name 13px; signed amount without currency, 13/700 ("+28.79", "−16.38"). A member the viewer owes gets the `--hero-owe-chip-bg` background instead.
- **Share-of-spend card** (`flex: 1 1 280px`): `--surface`, radius 24, padding 20, `--shadow-card`, vertically centred. "Trip so far" 17/800 · "Group spent CA$492.52" 13px muted · a 12px bar (radius 6, `--bar-track`) with two segments: your share (`--bar-share`) then what you fronted beyond it (`--bar-extra`) · a legend row with "Your share CA$85.59" (left) and "You paid CA$151.74" (right, `--positive`).

**2. Toolbar** (`padding: 16px 0 12px`, wrap, gap 12):
- Search field: `--surface` pill, 44px, max-width 360, `--shadow-button`; search icon, placeholder "Search expenses, people, amounts", `[/]` kbd at the end.
- Filter chips, single-select: `All` (selected: `--button-primary-bg/fg`) · `Expenses` · `Payments` · `Involving me` (unselected: `--surface-muted`, 600). 44px pills.

**3. Content row**: flex, wrap, `align-items: flex-start`, gap 16, page bottom padding 16.
- **Ledger table card** (`flex: 999 1 560px`, `min-width: 0`): `--surface`, radius 24, `--shadow-card`, `padding: 0 8px`, horizontal scroll if needed. Columns: **Date · Description · Paid by · Total (right) · Your impact (right) · Balance (right)**.
  - Header cells: 12/700 `--text-muted`, `padding: 14px 12px 10px`, bottom border `--line`.
  - Rows: 56px, `padding: 0 12px`, bottom border `--line-table-row`, last row none.
  - Date shows only on the first row of each calendar day (700 weight); later rows that day leave it blank.
  - Description: the expense name (700). Payment rows read "{payer} paid you" (or "{payer} paid {payee}") followed by a "Payment" tag (12/600, `--positive-tag-bg/fg`, radius 10, `padding: 2px 8px`) and the note in `--text-muted` if there is one ("write off").
  - Paid by: 28px avatar + name. The viewer is shown as the "You" avatar (`--you-avatar-bg/fg`, 10px text) with the label "You".
  - Total: money, regular weight.
  - Your impact: expenses show signed money, 700, `--positive` for + and `--negative` for −. Payments show "CA$3.75 in" or "CA$3.75 out", 600, default text colour. Rows the viewer isn't part of show "not involved" in `--text-muted` (board 23).
  - Balance: the viewer's running balance after this row, `--text-secondary`.
  - Selected row: background `--positive-soft`, first/last cell radius 14, description 800.
- **Right panel** (`flex: 1 1 300px`; 400px basis when it holds the composer): one of three states. Details (boards 03, 23), add/edit (09) or empty. See docs/04.

**Inspector variant on 03/04 vs canonical details on 15/16:** the panel on 03/04 is an earlier, simpler version: date · "added by"; title 22/800; amount 32/800; "You paid · split equally 6 ways"; split rows; `Edit [E]` + `Duplicate`. Boards 23/24 add a "Your share −CA$18.29" strip. **Build the details panel from boards 15/16**, which supersede both (see docs/07).

## Activity, phone (01/02)

1. Header + tabs (see shared frame).
2. **Hero card** (16px side margin, radius 24, `padding: 20px 16px 14px`, `--gradient-glow-compact`): "You're owed" 14/600 · amount 54/800 · a 5-column chip grid (gap 4): chips radius 14, `padding: 8px 0`, 36px avatars, 12px text.
3. **Share-of-spend card**: radius 20, `padding: 14px 16px`. Same content as desktop, with a 10px bar.
4. **Ledger list card**: radius 20, `padding: 0 14px`. Rows are 64px min, a grid of `36px | 1fr | auto`, gap 12:
   - leading **payer avatar** (36px; "You" avatar when the viewer paid),
   - title (700) over a meta line, 13px muted: "Sep 18 · Stephen paid CA$75.00" or "Sep 17 · payment · write off",
   - right column: impact (700, coloured like desktop; payments "CA$3.75 in", 600) over "bal. CA$51.91", 12px muted.
   - Row dividers `--line`.
5. Bottom action bar.

No search or filters on phone in this round (see docs/07).

## Balances, phone (05/06)

1. Header + tabs (Balances selected).
2. **Hero card**: "You're owed" + 54px amount, then a 3-column grid of stat tiles (`--on-glow-tile`, radius 14, padding 10): "You paid CA$151.74" · "Your share −CA$85.59" · "Paid back −CA$14.24" (label 12px, value 15/700). These three add up to the hero amount.
3. **Settle-up plan card** (radius 20, `padding: 14px 14px 4px`):
   - Header row: "Settle-up plan" 17/800 over "5 payments clear the whole group" 13px muted; on the right a labelled switch "Simplify" (46 × 28 track, `--accent` when on, 22px white knob).
   - Section label "INVOLVING YOU" (12/700 uppercase, tracking 0.06em, muted). Rows: 36px avatar of the other person · "Alvin pays you" (700) over the amount (700, `--positive`; `--negative` when the viewer pays) · "Mark paid" button (44px pill, `--surface-muted-2`).
   - Section label "REST OF THE GROUP". Rows: avatar · "Jonah pays Stephen" (600) · amount (700). No action.
4. **Everyone card**: "Everyone" 17/800 over "Tap a person to see how their balance adds up". Accordion rows (60px min, grid `36px | 1fr | auto | 20px`): avatar · name (700) · "gets back"/"owes" label (12px muted) over the amount (`--positive`/`--negative`) · chevron (right when closed, down when open). Sorted by net descending; the viewer is labelled "You", with "get back"/"owe".
   - Expanded body (`--surface-sunken`, radius 14, padding 12): "Paid for the group" · "Their share" (negative) · "Payments" · divider · **Net** (800, coloured), then a "Show 7 expenses" button (44px, `--surface-muted-2`) that reveals the itemised lists.
5. Bottom action bar.

## Balances, desktop (07/08)

1. Header (Balances selected).
2. **Hero card**, full width (`margin: 4px 24px 0`), wrap: left (`flex: 1 1 280px`): "You're owed" · 60px amount · "Alvin and Angus pay you once debts are simplified" (13px). Right (`flex: 2 1 420px`): auto-fit grid of 3 stat tiles (min 130px; radius 16, `padding: 14px 16px`; label 13px, value 22/800): "You paid" · "Your share" · "Already paid back to you".
3. Content row (`padding: 16px 24px`, gap 16, wrap):
   - **Settle-up plan card** (`flex: 1 1 360px`, radius 24, `padding: 18px 20px 8px`): same as phone; switch label "Simplify debts".
   - **Everyone card** (`flex: 2 1 560px`): a table built on a CSS grid, `minmax(150px,1.5fr) repeat(3, 1fr) 1.3fr 20px`, columns **Person · Paid · Share · Payments · Net · (chevron)**. Payments read "received CA$14.24", "sent CA$10.49" or "none". Net reads "gets back CA$185.41" / "owes CA$5.31", coloured. Rows 56px, 32px avatars, horizontal scroll under 600px.
   - Expanded row: a sunken box (radius 16, padding 16) with **three columns**: "PAID FOR THE GROUP" (expense · date · amount per line) · "THEIR SHARE" (same) · "ADDS UP TO" (Total paid, Total share, Payments, **Net**).
4. Footer hints.

## Add expense, desktop (09/10) and the panel (11–14)

Board 09 is board 03 with the right panel switched to the **composer** (no row selected) and a 400px panel basis. The panel (`--surface`, radius 24, padding 20, gap 14, `--shadow-card`):

1. **Panel header**: "Add expense" 20/800 · on the right, `[Esc]` kbd + close icon (44px hit area).
2. **Gradient input card** (`--gradient-glow-compact`, radius 20, padding 16, gap 10, white text):
   - "What was it for?" label with a character counter on the right ("19/50"); the input (40px, radius 12, `--on-glow-input`, no border, 600).
   - Row: "Amount" label over a borderless input at 48/800, tracking −0.03em, tabular; on the right, a currency pill "CAD ▾" (44px, `--on-glow-input`).
3. **Paid-by sentence**: "Paid by [● You ▾] on [Today ▾]". The two pickers are 44px pills on `--surface-muted-2`; the first holds a 32px avatar. The sentence wraps.
4. **Split-mode tabs**: 4 equal segments "Equally · Exact · Percent · Shares" in a `--surface-muted-2` track (radius 16, padding 4); segments 40px, radius 12; selected `--segment-selected` + shadow.
5. **Mode body**:
   - *Equally* (09, 17): a header line, "4 of 6 people included" (muted) on the left and an "Include everyone" text button (`--positive`, 700) on the right. Then one checkbox row per member (44px min; grid `22px | 32px | 1fr | auto`): checkbox (22px, radius 7, `--accent` with a white tick when on; 2px `#8585A0` outline when off) · avatar · name · that person's amount (700). Excluded rows show the name muted and "not included". Under the list: "CA$64.50 doesn't divide evenly by 4, so you and Stephen each take an extra cent." (13px muted, shown only when there is a remainder).
   - *Exact* (11): rows (grid `32px | 1fr | 132px`, 48px min): avatar · name · an input box (`--surface-sunken`, radius 12, 40px) with a "CA$" prefix (13px muted), right-aligned 700 value or "0.00" placeholder.
   - *Percent* (13): rows (grid `32px | 1fr | auto | 92px`): avatar · name · computed amount (13px muted) · an input with a "%" suffix.
   - *Shares*: tab only, body not designed.
6. **Status strip** (radius 14, `padding: 10px 14px`, 13px, wraps):
   - Valid: `--positive-soft`; left "Fully assigned" (Equally/Exact) or "100% assigned" (Percent), 700 `--positive`; right "You'll be owed **CA$48.37** more" (the viewer's impact).
   - Incomplete: `--negative-soft`; left "CA$20.00 left to assign" (700 `--negative`); right "CA$44.50 of CA$64.50". Under it, a full-width 44px button "Split CA$20.00 across the 3 blank rows" (`--surface-muted-2`).
7. **Actions** (wrap, gap 8): "Save and add another" (secondary, 48px) · "Save expense [⌘↵]" (primary, 48px). When blocked, the primary becomes `--button-disabled-bg/fg` with the reason as its label, "Assign CA$20.00 more to save", with `aria-disabled`.

## Add expense, phone (17/18)

The same composer, full width (390, 12px outer padding), as a full-height sheet. No keyboard hints. Built from the same component as the desktop panel.

## Expense details panel (15/16), canonical

`--surface`, radius 24, padding 20, gap 14:

1. Header: the expense name as the title (20/800) · `[Esc]` + close.
2. Amount 44/800, tabular; "Sep 8 · added by you" 13px muted.
3. **Impact strip** (`--positive-soft` or `--negative-soft`, radius 14, `padding: 12px 14px`): left "You paid, so you lent" (600) / right "+CA$91.45" (18/800, coloured). Copy variants are in docs/06.
4. Sentence: "Paid by [● You] and split [equally, 6 ways]". Read-only 36px pills on `--surface-muted-2`.
5. Split list: rows 44px min with top borders, each with a 32px avatar · name · status: "paid, share CA$18.29" (muted) for the payer, "owes you CA$18.29" (600 `--positive`) for others. When the viewer isn't the payer: "you owe {payer} …" in `--negative` on the viewer's row, "owes {payer} …" in default text on others (board 23 has this).
6. Actions: `Edit [E]` (primary) · `Duplicate` (secondary) · `Delete` (text button, `--negative`).

## Viewing-as switcher (19–22) and another member's perspective (23/24)

**Desktop pill** (header, far right): 44px, `padding: 0 12px 0 6px`, `--surface` + `--shadow-button`. A 32px member avatar, then two lines ("Viewing as" 11/600 muted over "Jacky" 14/700), then a chevron-down. `aria-haspopup="menu"`.

**Desktop menu** (19/20): anchored under the pill, right-aligned, `top: 52px`, width 340, padding 8, radius 20, `--shadow-menu` (+ `--menu-border` in dark), z-index above the hero.
- Heading block: "View the group as" (15/800) over "Amounts and “you” switch to this person" (13px muted).
- One radio item per member (52px min, radius 14, grid `32px | 1fr | auto | 20px`): avatar · name (700) · their group net, "gets back CA$51.91" (`--positive`) or "owes CA$5.31" (`--negative`), 13/600 · a tick (`--positive`) on the selected one, which also has a `--positive-soft` background.
- Divider, then "Manage members" (people icon in a 32px `--surface-muted` circle).

**Phone sheet** (21/22): the page dims under `--overlay`; a bottom sheet (radius 28 on top, `padding: 8px 12px 28px`) with a 40 × 5 grabber, a heading block (title 19px) with a 44px round close button, the same items at 56px with 36px avatars, then "Manage members".

**Another perspective** (23/24): the page re-renders for Stephen. The pill reads "Viewing as Stephen". The hero shows "You're owed CA$185.41" / "Everyone else owes you" with chips Alvin +45.17, Matthew +45.16, Jonah +45.16, Angus +33.54, Jacky +16.38. The share bar becomes 17.4% + 37.6% ("You paid CA$271.00"). The table shows Stephen's impact and running balance: the two payments between other people stay visible, marked "not involved" with the balance unchanged. The details panel for Pizza Badiali says "Jacky paid · split equally 6 ways", has a "Your share −CA$18.29" strip, and the viewer's row reads "You · owe Jacky CA$18.29".
