"use client";

// Activity | Balances, driven by ?tab= (decision D18), so a refresh or a shared
// link lands on the same tab. The server page sends both tabs and GroupFrame
// shows the one ?tab= names. Switching writes the URL with history.replaceState,
// which Next syncs into useSearchParams without a server round trip, so the
// switch is instant. Other params (?e=, ?panel=) are kept when switching.

import { usePathname, useSearchParams } from "next/navigation";
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
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = parseTab(searchParams.get("tab"));

  function setTab(next: GroupTab) {
    if (next === tab) return;
    // Read the live URL, not searchParams: a panel change may have just rewritten it.
    const params = new URLSearchParams(window.location.search);
    if (next === "activity") params.delete("tab");
    else params.set("tab", next);
    const query = params.toString();
    // `null` state: Next's patched replaceState ignores calls that pass its own
    // internal state object, and then useSearchParams wouldn't see the change.
    window.history.replaceState(null, "", query ? `${pathname}?${query}` : pathname);
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
