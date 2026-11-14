// Pure helpers for the expense composer (T13): typed text to cents, the date
// the form means, and the wording that depends on who is in the split. No
// React, so it is unit tested directly. The split maths itself is `splitEqually`
// and `composerImpact` (T03); nothing here divides money.

/**
 * Typed amount to integer cents, or null when it isn't a usable amount.
 * Accepts "45", "45.5", "45.50", "$45", "CA$ 1,045.50" and ".5". Anything with
 * more decimals than the currency has is rejected rather than rounded, so what
 * is saved is exactly what was typed. Zero parses to 0; the caller decides that
 * it isn't enough to save.
 */
export function parseAmountCents(text: string, decimals = 2): number | null {
  // Currency symbols and letters ("CA$"), spaces and thousands commas go away.
  const cleaned = text.replace(/[\s,$€£¥A-Za-z]/g, "");
  if (cleaned === "" || /[^0-9.]/.test(cleaned)) return null;
  const parts = cleaned.split(".");
  if (parts.length > 2) return null;
  const [whole, fraction = ""] = parts;
  if (whole === "" && fraction === "") return null;
  if (fraction.length > decimals) return null;
  const scale = 10 ** decimals;
  const cents = Number(whole || "0") * scale + Number(fraction.padEnd(decimals, "0") || "0");
  return Number.isSafeInteger(cents) ? cents : null;
}

/** What an amount field lets through: digits, one decimal point, commas. */
export function filterAmountInput(text: string): string {
  const kept = text.replace(/[^0-9.,]/g, "");
  const dot = kept.indexOf(".");
  return dot === -1 ? kept : kept.slice(0, dot + 1) + kept.slice(dot + 1).replace(/\./g, "");
}

const pad = (n: number) => String(n).padStart(2, "0");

/** The local calendar day as "YYYY-MM-DD", the value of a date input. */
export function dayString(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** A "YYYY-MM-DD" at local noon, or null if it isn't a real date. */
function noonOf(day: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!m) return null;
  const date = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0, 0);
  return dayString(date) === day ? date : null;
}

/**
 * D7: the picker is date-only but is written to `expenses.created_at`. Today
 * keeps the current time (so the row sorts after what was added earlier today);
 * any other day is local noon, which no timezone shifts onto another date.
 */
export function createdAtFor(day: string, now: Date = new Date()): string | null {
  if (day === dayString(now)) return now.toISOString();
  const noon = noonOf(day);
  return noon ? noon.toISOString() : null;
}

/** "Today", "Yesterday", "Sep 8", or "Sep 8, 2025" for another year (docs/06, docs/05). */
export function dayLabel(day: string, now: Date = new Date()): string {
  if (day === dayString(now)) return "Today";
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 12);
  if (day === dayString(yesterday)) return "Yesterday";
  const noon = noonOf(day);
  if (!noon) return day;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    ...(noon.getFullYear() === now.getFullYear() ? {} : { year: "numeric" })
  }).format(noon);
}

/** "you and Stephen", "Stephen", "you, Stephen and Angus" (docs/06 remainder note). */
export function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}
