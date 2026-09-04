// src/app/ledger/[id]/UserManagementModal.tsx
"use client";

import { useState } from "react";
import { supabase } from "@/src/lib/supabase";
import { useModalKeyboard } from "@/src/lib/useModalKeyboard";

type User = {
  id: string;
  name: string;
  is_placeholder: boolean;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  ledgerId: string;
  users: User[];
  onUserAdded: (newUser: User) => void;
};

export default function UserManagementModal({ isOpen, onClose, ledgerId, users, onUserAdded }: Props) {
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [isSubmittingUser, setIsSubmittingUser] = useState(false);
  const modalRef = useModalKeyboard(isOpen, onClose);

  if (!isOpen) return null;

  const handleAddUser = async () => {
    if (!newUserName.trim()) return;
    setIsSubmittingUser(true);

    const { data, error } = await supabase
      .from("users")
      .insert([{ 
        name: newUserName.trim(), 
        ledger_id: ledgerId, 
        is_placeholder: true 
      }])
      .select()
      .single();

    if (!error && data) {
      onUserAdded(data); // Update parent state
      setNewUserName("");
      setIsAddingUser(false); // Go back to list view
    } else {
      console.error("Failed to add user:", error);
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
            <div className="max-h-60 overflow-y-auto mb-6 flex flex-col gap-2">
              {users.length === 0 ? (
                <p className="text-zinc-500 text-sm italic">No members yet.</p>
              ) : (
                users.map(user => (
                  <div key={user.id} className="flex items-center gap-3 p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                    <div className="w-8 h-8 rounded-full bg-zinc-200 flex items-center justify-center font-medium text-zinc-600">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium text-zinc-900">{user.name}</span>
                  </div>
                ))
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