// app/ledger/[id]/ActionMenu.tsx
"use client";

import { useState } from "react";
import { supabase } from "@/src/lib/supabase";

export default function ActionMenu({ ledgerId }: { ledgerId: string }) {
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddUser = async () => {
    if (!newUserName.trim()) return;
    setIsSubmitting(true);

    const { error } = await supabase
      .from("users")
      .insert([{ 
        name: newUserName, 
        ledger_id: ledgerId, 
        is_placeholder: true 
      }]);

    if (!error) {
      setNewUserName("");
      setIsAddingUser(false);
      // In a later step, we will trigger a refresh of the user list here
    } else {
      console.error("Failed to add user:", error);
    }
    
    setIsSubmitting(false);
  };

  return (
    <>
      {/* Dimmed Overlay & Pop-up Menu */}
      {isAddingUser && (
        <div className="fixed inset-0 bg-black/20 z-20 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-xl mb-24 sm:mb-0">
            <h3 className="text-lg font-semibold mb-4">Add Participant</h3>
            <input
              type="text"
              placeholder="Name"
              value={newUserName}
              onChange={(e) => setNewUserName(e.target.value)}
              className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl mb-4 outline-none focus:border-zinc-900"
              autoFocus
            />
            <div className="flex gap-2">
              <button 
                onClick={() => setIsAddingUser(false)}
                className="flex-1 py-3 font-medium text-zinc-500 hover:bg-zinc-50 rounded-xl"
              >
                Cancel
              </button>
              <button 
                onClick={handleAddUser}
                disabled={isSubmitting || !newUserName.trim()}
                className="flex-1 py-3 font-medium bg-zinc-900 text-white rounded-xl disabled:bg-zinc-200"
              >
                {isSubmitting ? "Adding..." : "Add"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Buttons */}
      <div className="fixed bottom-8 right-8 flex flex-col gap-4 z-10">
        <button 
          onClick={() => setIsAddingUser(true)}
          className="bg-white text-zinc-900 border border-zinc-200 shadow-md hover:bg-zinc-50 px-6 py-3 rounded-full font-medium transition-all active:scale-95"
        >
          Add User
        </button>

        <button 
          className="bg-zinc-900 text-white shadow-lg hover:bg-zinc-800 px-6 py-3 rounded-full font-medium transition-all active:scale-95"
        >
          Add Expense
        </button>
      </div>
    </>
  );
}