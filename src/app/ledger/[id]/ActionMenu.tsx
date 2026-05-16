// src/app/ledger/[id]/ActionMenu.tsx
"use client";

import { useState } from "react";
import UserManagementModal from "./UserManagementModal";
import ExpenseModal from "./ExpenseModal";

type User = {
  id: string;
  name: string;
  is_placeholder: boolean;
};

export default function ActionMenu({
  ledgerId,
  initialUsers,
  baseCurrency
}: {
  ledgerId: string;
  initialUsers: User[];
  baseCurrency: string;
}) {
  const [users, setUsers] = useState<User[]>(initialUsers);

  // Modal states
  const [isManagingUsers, setIsManagingUsers] = useState(false);
  const [isAddingExpense, setIsAddingExpense] = useState(false);

  return (
    <>
      <UserManagementModal
        isOpen={isManagingUsers}
        onClose={() => setIsManagingUsers(false)}
        ledgerId={ledgerId}
        users={users}
        onUserAdded={(newUser) => setUsers([...users, newUser])}
      />

      <ExpenseModal
        isOpen={isAddingExpense}
        onClose={() => setIsAddingExpense(false)}
        ledgerId={ledgerId}
        users={users}
        baseCurrency={baseCurrency}
      />

      {/* Floating Action Buttons */}
      <div className="fixed bottom-8 right-8 flex flex-col gap-4 z-10">
        <button
          onClick={() => setIsManagingUsers(true)}
          className="bg-white text-zinc-900 border border-zinc-200 shadow-md hover:bg-zinc-50 px-6 py-3 rounded-full font-medium transition-all active:scale-95"
        >
          Manage Users
        </button>

        <button
          onClick={() => setIsAddingExpense(true)}
          className="bg-zinc-900 text-white shadow-lg hover:bg-zinc-800 px-6 py-3 rounded-full font-medium transition-all active:scale-95"
        >
          Add Expense
        </button>
      </div>
    </>
  );
}