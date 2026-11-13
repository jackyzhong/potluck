import { test } from "node:test";
import assert from "node:assert/strict";

import { activeMembers, pickableMembers } from "./members.ts";

const members = [
  { id: "a", archived_at: null },
  { id: "b", archived_at: "2026-11-05T00:00:00Z" },
  { id: "c" },
  { id: "d", archived_at: "2026-11-01T00:00:00Z" }
];

test("archived members are not offered for new records", () => {
  assert.deepEqual(pickableMembers(members).map((m) => m.id), ["a", "c"]);
  assert.deepEqual(activeMembers(members).map((m) => m.id), ["a", "c"]);
});

test("archived members already on a record stay pickable when editing it", () => {
  assert.deepEqual(pickableMembers(members, ["b"]).map((m) => m.id), ["a", "b", "c"]);
  // Involvement of an active member changes nothing; order is preserved.
  assert.deepEqual(pickableMembers(members, new Set(["a", "d"])).map((m) => m.id), ["a", "c", "d"]);
});
