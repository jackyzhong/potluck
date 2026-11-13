import { fallbackSlot, initialOf, type AvatarSlot } from "@/src/lib/glow/avatar";

export type AvatarSize = 28 | 32 | 36 | 38;

export type AvatarProps = {
  /** Display name. Only its first letter is drawn. */
  name: string;
  /**
   * Palette slot 1–6. Compute it with `memberSlots()` over ALL the group's
   * members, archived ones included, so a colour never moves when someone is
   * archived. Needed for `variant="member"`; ignored by the other two. Omit it
   * and the colour falls back to a stable hash of `id`.
   */
  slot?: AvatarSlot;
  /** Only used for the fallback colour above. */
  id?: string;
  size?: AvatarSize;
  /**
   * `member`: palette colours. `you`: the neutral "You" avatar used in tables,
   * lists and pickers. `onGlow`: white circle for use on the gradient card.
   */
  variant?: "member" | "you" | "onGlow";
  /**
   * Avatars are decorative whenever the name is printed beside them, which is
   * every use in these designs. Set false for a lone avatar to expose the name.
   */
  decorative?: boolean;
  className?: string;
};

// Literal class names, so Tailwind can see every one of them.
const slotClasses: Record<AvatarSlot, string> = {
  1: "bg-member-1-bg text-member-1-fg",
  2: "bg-member-2-bg text-member-2-fg",
  3: "bg-member-3-bg text-member-3-fg",
  4: "bg-member-4-bg text-member-4-fg",
  5: "bg-member-5-bg text-member-5-fg",
  6: "bg-member-6-bg text-member-6-fg"
};

const sizeClasses: Record<AvatarSize, string> = {
  28: "size-7 text-[length:var(--text-small)]",
  32: "size-8 text-[length:var(--text-meta)]",
  36: "size-9 text-[length:var(--text-body)]",
  38: "size-[38px] text-[length:var(--text-body)]"
};

// "You" is three letters, so it is set smaller than an initial (docs/03: 10–12px).
const youSizeClasses: Record<AvatarSize, string> = {
  28: "size-7 text-[10px]",
  32: "size-8 text-[11px]",
  36: "size-9 text-[12px]",
  38: "size-[38px] text-[12px]"
};

export function Avatar({
  name,
  slot,
  id,
  size = 32,
  variant = "member",
  decorative = true,
  className = ""
}: AvatarProps) {
  const colour =
    variant === "you"
      ? "bg-you-avatar-bg text-you-avatar-fg"
      : variant === "onGlow"
        ? "bg-on-glow text-on-glow-avatar-fg"
        : slotClasses[slot ?? fallbackSlot(id ?? name)];
  const sizing = variant === "you" ? youSizeClasses[size] : sizeClasses[size];

  return (
    <span
      {...(decorative ? { "aria-hidden": true } : { role: "img", "aria-label": name })}
      className={`inline-flex shrink-0 select-none items-center justify-center rounded-full font-extrabold leading-none ${colour} ${sizing} ${className}`}
    >
      {variant === "you" ? "You" : initialOf(name)}
    </span>
  );
}
