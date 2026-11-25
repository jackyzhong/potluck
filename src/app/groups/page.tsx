"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Money } from "@/src/components/glow/Money";
import {
  browserStorage,
  pruneVisitedGroups,
  readStoredViewer,
  readVisitedGroups
} from "@/src/lib/glow/viewer";
import { getVisitedGroups, type VisitedGroupSummary } from "./actions";

export default function GroupsPage() {
  const [groups, setGroups] = useState<VisitedGroupSummary[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    const storage = browserStorage();
    const ids = readVisitedGroups(storage);
    if (ids.length === 0) {
      Promise.resolve().then(() => {
        if (!cancelled) setGroups([]);
      });
      return () => {
        cancelled = true;
      };
    }

    const entries = ids.map((ledgerId) => ({
      ledgerId,
      viewerId: readStoredViewer(storage, ledgerId)
    }));

    void getVisitedGroups(entries)
      .then((summaries) => {
        if (cancelled) return;
        pruneVisitedGroups(
          browserStorage(),
          summaries.map((s) => s.id)
        );
        setGroups(summaries);
      })
      .catch(() => {
        if (!cancelled) setGroups([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[540px] flex-col bg-bg text-[length:var(--text-body-phone)] leading-[1.35] text-text">
      <header className="flex items-center p-4">
        <Link
          href="/"
          className="flex items-center gap-2.5 text-text no-underline focus-visible:rounded-pill focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <span aria-hidden="true" className="text-[28px] leading-none">
            🍲
          </span>
          <span className="text-[20px] font-extrabold tracking-[-0.01em]">Potluck</span>
        </Link>
      </header>

      <div className="flex flex-col gap-0.5 px-4">
        <h1 className="m-0 text-[length:var(--text-page-title-phone)] font-extrabold tracking-[-0.01em]">
          Your groups
        </h1>
        <span className="text-[length:var(--text-meta)] text-text-muted">
          Groups you&apos;ve opened on this device
        </span>
      </div>

      <main className="mx-4 mt-4 flex flex-col rounded-card bg-surface px-3.5 shadow-card">
        {groups === null ? (
          <div aria-busy="true" aria-label="Loading groups" className="flex flex-col">
            {[0, 1].map((row) => (
              <div
                key={row}
                className="grid min-h-16 grid-cols-[36px_minmax(0,1fr)_72px] items-center gap-3 border-b border-line py-2 last:border-b-0"
              >
                <span className="size-9 rounded-full bg-surface-muted-2 motion-safe:animate-pulse" />
                <span className="flex flex-col gap-1.5">
                  <span className="h-3.5 w-32 rounded-lg bg-surface-muted-2 motion-safe:animate-pulse" />
                  <span className="h-3 w-44 rounded-lg bg-surface-muted-2 motion-safe:animate-pulse" />
                </span>
                <span className="flex flex-col items-end gap-1.5">
                  <span className="h-3.5 w-16 rounded-lg bg-surface-muted-2 motion-safe:animate-pulse" />
                  <span className="h-3 w-12 rounded-lg bg-surface-muted-2 motion-safe:animate-pulse" />
                </span>
              </div>
            ))}
          </div>
        ) : groups.length === 0 ? (
          <div className="flex flex-col items-center gap-1 px-4 py-8 text-center">
            <span className="font-bold text-text">No groups on this device yet</span>
            <span className="text-[length:var(--text-meta)] text-text-muted">
              Create a group below or open a link somebody shared with you.
            </span>
          </div>
        ) : (
          groups.map((g) => (
            <Link
              key={g.id}
              href={`/ledger/${g.id}`}
              className="grid min-h-16 grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3 border-b border-line py-2 text-text no-underline last:border-b-0 focus-visible:rounded-tile focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent"
            >
              <span
                aria-hidden="true"
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-muted-2 text-[20px] leading-none"
              >
                {g.emoji}
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="truncate font-bold">{g.title}</span>
                <span className="truncate text-[length:var(--text-meta)] text-text-muted">
                  {g.memberCount} {g.memberCount === 1 ? "person" : "people"}
                  {g.viewerName ? ` · viewing as ${g.viewerName}` : ""}
                </span>
              </span>
              {g.viewerNetCents === null ? (
                <span className="text-[length:var(--text-meta)] font-semibold text-text-muted">Open</span>
              ) : g.viewerNetCents === 0 ? (
                <span className="font-bold tabular-nums text-text-muted">settled up</span>
              ) : (
                <span className="flex flex-col items-end">
                  <Money
                    cents={g.viewerNetCents}
                    currency={g.baseCurrency}
                    signed
                    tone={g.viewerNetCents > 0 ? "positive" : "negative"}
                    className="font-bold"
                  />
                  <span className="text-[length:var(--text-small)] text-text-muted">
                    {g.viewerNetCents > 0 ? "you're owed" : "you owe"}
                  </span>
                </span>
              )}
            </Link>
          ))
        )}
      </main>

      <p className="mx-5 mt-3 text-[length:var(--text-meta)] text-text-muted">
        This list lives in this browser only. To open a group somewhere else, use its link.
      </p>

      <div className="mt-auto flex px-4 pb-5 pt-3">
        <Link
          href="/create-group"
          className="inline-flex h-[52px] flex-1 items-center justify-center rounded-pill bg-button-primary-bg px-4 text-[16px] font-bold text-button-primary-fg no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Create a group
        </Link>
      </div>
    </div>
  );
}
