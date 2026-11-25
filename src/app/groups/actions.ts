"use server";

import { memberTotals, type Payment } from "@/src/lib/glow/ledger";
import { buildMemberOrder, type GlowMember } from "@/src/lib/glow/viewer";
import { db } from "@/src/lib/server/supabase";
import type { Expense, Split } from "@/src/lib/types";
import { isUuid } from "@/src/lib/validation";

type LedgerRow = {
  id: string;
  title: string;
  emoji: string | null;
  base_currency: string | null;
};
type UserRow = GlowMember & { ledger_id: string };
type PaymentRow = Payment & { ledger_id: string };

export type VisitedGroupInput = {
  ledgerId: string;
  viewerId: string | null;
};

export type VisitedGroupSummary = {
  id: string;
  title: string;
  emoji: string;
  baseCurrency: string;
  memberCount: number;
  viewerName: string | null;
  viewerNetCents: number | null;
};

const MAX_GROUPS = 50;

/**
 * Load lightweight summaries for ledgers opened on the caller's device.
 * Only validates UUIDs from the localStorage index — missing or deleted
 * ledgers are omitted so the client can prune them.
 */
export async function getVisitedGroups(entries: unknown): Promise<VisitedGroupSummary[]> {
  if (!Array.isArray(entries)) return [];

  const clean: VisitedGroupInput[] = [];
  const seen = new Set<string>();
  for (const raw of entries) {
    if (!raw || typeof raw !== "object") continue;
    const item = raw as { ledgerId?: unknown; viewerId?: unknown };
    if (typeof item.ledgerId !== "string" || !isUuid(item.ledgerId)) continue;
    const ledgerId = item.ledgerId.toLowerCase();
    if (seen.has(ledgerId)) continue;
    seen.add(ledgerId);
    const viewerId =
      typeof item.viewerId === "string" && isUuid(item.viewerId) ? item.viewerId.toLowerCase() : null;
    clean.push({ ledgerId, viewerId });
    if (clean.length >= MAX_GROUPS) break;
  }

  if (clean.length === 0) return [];
  const ledgerIds = clean.map((c) => c.ledgerId);

  const [{ data: ledgers }, { data: users }, { data: expenses }, { data: payments }] = await Promise.all([
    db.from("ledgers").select("*").in("id", ledgerIds),
    db.from("users").select("*").in("ledger_id", ledgerIds).order("created_at", { ascending: true }),
    db.from("expenses").select("*").in("ledger_id", ledgerIds),
    db.from("payments").select("*").in("ledger_id", ledgerIds)
  ]);

  const ledgerRows = (ledgers ?? []) as LedgerRow[];
  if (ledgerRows.length === 0) return [];

  const expenseRows = (expenses ?? []) as Expense[];
  const expenseIds = expenseRows.map((e) => e.id);
  let splitRows: Split[] = [];
  if (expenseIds.length > 0) {
    const { data: splits } = await db.from("splits").select("*").in("expense_id", expenseIds);
    splitRows = (splits ?? []) as Split[];
  }

  const ledgerById = new Map(ledgerRows.map((l) => [l.id, l]));
  const usersByLedger = new Map<string, UserRow[]>();
  for (const u of (users ?? []) as UserRow[]) {
    const list = usersByLedger.get(u.ledger_id) ?? [];
    list.push(u);
    usersByLedger.set(u.ledger_id, list);
  }
  const expensesByLedger = new Map<string, Expense[]>();
  const expenseToLedger = new Map<string, string>();
  for (const e of expenseRows) {
    expenseToLedger.set(e.id, e.ledger_id);
    const list = expensesByLedger.get(e.ledger_id) ?? [];
    list.push(e);
    expensesByLedger.set(e.ledger_id, list);
  }
  const splitsByLedger = new Map<string, Split[]>();
  for (const s of splitRows) {
    const lid = expenseToLedger.get(s.expense_id);
    if (!lid) continue;
    const list = splitsByLedger.get(lid) ?? [];
    list.push(s);
    splitsByLedger.set(lid, list);
  }
  const paymentsByLedger = new Map<string, PaymentRow[]>();
  for (const p of (payments ?? []) as PaymentRow[]) {
    const list = paymentsByLedger.get(p.ledger_id) ?? [];
    list.push(p);
    paymentsByLedger.set(p.ledger_id, list);
  }

  const out: VisitedGroupSummary[] = [];
  for (const req of clean) {
    const ledger = ledgerById.get(req.ledgerId);
    if (!ledger) continue;
    const members = usersByLedger.get(ledger.id) ?? [];
    const activeMembers = members.filter((m) => !m.archived_at);
    const viewer = req.viewerId ? activeMembers.find((m) => m.id === req.viewerId) ?? null : null;

    let viewerNetCents: number | null = null;
    if (viewer) {
      const totals = memberTotals({
        memberOrder: buildMemberOrder(members),
        expenses: expensesByLedger.get(ledger.id) ?? [],
        splits: splitsByLedger.get(ledger.id) ?? [],
        payments: paymentsByLedger.get(ledger.id) ?? []
      });
      viewerNetCents = totals[viewer.id]?.net ?? 0;
    }

    out.push({
      id: ledger.id,
      title: ledger.title,
      emoji: ledger.emoji || "🍲",
      baseCurrency: ledger.base_currency || "CAD",
      memberCount: activeMembers.length,
      viewerName: viewer?.name ?? null,
      viewerNetCents
    });
  }

  return out;
}
