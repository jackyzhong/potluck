import { test } from "node:test";
import assert from "node:assert/strict";

import {
  composerImpact,
  heroCounts,
  impact,
  events,
  memberTotals,
  pairwise,
  shareOfSpend,
  splitAmounts,
  viewerLedger,
  visibleChips,
  type Expense,
  type GroupData,
  type Payment,
  type Split
} from "./index.ts";
import { chipText, loadFixture, loadJson, money, toGroupData } from "./fixture-adapter.ts";

// ---------- the sample group, against fixtures/expected.json ----------

type Expected = {
  members: Record<string, Record<string, string>>;
  viewers: Record<
    string,
    {
      net: string;
      ledger: Record<string, string>[];
      chips: { member: string; amount: string }[];
      share_of_spend: Record<string, unknown>;
    }
  >;
  composer: {
    equal: Record<string, string>;
    percent: Record<string, string>;
    exact_left_to_assign: string;
  };
};

const fixture = loadFixture();
const data = toGroupData(fixture);
const expected = loadJson<Expected>("expected.json");
const name = Object.fromEntries(fixture.users.map((u) => [u.id, u.name]));
const idOf = Object.fromEntries(fixture.users.map((u) => [u.name, u.id]));

test("the adapter produces the app's row shapes", () => {
  assert.equal(data.expenses.length, 5);
  assert.equal(data.payments.length, 2);
  // Every expense's split rows add up to its total.
  for (const e of data.expenses) {
    const sum = data.splits.filter((s) => s.expense_id === e.id).reduce((a, s) => a + s.amount_cents, 0);
    assert.equal(sum, e.amount_cents, e.id);
  }
});

test("per-member totals match expected.json", () => {
  const totals = memberTotals(data);
  const actual = Object.fromEntries(
    Object.entries(totals).map(([id, t]) => [
      name[id],
      {
        paid: money(t.paid),
        share: money(t.share),
        sent: money(t.sent),
        received: money(t.received),
        net: money(t.net, { signed: true })
      }
    ])
  );
  assert.deepEqual(actual, expected.members);
});

for (const viewer of ["Jacky", "Stephen"]) {
  const viewerId = idOf[viewer];
  const want = expected.viewers[viewer];

  test(`${viewer}: net matches expected.json`, () => {
    assert.equal(money(memberTotals(data)[viewerId].net), want.net);
  });

  test(`${viewer}: ledger rows (impact and running balance) match expected.json`, () => {
    const actual = viewerLedger(data, viewerId).map((r) => ({
      when: r.createdAt.slice(0, 10),
      row: r.kind === "expense" ? r.title : `${name[r.payerId]} paid ${name[r.payeeId!]}`,
      paid_by: name[r.payerId],
      total: money(r.totalCents),
      impact: r.involved ? money(r.impactCents!, { signed: true }) : "not involved",
      balance: money(r.balanceAfterCents)
    }));
    assert.deepEqual(actual, want.ledger);
  });

  test(`${viewer}: hero chips match expected.json`, () => {
    const actual = pairwise(data, viewerId).map((p) => ({
      member: name[p.memberId],
      amount: chipText(p.cents)
    }));
    assert.deepEqual(actual, want.chips);
  });

  test(`${viewer}: share of spend matches expected.json`, () => {
    const s = shareOfSpend(data, viewerId);
    assert.deepEqual(
      {
        group_spent_cents: s.groupSpentCents,
        your_share_cents: s.yourShareCents,
        you_paid_cents: s.youPaidCents,
        bar: {
          share_pct: s.bar.sharePct,
          extra_pct: s.bar.extraPct,
          shortfall_pct: s.bar.shortfallPct
        }
      },
      want.share_of_spend
    );
  });
}

test("composer examples match expected.json", () => {
  const { equal, percent, exact_in_progress } = fixture._composer_examples;
  const order = data.memberOrder;
  const label = (cents: Record<string, number>) =>
    Object.fromEntries(Object.entries(cents).map(([id, c]) => [name[id], money(c)]));

  assert.deepEqual(
    label(splitAmounts(equal.amount_cents, { mode: "equal", participants: equal.participants }, order)),
    expected.composer.equal
  );
  assert.deepEqual(
    label(splitAmounts(percent.amount_cents, { mode: "percent", weights: percent.percent }, order)),
    expected.composer.percent
  );
  const entered = Object.values(exact_in_progress.entered).reduce((a, b) => a + b, 0);
  assert.equal(money(exact_in_progress.amount_cents - entered), expected.composer.exact_left_to_assign);
});

