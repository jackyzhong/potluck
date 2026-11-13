// Who can be chosen in a member picker.
//
// Archived members (removed from the group, but kept because they are on past
// expenses or payments) must not be offered for anything new. They must still
// appear when editing a record they are already part of, though: otherwise the
// form would silently drop them from it on save.

type MemberLike = { id: string; archived_at?: string | null };

/** Members to offer in a picker, keeping archived ones already on the record. */
export function pickableMembers<T extends MemberLike>(members: T[], alreadyInvolved: Iterable<string> = []): T[] {
  const keep = new Set(alreadyInvolved);
  return members.filter((m) => !m.archived_at || keep.has(m.id));
}

/** Members who have not been removed from the group. */
export function activeMembers<T extends MemberLike>(members: T[]): T[] {
  return members.filter((m) => !m.archived_at);
}
