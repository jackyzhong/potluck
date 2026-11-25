# Calculations

How every number on the group page is computed. The code lives in `src/lib/glow/` (`ledger.ts`, `split.ts`, `balances.ts`, `hero.ts`, `money.ts`). `src/lib/glow/fixtures/reference.mjs` is an independent reference implementation of the per-viewer numbers; the unit tests check the app against its output for the sample group in `cabin-trip.json`.

To regenerate the expected values after changing the sample group:

```bash
node src/lib/glow/fixtures/reference.mjs > src/lib/glow/fixtures/expected.json
```

```bash
node src/lib/glow/fixtures/reference.mjs --check
```

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

Always compute it over the full history, never over a filtered list.

### Pairwise chips (hero card)

For each other member O, the net between V and O before any simplification:

```
pair(V,O) = Σ over expenses paid by V:  split[O]
          − Σ over expenses paid by O:  split[V]
          − Σ payments O → V
          + Σ payments V → O
```

Positive: O owes V. The chips sum to net(V) (the reference script asserts this). Sort descending; ties keep ledger order. Compact display: "+37.55" / "−40.08", no currency. Chips with a value of 0 are hidden.

Hero sub-line: count the chips > 0 ("4 people owe you") and the chips < 0 ("you owe Priya" / "you owe 2 people"). `src/lib/glow/hero.ts` has every combination.

### Share of spend (Trip so far card)

```
groupSpent = Σ expenses.amount_cents   (payments excluded)
share      = share(V);  paid = paid(V)
bar segment 1 (--bar-share) = min(share, paid) / groupSpent
bar segment 2 (--bar-extra) = max(paid − share, 0) / groupSpent   → V fronted money for others
undrawn case: if paid < share, segment 2 is instead (share − paid) / groupSpent in a "still to cover" style
legend: "Your share {share}" · "You paid {paid}"
```

### Composer impact line

Same formula as an expense's impact, computed live from the form: `(payerId == V ? amount : 0) − (split[V] ?? 0)`. Positive → "You'll be owed {x} more"; negative → "You'll owe {|x|} more"; V not involved → "This doesn't change your balance". Examples: equal 6450 among 4 with V paying → +4837 ("CA$48.37"); percent 40/30/20/10 → +3870.

### Settle-up plan

Built on the app's existing debt-settlement algorithms (`src/lib/balances.ts`). For the current mode they give a list of transfers `{ from, to, amountCents }`:
- `simplify_debts = true` → the minimised plan ("5 payments clear the whole group").
- `simplify_debts = false` → the unsimplified pairwise debts.

The UI then puts transfers where `from == V` or `to == V` under "Involving you" and the rest under "Rest of the group".

Any valid plan works: the per-person totals must match the nets, not specific pairs.

### Everyone breakdown

Per member: paid, share, payments ("received X" / "sent X" / "none"; both can be non-zero, so show net or both), net. Sorted by net descending. Expanded lines: each expense the member paid for (description · date · amount), and each split they hold (description · date · share).

## Splitting rules (cents)

All split modes must produce integer cents that sum exactly to `amount_cents`.

- **Equal:** `base = floor(total / n)`; the remainder `r = total − base·n` goes **1 cent each to the first r included members in ledger order** (`users.created_at` ascending). Example: 6450 / 4 → 1613, 1613, 1612, 1612.
- **Percent / Shares:** largest-remainder method. Floor each exact share, then hand out the missing cents to the largest fractional remainders, ties in ledger order.
- **Exact:** stored as entered. Valid only when they sum to the total.

## Formatting

- `Intl.NumberFormat('en-US', { style: 'currency', currency })` gives "CA$1,175.90" for CAD, which is what the app shows. (en-CA would print "$1,175.90"; keep "CA$" so currencies stay unambiguous when they're mixed.)
- Negatives: U+2212 minus before the currency, "−CA$12.50". Signed positives: "+CA$91.45".
- Compact (hero chips): two decimals, sign, no currency, e.g. "+28.79".
- Dates in the ledger: "Sep 18" this year, "Sep 18, 2025" in other years. Phone meta lines use the same format. Details: "Sep 8 · added by you".
