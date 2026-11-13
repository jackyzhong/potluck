// Who is looking at the group ("Viewing as"), kept on the device.
//
// Potluck has no accounts, so the viewer is one member id per group, saved in
// localStorage under `potluck:viewer:{ledgerId}` (docs/04 "Viewer model").
// Everything here is pure or takes the storage as a parameter, so it can be
// tested without a browser. The React side is `ViewerProvider`.
//
// Storage can throw (private mode, blocked site data, quota), so every access
// is guarded: a failed read means "nothing stored", a failed write is reported
// to the caller and never thrown.

import { memberSlots } from "./avatar.ts";

export const VIEWER_STORAGE_PREFIX = "potluck:viewer:";

export function viewerStorageKey(ledgerId: string): string {
  return `${VIEWER_STORAGE_PREFIX}${ledgerId}`;
}

/** The part of `Storage` we use, so tests can pass a plain object. */
export type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/** `window.localStorage`, or null when there is no window or touching it throws. */
export function browserStorage(): StorageLike | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

/** The saved viewer id for a group, or null when none is saved or storage fails. */
export function readStoredViewer(storage: StorageLike | null, ledgerId: string): string | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(viewerStorageKey(ledgerId));
    return raw ? raw : null;
  } catch {
    return null;
  }
}

/** Save the viewer. Returns false when the browser refused (the caller keeps it in memory). */
export function writeStoredViewer(storage: StorageLike | null, ledgerId: string, viewerId: string): boolean {
  if (!storage) return false;
  try {
    storage.setItem(viewerStorageKey(ledgerId), viewerId);
    return true;
  } catch {
    return false;
  }
}

/** The members a viewer can be, as the ledger page loads them from `users`. */
export type GlowMember = {
  id: string;
  name: string;
  created_at: string;
  archived_at?: string | null;
};

/**
 * Member ids in ledger order (`users.created_at` ascending, id as the
 * tie-break), archived members included. This is `GroupData.memberOrder`: an
 * archived member stays in history and in the totals, so leaving them out would
 * break the sum-to-zero checks. It uses the same ordering as the avatar colours
 * (`memberSlots`), so a member's place in the list and their colour agree.
 */
export function buildMemberOrder(members: readonly GlowMember[]): string[] {
  return [...memberSlots(members).keys()];
}

/** Members who can be picked as the viewer: everyone not archived, in ledger order. */
export function pickableViewers<T extends GlowMember>(members: readonly T[]): T[] {
  const byId = new Map(members.map((m) => [m.id, m]));
  return buildMemberOrder(members)
    .map((id) => byId.get(id) as T)
    .filter((m) => !m.archived_at);
}

export type ViewerResolution = {
  /** The member to view as, or null while nobody has been picked. */
  viewerId: string | null;
  /**
   * Why. `stored`: the saved id is a current member. `none`: nothing saved.
   * `archived` / `unknown`: something is saved but it is no longer usable.
   */
  reason: "stored" | "none" | "archived" | "unknown";
};

/**
 * Docs/04 fallback rules. A saved viewer is used only if it is still a current
 * (not archived) member of the group. Anything else — nothing saved, an
 * archived member, an id that isn't in the group — gives no viewer, which makes
 * the "Which one are you?" prompt appear and the page use neutral wording
 * until someone picks. A stale id is never silently swapped for another member:
 * that would show somebody else's balances as "yours".
 */
export function resolveViewer(stored: string | null, members: readonly GlowMember[]): ViewerResolution {
  if (!stored) return { viewerId: null, reason: "none" };
  const member = members.find((m) => m.id === stored);
  if (!member) return { viewerId: null, reason: "unknown" };
  if (member.archived_at) return { viewerId: null, reason: "archived" };
  return { viewerId: member.id, reason: "stored" };
}
