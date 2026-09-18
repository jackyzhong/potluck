// src/app/ledger/[id]/ActionMenu.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import UserManagementModal from "./UserManagementModal";
import ExpenseModal from "./ExpenseModal";
import PaymentModal from "./PaymentModal";

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
  const [isAddingPayment, setIsAddingPayment] = useState(false);

  // Three pills do not fit over the content on a phone, so below `sm` they
  // collapse behind a single button. The breakpoint is handled in CSS rather
  // than by measuring the window, which would not survive hydration.
  const [isExpanded, setIsExpanded] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isExpanded) return;

    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsExpanded(false);
      }
    }

    // Capture phase, so collapsing the menu does not also close a modal behind it.
    function handleEscapeCapture(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      event.preventDefault();
      setIsExpanded(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscapeCapture, true);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscapeCapture, true);
    };
  }, [isExpanded]);

  const runAction = (open: () => void) => {
    setIsExpanded(false);
    open();
  };

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

      {isAddingPayment && (
        <PaymentModal
          onClose={() => setIsAddingPayment(false)}
          ledgerId={ledgerId}
          users={users}
          baseCurrency={baseCurrency}
        />
      )}

      {/* Floating Action Buttons */}
      <div ref={menuRef} className="fixed bottom-8 right-8 flex flex-col items-end gap-3 z-10">
        <div className={`flex-col items-end gap-3 sm:flex ${isExpanded ? "flex" : "hidden"}`}>
          <button
            type="button"
            onClick={() => runAction(() => setIsManagingUsers(true))}
            className="bg-white text-zinc-900 border border-zinc-200 shadow-md hover:bg-zinc-50 px-6 py-3 rounded-full font-medium transition-all active:scale-95"
          >
            Manage Users
          </button>

          <button
            type="button"
            onClick={() => runAction(() => setIsAddingPayment(true))}
            className="bg-white text-zinc-900 border border-zinc-200 shadow-md hover:bg-zinc-50 px-6 py-3 rounded-full font-medium transition-all active:scale-95"
          >
            Add Payment
          </button>

          <button
            type="button"
            onClick={() => runAction(() => setIsAddingExpense(true))}
            className="bg-zinc-900 text-white shadow-lg hover:bg-zinc-800 px-6 py-3 rounded-full font-medium transition-all active:scale-95"
          >
            Add Expense
          </button>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          aria-expanded={isExpanded}
          aria-haspopup="menu"
          aria-label={isExpanded ? "Close actions" : "Open actions"}
          className="sm:hidden bg-zinc-900 text-white shadow-lg hover:bg-zinc-800 w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-95"
        >
          <span
            aria-hidden="true"
            className={`text-3xl leading-none transition-transform ${isExpanded ? "rotate-45" : ""}`}
          >
            +
          </span>
        </button>
      </div>
    </>
  );
}
