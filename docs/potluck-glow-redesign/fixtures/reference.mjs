// Reference implementation of every number the Glow mockups display.
// Plain JS (no deps) so it can be ported straight into TypeScript.
// It is NOT meant to replace Potluck's existing settlement algorithms; it defines the
// per-viewer numbers (impact, running balance, pairwise chips, share of spend) that the
// new UI needs, so they can be unit-tested against fixtures/expected.json.
//
// Run:  node fixtures/reference.mjs            -> prints expected.json to stdout
//       node fixtures/reference.mjs --check    -> asserts the values shown in the mockups

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// ---------- splitting (all integer cents) ----------

/** Equal split. Leftover cents go one each to the first participants in ledger member order. */
export function splitEqually(totalCents, participantIds, memberOrder) {
  const ordered = memberOrder.filter((id) => participantIds.includes(id));
  const base = Math.floor(totalCents / ordered.length);
  let rest = totalCents - base * ordered.length;
  const out = {};
  for (const id of ordered) { out[id] = base + (rest > 0 ? 1 : 0); rest--; }
  return out;
}

/** Weighted split (percent or shares). Largest-remainder method; ties go to ledger member order. */
export function splitByWeight(totalCents, weights, memberOrder) {
  const ids = memberOrder.filter((id) => (weights[id] ?? 0) > 0);
  const sum = ids.reduce((a, id) => a + weights[id], 0);
  const raw = ids.map((id) => ({ id, exact: (totalCents * weights[id]) / sum }));
  const out = {};
  let assigned = 0;
  for (const r of raw) { out[r.id] = Math.floor(r.exact); assigned += out[r.id]; }
  const order = [...raw].sort((a, b) => (b.exact % 1) - (a.exact % 1) || ids.indexOf(a.id) - ids.indexOf(b.id));
  for (let i = 0; i < totalCents - assigned; i++) out[order[i].id] += 1;
  return out;
}

export function splitsFor(expense, memberOrder) {
  const s = expense.split;
  if (s.mode === "equal") return splitEqually(expense.amount_cents, s.participants, memberOrder);
  if (s.mode === "percent" || s.mode === "shares") return splitByWeight(expense.amount_cents, s.weights, memberOrder);
  if (s.mode === "exact") return { ...s.amounts };
  throw new Error("unknown split mode " + s.mode);
}

// ---------- events ----------

/** All expenses and payments as one chronological list (oldest first). Ties break on id. */
export function events(data) {
  const order = data.users.map((u) => u.id);
  const ex = data.expenses.map((e) => ({ kind: "expense", ...e, splits: e.splits ?? splitsFor(e, order) }));
  const pay = data.payments.map((p) => ({ kind: "payment", ...p }));
  return [...ex, ...pay].sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
}

/**
 * Effect of one event on the viewer's net position (positive = others owe the viewer more).
 * expense: (viewer paid ? total : 0) - (viewer's split ?? 0)
 * payment: +amount if the viewer sent it, -amount if the viewer received it
 * Returns null when the viewer is not involved.
 */
export function impact(ev, viewerId) {
  if (ev.kind === "expense") {
    const paid = ev.payer_id === viewerId ? ev.amount_cents : 0;
    const share = ev.splits[viewerId] ?? 0;
    if (!paid && !(viewerId in ev.splits)) return null;
    return paid - share;
  }
  if (ev.payer_id === viewerId) return ev.amount_cents;
  if (ev.payee_id === viewerId) return -ev.amount_cents;
  return null;
}

// ---------- per-member totals (Balances tab, viewer menu) ----------

export function memberTotals(data) {
  const t = Object.fromEntries(data.users.map((u) => [u.id, { paid: 0, share: 0, sent: 0, received: 0, net: 0 }]));
  for (const ev of events(data)) {
    if (ev.kind === "expense") {
      t[ev.payer_id].paid += ev.amount_cents;
      for (const [id, c] of Object.entries(ev.splits)) t[id].share += c;
    } else {
      t[ev.payer_id].sent += ev.amount_cents;
      t[ev.payee_id].received += ev.amount_cents;
    }
  }
  for (const v of Object.values(t)) v.net = v.paid - v.share + v.sent - v.received;
  return t;
}

// ---------- viewer ledger (Activity tab) ----------

/** Rows newest first, each with the viewer's impact and the viewer's running balance after it. */
export function viewerLedger(data, viewerId) {
  let bal = 0;
  const rows = events(data).map((ev) => {
    const imp = impact(ev, viewerId);
    bal += imp ?? 0;
    return {
      id: ev.id, kind: ev.kind, created_at: ev.created_at,
      title: ev.kind === "expense" ? ev.description : null,
      payer_id: ev.payer_id, payee_id: ev.payee_id ?? null, note: ev.note ?? null,
      total_cents: ev.amount_cents, involved: imp !== null, impact_cents: imp, balance_after_cents: bal,
    };
  });
  return rows.reverse();
}

// ---------- pairwise chips (hero card) ----------

