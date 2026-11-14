import { test } from "node:test";
import assert from "node:assert/strict";

import {
  discardTitle,
  isPanelVisible,
  layoutForWidth,
  needsDiscardPrompt,
  panelToParams,
  parsePanel,
  readPanelParams,
  transition,
  withPanelState,
  type PanelState
} from "./panel.ts";

const empty: PanelState = { kind: "empty" };
const details = (id: string): PanelState => ({ kind: "details", id });
const add: PanelState = { kind: "add" };
const edit = (id: string): PanelState => ({ kind: "edit", id });
const p = (e: string | null, panel: string | null) => ({ e, panel });

// ---------- URL <-> state ----------

test("parsePanel reads each state from the URL", () => {
  assert.deepEqual(parsePanel(p(null, null)).state, empty);
  assert.deepEqual(parsePanel(p("x1", null)).state, details("x1"));
  assert.deepEqual(parsePanel(p(null, "add")).state, add);
  assert.deepEqual(parsePanel(p("x1", "edit")).state, edit("x1"));
  assert.equal(parsePanel(p("x1", null)).needsCleanup, false);
});

test("a refresh keeps the state: params round-trip through the URL", () => {
  for (const s of [empty, details("x1"), add, edit("x1")]) {
    const query = withPanelState("", s);
    const back = parsePanel(readPanelParams(new URLSearchParams(query))).state;
    assert.deepEqual(back, s);
  }
});

test("withPanelState keeps unrelated params and replaces the panel's", () => {
  assert.equal(withPanelState("tab=balances&e=a&panel=edit", details("b")), "tab=balances&e=b");
  assert.equal(withPanelState("e=a&tab=activity", add), "tab=activity&panel=add");
  assert.equal(withPanelState("e=a&panel=edit", empty), "");
});

test("an unknown ?e= is ignored and cleaned up", () => {
  const known = new Set(["x1"]);
  const r = parsePanel(p("gone", null), { knownIds: known });
  assert.deepEqual(r.state, empty);
  assert.equal(r.needsCleanup, true);
  assert.deepEqual(parsePanel(p("gone", "edit"), { knownIds: known }).state, empty);
  assert.deepEqual(parsePanel(p("x1", null), { knownIds: known }).state, details("x1"));
});

test("a row click while adding or editing wins over the stale panel param", () => {
  const added = parsePanel(p("x2", "add"));
  assert.deepEqual(added.state, details("x2"));
  assert.equal(added.needsCleanup, true);
  const edited = parsePanel(p("x2", "edit"), { editingId: "x1" });
  assert.deepEqual(edited.state, details("x2"));
  assert.equal(edited.needsCleanup, true);
  // Same id, or after a refresh (no editingId): it is still the edit.
  assert.deepEqual(parsePanel(p("x1", "edit"), { editingId: "x1" }).state, edit("x1"));
  assert.deepEqual(parsePanel(p("x2", "edit"), { editingId: null }).state, edit("x2"));
});

test("edit without an expense, or an unknown panel value, falls back", () => {
  assert.deepEqual(parsePanel(p(null, "edit")).state, empty);
  assert.deepEqual(parsePanel(p(null, "bogus")).state, empty);
  assert.deepEqual(parsePanel(p("x1", "bogus")).state, details("x1"));
});

test("panelToParams", () => {
  assert.deepEqual(panelToParams(empty), p(null, null));
  assert.deepEqual(panelToParams(details("a")), p("a", null));
  assert.deepEqual(panelToParams(add), p(null, "add"));
  assert.deepEqual(panelToParams(edit("a")), p("a", "edit"));
});

// ---------- the docs/04 transition table ----------

test("empty -> details (click a row, Enter on the focused row)", () => {
  assert.deepEqual(transition(empty, { type: "select", id: "a" }), details("a"));
});

test("details -> details (another row)", () => {
  assert.deepEqual(transition(details("a"), { type: "select", id: "b" }), details("b"));
});

test("any state -> add (Add expense, N, Duplicate), selection cleared", () => {
  for (const s of [empty, details("a"), edit("a"), add]) {
    assert.deepEqual(transition(s, { type: "add" }), add);
  }
  assert.equal(panelToParams(add).e, null);
});

test("details -> edit (Edit, E); edit stays edit; nothing else can edit", () => {
  assert.deepEqual(transition(details("a"), { type: "edit" }), edit("a"));
  assert.deepEqual(transition(edit("a"), { type: "edit" }), edit("a"));
  assert.deepEqual(transition(empty, { type: "edit" }), empty);
  assert.deepEqual(transition(add, { type: "edit" }), add);
});

