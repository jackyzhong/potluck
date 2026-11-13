import { test } from "node:test";
import assert from "node:assert/strict";

import {
  equalSplitExtraCentMembers,
  splitAmounts,
  splitByWeight,
  splitEqually,
  type SplitSpec
} from "./split.ts";

const ORDER = ["jacky", "stephen", "angus", "alvin", "matthew", "jonah"];
const sum = (cents: Record<string, number>) => Object.values(cents).reduce((a, b) => a + b, 0);

// Deterministic PRNG so a failure can be reproduced from its seed.
function makeRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

const SEEDS = Array.from({ length: 500 }, (_, i) => i + 1);

// ---------- equal ----------

test("equal: 6450 among four gives the first two members the extra cents (D5)", () => {
  assert.deepEqual(splitEqually(6450, ["jacky", "stephen", "alvin", "jonah"], ORDER), {
    jacky: 1613,
    stephen: 1613,
    alvin: 1612,
    jonah: 1612
  });
});

test("equal: 19600 among six, extra cents to the first four in ledger order", () => {
  assert.deepEqual(splitEqually(19600, ORDER, ORDER), {
    jacky: 3267,
    stephen: 3267,
    angus: 3267,
    alvin: 3267,
    matthew: 3266,
    jonah: 3266
  });
});

test("equal: ledger order decides, not the order participants were picked in", () => {
  const picked = ["jonah", "alvin", "jacky"]; // 100 / 3 -> one extra cent
  assert.deepEqual(splitEqually(100, picked, ORDER), { jacky: 34, alvin: 33, jonah: 33 });
});

test("equal: an even split, a single person, and zero", () => {
  assert.deepEqual(splitEqually(1000, ["jacky", "stephen"], ORDER), { jacky: 500, stephen: 500 });
  assert.deepEqual(splitEqually(1000, ["angus"], ORDER), { angus: 1000 });
  assert.deepEqual(splitEqually(0, ["jacky", "stephen"], ORDER), { jacky: 0, stephen: 0 });
});

test("equal: no participants gives an empty split", () => {
  assert.deepEqual(splitEqually(1000, [], ORDER), {});
});

test("equal: a participant missing from the member order still gets a share", () => {
  const out = splitEqually(100, ["jacky", "ghost"], ORDER);
  assert.deepEqual(out, { jacky: 50, ghost: 50 });
});

test("equal: which members take the extra cent", () => {
  assert.deepEqual(equalSplitExtraCentMembers(6450, ["jacky", "stephen", "alvin", "jonah"], ORDER), [
    "jacky",
    "stephen"
  ]);
  assert.deepEqual(equalSplitExtraCentMembers(6400, ["jacky", "stephen", "alvin", "jonah"], ORDER), []);
  assert.deepEqual(equalSplitExtraCentMembers(100, [], ORDER), []);
});

test("equal: cents always sum to the total, and no one is more than a cent apart", () => {
  for (const seed of SEEDS) {
    const rnd = makeRandom(seed);
    const total = Math.floor(rnd() * 1_000_000);
    const chosen = ORDER.filter(() => rnd() < 0.6);
    const participants = chosen.length ? chosen : [ORDER[0]];
    const out = splitEqually(total, participants, ORDER);

    assert.equal(sum(out), total, `seed ${seed}`);
    assert.deepEqual(Object.keys(out), participants, `seed ${seed}: order`);
    const values = Object.values(out);
    assert.ok(Math.max(...values) - Math.min(...values) <= 1, `seed ${seed}: spread`);
    // The extra cents sit with the earliest members.
    assert.deepEqual(
      values,
      [...values].sort((a, b) => b - a),
      `seed ${seed}: extra cents not first`
    );
  }
});

// ---------- weighted (percent and shares) ----------

test("percent: 40/30/20/10 of 6450 matches the composer board", () => {
  assert.deepEqual(
    splitByWeight(6450, { jacky: 40, stephen: 30, alvin: 20, jonah: 10 }, ORDER),
    { jacky: 2580, stephen: 1935, alvin: 1290, jonah: 645 }
  );
});

test("percent: largest remainder gives the cent to the biggest fraction (D6)", () => {
  // 100 cents at 1/3 each: every remainder ties, so ledger order wins.
  assert.deepEqual(splitByWeight(100, { jacky: 1, stephen: 1, angus: 1 }, ORDER), {
    jacky: 34,
    stephen: 33,
    angus: 33
  });
  // 10 cents at 50/25/25 -> 5, 2.5, 2.5: the two .5 remainders tie, ledger order takes one.
  assert.deepEqual(splitByWeight(10, { jacky: 50, stephen: 25, angus: 25 }, ORDER), {
    jacky: 5,
    stephen: 3,
    angus: 2
  });
  // A bigger fraction beats an earlier member: 10 cents at 1/2/4 is 1.43, 2.86,
  // 5.71. The floors leave 2 cents over, which go to .86 (stephen) and .71 (angus),
  // not to jacky (.43).
  assert.deepEqual(splitByWeight(10, { jacky: 1, stephen: 2, angus: 4 }, ORDER), {
    jacky: 1,
    stephen: 3,
    angus: 6
  });
});

