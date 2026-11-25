import { test } from "node:test";
import assert from "node:assert/strict";

import { fallbackSlot, initialOf, memberSlots } from "./avatar.ts";

const m = (id: string, created_at: string) => ({ id, created_at });
const group = [
  m("sam", "2026-09-01T10:00:00Z"),
  m("priya", "2026-09-01T10:00:01Z"),
  m("marco", "2026-09-01T10:00:02Z"),
  m("lena", "2026-09-01T10:00:03Z"),
  m("theo", "2026-09-01T10:00:04Z"),
  m("nadia", "2026-09-01T10:00:05Z")
];

test("slots follow ledger order, whatever order the rows arrive in", () => {
  const shuffled = [group[3], group[0], group[5], group[2], group[1], group[4]];
  const slots = memberSlots(shuffled);
  assert.deepEqual(
    group.map((g) => slots.get(g.id)),
    [1, 2, 3, 4, 5, 6]
  );
});

test("the seventh member wraps around to slot 1", () => {
  const slots = memberSlots([...group, m("late", "2026-10-01T00:00:00Z")]);
  assert.equal(slots.get("late"), 1);
});

test("leaving a member out of the list shifts everyone after them, so callers must pass archived members too", () => {
  const all = memberSlots(group);
  const withoutPriya = memberSlots(group.filter((g) => g.id !== "priya"));
  assert.equal(all.get("marco"), 3);
  assert.equal(withoutPriya.get("marco"), 2); // the bug the all-members rule prevents
});

test("members created in the same instant are ordered by id", () => {
  const t = "2026-09-01T10:00:00Z";
  const a = memberSlots([m("b", t), m("a", t)]);
  const b = memberSlots([m("a", t), m("b", t)]);
  assert.equal(a.get("a"), 1);
  assert.equal(a.get("b"), 2);
  assert.deepEqual([...a].sort(), [...b].sort());
});

test("fallbackSlot is stable and in range", () => {
  assert.equal(fallbackSlot("someone"), fallbackSlot("someone"));
  for (const id of ["", "a", "someone", "3894c472-c5d9-5a84-ad89-8f6aa3ea2361"]) {
    const s = fallbackSlot(id);
    assert.ok(s >= 1 && s <= 6, `${id} -> ${s}`);
  }
});

test("initialOf takes the first character, upper-cased", () => {
  assert.equal(initialOf("sam"), "S");
  assert.equal(initialOf("  priya"), "P");
  assert.equal(initialOf("Émilie"), "É");
  assert.equal(initialOf("🍲 pot"), "🍲");
  assert.equal(initialOf(""), "?");
  assert.equal(initialOf("   "), "?");
});
