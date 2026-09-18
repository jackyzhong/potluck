# Payments / Settlement Tracking — Design

Status: **phases 1-3 built; phase 4 (edit/delete) outstanding**. This records the decisions made before
implementation so the reasoning survives the work. Update it if reality
diverges.

Context: this is HANDOFF priority #3, the last major MVP feature. It lets a
member record that they actually handed money to someone, so a debt can be
closed out rather than sitting in the Balances tab forever.

---

## 1. The arithmetic

A payment is not a new kind of math. Alice paying Carol $20 moves the books
exactly as an expense of $20 paid by Alice whose entire split lands on Carol:

```
balances[payer] += amount    // paying down what you owe
balances[payee] -= amount    // collecting what you were owed
```

Alice at −20 goes to 0; Carol at +20 goes to 0. Partial payments leave the
remainder; overpayments correctly flip the direction.

For the pairwise view, a payment is an edge in the opposite direction:

```
graph[payee][payer] += amount
```

`getUnsimplifiedDebts` already cancels mutual debts, so this needs no special
handling. Paying $5 of a $20 debt leaves $15 owed; paying $30 leaves $10 owed
back the other way; paying someone you owe nothing makes them your debtor.

`getSimplifiedDebts` needs no change at all — it derives from net balances.

## 2. Storage: a `payments` table

**Decision: payments live in their own table, not as a flagged row in
`expenses`.**

The rejected alternative was `expenses.kind = 'payment'` with a single
synthetic split row, which is what Splitwise does internally and which gets the
balance math for free. It was rejected because it makes the correctness of
every balance depend on a `splits` row that does not mean what a split means —
a payment written without its fake split row produces silently wrong balances,
the same failure shape as the missing-RLS bug (KNOWN-ISSUES 2.2). It also puts
payments within reach of `ExpenseModal`, whose split-mode inference is already
known-buggy (KNOWN-ISSUES 1.2, 1.3) and would corrupt one.

The cost of this choice, stated plainly: every balance calculation must now
remember to include payments, and one that forgets will tell someone they still
owe money they have already paid. That is a worse failure than the flag
approach's (a cosmetically wrong "total spent"), which is why §6 puts the
weight of the testing there.

```sql
create table payments (
  id                uuid primary key default gen_random_uuid(),
  ledger_id         uuid not null references ledgers(id) on delete cascade,
  payer_id          uuid not null references users(id),
  payee_id          uuid not null references users(id),
  amount_cents      bigint not null check (amount_cents > 0),
  original_currency text not null default 'CAD',
  note              text,
  created_at        timestamptz not null default now(),
  check (payer_id <> payee_id)
);
```

Notes on the shape:

- `note` is genuinely nullable. Do not repeat the `expenses.description`
  mistake, where the column is `NOT NULL` while the UI calls it optional and
  the save silently fails (KNOWN-ISSUES 1.1).
- `ledger_id` sits on the row directly. Besides being correct, it means
  payments can be filtered per-ledger by Realtime — the thing `splits` cannot
  do (KNOWN-ISSUES 4.1).
- `payer_id`/`payee_id` intentionally mirror the existing no-cascade FKs to
  `users`, for consistency with `expenses.payer_id`. This inherits
  KNOWN-ISSUES 2.4: a member with payment history cannot be deleted. That is
  the right default until the remove-member semantics are decided.
- RLS policies must be added in the same migration — `select`, `insert`,
  `update`, `delete`. A missing one fails silently rather than erroring.
  Match the existing (fully open) convention for now, and note that this table
  is in scope for whatever fixes KNOWN-ISSUES 2.1, which is the real problem.

## 3. Balance function changes

All four functions in `src/lib/balances.ts` take an additional `payments`
argument:

- `getNetBalances` — apply the two terms from §1.
- `getUnsimplifiedDebts` — add the reverse edge from §1.
- `getSimplifiedDebts` — no change beyond passing through.
- `getMemberBreakdown` — two new sections, so the drill-down still reconciles
  to the figure it explains:

```
Paid for the group     $40.00
Payments made          $20.00
Share of expenses     −$30.00
Payments received      −$0.00
─────────────────────────────
Net                    $30.00
```

The invariant that already holds for expenses must keep holding with payments
in play: `getMemberBreakdown(u, ...).netCents === getNetBalances(...)[u]`.

## 4. UI

