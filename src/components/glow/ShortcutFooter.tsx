import { Kbd } from "./Kbd";

// Labels only: the keys themselves are wired in T17. Copy from docs/06 "Footer hints".
const HINTS = {
  activity: [
    ["J K", "move between rows"],
    ["Enter", "open"],
    ["E", "edit"],
    ["/", "search"],
    ["N", "add expense"],
    ["P", "add payment"]
  ],
  balances: [
    ["J K", "move between people"],
    ["Enter", "expand"],
    ["D", "simplify debts on or off"],
    ["N", "add expense"],
    ["P", "add payment"]
  ]
} as const;

/**
 * The keyboard hint row. Only on a pointer-and-keyboard desktop: hidden below
 * 1024px, and on touch devices (`hover: none`).
 */
export function ShortcutFooter({ tab }: { tab: "activity" | "balances" }) {
  return (
    <footer
      aria-label="Keyboard shortcuts"
      className="hidden flex-wrap items-center gap-x-5 gap-y-2 px-6 pb-6 pt-8 text-[length:var(--text-meta)] text-text-muted lg:[@media(hover:hover)]:flex"
    >
      {HINTS[tab].map(([keys, label]) => (
        <span key={label} className="flex items-center gap-1.5">
          {keys.split(" ").map((k) => (
            <Kbd key={k}>{k}</Kbd>
          ))}
          {label}
        </span>
      ))}
    </footer>
  );
}
