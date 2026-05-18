"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

export default function LedgerTabs() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentTab = searchParams.get("tab") || "expenses";

  const setTab = (tab: string) => {
    const params = new URLSearchParams(searchParams);
    if (tab === "expenses") {
      params.delete("tab");
    } else {
      params.set("tab", tab);
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="flex justify-center mb-6">
      <div className="bg-zinc-200/50 p-1 rounded-full flex gap-1">
        <button
          onClick={() => setTab("expenses")}
          className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
            currentTab === "expenses"
              ? "bg-white text-zinc-900 shadow-sm"
              : "text-zinc-500 hover:text-zinc-700"
          }`}
        >
          Expenses
        </button>
        <button
          onClick={() => setTab("balances")}
          className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
            currentTab === "balances"
              ? "bg-white text-zinc-900 shadow-sm"
              : "text-zinc-500 hover:text-zinc-700"
          }`}
        >
          Balances
        </button>
      </div>
    </div>
  );
}
