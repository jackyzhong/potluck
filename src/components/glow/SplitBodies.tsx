"use client";

// The Exact, Percent and Shares bodies of the composer (T14; boards 11-14).
// They only draw the rows and report typing. The numbers come from
// `src/lib/glow/composerSplit.ts`, which uses T03's split functions; nothing
// here does money arithmetic. Typing is cleaned as it happens, so a field can
// only ever hold something that parses.

import type { ReactNode } from "react";
import {
  MAX_SHARES,
  formatPerShareAmount,
  parseShares,
  sanitizeDecimalInput,
  sanitizePercentInput,
  sharesExtraCentMembers,
  sharesSummary
} from "@/src/lib/glow/composerSplit";
import { joinNames } from "@/src/lib/glow/composer";
import { Button } from "./Button";
import { MinusIcon, PlusIcon } from "./icons";
import { Money } from "./Money";

export type SplitRow = {
  id: string;
  name: string;
  /** "Your" or "Marco's", for the input's accessible name. */
  possessive: string;
  avatar: ReactNode;
};

const rowBase = "grid min-h-12 items-center gap-2.5";
const fieldBox =
  "flex h-10 items-center gap-1.5 rounded-input bg-surface-sunken px-3 tabular-nums focus-within:outline-2 focus-within:outline-offset-1 focus-within:outline-accent";
const bareInput =
  "min-w-0 w-full flex-1 border-0 bg-transparent p-0 text-right font-bold text-text outline-none placeholder:font-normal placeholder:text-text-muted";

/** "CA$" for CAD, "€" for EUR: the same prefix <Money> would print. */
function currencyPrefix(currency: string): string {
  try {
    const parts = new Intl.NumberFormat("en-US", { style: "currency", currency }).formatToParts(0);
    return parts.find((p) => p.type === "currency")?.value ?? currency;
  } catch {
    return currency;
  }
}

export function ExactBody({
  rows,
  values,
  decimals,
  currency,
  onChange
}: {
  rows: SplitRow[];
  values: Record<string, string>;
  decimals: number;
  currency: string;
  onChange: (id: string, text: string) => void;
}) {
  const prefix = currencyPrefix(currency);
  return (
    <ul className="m-0 flex list-none flex-col p-0">
      {rows.map((r) => (
        <li key={r.id}>
          <label className={`${rowBase} grid-cols-[32px_minmax(0,1fr)_132px]`}>
            {r.avatar}
            <span className="truncate font-semibold">{r.name}</span>
            <span className={fieldBox}>
              <span className="text-[length:var(--text-meta)] text-text-muted">{prefix}</span>
              <input
                type="text"
                inputMode="decimal"
                autoComplete="off"
                placeholder={(0).toFixed(decimals)}
                aria-label={`${r.possessive} amount`}
                value={values[r.id] ?? ""}
                onChange={(e) => onChange(r.id, sanitizeDecimalInput(e.target.value, decimals))}
                onBlur={(e) => {
                  // "20" reads "20.00" once you leave the field; the cents don't change.
                  const text = e.target.value;
                  if (!/\d/.test(text)) return;
                  const [whole, fraction = ""] = text.split(".");
                  const padded = `${whole || "0"}${decimals > 0 ? "." + fraction.padEnd(decimals, "0") : ""}`;
                  if (padded !== text) onChange(r.id, padded);
                }}
                className={bareInput}
              />
            </span>
          </label>
        </li>
      ))}
    </ul>
  );
}

export function PercentBody({
  rows,
  values,
  cents,
  currency,
  onChange
}: {
  rows: SplitRow[];
  values: Record<string, string>;
  /** Each member's computed cents (T03). Missing means nothing to show. */
  cents: Record<string, number>;
  currency: string;
  onChange: (id: string, text: string) => void;
}) {
  return (
    <ul className="m-0 flex list-none flex-col p-0">
      {rows.map((r) => (
        <li key={r.id}>
          <label className={`${rowBase} grid-cols-[32px_minmax(0,1fr)_auto_92px]`}>
            {r.avatar}
            <span className="truncate font-semibold">{r.name}</span>
            <span className="text-[length:var(--text-meta)] tabular-nums text-text-muted">
              {r.id in cents ? <Money cents={cents[r.id]} currency={currency} /> : null}
            </span>
            <span className={fieldBox}>
              <input
                type="text"
                inputMode="decimal"
                autoComplete="off"
                placeholder="0"
                aria-label={`${r.possessive} percentage`}
                value={values[r.id] ?? ""}
                onChange={(e) => onChange(r.id, sanitizePercentInput(e.target.value))}
                className={bareInput}
              />
              <span className="text-[length:var(--text-meta)] text-text-muted">%</span>
            </span>
          </label>
        </li>
      ))}
    </ul>
  );
}

