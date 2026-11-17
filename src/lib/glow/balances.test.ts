import { test } from "node:test";
import assert from "node:assert/strict";

import {
  everyoneRows,
  lineDate,
  memberLines,
  memberTotals,
  netLabel,
  paymentsCell,
  planHeroLine,
  planSubtitle,
  settlePlan,
  showExpensesLabel,
  statTiles,
  statTilesTotal,
  transferText,
  type GroupData
} from "./index.ts";
import { loadFixture, toGroupData } from "./fixture-adapter.ts";

const fixture = loadFixture();
const data: GroupData = toGroupData(fixture);
const nameOf = (id: string) => fixture.users.find((u) => u.id === id)?.name ?? id;
const sam = "u-sam";
const priya = "u-priya";

test("the three tiles add up to the net, for every member", () => {
  const totals = memberTotals(data);
  for (const id of data.memberOrder) {
    assert.equal(statTilesTotal(statTiles(totals[id])), totals[id].net, nameOf(id));
  }
});

test("tiles for Sam and Priya", () => {
  const totals = memberTotals(data);
  assert.deepEqual(statTiles(totals[sam]), {
    paidCents: 30075,
    shareCents: -21421,
    paymentsCents: -1300,
    paymentsKind: "paidBack"
  });
  assert.deepEqual(statTiles(totals[priya]), {
    paidCents: 56286,
    shareCents: -19710,
    paymentsCents: -1200,
    paymentsKind: "paidBack"
  });
});

test("a member who only sent payments gets 'You've paid back' with a positive amount", () => {
  const theo = fixture.users.find((u) => u.name === "Theo")!.id;
  const tiles = statTiles(memberTotals(data)[theo]);
  assert.equal(tiles.paymentsCents, 2500);
  assert.equal(tiles.paymentsKind, "youPaidBack");
  assert.equal(statTilesTotal(tiles), -14719);
});

test("both plans clear every balance, and Simplify never needs more payments", () => {
  const totals = memberTotals(data);
  for (const simplified of [true, false]) {
    const plan = settlePlan(data, simplified, sam);
    const moved: Record<string, number> = {};
    for (const t of plan.transfers) {
      moved[t.fromId] = (moved[t.fromId] ?? 0) + t.amountCents;
      moved[t.toId] = (moved[t.toId] ?? 0) - t.amountCents;
    }
    // Paying a debt raises the payer's net, so each person's transfers equal -net.
    for (const id of data.memberOrder) {
      assert.equal(moved[id] ?? 0, -totals[id].net, `${simplified} ${nameOf(id)}`);
    }
  }
  const on = settlePlan(data, true, sam).transfers.length;
  const off = settlePlan(data, false, sam).transfers.length;
  assert.ok(on <= off);
  assert.equal(on, 5);
});

test("sections: involving you, the rest, largest first", () => {
  const plan = settlePlan(data, true, sam);
  assert.equal(plan.involving.length + plan.rest.length, plan.transfers.length);
  assert.ok(plan.involving.every((t) => t.fromId === sam || t.toId === sam));
  assert.ok(plan.rest.every((t) => t.fromId !== sam && t.toId !== sam));
  const sorted = (xs: { amountCents: number }[]) =>
    xs.every((t, i) => i === 0 || xs[i - 1].amountCents >= t.amountCents);
  assert.ok(sorted(plan.involving) && sorted(plan.rest));
  const none = settlePlan(data, true, null);
  assert.equal(none.involving.length, 0);
  assert.equal(none.rest.length, none.transfers.length);
});

test("transfer wording", () => {
  assert.equal(transferText({ fromId: "u-lena", toId: sam, amountCents: 1 }, sam, nameOf), "Lena pays you");
  assert.equal(transferText({ fromId: sam, toId: priya, amountCents: 1 }, sam, nameOf), "You pay Priya");
  assert.equal(transferText({ fromId: "u-nadia", toId: priya, amountCents: 1 }, sam, nameOf), "Nadia pays Priya");
  assert.equal(transferText({ fromId: "u-nadia", toId: priya, amountCents: 1 }, null, nameOf), "Nadia pays Priya");
});