/** Net between the viewer and each other member, before simplification. Sums to the viewer's net. */
export function pairwise(data, viewerId) {
  const out = Object.fromEntries(data.users.filter((u) => u.id !== viewerId).map((u) => [u.id, 0]));
  for (const ev of events(data)) {
    if (ev.kind === "expense") {
      if (ev.payer_id === viewerId) for (const [id, c] of Object.entries(ev.splits)) { if (id !== viewerId) out[id] += c; }
      else if (viewerId in ev.splits) out[ev.payer_id] -= ev.splits[viewerId];
    } else {
      if (ev.payee_id === viewerId) out[ev.payer_id] -= ev.amount_cents;
      if (ev.payer_id === viewerId) out[ev.payee_id] += ev.amount_cents;
    }
  }
  return Object.entries(out).map(([member_id, cents]) => ({ member_id, cents }))
    .sort((a, b) => b.cents - a.cents);
}

// ---------- share of spend (Trip so far card) ----------

export function shareOfSpend(data, viewerId) {
  const group = data.expenses.reduce((a, e) => a + e.amount_cents, 0);
  const t = memberTotals(data)[viewerId];
  const pct = (c) => +(100 * c / group).toFixed(1);
  return {
    group_spent_cents: group, your_share_cents: t.share, you_paid_cents: t.paid,
    // Drawn case (paid >= share): dark segment = your share, accent segment = what you fronted for others.
    // Undrawn case (paid < share): dark segment = what you paid, shortfall = rest of your share (see docs/07).
    bar: { share_pct: pct(Math.min(t.share, t.paid)), extra_pct: pct(Math.max(t.paid - t.share, 0)),
           shortfall_pct: pct(Math.max(t.share - t.paid, 0)) },
  };
}

// ---------- display ----------

const fmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "CAD" });
/** "CA$1,175.90"; negatives use a true minus before the currency: "−CA$12.50". */
export function money(cents, { signed = false } = {}) {
  const s = fmt.format(Math.abs(cents) / 100);
  if (cents < 0) return "−" + s;
  return signed && cents > 0 ? "+" + s : s;
}

// ---------- CLI ----------

function build(data) {
  const name = Object.fromEntries(data.users.map((u) => [u.id, u.name]));
  const order = data.users.map((u) => u.id);
  const totals = memberTotals(data);
  const perViewer = {};
  for (const v of ["u-jacky", "u-stephen"]) {
    perViewer[name[v]] = {
      net: money(totals[v].net),
      ledger: viewerLedger(data, v).map((r) => ({
        when: r.created_at.slice(0, 10),
        row: r.kind === "expense" ? r.title : `${name[r.payer_id]} paid ${name[r.payee_id]}`,
        paid_by: name[r.payer_id], total: money(r.total_cents),
        impact: r.involved ? money(r.impact_cents, { signed: true }) : "not involved",
        balance: money(r.balance_after_cents),
      })),
      chips: pairwise(data, v).map((p) => ({ member: name[p.member_id], amount: (p.cents >= 0 ? "+" : "−") + (Math.abs(p.cents) / 100).toFixed(2) })),
      share_of_spend: shareOfSpend(data, v),
    };
  }
  const c = data._composer_examples;
  return {
    members: Object.fromEntries(Object.entries(totals).map(([id, t]) => [name[id], {
      paid: money(t.paid), share: money(t.share), sent: money(t.sent), received: money(t.received), net: money(t.net, { signed: true }),
    }])),
    viewers: perViewer,
    composer: {
      equal: Object.fromEntries(Object.entries(splitEqually(c.equal.amount_cents, c.equal.participants, order)).map(([id, x]) => [name[id], money(x)])),
      percent: Object.fromEntries(Object.entries(splitByWeight(c.percent.amount_cents, c.percent.percent, order)).map(([id, x]) => [name[id], money(x)])),
      exact_left_to_assign: money(c.exact_in_progress.amount_cents - Object.values(c.exact_in_progress.entered).reduce((a, b) => a + b, 0)),
    },
  };
}

const here = dirname(fileURLToPath(import.meta.url));
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const data = JSON.parse(readFileSync(join(here, "veld-2026.json"), "utf8"));
  const out = build(data);
  if (process.argv.includes("--check")) {
    const assert = (cond, msg) => { if (!cond) { console.error("FAIL", msg); process.exit(1); } };
    const exp = JSON.parse(readFileSync(join(here, "expected.json"), "utf8"));
    assert(JSON.stringify(out) === JSON.stringify(exp), "output differs from expected.json");
    const t = memberTotals(data);
    assert(Object.values(t).reduce((a, v) => a + v.net, 0) === 0, "nets must sum to zero");
    for (const v of data.users.map((u) => u.id))
      assert(pairwise(data, v).reduce((a, p) => a + p.cents, 0) === t[v].net, "pairwise chips must sum to net for " + v);
    console.log("all checks passed");
  } else {
    console.log(JSON.stringify(out, null, 2));
  }
}
