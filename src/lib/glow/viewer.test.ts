import { test } from "node:test";
import assert from "node:assert/strict";

import {
  browserStorage,
  buildMemberOrder,
  pickableViewers,
  readStoredViewer,
  resolveViewer,
  viewerStorageKey,
  writeStoredViewer,
  type GlowMember,
  type StorageLike
} from "./viewer.ts";
import { memberSlots } from "./avatar.ts";

const member = (id: string, created_at: string, archived_at: string | null = null): GlowMember => ({
  id,
  name: id,
  created_at,
  archived_at
});

const jacky = member("jacky", "2026-09-01T10:00:00Z");
const stephen = member("stephen", "2026-09-01T10:00:01Z");
const angus = member("angus", "2026-09-01T10:00:02Z", "2026-10-01T09:00:00Z"); // archived
const group = [jacky, stephen, angus];

// ---------- storage ----------

function fakeStorage(initial: Record<string, string> = {}): StorageLike & { data: Map<string, string> } {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k)
  };
}

const throwingStorage: StorageLike = {
  getItem: () => {
    throw new Error("blocked");
  },
  setItem: () => {
    throw new Error("quota");
  },
  removeItem: () => {
    throw new Error("blocked");
  }
};

test("the storage key is potluck:viewer:{ledgerId}", () => {
  assert.equal(viewerStorageKey("abc"), "potluck:viewer:abc");
});

test("a saved viewer reads back, per group", () => {
  const s = fakeStorage();
  assert.equal(writeStoredViewer(s, "ledger-1", "jacky"), true);
  assert.equal(readStoredViewer(s, "ledger-1"), "jacky");
  assert.equal(readStoredViewer(s, "ledger-2"), null);
  assert.equal(s.data.get("potluck:viewer:ledger-1"), "jacky");
});

test("nothing saved, an empty value, or no storage all read as null", () => {
  assert.equal(readStoredViewer(fakeStorage(), "l"), null);
  assert.equal(readStoredViewer(fakeStorage({ "potluck:viewer:l": "" }), "l"), null);
  assert.equal(readStoredViewer(null, "l"), null);
});

test("storage that throws never throws out: reads give null, writes give false", () => {
  assert.equal(readStoredViewer(throwingStorage, "l"), null);
  assert.equal(writeStoredViewer(throwingStorage, "l", "jacky"), false);
  assert.equal(writeStoredViewer(null, "l", "jacky"), false);
});

test("browserStorage is null with no window (server) and when the getter throws", () => {
  assert.equal(browserStorage(), null);
  const g = globalThis as unknown as { window?: unknown };
  g.window = {
    get localStorage() {
      throw new Error("SecurityError");
    }
  };
  try {
    assert.equal(browserStorage(), null);
  } finally {
    delete g.window;
  }
});

// ---------- memberOrder ----------

test("memberOrder is ledger order and includes archived members", () => {
  assert.deepEqual(buildMemberOrder(group), ["jacky", "stephen", "angus"]);
});

test("memberOrder doesn't depend on the order rows arrive in", () => {
  assert.deepEqual(buildMemberOrder([angus, jacky, stephen]), ["jacky", "stephen", "angus"]);
});

test("memberOrder breaks a created_at tie on id", () => {
  const a = member("a", "2026-09-01T10:00:00Z");
  const b = member("b", "2026-09-01T10:00:00Z");
  assert.deepEqual(buildMemberOrder([b, a]), ["a", "b"]);
});

test("memberOrder agrees with the avatar slots, and an empty group gives []", () => {
  const slots = memberSlots(group);
  assert.deepEqual(
    buildMemberOrder(group).map((id) => slots.get(id)),
    [1, 2, 3]
  );
  assert.deepEqual(buildMemberOrder([]), []);
});

test("archiving a member doesn't move anyone in memberOrder", () => {
  const before = buildMemberOrder([jacky, stephen, member("angus", angus.created_at)]);
  const after = buildMemberOrder(group);
  assert.deepEqual(before, after);
});

test("pickableViewers drops archived members and keeps ledger order", () => {
  assert.deepEqual(
    pickableViewers([stephen, angus, jacky]).map((m) => m.id),
    ["jacky", "stephen"]
  );
});

// ---------- fallback rules ----------

test("a stored current member is the viewer", () => {
  assert.deepEqual(resolveViewer("stephen", group), { viewerId: "stephen", reason: "stored" });
});

test("nothing stored means no viewer yet", () => {
  assert.deepEqual(resolveViewer(null, group), { viewerId: null, reason: "none" });
  assert.deepEqual(resolveViewer("", group), { viewerId: null, reason: "none" });
});

test("a stored archived member falls back to no viewer", () => {
  assert.deepEqual(resolveViewer("angus", group), { viewerId: null, reason: "archived" });
});

test("a stored id that isn't in the group (deleted, or another group's) falls back to no viewer", () => {
  assert.deepEqual(resolveViewer("ghost", group), { viewerId: null, reason: "unknown" });
});

test("a group with no members never resolves a viewer", () => {
  assert.deepEqual(resolveViewer("jacky", []), { viewerId: null, reason: "unknown" });
});

test("restoring an archived member makes their stored id valid again", () => {
  const restored = [jacky, stephen, member("angus", angus.created_at, null)];
  assert.deepEqual(resolveViewer("angus", restored), { viewerId: "angus", reason: "stored" });
});
