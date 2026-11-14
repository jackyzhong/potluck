import { test } from "node:test";
import assert from "node:assert/strict";

import { heroCopy, heroScale } from "./hero.ts";

test("owed, with one person the viewer owes (Jacky, board 03)", () => {
  const c = heroCopy({
    netCents: 5191,
    owesYou: ["Jonah", "Matthew", "Alvin", "Angus"],
    youOwe: ["Stephen"],
    everyoneElse: 5
  });
  assert.deepEqual(c, { label: "You're owed", subline: "4 people owe you · you owe Stephen", showAmount: true });
});

test("owed by everyone (Stephen, board 23)", () => {
  const c = heroCopy({
    netCents: 18541,
    owesYou: ["Alvin", "Matthew", "Jonah", "Angus", "Jacky"],
    youOwe: [],
    everyoneElse: 5
  });
  assert.equal(c.subline, "Everyone else owes you");
});

test("owed by some, owing nobody", () => {
  assert.equal(
    heroCopy({ netCents: 100, owesYou: ["A", "B"], youOwe: [], everyoneElse: 5 }).subline,
    "2 people owe you"
  );
  assert.equal(
    heroCopy({ netCents: 100, owesYou: ["Ann"], youOwe: [], everyoneElse: 5 }).subline,
    "Ann owes you"
  );
});

test("a two-person group says the name, not 'everyone else'", () => {
  assert.equal(heroCopy({ netCents: 100, owesYou: ["Ann"], youOwe: [], everyoneElse: 1 }).subline, "Ann owes you");
});

test("you owe several people", () => {
  assert.equal(
    heroCopy({ netCents: 100, owesYou: ["A"], youOwe: ["B", "C"], everyoneElse: 5 }).subline,
    "A owes you · you owe 2 people"
  );
});

test("owing: the mirror of owed", () => {
  const c = heroCopy({ netCents: -6460, owesYou: ["Jacky"], youOwe: ["Stephen", "Zed", "Ann"], everyoneElse: 5 });
  assert.equal(c.label, "You owe");
  assert.equal(c.subline, "You owe 3 people · Jacky owes you");
  assert.equal(c.showAmount, true);
  assert.equal(
    heroCopy({ netCents: -1, owesYou: [], youOwe: ["A", "B", "C"], everyoneElse: 3 }).subline,
    "You owe everyone else"
  );
  assert.equal(heroCopy({ netCents: -1, owesYou: [], youOwe: ["Stephen"], everyoneElse: 5 }).subline, "You owe Stephen");
});

test("settled shows no amount", () => {
  assert.deepEqual(heroCopy({ netCents: 0, owesYou: [], youOwe: [], everyoneElse: 5 }), {
    label: "You're all settled",
    subline: "Nothing owed either way",
    showAmount: false
  });
});

test("net zero with offsetting debts keeps the chips' story", () => {
  const c = heroCopy({ netCents: 0, owesYou: ["A"], youOwe: ["B"], everyoneElse: 5 });
  assert.equal(c.label, "You're all settled");
  assert.equal(c.subline, "A owes you · you owe B");
});

test("heroScale: full size up to 9 characters, smaller after", () => {
  assert.equal(heroScale("CA$185.41"), 1);
  assert.equal(heroScale("CA$51.91"), 1);
  assert.equal(heroScale("CA$1,185.41"), 0.818);
  assert.equal(heroScale("CA$12,345.67"), 0.75);
  assert.equal(heroScale("−CA$12,345.67"), 0.692);
  assert.equal(heroScale("x".repeat(100)), 0.4);
});
