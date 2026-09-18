import { test } from "node:test";
import assert from "node:assert/strict";

import {
  getMemberBreakdown,
  getNetBalances,
  getSimplifiedDebts,
  getUnsimplifiedDebts,
  type Debt,
  type Payment
} from "./balances.ts";

type Expense = {
  id: string;
  ledger_id: string;
  payer_id: string;
  description: string | null;
  amount_cents: number;
  original_currency: string;
  created_at: string;
};
type Split = { expense_id: string; user_id: string; amount_cents: number };

type Ledger = {
  users: string[];
  expenses: Expense[];
  splits: Split[];
  payments: Payment[];
  rates: Record<string, number>;
};

const RATES: Record<string, number> = { CAD: 1, USD: 1.37, JPY: 0.0091 };

// Deterministic PRNG so a failure can be reproduced from its seed.
function makeRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

// Mixed currencies are deliberately opt-in: converting each split independently
// does not conserve money (see PAR note below), so the conservation invariants
// run at par, which is what the app actually does today.
const MIXED = Object.keys(RATES);
const PAR = ["CAD"];

function randomLedger(seed: number, withPayments: boolean, currencies: string[] = MIXED): Ledger {
  const rnd = makeRandom(seed);
  const pick = <T,>(xs: T[]) => xs[Math.floor(rnd() * xs.length)];

  const users = ["u1", "u2", "u3", "u4", "u5"].slice(0, 2 + Math.floor(rnd() * 4));

  const expenses: Expense[] = [];
  const splits: Split[] = [];

  const expenseCount = 1 + Math.floor(rnd() * 12);
  for (let i = 0; i < expenseCount; i++) {
    const id = `e${i}`;
    const total = 1 + Math.floor(rnd() * 50000);
    expenses.push({
      id,
      ledger_id: "L",
      payer_id: pick(users),
      description: `expense ${i}`,
      amount_cents: total,
      original_currency: pick(currencies),
      created_at: new Date(Date.UTC(2026, 0, (i % 28) + 1)).toISOString()
    });

    // Uneven split across a random non-empty subset; the last participant
    // absorbs the remainder, the way the app's EQUAL mode does.
    const chosen = users.filter(() => rnd() < 0.7);
    const participants = chosen.length > 0 ? chosen : [users[0]];
    let allocated = 0;
    participants.forEach((user, idx) => {
      const amount =
        idx === participants.length - 1 ? total - allocated : Math.floor(total / participants.length);
      allocated += amount;
      splits.push({ expense_id: id, user_id: user, amount_cents: amount });
    });
  }

  const payments: Payment[] = [];
  if (withPayments) {
    const paymentCount = Math.floor(rnd() * 5);
    for (let i = 0; i < paymentCount && users.length > 1; i++) {
      const payer = pick(users);
      const others = users.filter((u) => u !== payer);
      payments.push({
        id: `p${i}`,
        ledger_id: "L",
        payer_id: payer,
        payee_id: pick(others),
        amount_cents: 1 + Math.floor(rnd() * 20000),
        original_currency: pick(currencies),
        note: null,
        created_at: new Date(Date.UTC(2026, 1, (i % 28) + 1)).toISOString()
      });
    }
  }

  return { users, expenses, splits, payments, rates: RATES };
}

const net = (l: Ledger) => getNetBalances(l.expenses, l.splits, l.payments, l.rates);
const sumDebts = (debts: Debt[]) => debts.reduce((total, d) => total + d.amountCents, 0);

/** Turn each suggested transfer into the payment that settles it. */
function payOff(ledger: Ledger, debts: Debt[]): Ledger {
  const settlements: Payment[] = debts.map((debt, i) => ({
    id: `settle${i}`,
    ledger_id: "L",
    payer_id: debt.debtorId,
    payee_id: debt.creditorId,
    amount_cents: debt.amountCents,
    // Debts are already normalized to the base currency, so settle at par.
    original_currency: "CAD",
    note: null,
    created_at: new Date(Date.UTC(2026, 5, 1)).toISOString()
  }));
  return { ...ledger, payments: [...ledger.payments, ...settlements] };
}

const SEEDS = Array.from({ length: 300 }, (_, i) => i + 1);