### Recording a payment

**Primary path — Settle up.** Each transfer row in Balances ("Alice owes Carol
$20") gets a Settle up action that opens the payment form pre-filled with that
payer, payee and amount. This is the path that matters: it takes the user from
the debt they are looking at to the record of paying it in one tap.

Note that with Simplify Debts on, the suggested transfers are not raw pairwise
debts. Settling a simplified transfer is still correct — the math does not care
— and is in fact the point of simplification.

**Fallback — the action menu**, for payments that do not match a suggested
transfer (someone rounded up, paid early, or paid a person they did not owe).

### The floating action menu

Adding a third action makes the current two-pill stack untenable on a phone:
the pills are `fixed bottom-8 right-8` while the page only reserves bottom
padding, so they already float over content at narrow widths (observed at
500px, covering the balance rows). Fixing this is part of this work, not a
follow-up.

- **`sm` and up:** three pills as today — Manage Users, Add Payment, Add
  Expense.
- **Below `sm`:** a single `+` button that expands the stack.

Implementation constraints:

- The breakpoint switch is **CSS-only** (`hidden sm:flex` on the stack,
  `sm:hidden` on the `+`). No JS viewport measurement — it causes hydration
  mismatches under SSR. `display:none` already removes the hidden variant from
  the accessibility tree.
- Render **one** set of pills, not one per breakpoint. The stack is `hidden`
  on mobile unless expanded and always `flex` at `sm:`; only the `+` is
  breakpoint-specific.
- The expanded menu dismisses on outside-click and Escape, following the
  currency dropdown in `ExpenseModal` — including its capture-phase Escape
  listener, so closing the menu does not also close anything behind it.
- `aria-expanded` / `aria-haspopup` on the `+`, and auto-collapse when an
  action opens its modal.

**Styling:** Add Payment is secondary (white, like Manage Users). Add Expense
stays the only black primary — logging expenses is the constant action,
settling up is occasional, and two competing primaries make neither read as
the default.

### History

The Expenses tab is renamed **Activity** and payments appear in the same
chronological list, styled distinctly ("Alice paid Carol"). The list is the
ledger's real history; putting settlements anywhere else makes them hard to
audit against the balances they changed.

## 5. Decisions locked

1. **Base currency only, for v1.** Multi-currency payments inherit the
   unfixed rate-locking problem (KNOWN-ISSUES 1.4) and would compound it.
   Revisit when that is fixed.
2. **No validation against current debt.** Any positive amount is allowed.
   People round up, pay in advance, and pay people they do not owe; the
   arithmetic handles all three.
3. **Editing and deleting payments is phase 4**, not v1. When it lands it needs
   the same `.select()`-on-write care as expenses, for the reason in §2.

## 6. Phases

1. ~~**Schema, RLS, balance math, tests.**~~ Done. Found and logged a
   pre-existing rounding bug on the way (KNOWN-ISSUES 1.5).
2. ~~**Recording:** payment modal, Settle up entry point, responsive action
   menu.~~ Done.
3. ~~**Display:** Activity tab rename, payment rows in the list, breakdown
   sections.~~ Done. The breakdown sections landed in phase 1 instead: the net
   already counted payments, so omitting the rows would have shown totals that
   did not add up.
4. **Edit and delete.** Outstanding. `payments` already has its UPDATE and
   DELETE policies. Note that `PaymentCard` is deliberately non-interactive
   until this lands.

## 7. Testing

Phase 1 carries the testing weight — it is pure functions over plain data, no
mocking required, and it is where a mistake silently misstates what people owe
each other. This is also the natural moment to introduce a test runner, since
the project currently has none (KNOWN-ISSUES 5.1).

Extend the randomized harness already used for the breakdown work — generate
ledgers with random members, expenses, uneven splits and mixed currencies, now
with payments — and assert:

- `getMemberBreakdown(u, ...).netCents === getNetBalances(...)[u]` for every
  member, as today.
- Net balances sum to zero across all members, before and after payments.
- **Settling every suggested transfer zeroes the group.** Take the output of
  `getSimplifiedDebts`, record a payment for each, recompute: every member's
  net must be exactly 0. This is the invariant that proves the feature works —
  the whole point of the Balances tab is that following its instructions
  settles the group, and this asserts it end to end.
- The same must hold for `getUnsimplifiedDebts`.