test("composer impact line: the 6450 / 4 and 40/30/20/10 examples", () => {
  const { equal, percent } = fixture._composer_examples;
  const jacky = idOf.Jacky;

  const equalShares = splitAmounts(
    equal.amount_cents,
    { mode: "equal", participants: equal.participants },
    data.memberOrder
  );
  const a = composerImpact({
    viewerId: jacky,
    payerId: equal.payer_id,
    amountCents: equal.amount_cents,
    shares: equalShares
  });
  assert.equal(a.cents, 4837); // "+CA$48.37"
  assert.equal(a.kind, "owed");

  const percentShares = splitAmounts(
    percent.amount_cents,
    { mode: "percent", weights: percent.percent },
    data.memberOrder
  );
  const b = composerImpact({
    viewerId: jacky,
    payerId: jacky,
    amountCents: percent.amount_cents,
    shares: percentShares
  });
  assert.equal(b.cents, 3870);
});

test("composer impact line: owe, none, and not involved", () => {
  const shares = { a: 500, b: 500 };
  // Someone else paid and the viewer is in the split: the viewer owes.
  assert.deepEqual(composerImpact({ viewerId: "b", payerId: "a", amountCents: 1000, shares }), {
    cents: -500,
    kind: "owe",
    involved: true
  });
  // The viewer pays for themselves alone: no change, but still involved.
  assert.deepEqual(
    composerImpact({ viewerId: "a", payerId: "a", amountCents: 1000, shares: { a: 1000 } }),
    { cents: 0, kind: "none", involved: true }
  );
  // Neither paying nor in the split.
  assert.deepEqual(composerImpact({ viewerId: "c", payerId: "a", amountCents: 1000, shares }), {
    cents: 0,
    kind: "none",
    involved: false
  });
});

test("hero counts and chips: zero chips are hidden (D11)", () => {
  const stephenPairs = pairwise(data, idOf.Stephen);
  assert.equal(heroCounts(stephenPairs).owesYou.length, 5);
  assert.equal(heroCounts(stephenPairs).youOwe.length, 0);

  const jackyPairs = pairwise(data, idOf.Jacky);
  assert.deepEqual(heroCounts(jackyPairs).owesYou.map((id) => name[id]), ["Jonah", "Matthew", "Alvin", "Angus"]);
  assert.deepEqual(heroCounts(jackyPairs).youOwe.map((id) => name[id]), ["Stephen"]);

  const withSquare = [
    { memberId: "x", cents: 500 },
    { memberId: "y", cents: 0 },
    { memberId: "z", cents: -200 }
  ];
  assert.deepEqual(visibleChips(withSquare).map((p) => p.memberId), ["x", "z"]);
  assert.deepEqual(heroCounts(withSquare), { owesYou: ["x"], youOwe: ["z"], square: ["y"] });
});

// ---------- small hand-built cases ----------

const expense = (over: Partial<Expense> & Pick<Expense, "id" | "payer_id" | "amount_cents">): Expense => ({
  ledger_id: "L",
  description: over.id,
  original_currency: "CAD",
  created_at: "2026-02-01T00:00:00.000Z",
  ...over
});
const payment = (over: Partial<Payment> & Pick<Payment, "id" | "payer_id" | "payee_id" | "amount_cents">): Payment => ({
  ledger_id: "L",
  original_currency: "CAD",
  note: null,
  created_at: "2026-02-01T00:00:00.000Z",
  ...over
});

test("events sort by instant, not by string, and tie-break on id", () => {
  const d: GroupData = {
    memberOrder: ["a", "b"],
    expenses: [
      // Same instant as p1, written the way Postgres writes it.
      expense({ id: "e2", payer_id: "a", amount_cents: 100, created_at: "2026-02-01T00:00:00+00:00" }),
      expense({ id: "e1", payer_id: "a", amount_cents: 100, created_at: "2026-02-01T00:00:00.5Z" })
    ],
    splits: [],
    payments: [payment({ id: "p1", payer_id: "a", payee_id: "b", amount_cents: 1, created_at: "2026-02-01T00:00:00Z" })]
  };
  // e2 and p1 are the same instant, so id decides ("e2" < "p1"); e1 is half a second later.
  assert.deepEqual(
    events(d).map((ev) => (ev.kind === "expense" ? ev.expense.id : ev.payment.id)),
    ["e2", "p1", "e1"]
  );
});

