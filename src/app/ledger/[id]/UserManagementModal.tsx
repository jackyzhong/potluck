// src/app/ledger/[id]/UserManagementModal.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addMember, removeMember, renameMember, restoreMember } from "./actions";
import { useModalKeyboard } from "@/src/lib/useModalKeyboard";
import { LIMITS } from "@/src/lib/validation";

type User = {
  id: string;
  name: string;
  is_placeholder: boolean;
  archived_at?: string | null;
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
      className="fixed inset-0 bg-black/20 z-20 flex items-end sm:items-center justify-center p-4"
    >
      <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-xl mb-24 sm:mb-0 relative">
        <button
          type="button"
          onClick={onClose}
          data-modal-close
          aria-label="Close"
          className="absolute top-6 right-6 text-zinc-400 hover:text-zinc-900 z-10"
        >
          ✕
        </button>

        {!isAddingUser ? (
          <>
            <h3 id="user-modal-title" className="text-xl font-bold mb-4 text-zinc-900">Group Members</h3>
            <div className="max-h-72 overflow-y-auto mb-6 flex flex-col gap-2">
              {active.length === 0 ? (
                <p className="text-zinc-500 text-sm italic">No members yet.</p>
              ) : (
                active.map(user => (
                  <div key={user.id} className="flex items-center gap-3 p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                    <div className="w-8 h-8 shrink-0 rounded-full bg-zinc-200 flex items-center justify-center font-medium text-zinc-600">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
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
                          className="flex-1 min-w-0 px-2 py-1 bg-white border border-zinc-300 rounded-lg outline-none focus:border-zinc-900"
                          autoFocus
                        />
                        <button
                          type="submit"
                          disabled={busyMemberId === user.id || !renameValue.trim()}
                          className="text-sm font-medium text-zinc-900 disabled:text-zinc-300"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setRenamingId(null)}
                          className="text-sm text-zinc-500"
                        >
                          Cancel
                        </button>
                      </form>
                    ) : (
                      <>
                        <span className="flex-1 min-w-0 truncate font-medium text-zinc-900">{user.name}</span>
                        <button
                          type="button"
                          onClick={() => startRename(user)}
                          disabled={busyMemberId === user.id}
                          aria-label={`Rename ${user.name}`}
                          className="text-sm text-zinc-500 hover:text-zinc-900 disabled:text-zinc-300"
                        >
                          Rename
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemove(user)}
                          disabled={busyMemberId === user.id}
                          aria-label={`Remove ${user.name}`}
                          className="text-sm text-red-500 hover:text-red-600 disabled:text-zinc-300"
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
                  <h4 className="mt-3 text-xs font-medium uppercase tracking-wide text-zinc-400">Removed</h4>
                  {removed.map(user => (
                    <div key={user.id} className="flex items-center gap-3 p-3 rounded-xl border border-dashed border-zinc-200">
                      <div className="w-8 h-8 shrink-0 rounded-full bg-zinc-100 flex items-center justify-center font-medium text-zinc-400">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="flex-1 min-w-0 truncate text-zinc-500">{user.name}</span>
                      <button
                        type="button"
                        onClick={() => runForMember(user.id, () => restoreMember(ledgerId, user.id))}
                        disabled={busyMemberId === user.id}
                        aria-label={`Restore ${user.name}`}
                        className="text-sm font-medium text-zinc-700 hover:text-zinc-900 disabled:text-zinc-300"
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
              className="w-full py-3 font-medium bg-zinc-100 text-zinc-900 hover:bg-zinc-200 rounded-xl transition-colors"
            >
              + Add Group Member
            </button>
          </>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAddUser();
            }}
          >
            <h3 id="user-modal-title" className="text-xl font-bold mb-2 text-zinc-900">Add Member</h3>
            <p className="text-sm text-zinc-500 mb-4">Phone number search coming soon.</p>

            <input
              type="text"
              placeholder="Name"
              maxLength={LIMITS.memberName}
              value={newUserName}
              onChange={(e) => setNewUserName(e.target.value)}
              className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl mb-6 outline-none focus:border-zinc-900"
              autoFocus
            />

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsAddingUser(false);
                  setNewUserName("");
                }}
                className="flex-1 py-3 font-medium text-zinc-500 hover:bg-zinc-50 rounded-xl transition-colors"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isSubmittingUser || !newUserName.trim()}
                className="flex-1 py-3 font-medium bg-zinc-900 text-white rounded-xl disabled:bg-zinc-200 transition-colors"
              >
                {isSubmittingUser ? "Adding..." : "Add"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}