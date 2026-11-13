"use client";

// The page header (docs/01 "Shared page frame"). One header, two layouts by CSS:
//   desktop (≥ 640): identity · tabs · Invite, Add payment, Add expense, divider, viewer pill
//   phone   (< 640): emoji · title with "Viewing as {name}" · Invite · viewer avatar,
//                    with the tabs on their own row below
// There is no back button yet (D19): there is no groups list to go back to.

import { Button } from "./Button";
import { GroupTabs } from "./GroupTabs";
import { InvitePopover } from "./InvitePopover";
import { ViewerSwitcher, type ViewerSwitcherProps } from "./ViewerSwitcher";
import { useViewer } from "./ViewerProvider";

export type GroupHeaderProps = {
  ledgerId: string;
  title: string;
  emoji: string;
  onAddPayment: () => void;
  onAddExpense: () => void;
  viewerMenu: ViewerSwitcherProps;
};

export function GroupHeader({ ledgerId, title, emoji, onAddPayment, onAddExpense, viewerMenu }: GroupHeaderProps) {
  const { viewer } = useViewer();

  return (
    <header className="relative flex flex-wrap items-center gap-x-4 gap-y-3 px-6 py-4 max-sm:gap-x-2 max-sm:gap-y-3 max-sm:py-3 max-sm:pl-4 max-sm:pr-3">
      <div className="flex min-w-0 flex-[1_1_200px] items-center gap-2.5 max-sm:flex-[1_1_0]">
        <span aria-hidden="true" className="text-[28px] leading-none max-sm:text-2xl">
          {emoji}
        </span>
        <div className="flex min-w-0 flex-col">
          <h1 className="m-0 truncate text-[length:var(--text-page-title)] font-extrabold tracking-[var(--tracking-title)] max-sm:text-[length:var(--text-page-title-phone)]">
            {title}
          </h1>
          {viewer ? (
            <span className="text-[length:var(--text-small)] font-semibold text-text-muted sm:hidden">
              Viewing as {viewer.name}
            </span>
          ) : null}
        </div>
      </div>

      {/* Tabs: between the identity and the actions on desktop, a full row below on a phone. */}
      <div className="max-sm:order-last max-sm:mr-1 max-sm:basis-full">
        <GroupTabs className="max-sm:w-full" />
      </div>

      <div className="flex flex-[1_1_420px] flex-wrap items-center justify-end gap-2 max-sm:flex-[0_0_auto] max-sm:flex-nowrap">
        <InvitePopover ledgerId={ledgerId} />
        <Button variant="secondary" kbd="P" onClick={onAddPayment} className="max-sm:hidden">
          Add payment
        </Button>
        <Button kbd="N" onClick={onAddExpense} className="max-sm:hidden">
          Add expense
        </Button>
        <span aria-hidden="true" className="mx-1 h-7 w-px bg-line-strong max-sm:hidden" />
        <ViewerSwitcher {...viewerMenu} />
      </div>
    </header>
  );
}
