import { test } from "node:test";
import assert from "node:assert/strict";

import {
  THEME_STORAGE_KEY,
  getStoredTheme,
  parseTheme,
  setTheme,
  themeInitScript,
} from "./theme.ts";

test("parseTheme accepts the three settings and nothing else", () => {
  assert.equal(parseTheme("system"), "system");
  assert.equal(parseTheme("light"), "light");
  assert.equal(parseTheme("dark"), "dark");
  for (const bad of ["", "Dark", "auto", null, undefined, 1, {}]) {
    assert.equal(parseTheme(bad), null);
  }
});

// Run the inline script against a tiny fake document to check what it does
// with each stored value, including a throwing localStorage.
function runInitScript(storage: { getItem(key: string): string | null }) {
  const attrs: Record<string, string> = {};
  const document = {
    documentElement: { setAttribute: (k: string, v: string) => (attrs[k] = v) },
  };
  new Function("localStorage", "document", themeInitScript)(storage, document);
  return attrs;
}

test("init script applies a stored theme", () => {
  for (const t of ["system", "light", "dark"]) {
    const attrs = runInitScript({
      getItem: (k) => (k === THEME_STORAGE_KEY ? t : null),
    });
    assert.deepEqual(attrs, { "data-theme": t });
  }
});

test("init script leaves the attribute off when nothing valid is stored", () => {
  assert.deepEqual(runInitScript({ getItem: () => null }), {});
  assert.deepEqual(runInitScript({ getItem: () => "purple" }), {});
});

test("init script survives blocked storage", () => {
  const attrs = runInitScript({
    getItem: () => {
      throw new Error("blocked");
    },
  });
  assert.deepEqual(attrs, {});
});

// getStoredTheme and setTheme touch window and document, so give them fakes.
function withBrowser(
  storage: Pick<Storage, "getItem" | "setItem">,
  run: (attrs: Record<string, string>) => void,
) {
  const attrs: Record<string, string> = {};
  const g = globalThis as Record<string, unknown>;
  g.window = { localStorage: storage };
  g.document = {
    documentElement: { setAttribute: (k: string, v: string) => (attrs[k] = v) },
  };
  try {
    run(attrs);
  } finally {
    delete g.window;
    delete g.document;
  }
}

test("setTheme saves the choice and applies it; getStoredTheme reads it back", () => {
  const saved: Record<string, string> = {};
  const storage = {
    getItem: (k: string) => saved[k] ?? null,
    setItem: (k: string, v: string) => void (saved[k] = v),
  };
  withBrowser(storage, (attrs) => {
    assert.equal(getStoredTheme(), "system");
    setTheme("dark");
    assert.equal(saved[THEME_STORAGE_KEY], "dark");
    assert.equal(attrs["data-theme"], "dark");
    assert.equal(getStoredTheme(), "dark");
    saved[THEME_STORAGE_KEY] = "garbage";
    assert.equal(getStoredTheme(), "system");
  });
});

test("setTheme still applies when storage is blocked", () => {
  const blocked = {
    getItem: () => {
      throw new Error("blocked");
    },
    setItem: () => {
      throw new Error("blocked");
    },
  };
  withBrowser(blocked, (attrs) => {
    assert.equal(getStoredTheme(), "system");
    setTheme("light");
    assert.equal(attrs["data-theme"], "light");
  });
});