test("impact: payer-only, split-only, both, and not involved", () => {
  const d: GroupData = {
    memberOrder: ["a", "b", "c"],
    expenses: [expense({ id: "e1", payer_id: "a", amount_cents: 900 })],
    splits: [
      { expense_id: "e1", user_id: "a", amount_cents: 300 },
      { expense_id: "e1", user_id: "b", amount_cents: 600 }
    ],
    payments: []
  };
  const [ev] = events(d);
  assert.equal(impact(ev, "a"), 600); // paid 900, owes 300
  assert.equal(impact(ev, "b"), -600);
  assert.equal(impact(ev, "c"), null);
});

test("an expense the viewer paid but isn't split on counts fully in their favour", () => {
  const d: GroupData = {
    memberOrder: ["a", "b"],
    expenses: [expense({ id: "e1", payer_id: "a", amount_cents: 500 })],
    splits: [{ expense_id: "e1", user_id: "b", amount_cents: 500 }],
    payments: []
  };
  assert.equal(viewerLedger(d, "a")[0].impactCents, 500);
  assert.equal(viewerLedger(d, "b")[0].impactCents, -500);
});

test("share of spend: still-to-cover case and an empty group", () => {
  const d: GroupData = {
    memberOrder: ["a", "b"],
    expenses: [expense({ id: "e1", payer_id: "a", amount_cents: 1000 })],
    splits: [
      { expense_id: "e1", user_id: "a", amount_cents: 200 },
      { expense_id: "e1", user_id: "b", amount_cents: 800 }
    ],
    payments: []
  };
  // b paid nothing and owes 800 of the 1000.
  const b = shareOfSpend(d, "b");
  assert.deepEqual(b.bar, { sharePct: 0, extraPct: 0, shortfallPct: 80 });
  // a paid 1000 against a 200 share.
  assert.deepEqual(shareOfSpend(d, "a").bar, { sharePct: 20, extraPct: 80, shortfallPct: 0 });

  const empty = shareOfSpend({ memberOrder: ["a"], expenses: [], splits: [], payments: [] }, "a");
  assert.deepEqual(empty.bar, { sharePct: 0, extraPct: 0, shortfallPct: 0 });
});

test("a viewer who isn't a member gets an empty, zero-balance view", () => {
  assert.equal(viewerLedger(data, "u-nobody").every((r) => !r.involved && r.balanceAfterCents === 0), true);
  assert.equal(shareOfSpend(data, "u-nobody").youPaidCents, 0);
});

// ---------- property tests ----------

// Deterministic PRNG so a failure can be reproduced from its seed.
function makeRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function randomGroup(seed: number): GroupData {
  const rnd = makeRandom(seed);
  const pick = <T,>(xs: T[]) => xs[Math.floor(rnd() * xs.length)];
  const memberOrder = ["u1", "u2", "u3", "u4", "u5", "u6"].slice(0, 2 + Math.floor(rnd() * 5));

  const expenses: Expense[] = [];
  const splits: Split[] = [];
  const count = 1 + Math.floor(rnd() * 12);
  for (let i = 0; i < count; i++) {
    const id = `e${i}`;
    const total = 1 + Math.floor(rnd() * 50000);
    expenses.push(
      expense({
        id,
        payer_id: pick(memberOrder),
        amount_cents: total,
        // Some share a day so the id tie-break is exercised.
        created_at: new Date(Date.UTC(2026, 0, 1 + Math.floor(i / 2))).toISOString()
      })
    );

    const chosen = memberOrder.filter(() => rnd() < 0.7);
    const participants = chosen.length > 0 ? chosen : [memberOrder[0]];
    const mode = pick(["equal", "percent", "shares", "exact"] as const);
    const weights = Object.fromEntries(
      participants.map((u) => [u, mode === "percent" ? 1 + Math.floor(rnd() * 60) : 1 + Math.floor(rnd() * 5)])
    );
    const cents =
      mode === "equal"
        ? splitAmounts(total, { mode, participants }, memberOrder)
        : mode === "exact"
          ? splitAmounts(total, { mode, amounts: exactAmounts(total, participants, rnd) }, memberOrder)
          : splitAmounts(total, { mode, weights }, memberOrder);
    for (const [user_id, amount_cents] of Object.entries(cents)) {
      splits.push({ expense_id: id, user_id, amount_cents });
    }
  }

  const payments: Payment[] = [];
  const paymentCount = Math.floor(rnd() * 5);
  for (let i = 0; i < paymentCount; i++) {
    const payer = pick(memberOrder);
    payments.push(
      payment({
        id: `p${i}`,
        payer_id: payer,
        payee_id: pick(memberOrder.filter((u) => u !== payer)),
        amount_cents: 1 + Math.floor(rnd() * 20000),
        created_at: new Date(Date.UTC(2026, 0, 1 + Math.floor(rnd() * 8))).toISOString()
      })
    );
  }
  return { memberOrder, expenses, splits, payments };
}