test("a member's breakdown always reconciles to their net balance", () => {
  for (const seed of SEEDS) {
    for (const withPayments of [false, true]) {
      const ledger = randomLedger(seed, withPayments);
      const balances = net(ledger);

      for (const user of ledger.users) {
        const breakdown = getMemberBreakdown(
          user,
          ledger.expenses,
          ledger.splits,
          ledger.payments,
          ledger.rates
        );

        assert.equal(
          breakdown.netCents,
          balances[user] || 0,
          `seed ${seed} (payments=${withPayments}) user ${user}: breakdown disagrees with net balance`
        );

        // The four totals shown to the user must produce the figure above them.
        assert.equal(
          breakdown.paidTotalCents +
            breakdown.paymentsMadeTotalCents -
            breakdown.owedTotalCents -
            breakdown.paymentsReceivedTotalCents,
          breakdown.netCents,
          `seed ${seed}: breakdown totals do not add up for ${user}`
        );
      }
    }
  }
});

test("net balances sum to zero, with and without payments", () => {
  for (const seed of SEEDS) {
    for (const withPayments of [false, true]) {
      const ledger = randomLedger(seed, withPayments, PAR);
      const total = Object.values(net(ledger)).reduce((a, b) => a + b, 0);
      assert.equal(total, 0, `seed ${seed} (payments=${withPayments}): balances do not sum to zero`);
    }
  }
});

test("settling every simplified transfer leaves the whole group at zero", () => {
  for (const seed of SEEDS) {
    const ledger = randomLedger(seed, true, PAR);
    const settled = payOff(ledger, getSimplifiedDebts(ledger.expenses, ledger.splits, ledger.payments, ledger.rates));

    for (const [user, balance] of Object.entries(net(settled))) {
      assert.equal(balance, 0, `seed ${seed}: ${user} is not settled after paying every suggested transfer`);
    }
    assert.equal(
      getSimplifiedDebts(settled.expenses, settled.splits, settled.payments, settled.rates).length,
      0,
      `seed ${seed}: transfers remain after settling all of them`
    );
  }
});

test("settling every unsimplified transfer leaves the whole group at zero", () => {
  for (const seed of SEEDS) {
    const ledger = randomLedger(seed, true, PAR);
    const settled = payOff(
      ledger,
      getUnsimplifiedDebts(ledger.expenses, ledger.splits, ledger.payments, ledger.rates)
    );

    for (const [user, balance] of Object.entries(net(settled))) {
      assert.equal(balance, 0, `seed ${seed}: ${user} is not settled after paying every pairwise debt`);
    }
  }
});

test("simplifying never moves more money than paying pairwise", () => {
  for (const seed of SEEDS) {
    const ledger = randomLedger(seed, true, PAR);
    const pairwise = getUnsimplifiedDebts(ledger.expenses, ledger.splits, ledger.payments, ledger.rates);
    const simplified = getSimplifiedDebts(ledger.expenses, ledger.splits, ledger.payments, ledger.rates);

    assert.ok(
      sumDebts(simplified) <= sumDebts(pairwise),
      `seed ${seed}: simplified total ${sumDebts(simplified)} exceeds pairwise ${sumDebts(pairwise)}`
    );
    assert.ok(
      simplified.length <= pairwise.length,
      `seed ${seed}: simplifying produced more transfers than it removed`
    );
  }
});

test("a payment moves exactly its amount between two people", () => {
  const base: Ledger = {
    users: ["alice", "carol"],
    expenses: [
      {
        id: "e1",
        ledger_id: "L",
        payer_id: "carol",
        description: "Taxi",
        amount_cents: 2000,
        original_currency: "CAD",
        created_at: "2026-02-01T00:00:00.000Z"
      }
    ],
    splits: [{ expense_id: "e1", user_id: "alice", amount_cents: 2000 }],
    payments: [],
    rates: RATES
  };

  assert.deepEqual(net(base), { carol: 2000, alice: -2000 });

  const partly = payOff(base, [{ debtorId: "alice", creditorId: "carol", amountCents: 500 }]);
  assert.deepEqual(net(partly), { carol: 1500, alice: -1500 });
  assert.deepEqual(
    getUnsimplifiedDebts(partly.expenses, partly.splits, partly.payments, partly.rates),
    [{ debtorId: "alice", creditorId: "carol", amountCents: 1500 }]
  );

  const exactly = payOff(base, [{ debtorId: "alice", creditorId: "carol", amountCents: 2000 }]);
  assert.deepEqual(net(exactly), { carol: 0, alice: 0 });
  assert.equal(getUnsimplifiedDebts(exactly.expenses, exactly.splits, exactly.payments, exactly.rates).length, 0);

  // Overpaying is allowed and simply reverses who is owed.
  const overpaid = payOff(base, [{ debtorId: "alice", creditorId: "carol", amountCents: 3000 }]);
  assert.deepEqual(net(overpaid), { carol: -1000, alice: 1000 });
  assert.deepEqual(
    getUnsimplifiedDebts(overpaid.expenses, overpaid.splits, overpaid.payments, overpaid.rates),
    [{ debtorId: "carol", creditorId: "alice", amountCents: 1000 }]
  );
});

