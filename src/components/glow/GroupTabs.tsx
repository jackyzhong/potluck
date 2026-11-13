"use client";

// Activity | Balances, driven by ?tab= (decision D18). The server page reads the
// same param to choose what to render, so a refresh or a shared link lands on
// the same tab. Other params (?e=, ?panel=) are kept when switching.

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SegmentedControl } from "./SegmentedControl";

export type GroupTab = "activity" | "balances";

const OPTIONS = [
  { value: "activity", label: "Activity" },
  { value: "balances", label: "Balances" }
] as const;

/** Anything but "balances" is Activity, as the page reads it. */
export function parseTab(value: string | null | undefined): GroupTab {
  return value === "balances" ? "balances" : "activity";
}

export function useGroupTab(): { tab: GroupTab; setTab: (tab: GroupTab) => void } {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = parseTab(searchParams.get("tab"));

  function setTab(next: GroupTab) {
    if (next === tab) return;
    const params = new URLSearchParams(searchParams);
    if (next === "activity") params.delete("tab");
    else params.set("tab", next);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }
  return { tab, setTab };
}

/**
 * Two instances are drawn, one per layout, because the segments are 40px tall
 * on desktop and 44px full-width on a phone and the control takes its size as a
 * prop. CSS shows one; the hidden one is display:none, so it is out of the
 * accessibility tree and the tab order.
 */
export function GroupTabs({ className = "" }: { className?: string }) {
  const { tab, setTab } = useGroupTab();
  return (
    <>
      <SegmentedControl
        aria-label="Group views"
        options={OPTIONS}
        value={tab}
        onChange={setTab}
        className={`max-sm:hidden ${className}`}
      />
      <SegmentedControl
        aria-label="Group views"
        options={OPTIONS}
        value={tab}
        onChange={setTab}
        size={44}
        fill
        className={`sm:hidden ${className}`}
      />
    </>
  );
}
