// Wording and sizing for the Activity hero (docs/06 "Hero", docs/07 "very large
// amounts"). Pure: it takes counts and names that the calculation layer already
// produced and turns them into words. No money arithmetic happens here.

export type HeroCopyInput = {
  /** The viewer's net balance in cents (positive: they are owed). */
  netCents: number;
  /** Names of people who owe the viewer, in chip order. */
  owesYou: readonly string[];
  /** Names of people the viewer owes, in chip order. */
  youOwe: readonly string[];
  /** How many other members count as "everyone else" (archived members who are square don't). */
  everyoneElse: number;
};

export type HeroCopy = {
  label: string;
  subline: string;
  /** False when settled: the card prints no amount. */
  showAmount: boolean;
};

const theyOweYou = (names: readonly string[]) =>
  names.length === 1 ? `${names[0]} owes you` : `${names.length} people owe you`;

const youOweThem = (names: readonly string[], capital: boolean) => {
  if (names.length === 0) return "";
  const lead = capital ? "You owe" : "you owe";
  return names.length === 1 ? `${lead} ${names[0]}` : `${lead} ${names.length} people`;
};

/** Wording for the viewer's hero card, from docs/06. */
export function heroCopy({ netCents, owesYou, youOwe, everyoneElse }: HeroCopyInput): HeroCopy {
  if (netCents === 0) {
    const none = owesYou.length === 0 && youOwe.length === 0;
    return {
      label: "You're all settled",
      subline: none ? "Nothing owed either way" : owedFirst(owesYou, youOwe, everyoneElse),
      showAmount: false
    };
  }
  if (netCents > 0) {
    return {
      label: "You're owed",
      subline: owedFirst(owesYou, youOwe, everyoneElse),
      showAmount: true
    };
  }
  return {
    label: "You owe",
    subline: oweFirst(owesYou, youOwe, everyoneElse),
    showAmount: true
  };
}

/** "4 people owe you · you owe Stephen". */
function owedFirst(owesYou: readonly string[], youOwe: readonly string[], everyoneElse: number): string {
  if (youOwe.length === 0 && everyoneElse >= 2 && owesYou.length >= everyoneElse) {
    return "Everyone else owes you";
  }
  return [owesYou.length ? theyOweYou(owesYou) : "", youOweThem(youOwe, false)].filter(Boolean).join(" · ");
}

/** The mirror, for a negative balance: "You owe 3 people · Jacky owes you". */
function oweFirst(owesYou: readonly string[], youOwe: readonly string[], everyoneElse: number): string {
  if (owesYou.length === 0 && everyoneElse >= 2 && youOwe.length >= everyoneElse) {
    return "You owe everyone else";
  }
  return [youOweThem(youOwe, true), owesYou.length ? theyOweYou(owesYou) : ""].filter(Boolean).join(" · ");
}

/** Characters the 60px hero amount holds ("CA$185.41" is 9). */
export const HERO_FULL_SIZE_CHARS = 9;

/**
 * Factor to multiply the hero font size by so a long amount still fits:
 * 1 up to 9 characters, then shrinking in proportion ("CA$12,345.67" gives 0.75).
 * Never below 0.4, so a freak amount stays legible rather than vanishing.
 */
export function heroScale(text: string): number {
  const n = [...text].length;
  if (n <= HERO_FULL_SIZE_CHARS) return 1;
  return Math.max(0.4, +(HERO_FULL_SIZE_CHARS / n).toFixed(3));
}
