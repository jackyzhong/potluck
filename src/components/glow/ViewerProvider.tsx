"use client";

// The current viewer ("Viewing as") and every number that depends on them.
//
// `ViewerProvider` wraps the ledger page's client tree. The server page keeps
// doing the reads and hands the rows down as props; this file never touches the
// database. Two hooks read from it:
//
//   useViewer()    who is looking, and how to change it
//   useGlowData()  the T03 calculations for that viewer, memoised
//
// D9: signed-in "view as" isn't built. When accounts arrive, `viewerId` comes
// from the member linked to the signed-in user instead of localStorage, and
// only this file changes: callers only ever see `useViewer()`.

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode
} from "react";
import { memberSlots, type AvatarSlot } from "@/src/lib/glow/avatar";
import {
  heroCounts,
  memberTotals,
  pairwise,
  shareOfSpend,
  viewerLedger,
  visibleChips,
  type Expense,
  type GroupData,
  type HeroCounts,
  type LedgerRow,
  type MemberTotals,
  type PairBalance,
  type Payment,
  type ShareOfSpend,
  type Split
} from "@/src/lib/glow/ledger";
import {
  browserStorage,
  buildMemberOrder,
  pickableViewers,
  readStoredViewer,
  resolveViewer,
  writeStoredViewer,
  type GlowMember
} from "@/src/lib/glow/viewer";
import { WhichOneAreYou } from "./WhichOneAreYou";

// ---------- the saved viewer, as an external store ----------
//
// localStorage doesn't exist on the server, so the saved id is read through
// useSyncExternalStore: the server and the first client render both see
// `undefined` ("not read yet"), and React then switches to the real value
// without a hydration mismatch. It also lets a change made in another tab show
// up here through the `storage` event.

type Saved = string | null | undefined; // undefined: not read yet (server render)

const listeners = new Set<() => void>();
// Used only when the browser refuses the write (private mode, quota), so a pick
// still sticks for the rest of this visit.
const memory = new Map<string, string>();

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function readSaved(ledgerId: string): string | null {
  // Memory wins: it only holds a pick that couldn't be written, which is newer
  // than whatever the browser still has.
  return memory.get(ledgerId) ?? readStoredViewer(browserStorage(), ledgerId);
}

function save(ledgerId: string, viewerId: string): void {
  if (writeStoredViewer(browserStorage(), ledgerId, viewerId)) memory.delete(ledgerId);
  else memory.set(ledgerId, viewerId);
  listeners.forEach((notify) => notify());
}

// ---------- contexts ----------

export type ViewerState = {
  /**
   * `loading` until this device's saved choice has been read (the server
   * render, and the first client render). Show neutral wording while loading,
   * so a page never flashes someone else's "you".
   */
  status: "loading" | "ready";
  /** The member the page is viewed as, or null until one is picked. */
  viewerId: string | null;
  viewer: GlowMember | null;
  /** Everyone in the group in ledger order, archived members included. */
  members: GlowMember[];
  /** Who can be picked (not archived), in ledger order. */
  pickable: GlowMember[];
  /** Switch viewer. Recomputes every number from the rows already loaded: no refetch. */
  setViewer: (memberId: string) => void;
};

/** The numbers that exist only once there is a viewer. */
export type ViewerNumbers = {
  /** Activity rows, newest first, with impact and running balance (viewerLedger). */
  ledger: LedgerRow[];
  /** Everyone's balance with the viewer, zeros included (pairwise). */
  pairs: PairBalance[];
  /** The hero chips: `pairs` without the people who are square (D11). */
  chips: PairBalance[];
  counts: HeroCounts;
  share: ShareOfSpend;
};

export type GlowDataState = {
  /** The rows in the shape the calculation layer takes. `memberOrder` includes archived members. */
  data: GroupData;
  currency: string;
  /** Avatar colour slot per member, counting archived members. */
  slots: Map<string, AvatarSlot>;
  /** paid / share / sent / received / net per member. Doesn't depend on the viewer. */
  totals: Record<string, MemberTotals>;
  /** Viewer-relative numbers, or null while there is no viewer. */
  forViewer: ViewerNumbers | null;
};

