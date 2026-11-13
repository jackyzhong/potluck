# 05 · Data and calculations

Every number the redesign shows, how to compute it, and how it maps to the Supabase schema as it is today. `fixtures/reference.mjs` implements all of it in ~200 lines of dependency-free JS; `fixtures/expected.json` is its output for the sample group and matches the mockups exactly.

## Schema as read from Supabase (project "Potluck")

| Table | Columns used by the design | Design term |
|---|---|---|
| `ledgers` | `id`, `title`, `emoji` (default 🍲), `base_currency` (default CAD), `simplify_debts` (default true), `created_at` | group |
| `users` | `id`, `ledger_id`, `name`, `archived_at`, `created_at`; also `is_placeholder`, `device_token`, `phone_number`, `auth_user_id` | member |
| `expenses` | `id`, `ledger_id`, `payer_id`, `description` (nullable), `amount_cents` (bigint), `original_currency` (default CAD), `created_at` | expense |
| `splits` | `id`, `expense_id`, `user_id`, `amount_cents` | a member's share of an expense |
| `payments` | `id`, `ledger_id`, `payer_id`, `payee_id`, `amount_cents` (> 0), `original_currency`, `note` (nullable), `created_at` | payment / settle-up |

RLS is enabled on all five. Money is integer cents throughout; keep every calculation in integer cents and format only for display.

## Core definitions

Let **V** be the current viewer. For each event (expense or payment), in chronological order:

### Impact of an event on V

```
expense e:
  involved = (e.payer_id == V) or (V has a split row on e)
  impact   = (e.payer_id == V ? e.amount_cents : 0) − (split[V] ?? 0)

payment p:
  involved = (p.payer_id == V) or (p.payee_id == V)
  impact   = +p.amount_cents   if V sent it     (V's debt shrinks / V is owed more)
             −p.amount_cents   if V received it (others owe V less)
not involved → impact = null (shown as "not involved", counts as 0)
```

Positive means others owe V more. This sign convention is used everywhere: hero, ledger, chips, tiles.

**Display rule for payments:** the stored impact is signed (a payment V received is −), but the ledger shows payments in neutral text as "CA$10.49 in" (received) or "CA$10.49 out" (sent). The "+/−" colouring is for expenses only. The running balance still applies the signed value.

### Net balance of a member M (hero amount, Balances, viewer menu)

```
net(M) = paid(M) − share(M) + sent(M) − received(M)
  paid     = Σ expenses.amount_cents where payer_id = M
  share    = Σ splits.amount_cents   where user_id  = M
  sent     = Σ payments.amount_cents where payer_id = M
  received = Σ payments.amount_cents where payee_id = M
```

Nets across a group always sum to 0. Hero: "You're owed {net(V)}" if > 0, "You owe {|net(V)|}" if < 0, settled if 0.

Balances stat tiles: **You paid** = paid(V), **Your share** = −share(V), **Paid back** = −received(V) (if V has sent payments, show "+sent(V)" as "You've paid back"). Tiles sum to net(V).

### Running balance (ledger "Balance" / "bal." column)

Sort all of the group's expenses and payments ascending by `created_at` (tie-break on `id`), keep a cumulative sum of V's impact, and store each row's value *after* that row. Display newest first. Rows where V isn't involved repeat the previous balance. The newest row's balance equals net(V).

Always compute it over the full history, never over a filtered list (docs/04).

### Pairwise chips (hero card)

For each other member O, the net between V and O before any simplification:

```
pair(V,O) = Σ over expenses paid by V:  split[O]
          − Σ over expenses paid by O:  split[V]
          − Σ payments O → V
          + Σ payments V → O
```

Positive: O owes V. The chips sum to net(V) (the reference script asserts this). Sort descending; ties keep ledger order. Compact display: "+28.79" / "−16.38", no currency. Chips with a value of 0 can be hidden or shown as "0.00" (open question).

Hero sub-line: count the chips > 0 ("4 people owe you") and the chips < 0 ("you owe Stephen" / "you owe 2 people"). See docs/06 for every combination.

### Share of spend (Trip so far card)

```
groupSpent = Σ expenses.amount_cents   (payments excluded)
share      = share(V);  paid = paid(V)
bar segment 1 (--bar-share) = min(share, paid) / groupSpent
bar segment 2 (--bar-extra) = max(paid − share, 0) / groupSpent   → V fronted money for others
undrawn case: if paid < share, segment 2 is instead (share − paid) / groupSpent in a "still to cover" style (docs/07)
legend: "Your share {share}" · "You paid {paid}"
```

Jacky: share 17.4%, extra 13.4%. Stephen: share 17.4%, extra 37.6%.

### Composer impact line

Same formula as an expense's impact, computed live from the form: `(payerId == V ? amount : 0) − (split[V] ?? 0)`. Positive → "You'll be owed {x} more"; negative → "You'll owe {|x|} more"; V not involved → "This doesn't change your balance". Mockup examples: equal 6450 among 4 with V paying → +4837 ("CA$48.37"); percent 40/30/20/10 → +3870.

### Settle-up plan

**Use the app's existing debt-settlement algorithms** (Potluck has two). The design only needs, for the current mode, a list of transfers `{ from, to, amountCents }`:
- `simplify_debts = true` → the minimised plan ("5 payments clear the whole group").
- `simplify_debts = false` → the unsimplified pairwise debts.

The UI then puts transfers where `from == V` or `to == V` under "Involving you" and the rest under "Rest of the group".

The plan drawn in the mockups (Alvin→Jacky 46.60, Angus→Jacky 5.31, Jonah→Stephen 85.58, Matthew→Stephen 81.83, Alvin→Stephen 18.00) is one valid 5-transfer solution for the sample data. A greedy largest-first algorithm gives a different, equally valid 5-transfer plan. Don't treat the mockup's exact pairs as a spec. The totals per person must match the nets.

