// src/app/ledger/[id]/ActionMenu.tsx
"use client";

import { useState } from "react";
import { supabase } from "@/src/lib/supabase";

type User = {
  id: string;
  name: string;
  is_placeholder: boolean;
};

export default function ActionMenu({ 
  ledgerId, 
  initialUsers 
}: { 
  ledgerId: string;
  initialUsers: User[];
}) {
  const [users, setUsers] = useState<User[]>(initialUsers);
  
  // Modal states
  const [isManagingUsers, setIsManagingUsers] = useState(false);
  const [isAddingUser, setIsAddingUser] = useState(false);
  
  // Form states
  const [newUserName, setNewUserName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddUser = async () => {
    if (!newUserName.trim()) return;
    setIsSubmitting(true);

    const { data, error } = await supabase
      .from("users")
      .insert([{ 
        name: newUserName, 
        ledger_id: ledgerId, 
        is_placeholder: true 
      }])
      .select()
      .single();

    if (!error && data) {
      setUsers([...users, data]); // Update local list immediately
      setNewUserName("");
      // Return to the Manage Users view
      setIsAddingUser(false);
      setIsManagingUsers(true);
    } else {
      console.error("Failed to add user:", error);
    }
    
    setIsSubmitting(false);
  };

  return (
    <>
      {/* 1. Manage Users Modal */}
      {isManagingUsers && !isAddingUser && (
        <div className="fixed inset-0 bg-black/20 z-20 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-xl mb-24 sm:mb-0 relative">
            <button 
              onClick={() => setIsManagingUsers(false)}
              className="absolute top-6 right-6 text-zinc-400 hover:text-zinc-900"
            >
              ✕
            </button>
            
            <h3 className="text-xl font-bold mb-4 text-zinc-900">Group Members</h3>
            
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
              onClick={() => {
                setIsManagingUsers(false);
                setIsAddingUser(true);
              }}
              className="w-full py-3 font-medium bg-zinc-100 text-zinc-900 hover:bg-zinc-200 rounded-xl transition-colors"
            >
              + Add Group Member
            </button>
          </div>
        </div>
      )}

      {/* 2. Add User Modal */}
      {isAddingUser && (
        <div className="fixed inset-0 bg-black/20 z-20 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-xl mb-24 sm:mb-0">
            <h3 className="text-xl font-bold mb-2 text-zinc-900">Add Member</h3>
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
                onClick={() => {
                  setIsAddingUser(false);
                  setIsManagingUsers(true);
                  setNewUserName("");
                }}
                className="flex-1 py-3 font-medium text-zinc-500 hover:bg-zinc-50 rounded-xl transition-colors"
              >
                Back
              </button>
              <button 
                onClick={handleAddUser}
                disabled={isSubmitting || !newUserName.trim()}
                className="flex-1 py-3 font-medium bg-zinc-900 text-white rounded-xl disabled:bg-zinc-200 transition-colors"
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
          onClick={() => setIsManagingUsers(true)}
          className="bg-white text-zinc-900 border border-zinc-200 shadow-md hover:bg-zinc-50 px-6 py-3 rounded-full font-medium transition-all active:scale-95"
        >
          Manage Users
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