test("paying someone you owe nothing makes them your debtor", () => {
  const ledger: Ledger = {
    users: ["alice", "bob"],
    expenses: [],
    splits: [],
    payments: [
      {
        id: "p1",
        ledger_id: "L",
        payer_id: "alice",
        payee_id: "bob",
        amount_cents: 1500,
        original_currency: "CAD",
        note: "spotted you",
        created_at: "2026-02-01T00:00:00.000Z"
      }
    ],
    rates: RATES
  };

  assert.deepEqual(net(ledger), { alice: 1500, bob: -1500 });
  assert.deepEqual(getSimplifiedDebts(ledger.expenses, ledger.splits, ledger.payments, ledger.rates), [
    { debtorId: "bob", creditorId: "alice", amountCents: 1500 }
  ]);
});

test("a member's payments appear on the correct side of their breakdown", () => {
  const ledger: Ledger = {
    users: ["alice", "bob"],
    expenses: [],
    splits: [],
    payments: [
      {
        id: "p1",
        ledger_id: "L",
        payer_id: "alice",
        payee_id: "bob",
        amount_cents: 1500,
        original_currency: "CAD",
        note: "rent",
        created_at: "2026-02-01T00:00:00.000Z"
      }
    ],
    rates: RATES
  };

  const alice = getMemberBreakdown("alice", ledger.expenses, ledger.splits, ledger.payments, ledger.rates);
  assert.equal(alice.paymentsMade.length, 1);
  assert.equal(alice.paymentsReceived.length, 0);
  assert.equal(alice.paymentsMade[0].counterpartyId, "bob");
  assert.equal(alice.paymentsMade[0].note, "rent");
  assert.equal(alice.netCents, 1500);

  const bob = getMemberBreakdown("bob", ledger.expenses, ledger.splits, ledger.payments, ledger.rates);
  assert.equal(bob.paymentsReceived.length, 1);
  assert.equal(bob.paymentsMade.length, 0);
  assert.equal(bob.paymentsReceived[0].counterpartyId, "alice");
  assert.equal(bob.netCents, -1500);
});

// Known gap — see KNOWN-ISSUES 1.5. Converting every split independently rounds
// each one, so the shares need not add back up to the converted expense total,
// and cents appear or vanish. Unskip this when the multi-currency work lands;
// it is the acceptance test for it.
test(
  "mixed currencies conserve money",
  { skip: "known gap: per-split rounding loses cents, see KNOWN-ISSUES 1.5" },
  () => {
    // Minimal reproduction: 16344 USD at 1.37, split evenly two ways.
    // Payer is credited round(16344 * 1.37) = 22391.
    // Shares are charged round(8172 * 1.37) * 2 = 22392. One cent from nowhere.
    const ledger: Ledger = {
      users: ["alice", "bob"],
      expenses: [
        {
          id: "e1",
          ledger_id: "L",
          payer_id: "alice",
          description: "dinner",
          amount_cents: 16344,
          original_currency: "USD",
          created_at: "2026-02-01T00:00:00.000Z"
        }
      ],
      splits: [
        { expense_id: "e1", user_id: "alice", amount_cents: 8172 },
        { expense_id: "e1", user_id: "bob", amount_cents: 8172 }
      ],
      payments: [],
      rates: RATES
    };

    const total = Object.values(net(ledger)).reduce((a, b) => a + b, 0);
    assert.equal(total, 0, "converting splits independently did not conserve money");

    for (const seed of SEEDS) {
      const mixed = randomLedger(seed, true, MIXED);
      const sum = Object.values(net(mixed)).reduce((a, b) => a + b, 0);
      assert.equal(sum, 0, `seed ${seed}: mixed-currency balances do not sum to zero`);
    }
  }
);
