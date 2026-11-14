"use client";

// The Exact, Percent and Shares bodies of the composer (T14; boards 11-14).
// They only draw the rows and report typing. The numbers come from
// `src/lib/glow/composerSplit.ts`, which uses T03's split functions; nothing
// here does money arithmetic. Typing is cleaned as it happens, so a field can
// only ever hold something that parses.

import type { ReactNode } from "react";
import {
  MAX_SHARES,
  parseShares,
  sanitizeDecimalInput,
  sanitizePercentInput
} from "@/src/lib/glow/composerSplit";
import { Money } from "./Money";

export type SplitRow = {
  id: string;
  name: string;
  /** "Your" or "Angus's", for the input's accessible name. */
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
  "flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-[22px] font-bold leading-none text-text hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent aria-disabled:cursor-not-allowed aria-disabled:text-text-muted aria-disabled:opacity-50 aria-disabled:hover:bg-transparent";

/** D17: integer steppers per member, default 1 (set by the caller), minimum 0. */
export function SharesBody({
  rows,
  values,
  cents,
  currency,
  onChange
}: {
  rows: SplitRow[];
  values: Record<string, number>;
  cents: Record<string, number>;
  currency: string;
  onChange: (id: string, shares: number) => void;
}) {
  return (
    <ul className="m-0 flex list-none flex-col p-0">
      {rows.map((r) => {
        const n = values[r.id] ?? 0;
        const set = (next: number) => onChange(r.id, Math.max(0, Math.min(MAX_SHARES, next)));
        return (
          <li key={r.id} className={`${rowBase} grid-cols-[32px_minmax(0,1fr)_auto_auto]`}>
            {r.avatar}
            <span className={`truncate font-semibold ${n > 0 ? "" : "text-text-muted"}`}>{r.name}</span>
            <span className="text-[length:var(--text-meta)] tabular-nums text-text-muted">
              {r.id in cents ? <Money cents={cents[r.id]} currency={currency} /> : null}
            </span>
            <div role="group" aria-label={`${r.possessive} shares`} className="-mr-1 flex items-center">
              <button
                type="button"
                aria-label={`Fewer shares for ${r.name}`}
                aria-disabled={n <= 0}
                onClick={() => n > 0 && set(n - 1)}
                className={stepButton}
              >
                <span aria-hidden="true">−</span>
              </button>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                aria-label={`${r.possessive} share count`}
                value={String(n)}
                onChange={(e) => set(parseShares(e.target.value))}
                onFocus={(e) => e.currentTarget.select()}
                className="h-10 w-10 rounded-input border-0 bg-transparent p-0 text-center font-bold tabular-nums text-text outline-none focus-visible:outline-2 focus-visible:outline-accent"
              />
              <button
                type="button"
                aria-label={`More shares for ${r.name}`}
                aria-disabled={n >= MAX_SHARES}
                onClick={() => n < MAX_SHARES && set(n + 1)}
                className={stepButton}
              >
                <span aria-hidden="true">+</span>
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
