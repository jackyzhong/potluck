// Member avatar colours and initials (docs/02 "Member avatar palette").
//
// A member's colour comes from their position in ledger order (users.created_at),
// counting EVERY member, archived ones included. If archived members were left
// out, archiving someone would shift everyone after them to a new colour.

export const AVATAR_SLOT_COUNT = 6;
export type AvatarSlot = 1 | 2 | 3 | 4 | 5 | 6;

type Orderable = { id: string; created_at: string };

/** Slot (1–6) for each member id, in ledger order. Pass all members, archived too. */
export function memberSlots(members: readonly Orderable[]): Map<string, AvatarSlot> {
  // created_at is ISO text, so string order is time order. Ties break on id so the
  // result never depends on the order the database happened to return rows in.
  const ordered = [...members].sort((a, b) =>
    a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0
  );
  return new Map(ordered.map((m, i) => [m.id, ((i % AVATAR_SLOT_COUNT) + 1) as AvatarSlot]));
}

/** A stable slot for an id that isn't in the list (it should be, but never crash a render). */
export function fallbackSlot(id: string): AvatarSlot {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return ((h % AVATAR_SLOT_COUNT) + 1) as AvatarSlot;
}

/** The letter shown in the circle: first character of the name, upper case. */
export function initialOf(name: string): string {
  const first = Array.from(name.trim())[0]; // Array.from keeps an emoji or accented letter whole
  return first ? first.toLocaleUpperCase("en-US") : "?";
}