const ViewerContext = createContext<ViewerState | null>(null);
const GlowDataContext = createContext<GlowDataState | null>(null);

export function useViewer(): ViewerState {
  const value = useContext(ViewerContext);
  if (!value) throw new Error("useViewer() must be used inside <ViewerProvider>.");
  return value;
}

export function useGlowData(): GlowDataState {
  const value = useContext(GlowDataContext);
  if (!value) throw new Error("useGlowData() must be used inside <ViewerProvider>.");
  return value;
}

// ---------- provider ----------

export type ViewerProviderProps = {
  ledgerId: string;
  /** The group's base currency, for formatting. */
  currency: string;
  /** `users` rows. Pass every member, archived ones too. */
  users: GlowMember[];
  expenses: Expense[];
  splits: Split[];
  payments: Payment[];
  children: ReactNode;
};

export function ViewerProvider({
  ledgerId,
  currency,
  users,
  expenses,
  splits,
  payments,
  children
}: ViewerProviderProps) {
  const saved = useSyncExternalStore<Saved>(
    subscribe,
    () => readSaved(ledgerId),
    () => undefined
  );

  // Rows → calculation input. These depend only on the rows, so switching
  // viewer reuses them.
  const members = useMemo(() => {
    const order = buildMemberOrder(users);
    const byId = new Map(users.map((u) => [u.id, u]));
    return order.map((id) => byId.get(id) as GlowMember);
  }, [users]);
  const pickable = useMemo(() => pickableViewers(users), [users]);
  const slots = useMemo(() => memberSlots(users), [users]);
  const data = useMemo<GroupData>(
    () => ({ memberOrder: members.map((m) => m.id), expenses, splits, payments }),
    [members, expenses, splits, payments]
  );
  const totals = useMemo(() => memberTotals(data), [data]);

  const loading = saved === undefined;
  const viewerId = loading ? null : resolveViewer(saved, users).viewerId;
  const viewer = useMemo(() => members.find((m) => m.id === viewerId) ?? null, [members, viewerId]);

  // Per viewer: the only thing that reruns when the viewer changes.
  const forViewer = useMemo<ViewerNumbers | null>(() => {
    if (!viewerId) return null;
    const pairs = pairwise(data, viewerId);
    return {
      ledger: viewerLedger(data, viewerId),
      pairs,
      chips: visibleChips(pairs),
      counts: heroCounts(pairs),
      share: shareOfSpend(data, viewerId)
    };
  }, [data, viewerId]);

  // Screen-reader announcement for a switch (docs/04 "Focus and accessibility").
  const [announcement, setAnnouncement] = useState("");
  // The first-visit prompt can be dismissed; the page then stays neutral.
  const [promptDismissed, setPromptDismissed] = useState(false);

  const setViewer = useCallback(
    (memberId: string) => {
      const member = pickable.find((m) => m.id === memberId);
      if (!member) return; // archived or not in this group: never save it
      save(ledgerId, member.id);
      setAnnouncement(`Now viewing as ${member.name}`);
    },
    [ledgerId, pickable]
  );

  const viewerState = useMemo<ViewerState>(
    () => ({
      status: loading ? "loading" : "ready",
      viewerId,
      viewer,
      members,
      pickable,
      setViewer
    }),
    [loading, viewerId, viewer, members, pickable, setViewer]
  );

  const glowData = useMemo<GlowDataState>(
    () => ({ data, currency, slots, totals, forViewer }),
    [data, currency, slots, totals, forViewer]
  );

  // Only when nothing usable is saved, and only once storage has been read.
  const showPrompt = !loading && !viewerId && pickable.length > 0 && !promptDismissed;

  return (
    <ViewerContext.Provider value={viewerState}>
      <GlowDataContext.Provider value={glowData}>
        {children}
        {showPrompt && (
          <WhichOneAreYou
            members={pickable}
            slots={slots}
            nets={Object.fromEntries(Object.entries(totals).map(([id, t]) => [id, t.net]))}
            currency={currency}
            onPick={setViewer}
            onClose={() => setPromptDismissed(true)}
          />
        )}
        <div role="status" aria-live="polite" className="sr-only">
          {announcement}
        </div>
      </GlowDataContext.Provider>
    </ViewerContext.Provider>
  );
}