test("plan subtitle", () => {
  assert.equal(planSubtitle(5), "5 payments clear the whole group");
  assert.equal(planSubtitle(1), "One payment clears the whole group");
  assert.equal(planSubtitle(0), "Nothing to settle");
});

test("desktop hero line", () => {
  const plan = settlePlan(data, true, sam);
  const line = planHeroLine(plan, sam, nameOf, true);
  assert.equal(line, "Lena pays you once debts are simplified");
  assert.equal(planHeroLine(plan, sam, nameOf, false).endsWith("once debts are simplified"), false);
  const single = {
    transfers: [],
    involving: [{ fromId: "u-lena", toId: sam, amountCents: 5 }],
    rest: []
  };
  assert.equal(planHeroLine(single, sam, nameOf, true), "Lena pays you once debts are simplified");
  const owe = { transfers: [], involving: [{ fromId: sam, toId: priya, amountCents: 5 }], rest: [] };
  assert.equal(planHeroLine(owe, sam, nameOf, true), "You pay Priya once debts are simplified");
  assert.equal(planHeroLine({ transfers: [], involving: [], rest: [] }, sam, nameOf, true), "");
});

test("everyone: sorted by net, nets sum to zero, archived and square members hidden", () => {
  const rows = everyoneRows(data);
  assert.equal(rows.length, data.memberOrder.length);
  assert.deepEqual(
    rows.map((r) => nameOf(r.memberId)),
    ["Priya", "Sam", "Marco", "Lena", "Theo", "Nadia"]
  );
  assert.equal(rows.reduce((s, r) => s + r.netCents, 0), 0);
  assert.equal(rows[0].netKind, "back");
  assert.equal(rows[2].netKind, "back");
  assert.equal(rows[3].netKind, "owes");
  const fresh: GroupData = { ...data, expenses: [], splits: [], payments: [] };
  assert.equal(everyoneRows(fresh, new Set([sam])).length, data.memberOrder.length - 1);
  assert.equal(everyoneRows(data, new Set([sam])).length, data.memberOrder.length);
});

test("net labels and payments cells", () => {
  assert.equal(netLabel("back", false), "gets back");
  assert.equal(netLabel("back", true), "get back");
  assert.equal(netLabel("owes", false), "owes");
  assert.equal(netLabel("owes", true), "owe");
  assert.equal(netLabel("square", true), "settled up");
  assert.deepEqual(paymentsCell({ sentCents: 0, receivedCents: 0 }), []);
  assert.deepEqual(paymentsCell({ sentCents: 0, receivedCents: 1424 }), [{ kind: "received", cents: 1424 }]);
  assert.deepEqual(paymentsCell({ sentCents: 1049, receivedCents: 0 }), [{ kind: "sent", cents: 1049 }]);
  assert.equal(paymentsCell({ sentCents: 5, receivedCents: 9 }).length, 2);
});

test("a member's lines add up to their paid and share totals", () => {
  const totals = memberTotals(data);
  for (const id of data.memberOrder) {
    const lines = memberLines(data, id);
    assert.equal(lines.paid.reduce((s, l) => s + l.cents, 0), totals[id].paid, nameOf(id));
    assert.equal(lines.share.reduce((s, l) => s + l.cents, 0), totals[id].share, nameOf(id));
  }
  const s = memberLines(data, priya);
  assert.equal(s.paid.length, 2);
  assert.equal(s.share.length, 9);
  assert.equal(s.expenseCount, 9);
});

test("expense toggle label and line dates", () => {
  assert.equal(showExpensesLabel(5, false), "Show 5 expenses");
  assert.equal(showExpensesLabel(1, false), "Show 1 expense");
  assert.equal(showExpensesLabel(5, true), "Hide expenses");
  const now = new Date(2026, 10, 13, 12);
  assert.equal(lineDate(new Date(2026, 8, 18, 12).toISOString(), now), "Sep 18");
  assert.equal(lineDate(new Date(2025, 8, 18, 12).toISOString(), now), "Sep 18, 2025");
  assert.equal(lineDate("not a date", now), "");
});