// Random amounts that sum to the total, the way a valid Exact form would.
function exactAmounts(total: number, ids: string[], rnd: () => number): Record<string, number> {
  const out: Record<string, number> = {};
  let left = total;
  ids.forEach((id, i) => {
    const part = i === ids.length - 1 ? left : Math.floor(rnd() * left);
    out[id] = part;
    left -= part;
  });
  return out;
}

const SEEDS = Array.from({ length: 300 }, (_, i) => i + 1);

test("nets sum to zero", () => {
  for (const seed of SEEDS) {
    const g = randomGroup(seed);
    const total = Object.values(memberTotals(g)).reduce((a, t) => a + t.net, 0);
    assert.equal(total, 0, `seed ${seed}`);
  }
});

test("a member's net is paid - share + sent - received", () => {
  for (const seed of SEEDS) {
    const g = randomGroup(seed);
    for (const [id, t] of Object.entries(memberTotals(g))) {
      assert.equal(t.net, t.paid - t.share + t.sent - t.received, `seed ${seed} ${id}`);
    }
  }
});

test("the chips sum to the viewer's net, for every viewer", () => {
  for (const seed of SEEDS) {
    const g = randomGroup(seed);
    const totals = memberTotals(g);
    for (const viewer of g.memberOrder) {
      const sum = pairwise(g, viewer).reduce((a, p) => a + p.cents, 0);
      assert.equal(sum, totals[viewer].net, `seed ${seed} viewer ${viewer}`);
    }
  }
});

test("chips are sorted largest first and tie in ledger order", () => {
  for (const seed of SEEDS) {
    const g = randomGroup(seed);
    for (const viewer of g.memberOrder) {
      const pairs = pairwise(g, viewer);
      for (let i = 1; i < pairs.length; i++) {
        assert.ok(pairs[i - 1].cents >= pairs[i].cents, `seed ${seed} viewer ${viewer}: not descending`);
        if (pairs[i - 1].cents === pairs[i].cents) {
          assert.ok(
            g.memberOrder.indexOf(pairs[i - 1].memberId) < g.memberOrder.indexOf(pairs[i].memberId),
            `seed ${seed} viewer ${viewer}: a tie left ledger order`
          );
        }
      }
    }
  }
});

test("the newest ledger row's running balance equals the viewer's net", () => {
  for (const seed of SEEDS) {
    const g = randomGroup(seed);
    const totals = memberTotals(g);
    for (const viewer of g.memberOrder) {
      const rows = viewerLedger(g, viewer);
      assert.equal(rows[0].balanceAfterCents, totals[viewer].net, `seed ${seed} viewer ${viewer}`);
    }
  }
});

test("running balances change only on rows the viewer is involved in", () => {
  for (const seed of SEEDS) {
    const g = randomGroup(seed);
    for (const viewer of g.memberOrder) {
      const oldestFirst = viewerLedger(g, viewer).reverse();
      let before = 0;
      for (const row of oldestFirst) {
        assert.equal(row.balanceAfterCents - before, row.impactCents ?? 0, `seed ${seed} viewer ${viewer} row ${row.id}`);
        before = row.balanceAfterCents;
      }
    }
  }
});

test("the ledger has one row per expense and payment", () => {
  for (const seed of SEEDS) {
    const g = randomGroup(seed);
    assert.equal(viewerLedger(g, g.memberOrder[0]).length, g.expenses.length + g.payments.length, `seed ${seed}`);
  }
});

test("shareOfSpend segments never exceed the group's spend", () => {
  for (const seed of SEEDS) {
    const g = randomGroup(seed);
    for (const viewer of g.memberOrder) {
      const { bar } = shareOfSpend(g, viewer);
      // Each segment rounds to one decimal, so allow a hair of slack.
      assert.ok(bar.sharePct + bar.extraPct <= 100.1, `seed ${seed} viewer ${viewer}`);
      assert.ok(bar.sharePct + bar.shortfallPct <= 100.1, `seed ${seed} viewer ${viewer}`);
      assert.ok(bar.extraPct === 0 || bar.shortfallPct === 0, `seed ${seed} viewer ${viewer}`);
    }
  }
});
