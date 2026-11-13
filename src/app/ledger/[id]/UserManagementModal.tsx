// src/app/ledger/[id]/UserManagementModal.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addMember, removeMember, renameMember, restoreMember } from "./actions";
import { useModalKeyboard } from "@/src/lib/useModalKeyboard";
import { LIMITS } from "@/src/lib/validation";
import { Avatar } from "@/src/components/glow/Avatar";
import { CloseIcon } from "@/src/components/glow/icons";
import { memberSlots } from "@/src/lib/glow/avatar";

type User = {
  id: string;
  name: string;
  is_placeholder: boolean;
  archived_at?: string | null;
  created_at?: string;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  ledgerId: string;
  users: User[];
};

export default function UserManagementModal({ isOpen, onClose, ledgerId, users }: Props) {
  const router = useRouter();
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [isSubmittingUser, setIsSubmittingUser] = useState(false);
  const modalRef = useModalKeyboard(isOpen, onClose);

  // Whichever member row is mid-action, so only its buttons are disabled.
  const [busyMemberId, setBusyMemberId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  if (!isOpen) return null;

  // Colours count archived members too, so nobody's colour moves when someone is removed.
  const slots = memberSlots(users.map(u => ({ id: u.id, created_at: u.created_at ?? "" })));
  const active = users.filter(u => !u.archived_at);
  const removed = users.filter(u => u.archived_at);

  const runForMember = async (memberId: string, action: () => Promise<{ ok: boolean; error?: string }>) => {
    setBusyMemberId(memberId);
    const result = await action();
    setBusyMemberId(null);
    if (!result.ok) {
      alert(result.error);
      return false;
    }
    router.refresh();
    return true;
  };

  const startRename = (user: User) => {
    setRenamingId(user.id);
    setRenameValue(user.name);
  };

  const saveRename = async (user: User) => {
    if (renameValue.trim() === user.name) {
      setRenamingId(null);
      return;
    }
    if (await runForMember(user.id, () => renameMember(ledgerId, user.id, renameValue))) {
      setRenamingId(null);
    }
  };

  const handleRemove = (user: User) => {
    const message =
      `Remove ${user.name} from the group?\n\n` +
      "If they're on any expenses or payments, they stay there and in the balances, " +
      "but won't be offered for new ones. You can restore them later.";
    if (!window.confirm(message)) return;
    runForMember(user.id, () => removeMember(ledgerId, user.id));
  };

  const handleAddUser = async () => {
    if (!newUserName.trim()) return;
    setIsSubmittingUser(true);

    const result = await addMember(ledgerId, newUserName);

    if (result.ok) {
      router.refresh();
      setNewUserName("");
      setIsAddingUser(false); // Go back to list view
    } else {
      alert(result.error);
    }
    
    setIsSubmittingUser(false);
  };

  return (
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="user-modal-title"
      className="fixed inset-0 z-20 flex items-end justify-center bg-overlay p-4 text-text sm:items-center"
    >
      <div style={{ border: "var(--menu-border)" }} className="relative w-full max-w-sm rounded-hero bg-surface p-6 shadow-menu">
        <button
          type="button"
          onClick={onClose}
          data-modal-close
          aria-label="Close"
          className="absolute top-3 right-3 z-10 flex size-11 cursor-pointer items-center justify-center rounded-full bg-surface-muted text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <CloseIcon size={20} />
        </button>

        {!isAddingUser ? (
          <>
            <h3 id="user-modal-title" className="mb-4 pr-12 text-xl font-extrabold">Manage members</h3>
            <div className="max-h-72 overflow-y-auto mb-6 flex flex-col gap-2">
              {active.length === 0 ? (
                <p className="text-sm italic text-text-muted">No members yet.</p>
              ) : (
                active.map(user => (
                  <div key={user.id} className="flex items-center gap-3 rounded-tile bg-surface-sunken p-3">
                    <Avatar name={user.name} slot={slots.get(user.id)} id={user.id} size={32} />
                    {renamingId === user.id ? (
                      <form
                        className="flex-1 flex items-center gap-2 min-w-0"
                        onSubmit={(e) => {
                          e.preventDefault();
                          saveRename(user);
                        }}
                      >
                        <input
                          type="text"
                          aria-label={`New name for ${user.name}`}
                          value={renameValue}
                          maxLength={LIMITS.memberName}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => {
                            // Escape cancels the rename rather than closing the whole modal.
                            if (e.key === "Escape") {
                              e.stopPropagation();
                              setRenamingId(null);
                            }
                          }}
                          className="h-11 min-w-0 flex-1 rounded-input border border-line-strong bg-surface px-2 text-text outline-none focus:border-accent"
                          autoFocus
                        />
                        <button
                          type="submit"
                          disabled={busyMemberId === user.id || !renameValue.trim()}
                          className="min-h-11 cursor-pointer px-2 text-sm font-bold text-text disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setRenamingId(null)}
                          className="min-h-11 cursor-pointer px-2 text-sm font-semibold text-text-muted"
                        >
                          Cancel
                        </button>
                      </form>
                    ) : (
                      <>
                        <span className="min-w-0 flex-1 truncate font-bold">{user.name}</span>
                        <button
                          type="button"
                          onClick={() => startRename(user)}
                          disabled={busyMemberId === user.id}
                          aria-label={`Rename ${user.name}`}
                          className="min-h-11 cursor-pointer px-2 text-sm font-semibold text-text-secondary hover:text-text disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Rename
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemove(user)}
                          disabled={busyMemberId === user.id}
                          aria-label={`Remove ${user.name}`}
                          className="min-h-11 cursor-pointer px-2 text-sm font-semibold text-negative disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Remove
                        </button>
                      </>
                    )}
                  </div>
                ))
              )}

              {removed.length > 0 && (
                <>
                  <h4 className="mt-3 text-xs font-bold uppercase tracking-[var(--tracking-label)] text-text-muted">Removed</h4>
                  {removed.map(user => (
                    <div key={user.id} className="flex items-center gap-3 rounded-tile border border-dashed border-line-strong p-3">
                      <span className="opacity-60">
                        <Avatar name={user.name} slot={slots.get(user.id)} id={user.id} size={32} />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-text-muted">{user.name}</span>
                      <button
                        type="button"
                        onClick={() => runForMember(user.id, () => restoreMember(ledgerId, user.id))}
                        disabled={busyMemberId === user.id}
                        aria-label={`Restore ${user.name}`}
                        className="min-h-11 cursor-pointer px-2 text-sm font-bold text-positive disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Restore
                      </button>
                    </div>
                  ))}
                </>
              )}
            </div>
            <button
              type="button"
              onClick={() => setIsAddingUser(true)}
              className="h-12 w-full cursor-pointer rounded-pill bg-surface-muted font-bold text-text hover:opacity-90"
            >
              Add group member
            </button>
          </>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAddUser();
            }}
          >
            <h3 id="user-modal-title" className="mb-2 pr-12 text-xl font-extrabold">Add member</h3>
            <p className="mb-4 text-sm text-text-muted">Phone number search coming soon.</p>

            <input
              type="text"
              placeholder="Name"
              maxLength={LIMITS.memberName}
              value={newUserName}
              onChange={(e) => setNewUserName(e.target.value)}
              className="mb-6 h-12 w-full rounded-input border border-line-strong bg-surface-sunken px-3 text-text outline-none placeholder:text-text-muted focus:border-accent"
              autoFocus
            />

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsAddingUser(false);
                  setNewUserName("");
                }}
                className="h-12 flex-1 cursor-pointer rounded-pill font-bold text-text-secondary hover:bg-surface-muted"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isSubmittingUser || !newUserName.trim()}
                className="h-12 flex-1 cursor-pointer rounded-pill bg-button-primary-bg font-bold text-button-primary-fg disabled:cursor-not-allowed disabled:bg-button-disabled-bg disabled:text-button-disabled-fg"
              >
                {isSubmittingUser ? "Adding…" : "Add"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}