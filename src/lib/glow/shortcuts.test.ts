import { test } from "node:test";
import assert from "node:assert/strict";
import { escapeStep, isTypingTarget, moveIndex, shortcutAction, type KeyInfo, type ShortcutContext } from "./shortcuts.ts";

const key = (k: string, mods: Partial<KeyInfo> = {}): KeyInfo => ({
  key: k,
  metaKey: false,
  ctrlKey: false,
  altKey: false,
  shiftKey: false,
  ...mods
});
const act: ShortcutContext = { tab: "activity", typing: false, modalOpen: false };
const bal: ShortcutContext = { tab: "balances", typing: false, modalOpen: false };

test("the docs/04 table, on Activity", () => {
  const got = Object.fromEntries(
    ["n", "p", "/", "j", "k", "e", "d", "v", "1", "2", "Enter"].map((k) => [k, shortcutAction(key(k), act)])
  );
  assert.deepEqual(got, {
    n: "addExpense",
    p: "addPayment",
    "/": "focusSearch",
    j: "next",
    k: "previous",
    e: "edit",
    d: null,
    v: "viewerMenu",
    1: "showActivity",
    2: "showBalances",
    Enter: null
  });
});

test("Balances has D and no search or edit", () => {
  assert.equal(shortcutAction(key("d"), bal), "toggleSimplify");
  assert.equal(shortcutAction(key("/"), bal), null);
  assert.equal(shortcutAction(key("e"), bal), null);
  assert.equal(shortcutAction(key("n"), bal), "addExpense");
  assert.equal(shortcutAction(key("j"), bal), "next");
});

test("caps lock and shift: letters match either case, but Shift+letter is left alone", () => {
  assert.equal(shortcutAction(key("N"), act), "addExpense");
  assert.equal(shortcutAction(key("N", { shiftKey: true }), act), null);
  assert.equal(shortcutAction(key("/", { shiftKey: true }), act), "focusSearch");
});

test("typing: only Esc gets through", () => {
  const typing = { ...act, typing: true };
  for (const k of ["n", "p", "/", "j", "k", "e", "v", "1", "2", "Enter"]) {
    assert.equal(shortcutAction(key(k), typing), null, k);
  }
  assert.equal(shortcutAction(key("Escape"), typing), "escape");
});

test("a modal dialog swallows every key, Esc too", () => {
  const modal = { ...act, modalOpen: true };
  assert.equal(shortcutAction(key("n"), modal), null);
  assert.equal(shortcutAction(key("Escape"), modal), null);
});

test("Ctrl, Cmd and Alt are never ours, so Cmd+Enter stays the composer's", () => {
  for (const mod of ["metaKey", "ctrlKey", "altKey"] as const) {
    assert.equal(shortcutAction(key("n", { [mod]: true }), act), null);
    assert.equal(shortcutAction(key("Enter", { [mod]: true }), act), null);
    assert.equal(shortcutAction(key("Escape", { [mod]: true }), act), null);
  }
});

test("an IME composition is left alone", () => {
  assert.equal(shortcutAction(key("n", { isComposing: true }), act), null);
});

test("isTypingTarget", () => {
  assert.equal(isTypingTarget(null), false);
  assert.equal(isTypingTarget({ tagName: "INPUT" }), true);
  assert.equal(isTypingTarget({ tagName: "textarea" }), true);
  assert.equal(isTypingTarget({ tagName: "SELECT" }), true);
  assert.equal(isTypingTarget({ tagName: "DIV", isContentEditable: true }), true);
  assert.equal(isTypingTarget({ tagName: "BUTTON", closest: () => null }), false);
  assert.equal(isTypingTarget({ tagName: "BUTTON", closest: () => ({}) }), true); // inside a menu
});

test("moveIndex", () => {
  assert.equal(moveIndex(-1, 5, "next"), 0);
  assert.equal(moveIndex(-1, 5, "previous"), 0);
  assert.equal(moveIndex(0, 5, "next"), 1);
  assert.equal(moveIndex(4, 5, "next"), 4);
  assert.equal(moveIndex(0, 5, "previous"), 0);
  assert.equal(moveIndex(3, 5, "previous"), 2);
  assert.equal(moveIndex(9, 5, "next"), 0);
  assert.equal(moveIndex(0, 0, "next"), -1);
});

test("escapeStep: panel, then search, then the field", () => {
  assert.equal(escapeStep({ panelOpen: true, hasQuery: true, searchFocused: true }), "closePanel");
  assert.equal(escapeStep({ panelOpen: false, hasQuery: true, searchFocused: true }), "clearSearch");
  assert.equal(escapeStep({ panelOpen: false, hasQuery: false, searchFocused: true }), "blurSearch");
  assert.equal(escapeStep({ panelOpen: false, hasQuery: false, searchFocused: false }), null);
});