### Everyone breakdown

Per member: paid, share, payments ("received X" / "sent X" / "none"; both can be non-zero, so show net or both), net. Sorted by net descending. Expanded lines: each expense the member paid for (description · date · amount), and each split they hold (description · date · share).

## Splitting rules (cents)

All split modes must produce integer cents that sum exactly to `amount_cents`.

- **Equal:** `base = floor(total / n)`; the remainder `r = total − base·n` goes **1 cent each to the first r included members in ledger order** (`users.created_at` ascending). The mockup note "you and Stephen each take an extra cent" follows this rule (6450 / 4 → 1613, 1613, 1612, 1612). Sample check: Candy 19600 / 6 → Jacky, Stephen, Angus, Alvin 3267; Matthew, Jonah 3266.
  - The current app may use a different rule (e.g. the payer absorbs the remainder). **Check the existing implementation and keep one rule everywhere.** If it differs, update the remainder note's copy to match.
- **Percent / Shares:** largest-remainder method. Floor each exact share, then hand out the missing cents to the largest fractional remainders, ties in ledger order.
- **Exact:** stored as entered. Valid only when they sum to the total.

## Formatting

- `Intl.NumberFormat('en-US', { style: 'currency', currency })` gives "CA$1,175.90" for CAD, which is what the mockups show. (en-CA would print "$1,175.90"; keep "CA$" so currencies stay unambiguous when they're mixed.)
- Negatives: U+2212 minus before the currency, "−CA$12.50". Signed positives: "+CA$91.45".
- Compact (hero chips): two decimals, sign, no currency, e.g. "+28.79".
- Dates in the ledger: "Sep 18" this year, "Sep 18, 2025" in other years. Phone meta lines use the same format. Details: "Sep 8 · added by you".

## Gaps between the design and the current schema

The coding agent should confirm each against the code. These are the places where the design needs data the tables don't obviously hold.

| # | Design needs | Today | Suggestion |
|---|---|---|---|
| 1 | Edit reopens the **split mode** used (Equally / Exact / Percent / Shares), and details say "split equally, 6 ways" | Only `splits.amount_cents` is stored; the mode is lost | Add `expenses.split_mode text check (split_mode in ('equal','exact','percent','shares'))`, nullable for old rows. Add `splits.weight numeric null` for percent/shares inputs. For old rows: show "custom split" and open edit in Exact. |
| 2 | "Added by {name}" in details | No creator column | Add `expenses.created_by uuid references users(id)` (nullable), set from the viewer at save. Or drop the line until accounts exist. |
| 3 | Expense **date** chosen in the form ("on Today") | `created_at` is the only timestamp and is updatable; the current form edits date *and time* | Either keep using `created_at` as "when it happened" (simplest; the current behaviour), or add `expenses.occurred_on date` and keep `created_at` as the insert time. If a date-only picker writes `created_at`, use local noon to avoid timezone day-shifts. |
| 4 | Ledger ordering by "when it happened" plus a stable tie-break | `created_at` (+ `id`) | Fine as is. If #3 adds `occurred_on`, sort by `(occurred_on, created_at, id)`. |
| 5 | Delete expense | No soft delete | A hard delete of `splits` + `expenses` in one transaction is acceptable. Consider `deleted_at` if Undo should survive a refresh. |
| 6 | Multi-currency: the composer has a currency pill | `original_currency` on expenses/payments; no FX rate or converted amount | Confirm what the app does today with non-base currencies. The design shows all totals in the base currency. If an expense is in USD, the ledger should show the base-currency value with a small original-amount line ("US$20.00"), and balances must use converted values. Needs a stored rate (`fx_rate numeric`) or a converted amount. **Open question.** |
| 7 | Viewer per device | `users.device_token` exists (purpose unknown) | localStorage (docs/04). Check whether `device_token` already maps a device to a member. |
| 8 | Archived members | `users.archived_at` | Exclude from the viewer menu, payer picker and default participants. Keep them in history, the breakdown (if their net ≠ 0) and the settle-up plan. |
| 9 | Member colour stability | none | Derive from ledger order or an id hash (docs/02); no column needed. Add `users.color_index smallint` only if members should be able to pick a colour. |
| 10 | "Mark paid" | `payments` table | Insert a payment `{payer_id: from, payee_id: to, amount_cents, note: null}`. No schema change. |
| 11 | Simplify toggle | `ledgers.simplify_debts` | Already modelled, and group-wide. No change. |
| 12 | Payment notes ("write off") | `payments.note` | Already modelled. |

## Data fetching

Everything on both tabs derives from one group's members, expenses (with splits) and payments. Groups are small (tens to low hundreds of rows), so:
- Fetch once per group view (server component or one query with nested selects), compute all viewer-relative numbers on the client from that one dataset, and recompute instantly when the viewer changes.
- After a mutation (add, edit, delete, Mark paid, toggle), refetch or optimistically patch the dataset. Every number updates from the same source, so they can't drift apart.
- Move the totals into a SQL view or RPC only if groups get large. `expected.json` is the contract either way.

## Testing with the fixtures

- `fixtures/veld-2026.json` mirrors the tables (splits written as an equal-split spec; the reference expands them to cents). Seed it into a test database or load it into unit tests.
- Port the functions in `reference.mjs` (or test the app's own functions) and assert against `expected.json`: per-member totals, Jacky's and Stephen's ledgers (impact + running balance per row), the pairwise chips, the share-of-spend bar, and the composer examples (equal, percent, exact remaining).
- Invariants worth keeping as property tests: nets sum to 0; chips sum to the viewer's net; the newest row's running balance = net; every split mode's cents sum to the total.
