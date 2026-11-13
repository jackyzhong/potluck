import { formatMoney, moneyTone, type MoneyTone } from "@/src/lib/glow/money";

export type MoneyProps = {
  /** Integer cents. Anything else throws, because it means a calculation upstream is wrong. */
  cents: number;
  currency?: string;
  /** "+CA$91.45" for positive amounts. */
  signed?: boolean;
  /**
   * Sets the colour role. `positive` is money owed to the viewer, `negative` is
   * money the viewer owes, `neutral` is plain text colour, `auto` follows the
   * sign. Leave it out to inherit the colour of the surroundings (on the gradient).
   */
  tone?: MoneyTone;
  /** No currency, always signed: "+28.79", for the hero chips. */
  compact?: boolean;
  className?: string;
};

const toneClasses = {
  positive: "text-positive",
  negative: "text-negative",
  neutral: "text-text"
} as const;

/** The only place money becomes text in the Glow UI. */
export function Money({ cents, currency, signed, tone, compact, className = "" }: MoneyProps) {
  const toneClass = tone ? toneClasses[moneyTone(cents, tone)] : "";
  return (
    <span className={`whitespace-nowrap tabular-nums ${toneClass} ${className}`}>
      {formatMoney(cents, { currency, signed, compact })}
    </span>
  );
}