const stepButton =
  "flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-pill border-0 bg-surface-muted-2 text-text transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent aria-disabled:cursor-not-allowed aria-disabled:text-text-muted aria-disabled:opacity-50 aria-disabled:hover:bg-surface-muted-2";

/** D17 / T32 (Boards 40/46): 44px tonal -/n/+ steppers, summary header, and remainder note. */
export function SharesBody({
  rows,
  values,
  cents,
  totalCents,
  decimals,
  currency,
  memberOrder,
  viewerId,
  nameOf,
  onChange,
  onOneEach
}: {
  rows: SplitRow[];
  values: Record<string, number>;
  cents: Record<string, number>;
  totalCents: number | null;
  decimals: number;
  currency: string;
  memberOrder: readonly string[];
  viewerId: string | null;
  nameOf: (id: string, lower?: boolean) => string;
  onChange: (id: string, shares: number) => void;
  onOneEach: () => void;
}) {
  const rowIds = rows.map((r) => r.id);
  const { totalShares, includedCount } = sharesSummary(values, rowIds);
  const allOneEach = rows.length > 0 && rows.every((r) => (values[r.id] ?? 0) === 1);
  const extraIds =
    totalCents !== null && totalShares > 0 ? sharesExtraCentMembers(totalCents, values, memberOrder) : [];

  return (
    <div className="flex flex-col">
      <div className="flex min-h-11 items-center justify-between text-[length:var(--text-meta)]">
        <span className="text-text-muted">
          {totalShares} {totalShares === 1 ? "share" : "shares"} between {includedCount}{" "}
          {includedCount === 1 ? "person" : "people"}
        </span>
        {allOneEach ? null : (
          <Button variant="text" tone="positive" onClick={onOneEach} className="px-1">
            One share each
          </Button>
        )}
      </div>
      <ul className="m-0 flex list-none flex-col p-0">
        {rows.map((r) => {
          const n = values[r.id] ?? 0;
          const set = (next: number) => onChange(r.id, Math.max(0, Math.min(MAX_SHARES, next)));
          return (
            <li key={r.id} className="grid min-h-[52px] grid-cols-[32px_minmax(0,1fr)_auto_76px] items-center gap-2.5">
              {r.avatar}
              <span className={`truncate font-semibold ${n > 0 ? "" : "text-text-muted"}`}>{r.name}</span>
              <div role="group" aria-label={`${r.possessive} shares`} className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label={`Fewer shares for ${r.name}`}
                  aria-disabled={n <= 0}
                  onClick={() => n > 0 && set(n - 1)}
                  className={stepButton}
                >
                  <MinusIcon size={18} />
                </button>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  aria-label={`${r.possessive} share count`}
                  value={String(n)}
                  onChange={(e) => set(parseShares(e.target.value))}
                  onFocus={(e) => e.currentTarget.select()}
                  className="h-10 w-7 rounded-input border-0 bg-transparent p-0 text-center font-extrabold tabular-nums text-text focus-visible:outline-2 focus-visible:outline-accent"
                />
                <button
                  type="button"
                  aria-label={`More shares for ${r.name}`}
                  aria-disabled={n >= MAX_SHARES}
                  onClick={() => n < MAX_SHARES && set(n + 1)}
                  className={stepButton}
                >
                  <PlusIcon size={18} />
                </button>
              </div>
              <span className="text-right tabular-nums">
                {n <= 0 ? (
                  <span className="text-[length:var(--text-meta)] text-text-muted">not included</span>
                ) : r.id in cents ? (
                  <Money cents={cents[r.id]} currency={currency} className="font-bold" />
                ) : null}
              </span>
            </li>
          );
        })}
      </ul>
      {extraIds.length > 0 && totalCents !== null && totalShares > 0 ? (
        <p className="m-0 mt-1 text-[length:var(--text-meta)] text-text-muted">
          One share is {formatPerShareAmount(totalCents, totalShares, decimals, currency)}, so{" "}
          {extraIds.length === 1
            ? `${nameOf(extraIds[0], true)} ${extraIds[0] === viewerId ? "take" : "takes"} the extra cent.`
            : `${joinNames(extraIds.map((id) => nameOf(id, true)))} take the extra cents.`}
        </p>
      ) : null}
    </div>
  );
}
