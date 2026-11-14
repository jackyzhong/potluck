import { Avatar } from "./Avatar";
import { Money } from "./Money";
import { formatMoney } from "@/src/lib/glow/money";
import type { PairBalance } from "@/src/lib/glow/ledger";
import type { GlowMember } from "@/src/lib/glow/viewer";

export type PersonChipsProps = {
  /** The chips to draw, already in order and without zeros (`forViewer.chips`, D11). */
  chips: readonly PairBalance[];
  /** Everyone in the group, to look the names up. */
  members: readonly GlowMember[];
  /** The group currency, for the spoken label only (the chips themselves print no currency). */
  currency?: string;
  /** Called with the member's id when a chip is pressed. T10 turns this into the "with {name}" filter. */
  onSelect?: (memberId: string) => void;
  /** The member the ledger is currently filtered to, if any (T10). Marks that chip pressed. */
  selectedId?: string | null;
};

/**
 * One chip per person the viewer isn't square with: avatar, name, and a compact
 * signed amount ("+28.79"). People the viewer owes get the darker tile. Meant to
 * sit on the gradient card (docs/03 "PersonChips").
 */
export function PersonChips({ chips, members, currency, onSelect, selectedId }: PersonChipsProps) {
  const byId = new Map(members.map((m) => [m.id, m]));
  return (
    <ul
      aria-label="Balances by person, press to filter"
      className="m-0 grid list-none grid-cols-5 gap-1 p-0 sm:gap-1.5"
    >
      {chips.map((chip) => {
        const member = byId.get(chip.memberId);
        if (!member) return null;
        const owes = chip.cents < 0;
        const pressed = selectedId === undefined ? undefined : selectedId === chip.memberId;
        return (
          <li key={chip.memberId} className="min-w-0">
            <button
              type="button"
              onClick={() => onSelect?.(chip.memberId)}
              aria-pressed={pressed}
              aria-label={`${member.name}, ${owes ? "you owe" : "owes you"} ${formatMoney(Math.abs(chip.cents), { currency })}`}
              className={`flex min-h-11 w-full cursor-pointer flex-col items-center gap-[3px] rounded-[14px] border-0 px-0 py-2 text-on-glow transition-[filter] hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-glow sm:rounded-chip sm:py-2.5 ${
                owes ? "bg-hero-owe-chip-bg" : "bg-on-glow-tile"
              } ${pressed ? "outline-2 outline-offset-0 outline-on-glow" : ""}`}
            >
              <span className="sm:hidden">
                <Avatar
                  name={member.name}
                  variant="onGlow"
                  size={36}
                  className={owes ? "text-hero-owe-chip-bg!" : ""}
                />
              </span>
              <span className="hidden sm:inline-flex">
                <Avatar
                  name={member.name}
                  variant="onGlow"
                  size={38}
                  className={owes ? "text-hero-owe-chip-bg!" : ""}
                />
              </span>
              <span className="w-full truncate px-1 text-[length:var(--text-small)] sm:text-[length:var(--text-meta)]">
                {member.name}
              </span>
              <span className="text-[length:var(--text-small)] font-bold tabular-nums sm:text-[length:var(--text-meta)]">
                <Money cents={chip.cents} compact />
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
