"use client";

// Manage members panel & phone sheet (T30, Boards 21-23 & 27-29). Replaces
// UserManagementModal so everything happens inside the Glow panel chrome
// (?panel=members).

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { addMember, removeMember, renameMember, restoreMember } from "@/src/app/ledger/[id]/actions";
import { LIMITS } from "@/src/lib/validation";
import { Avatar } from "./Avatar";
import { Button } from "./Button";
import { ConfirmStrip } from "./ConfirmStrip";
import { useIsPhone } from "./useIsPhone";
import { useGlowData, useViewer } from "./ViewerProvider";

const CONNECTION_ERROR = "Couldn't reach the group. Check your connection and try again.";

export function ManageMembersPanel() {
  const router = useRouter();
  const phone = useIsPhone();
  const { viewerId, members } = useViewer();
  const { ledgerId, slots } = useGlowData();

  const rootRef = useRef<HTMLDivElement>(null);
  const backTo = useRef<string | null>(null);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // When inline rename or confirm closes via Escape/Cancel, restore focus to that row's trigger.
  useEffect(() => {
    if (confirmingId !== null || renamingId !== null || !backTo.current) return;
    const el = rootRef.current?.querySelector<HTMLElement>(backTo.current);
    backTo.current = null;
    el?.focus();
  }, [confirmingId, renamingId]);

  const active = members.filter((m) => !m.archived_at);
  const removed = members.filter((m) => Boolean(m.archived_at));
  const avatarSize = phone ? 36 : 32;

  async function runMemberAction(
    memberId: string,
    action: () => Promise<{ ok: boolean; error?: string }>
  ) {
    setBusyId(memberId);
    setError(null);
    let result: { ok: boolean; error?: string };
    try {
      result = await action();
    } catch {
      result = { ok: false, error: CONNECTION_ERROR };
    }
    setBusyId(null);
    if (!result.ok) {
      setError(result.error ?? CONNECTION_ERROR);
      return false;
    }
    router.refresh();
    return true;
  }

  function startRename(id: string, name: string) {
    setError(null);
    setConfirmingId(null);
    setRenamingId(id);
    setRenameValue(name);
  }

  async function submitRename(id: string, original: string, e: FormEvent) {
    e.preventDefault();
    if (renameValue.trim() === original) {
      backTo.current = `[data-rename="${id}"]`;
      setRenamingId(null);
      return;
    }
    if (await runMemberAction(id, () => renameMember(ledgerId, id, renameValue))) {
      backTo.current = `[data-rename="${id}"]`;
      setRenamingId(null);
    }
  }

  async function handleRemove(id: string) {
    if (active.length <= 1) {
      setError("A group needs at least one active member.");
      backTo.current = `[data-remove="${id}"]`;
      setConfirmingId(null);
      return;
    }
    if (await runMemberAction(id, () => removeMember(ledgerId, id))) {
      setConfirmingId(null);
    }
  }

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;
    if (members.some((m) => !m.archived_at && m.name.toLowerCase() === trimmed.toLowerCase())) {
      setError(`${trimmed} is already in the group.`);
      return;
    }
    setAdding(true);
    setError(null);
    let result: { ok: boolean; error?: string };
    try {
      result = await addMember(ledgerId, trimmed);
    } catch {
      result = { ok: false, error: CONNECTION_ERROR };
    }
    setAdding(false);
    if (!result.ok) {
      setError(result.error ?? CONNECTION_ERROR);
      return;
    }
    setNewName("");
    router.refresh();
  }

  return (
    <div ref={rootRef} className="flex flex-col gap-3.5">
      <div className="flex flex-col">
        {active.map((member, index) => {
          const border = index === 0 ? "" : "border-t border-line";
          const busy = busyId === member.id;

          if (confirmingId === member.id) {
            return (
              <div key={member.id} className={`flex flex-col gap-2 py-2 pb-3 ${border}`}>
                <div className="flex min-h-10 items-center gap-2.5">
                  <Avatar name={member.name} slot={slots.get(member.id)} id={member.id} size={avatarSize} />
                  <span className="min-w-0 truncate font-semibold">{member.name}</span>
                </div>
                <ConfirmStrip
                  title={`Remove ${member.name} from the group?`}
                  body="They stay on past expenses and in the balances, but won't be offered for new ones. You can restore them later."
                  cancelLabel="Cancel"
                  confirmLabel={`Remove ${member.name}`}
                  confirmBusyLabel="Removing…"
                  busy={busy}
                  onCancel={() => {
                    backTo.current = `[data-remove="${member.id}"]`;
                    setConfirmingId(null);
                  }}
                  onConfirm={() => void handleRemove(member.id)}
                />
              </div>
            );
          }

          if (renamingId === member.id) {
            return (
              <form
                key={member.id}
                onSubmit={(e) => void submitRename(member.id, member.name, e)}
                className={`flex min-h-12 items-center gap-2.5 py-1 ${border}`}
              >
                <Avatar name={member.name} slot={slots.get(member.id)} id={member.id} size={avatarSize} />
                <input
                  type="text"
                  aria-label={`New name for ${member.name}`}
                  value={renameValue}
                  maxLength={LIMITS.memberName}
                  autoFocus
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      e.preventDefault();
                      e.stopPropagation();
                      backTo.current = `[data-rename="${member.id}"]`;
                      setRenamingId(null);
                    }
                  }}
                  className="h-10 min-w-0 flex-1 rounded-input bg-surface-sunken px-3 font-bold text-text outline-2 outline-offset-2 outline-accent"
                />
                <Button
                  type="submit"
                  variant="soft"
                  inPanel
                  size={44}
                  disabled={busy || !renameValue.trim()}
                >
                  Save
                </Button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    backTo.current = `[data-rename="${member.id}"]`;
                    setRenamingId(null);
                  }}
                  className="h-11 shrink-0 cursor-pointer px-1 text-[length:var(--text-meta)] font-bold text-text-muted hover:text-text"
                >
                  Cancel
                </button>
              </form>
            );
          }

          return (
            <div key={member.id} className={`flex min-h-12 items-center gap-2.5 ${border}`}>
              <Avatar name={member.name} slot={slots.get(member.id)} id={member.id} size={avatarSize} />
              <span title={member.name} className="min-w-0 flex-1 truncate font-semibold">
                {member.name}
                {member.id === viewerId ? (
                  <span className="ml-1.5 inline-block rounded-[10px] bg-positive-tag-bg px-2 py-0.5 text-[length:var(--text-small)] font-semibold text-positive-tag-fg">
                    You
                  </span>
                ) : null}
              </span>
              <button
                type="button"
                data-rename={member.id}
                aria-label={`Rename ${member.name}`}
                disabled={busy}
                onClick={() => startRename(member.id, member.name)}
                className="h-11 shrink-0 cursor-pointer px-1 text-[length:var(--text-meta)] font-bold text-positive hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Rename
              </button>
              <button
                type="button"
                data-remove={member.id}
                aria-label={`Remove ${member.name}`}
                disabled={busy}
                onClick={() => {
                  setError(null);
                  setRenamingId(null);
                  setConfirmingId(member.id);
                }}
                className="ml-2 h-11 shrink-0 cursor-pointer px-1 text-[length:var(--text-meta)] font-bold text-negative hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Remove
              </button>
            </div>
          );
        })}
      </div>

      {removed.length > 0 ? (
        <div className="flex flex-col gap-1">
          <span className="text-[length:var(--text-small)] font-bold uppercase tracking-[var(--tracking-label)] text-text-muted">
            Removed
          </span>
          {removed.map((member) => {
            const busy = busyId === member.id;
            return (
              <div key={member.id} className="flex min-h-12 items-center gap-2.5">
                <Avatar name={member.name} slot={slots.get(member.id)} id={member.id} size={avatarSize} />
                <div className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-text-muted">{member.name}</span>
                  <span className="block text-[length:var(--text-meta)] text-text-muted">
                    Still on past expenses
                  </span>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  aria-label={`Restore ${member.name}`}
                  onClick={() => void runMemberAction(member.id, () => restoreMember(ledgerId, member.id))}
                  className="h-11 shrink-0 cursor-pointer px-1 text-[length:var(--text-meta)] font-bold text-positive hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Restore
                </button>
              </div>
            );
          })}
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="m-0 text-[length:var(--text-meta)] font-semibold text-negative">
          {error}
        </p>
      ) : null}

      <form onSubmit={(e) => void handleAdd(e)} className="flex flex-col gap-1.5">
        <div className="flex gap-2">
          <input
            type="text"
            aria-label="Add a member by name"
            placeholder="Add a name"
            maxLength={LIMITS.memberName}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="h-12 min-w-0 flex-1 rounded-input border-0 bg-surface-sunken px-3 font-bold text-text placeholder:text-text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          />
          <Button type="submit" size={48} disabled={adding || !newName.trim()}>
            {adding ? "Adding…" : "Add member"}
          </Button>
        </div>
        <span className="text-[length:var(--text-meta)] text-text-muted">
          New members can be put on expenses straight away.
        </span>
      </form>
    </div>
  );
}