test("save in add -> details(new id), or stays in add for Save and add another", () => {
  assert.deepEqual(transition(add, { type: "saved", id: "n" }), details("n"));
  assert.deepEqual(transition(add, { type: "saved", id: "n", another: true }), add);
});

test("save in edit -> details(id)", () => {
  assert.deepEqual(transition(edit("a"), { type: "saved", id: "a" }), details("a"));
});

test("close: details -> empty, edit -> details, add -> where it came from", () => {
  assert.deepEqual(transition(details("a"), { type: "close" }), empty);
  assert.deepEqual(transition(edit("a"), { type: "close" }), details("a"));
  assert.deepEqual(transition(add, { type: "close" }, details("a")), details("a"));
  assert.deepEqual(transition(add, { type: "close" }, empty), empty);
  assert.deepEqual(transition(add, { type: "close" }), empty);
  assert.deepEqual(transition(empty, { type: "close" }), empty);
});

test("delete -> empty", () => {
  assert.deepEqual(transition(details("a"), { type: "deleted" }), empty);
});

// ---------- discard prompt ----------

test("leaving a dirty add or edit asks first; clean or other states never do", () => {
  assert.equal(needsDiscardPrompt(add, empty, true), true);
  assert.equal(needsDiscardPrompt(add, details("a"), true), true);
  assert.equal(needsDiscardPrompt(edit("a"), details("a"), true), true);
  assert.equal(needsDiscardPrompt(edit("a"), details("b"), true), true);
  assert.equal(needsDiscardPrompt(add, empty, false), false);
  assert.equal(needsDiscardPrompt(details("a"), empty, true), false);
  assert.equal(needsDiscardPrompt(empty, add, true), false);
  assert.equal(needsDiscardPrompt(add, add, true), false);
  assert.equal(needsDiscardPrompt(edit("a"), edit("a"), true), false);
});

test("discard wording follows docs/06", () => {
  assert.equal(discardTitle(add), "Discard this expense?");
  assert.equal(discardTitle(edit("a")), "Discard changes?");
});

// ---------- layout ----------

test("layout breakpoints", () => {
  assert.equal(layoutForWidth(1280), "inline");
  assert.equal(layoutForWidth(1024), "inline");
  assert.equal(layoutForWidth(1023), "drawer");
  assert.equal(layoutForWidth(640), "drawer");
  assert.equal(layoutForWidth(639), "sheet");
  assert.equal(layoutForWidth(390), "sheet");
});

test("only the inline panel shows while empty", () => {
  assert.equal(isPanelVisible("inline", empty), true);
  assert.equal(isPanelVisible("drawer", empty), false);
  assert.equal(isPanelVisible("sheet", empty), false);
  assert.equal(isPanelVisible("sheet", details("a")), true);
});

// ---------- add payment (T15) ----------

const pay: PanelState = { kind: "pay" };

test("?panel=pay is the add-payment state and round-trips", () => {
  assert.deepEqual(parsePanel(p(null, "pay")).state, pay);
  assert.deepEqual(panelToParams(pay), p(null, "pay"));
  assert.equal(withPanelState("tab=activity&e=a", pay), "tab=activity&panel=pay");
  const back = parsePanel(readPanelParams(new URLSearchParams(withPanelState("", pay)))).state;
  assert.deepEqual(back, pay);
});

test("a row click next to ?panel=pay wins, and a stale e is cleaned", () => {
  const r = parsePanel(p("x2", "pay"));
  assert.deepEqual(r.state, details("x2"));
  assert.equal(r.needsCleanup, true);
  const stale = parsePanel(p("gone", "pay"), { knownIds: new Set(["x1"]) });
  assert.deepEqual(stale.state, pay);
  assert.equal(stale.needsCleanup, true);
});

test("any state -> pay; close goes back; save lands on the new payment's details", () => {
  assert.deepEqual(transition(details("x1"), { type: "pay" }), pay);
  assert.deepEqual(transition(add, { type: "pay" }), pay);
  assert.deepEqual(transition(pay, { type: "close" }, details("x1")), details("x1"));
  assert.deepEqual(transition(pay, { type: "close" }), empty);
  assert.deepEqual(transition(pay, { type: "saved", id: "p1" }), details("p1"));
  assert.deepEqual(transition(edit("p1"), { type: "saved", id: "p1" }), details("p1"));
});

test("a dirty pay asks before leaving, with payment wording", () => {
  assert.equal(needsDiscardPrompt(pay, details("x1"), true), true);
  assert.equal(needsDiscardPrompt(pay, details("x1"), false), false);
  assert.equal(needsDiscardPrompt(pay, pay, true), false);
  assert.equal(discardTitle(pay), "Discard this payment?");
});
