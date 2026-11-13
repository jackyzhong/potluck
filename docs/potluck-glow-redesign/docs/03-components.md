# 03 · Components

Each entry gives anatomy, variants and states, a suggested props shape (TypeScript, for orientation only), behaviour and accessibility. Names are suggestions; if the codebase already has an equivalent component, extend it instead.

Money values are passed around as integer cents and formatted at render time (docs/05, "Formatting").

---

## Foundations

### `Avatar`
- Circle with the member's first initial (800). Sizes 28 / 32 / 36 / 38.
- Variants: `member` (palette slot colours), `you` (neutral You avatar, text "You" at 10–12px), `onGlow` (white circle, initial in #2A1FB0).
- `aria-hidden` when the name is printed next to it (always, in these designs).
```ts
type AvatarProps = { member: Member; size: 28 | 32 | 36 | 38; variant?: 'member' | 'you' | 'onGlow' };
```

### `Money`
- Renders cents as "CA$1,175.90" with tabular numerals. Options: `signed` ("+CA$91.45"), `tone` (`positive | negative | neutral`, which sets the colour role), `compact` (no currency, for hero chips: "+28.79").
- Negative values use a true minus sign (U+2212) before the currency: "−CA$12.50".
```ts
type MoneyProps = { cents: number; currency?: string; signed?: boolean; tone?: 'positive'|'negative'|'neutral'|'auto'; compact?: boolean };
```

### `Kbd`
Inline key hint, 12/600, `padding: 1px 6px`, radius 5–6, `--kbd-bg/border/fg`. Used inside buttons (`Add expense [N]`) and in the footer. Hide on touch devices (`@media (hover: none)`).

### `Button`
| Variant | Look | Examples |
|---|---|---|
| `primary` | `--button-primary-bg/fg` | Add expense, Save expense, Edit |
| `secondary` | `--surface` + `--shadow-button` (header) | Invite, Add payment |
| `soft` | `--surface-muted` or `--surface-muted-2`, no shadow | Duplicate, Mark paid, Save and add another, Show 7 expenses |
| `text` | no background, 700, coloured | Include everyone (`--positive`), Delete (`--negative`) |
| `icon` | 44 × 44 hit area | Back, Close |

Sizes: 44 (header/panel inline), 48 (panel actions), 52 (phone bottom bar). Disabled uses `aria-disabled="true"` (keep it focusable so the reason label can be read) plus the disabled colours, and puts the reason in the label ("Assign CA$20.00 more to save").

### `SegmentedControl`
Track with 4px padding, segments fill equally. Used for the Activity/Balances tabs (pill radius, 40–44px segments) and the split-mode tabs (radius 16 track, radius 12 segments). Implement as `role="tablist"` / `role="tab"` with `aria-selected`; arrow keys move between segments.

### `FilterChips`
Single-select row: All · Expenses · Payments · Involving me. Selected uses the primary colours. Use `aria-pressed` on toggle buttons (as drawn), or `role="radiogroup"`.

### `SearchField`
Pill, 44px, search icon, placeholder "Search expenses, people, amounts", a `[/]` hint. A real `<input type="search">` with an `aria-label`. Matching rules are in docs/04.

### `Switch`
46 × 28 track, 22px knob, `--accent` when on. A `<button role="switch" aria-checked>` with a visible text label ("Simplify" on phone, "Simplify debts" on desktop) inside the same button.

### `StatusStrip`
Rounded box (radius 14) with a left message and a right detail. Tones: `positive` (`--positive-soft` bg, `--positive` heading) and `warning` (`--negative-soft` bg, `--negative` heading). Mark it `aria-live="polite"` so changes are announced while editing splits.

---

## Page frame

### `GroupHeader`
- Desktop: identity (emoji + title) · `GroupTabs` · actions (Invite, Add payment, Add expense, divider, `ViewerPill`).
- Phone: back · emoji · title with a "Viewing as {name}" sub-line · Invite · `ViewerAvatarButton`. Tabs sit on their own row below.
- The old "Don't lose the link to this page!" line is gone. **Invite** copies the group link and shows "Link copied" (toast not designed; see docs/07).
```ts
type GroupHeaderProps = { ledger: Ledger; tab: 'activity'|'balances'; viewer: Member; onInvite(): void; onAddPayment(): void; onAddExpense(): void };
```

### `PhoneActionBar`
Sticky bottom bar with Add payment + Add expense. Add `env(safe-area-inset-bottom)` padding. Hide it while a sheet is open.

### `ShortcutFooter`
The hint row on desktop. Its contents depend on the tab. Hide below the desktop breakpoint and on touch devices.

---

## Activity

### `BalanceHero`
The gradient card.
- Content: label · amount · sub-line · `PersonChips` (Activity), or label · amount · `StatTiles` (Balances).
- **States by the viewer's net:**
  - `> 0`: "You're owed" + amount.
  - `< 0`: "You owe" + amount shown without a minus (the label carries the meaning). Not drawn; see docs/07.
  - `= 0`: "You're all settled" with no amount, and no chips (or chips all "0.00"). Not drawn.
- Sub-line rules are in docs/06.
```ts
type BalanceHeroProps = { netCents: number; mode: 'activity'|'balances'; pairwise?: PairwiseEntry[]; totals?: MemberTotals; variant: 'desktop'|'phone' };
```

### `PersonChips`
One chip per *other* member: avatar · name · compact signed amount. Sorted by amount descending, so people who owe the viewer come first and people the viewer owes come last; ties keep ledger order. A chip where the viewer owes money uses `--hero-owe-chip-bg`. **Clicking a chip filters the ledger to rows involving that person** (and the viewer), shown as an extra removable chip in the filter row. Desktop shows up to 5 in one row; with more members, wrap to a second row or scroll horizontally (not drawn).

### `ShareOfSpendCard`
"Trip so far" title, "Group spent {total}", a two-segment bar, and the legend. The bar is `role="img"` with an `aria-label` that spells out the numbers. Bar maths are in docs/05. The title is fixed copy ("Trip so far") in the mockups; consider making it neutral ("So far") or deriving it from the group, since not every group is a trip (docs/07).

### `LedgerTable` (desktop) / `LedgerList` (phone)
Same data, two renderings. A row model (from docs/05):
```ts
type LedgerRow = {
  id: string; kind: 'expense'|'payment'; date: string /* ISO */;
  title: string;               // expense description, or "{payer} paid {payee|you}"
  note?: string | null;        // payments.note
  payer: Member; payee?: Member;
  totalCents: number;
  involved: boolean;
  impactCents: number | null;  // null when not involved
  balanceAfterCents: number;   // viewer's running balance after this row
};
```
- Sort newest first. Date grouping: show the date on the first row of each day (desktop), and inside the meta line on every row (phone).
- Row variants: **expense**, **payment** (Payment tag + optional note; impact reads "CA$X in" / "CA$X out" in neutral text), **not involved** (impact "not involved" in muted; still shown under the All filter).
- Selecting a row opens it in the right panel (desktop) or a details sheet (phone). The selected row gets `aria-selected="true"` and the `--positive-soft` fill.
- Desktop table: real `<table>` with `<th scope="col">`. Each row needs an accessible way to open it: make the description cell a button or link, or use a grid pattern with roving focus for J/K.
- Long descriptions truncate with an ellipsis on one line (desktop) or wrap to two lines (phone).
- Many rows: plan for pagination or virtualisation; the design shows 7 (docs/07).

### `RightPanel` (desktop only)
A column that hosts exactly one of `ExpenseDetails`, `ExpenseComposer` (add or edit), or an empty state (not designed: suggest a prompt "Select an expense to see the split" plus the Add expense button). The panel basis is 300px for details and 400px for the composer; the ledger flexes. Below the two-column breakpoint it becomes an overlay drawer (docs/04).

---

## Expense composer (add and edit)

### `ExpenseComposer`
One form used for add and edit. Desktop: inside `RightPanel`. Phone: a full-height sheet. Never a centred modal.

Anatomy, top to bottom: `PanelHeader` · `AmountCard` · `PaidBySentence` · `SplitModeTabs` · mode body (`EqualSplit` | `ExactSplit` | `PercentSplit` | `SharesSplit`) · `StatusStrip` · actions.

```ts
type SplitMode = 'equal' | 'exact' | 'percent' | 'shares';
type ComposerValue = {
  description: string;            // max 50 chars
  amountCents: number | null;
  currency: string;               // default ledgers.base_currency
  payerId: string;                // default: current viewer
  date: string;                   // date only; default today (see docs/05 on created_at)
  mode: SplitMode;
  included: string[];             // equal mode
  exactCents: Record<string, number | null>;
  percent: Record<string, number | null>;
  shares: Record<string, number | null>;
};
type ExpenseComposerProps = {
  mode: 'add' | 'edit';
  initial?: ComposerValue;        // edit: built from expenses + splits (+ stored split mode, see docs/05)
  members: Member[]; viewer: Member;
  onSave(v: ComposerValue, opts: { addAnother: boolean }): Promise<void>;
  onCancel(): void;
  onDelete?(): void;              // edit only
};
```

- **PanelHeader**: "Add expense" or "Edit expense" · `[Esc]` + close.
- **AmountCard** (gradient): description input with a live "n/50" counter; the amount input (`inputmode="decimal"`, placeholder "0.00", accepts "45", "45.5", "45.50", strips currency symbols; maths expressions are a suggested extra, docs/07); the currency pill opens a currency list (behaviour in docs/05).
- **PaidBySentence**: "Paid by [member ▾] on [date ▾]". The payer picker lists members with avatars, viewer first, labelled "You". The date picker offers Today / Yesterday / a calendar. Picking a different payer updates every "you'll be owed" line live.
- **SplitModeTabs**: switching mode keeps the amounts already entered when it can (equal → exact pre-fills each included person's equal share; exact → percent converts to percentages). Never silently drop input. If a switch would lose data, keep each mode's state separately.
- **EqualSplit**: checkbox rows for every member (not archived), all checked by default. "Include everyone" re-checks all. Rows show the live per-person amount. Show the remainder note only when the cents don't divide evenly (the rule is in docs/05).
- **ExactSplit**: amount inputs per member. Blank means 0. The status strip shows the remaining amount. The helper button "Split CA$X across the N blank rows" appears when there are blank rows and money left; it fills them equally with the same cent rule.
- **PercentSplit**: percentage inputs (decimals allowed, e.g. 33.33), with the computed amount shown beside each. Valid when the total is exactly 100.
- **SharesSplit**: not designed. Suggested: stepper/integer inputs (default 1 for everyone included), amount shown beside each, always valid when the total is ≥ 1.
- **Actions**: "Save and add another" (saves, clears description and amount, keeps payer, date, mode and participants, focuses the amount) · "Save expense" (`⌘↵`/`Ctrl↵`). Edit mode: "Save changes", plus Delete (not drawn, see docs/07).
- The validation and status copy for each mode is in docs/04 and docs/06.

### `ExpenseDetails`
Canonical version: boards 15/16. Title, amount, date · "added by {name}", impact strip, "Paid by … and split …" sentence, the split list, then Edit / Duplicate / Delete.
- **Duplicate** opens the composer in add mode prefilled with everything except the date (set to today).
- **Delete** asks for confirmation (not drawn: suggest an inline "Delete this expense? [Cancel] [Delete]" swap in the actions row, or an undo toast).
- The split sentence describes the stored mode: "equally, 6 ways" · "by exact amounts" · "by percentage" · "by shares". This needs the split mode stored (docs/05).
- Payments need their own details view (not designed). Suggested: the same panel showing "{payer} paid {payee}", the amount, the note, and Edit / Delete.

---

## Balances

### `StatTiles`
Three tiles on the gradient: You paid · Your share (shown negative) · Paid back (received, shown negative; if the viewer has *sent* payments, show "You've paid back +CA$X" instead). Their sum equals the hero amount. Show the arithmetic only when it's exact.

### `SettleUpPlan`
- Header: title, "{n} payments clear the whole group", the Simplify switch (bound to `ledgers.simplify_debts`, so it's **group-wide** and persisted; changing it changes everyone's plan).
- Sections: "Involving you" (transfers where the viewer pays or receives) and "Rest of the group". Hide a section when it's empty.
- Row: the other person's avatar, "{X} pays you" / "You pay {X}" / "{X} pays {Y}", amount, and in the "Involving you" section a **Mark paid** button.
- **Mark paid** records a payment for exactly that transfer (payer → payee, amount, today, no note) after a lightweight confirmation, then the plan recomputes. Suggested: optimistic update with an Undo toast rather than a dialog.
- With Simplify off, list the raw pairwise debts instead (more rows). The data comes from the existing settlement algorithms; docs/05 explains.
- Empty state (everyone settled): not designed. Suggest "Everyone's square" with no rows.

### `EveryoneBreakdown`
- Phone: an accordion list. Desktop: a grid table with Paid / Share / Payments / Net columns.
- Sorted by net, descending. The viewer is labelled "You".
- Expanded content: totals (phone, plus "Show N expenses" to reveal the itemised lists) or three columns of itemised lines (desktop).
- Accordion headers are `<button aria-expanded>` controlling a region. One open at a time isn't required.

---

## Viewing-as switcher

### `ViewerPill` (desktop) / `ViewerAvatarButton` (phone)
Shows the current viewer's avatar (in their own colour), plus "Viewing as / {name}" on desktop. `aria-haspopup="menu"` (desktop) or `"dialog"` (phone sheet), with `aria-expanded`.

### `ViewerMenu` (desktop popover) / `ViewerSheet` (phone)
- Heading "View the group as" plus the explanation line.
- Items: one per non-archived member, in ledger order, each with avatar · name · group net ("gets back …" / "owes …") · a tick on the current one. `role="menuitemradio"` with `aria-checked`.
- Divider, then "Manage members" (opens the existing member management UI).
- Picking a member closes the menu, sets the viewer, re-renders everything, and keeps the selected row and scroll position.
- Desktop: closes on Esc, outside click, or selection; arrow keys move between items; focus returns to the pill. Phone: closes on the scrim, the close button, a swipe down, or selection.
- **Future accounts:** the same button becomes the account menu. Signed in, it shows the user's avatar and name only (no "Viewing as"), and the menu offers profile, settings (theme toggle), sign out, and Manage members. Whether a signed-in user can still "view as" someone else is a product decision (docs/07).
