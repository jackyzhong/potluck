import Link from "next/link";
import type { ReactNode } from "react";

export type StatusCardPageProps = {
  title: string;
  body: string;
  actions: ReactNode;
};

/**
 * Shared standalone status card shell used for group not-found and error routes
 * (Boards 09–11 & 17–19).
 */
export function StatusCardPage({ title, body, actions }: StatusCardPageProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-bg text-text">
      <header className="flex items-center px-6 py-4 max-sm:p-4">
        <Link href="/" className="flex items-center gap-2.5 text-text no-underline">
          <span aria-hidden="true" className="text-[28px] leading-none">
            🍲
          </span>
          <span className="text-[20px] font-extrabold tracking-[-0.01em]">Potluck</span>
        </Link>
      </header>
      <div className="px-6 pb-8 pt-4 max-sm:px-4 max-sm:pt-1">
        <main className="flex w-full max-w-[520px] flex-col gap-5 rounded-hero bg-surface p-5 shadow-card max-sm:rounded-card max-sm:px-4 max-sm:py-3.5">
          <div className="flex flex-col gap-1.5">
            <h1 className="m-0 text-[24px] font-extrabold tracking-[-0.02em] max-sm:text-[20px]">
              {title}
            </h1>
            <p className="m-0 text-[length:var(--text-body)] leading-[1.4] text-text-muted">
              {body}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">{actions}</div>
        </main>
      </div>
    </div>
  );
}

export const STATUS_BUTTON_SECONDARY =
  "inline-flex h-12 flex-[1_1_150px] items-center justify-center rounded-pill bg-surface-muted-2 px-4 text-[length:var(--text-body)] font-bold text-text no-underline transition-colors hover:bg-surface-muted";

export const STATUS_BUTTON_PRIMARY =
  "inline-flex h-12 flex-[1_1_150px] cursor-pointer items-center justify-center rounded-pill bg-button-primary-bg px-4 text-[length:var(--text-body)] font-bold text-button-primary-fg no-underline transition-opacity hover:opacity-90";