test("shares: integer weights split in proportion", () => {
  assert.deepEqual(splitByWeight(900, { jacky: 1, stephen: 2, angus: 0 }, ORDER), {
    jacky: 300,
    stephen: 600
  });
});

test("weights of zero (or less) are left out", () => {
  assert.deepEqual(splitByWeight(100, { jacky: 0, stephen: 1, angus: -3 }, ORDER), { stephen: 100 });
  assert.deepEqual(splitByWeight(100, { jacky: 0 }, ORDER), {});
  assert.deepEqual(splitByWeight(100, {}, ORDER), {});
});

test("decimal percentages are exact, not subject to float noise", () => {
  // 33.33 + 33.33 + 33.34 of 10000 cents.
  assert.deepEqual(splitByWeight(10000, { jacky: 33.33, stephen: 33.33, angus: 33.34 }, ORDER), {
    jacky: 3333,
    stephen: 3333,
    angus: 3334
  });
  // 0.1 + 0.2 style weights stay exact.
  assert.deepEqual(splitByWeight(3000, { jacky: 0.1, stephen: 0.2 }, ORDER), {
    jacky: 1000,
    stephen: 2000
  });
});

test("weighted: cents always sum to the total, for percent and shares", () => {
  for (const seed of SEEDS) {
    const rnd = makeRandom(seed);
    const total = Math.floor(rnd() * 1_000_000);
    const percentMode = rnd() < 0.5;
    const chosen = ORDER.filter(() => rnd() < 0.6);
    const participants = chosen.length ? chosen : [ORDER[0]];
    const weights = Object.fromEntries(
      participants.map((id) => [id, percentMode ? 1 + Math.floor(rnd() * 100) : 1 + Math.floor(rnd() * 10)])
    );
    const out = splitByWeight(total, weights, ORDER);

    assert.equal(sum(out), total, `seed ${seed}`);
    assert.deepEqual(Object.keys(out), participants, `seed ${seed}: members`);
    // Largest remainder never strays more than a cent from the exact share.
    const weightSum = Object.values(weights).reduce((a, b) => a + b, 0);
    for (const [id, cents] of Object.entries(out)) {
      const exact = (total * weights[id]) / weightSum;
      assert.ok(Math.abs(cents - exact) < 1, `seed ${seed} ${id}: ${cents} vs ${exact}`);
    }
  }
});

test("weighted: a bigger weight never gets fewer cents", () => {
  for (const seed of SEEDS) {
    const rnd = makeRandom(seed * 7);
    const total = Math.floor(rnd() * 100_000);
    const weights = Object.fromEntries(ORDER.map((id) => [id, 1 + Math.floor(rnd() * 20)]));
    const out = splitByWeight(total, weights, ORDER);
    for (const a of ORDER) {
      for (const b of ORDER) {
        if (weights[a] > weights[b]) assert.ok(out[a] >= out[b], `seed ${seed}: ${a} vs ${b}`);
      }
    }
  }
});

// ---------- splitAmounts: every mode ----------

test("splitAmounts dispatches on mode and keeps exact amounts as entered", () => {
  assert.deepEqual(splitAmounts(100, { mode: "equal", participants: ["jacky", "stephen"] }, ORDER), {
    jacky: 50,
    stephen: 50
  });
  assert.deepEqual(splitAmounts(100, { mode: "percent", weights: { jacky: 75, stephen: 25 } }, ORDER), {
    jacky: 75,
    stephen: 25
  });
  assert.deepEqual(splitAmounts(100, { mode: "shares", weights: { jacky: 1, stephen: 3 } }, ORDER), {
    jacky: 25,
    stephen: 75
  });
  const amounts = { jacky: 10, stephen: 90 };
  const exact = splitAmounts(100, { mode: "exact", amounts }, ORDER);
  assert.deepEqual(exact, amounts);
  assert.notEqual(exact, amounts); // a copy, not the caller's object
});

test("every split mode's cents sum to the total", () => {
  for (const seed of SEEDS) {
    const rnd = makeRandom(seed * 13);
    const total = 1 + Math.floor(rnd() * 500_000);
    const chosen = ORDER.filter(() => rnd() < 0.6);
    const participants = chosen.length ? chosen : [ORDER[0]];

    // A valid Exact form sums to the total by construction.
    const amounts: Record<string, number> = {};
    let left = total;
    participants.forEach((id, i) => {
      amounts[id] = i === participants.length - 1 ? left : Math.floor(rnd() * left);
      left -= amounts[id];
    });

    const specs: SplitSpec[] = [
      { mode: "equal", participants },
      { mode: "percent", weights: Object.fromEntries(participants.map((id) => [id, 1 + Math.floor(rnd() * 100)])) },
      { mode: "shares", weights: Object.fromEntries(participants.map((id) => [id, 1 + Math.floor(rnd() * 8)])) },
      { mode: "exact", amounts }
    ];
    for (const spec of specs) {
      assert.equal(sum(splitAmounts(total, spec, ORDER)), total, `seed ${seed} mode ${spec.mode}`);
    }
  }
});
