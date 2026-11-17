"use server";

import { db } from "@/src/lib/server/supabase";
import { parseLedgerInput, type ActionResult } from "@/src/lib/validation";

/** Create a group and its initial members atomically; return its id and creator id. */
export async function createLedger(input: unknown): Promise<ActionResult<{ id: string; creatorUserId: string }>> {
  const parsed = parseLedgerInput(input);
  if (!parsed.ok) return parsed;

  const { data, error } = await db.rpc("create_ledger", {
    p_title: parsed.value.title,
    p_emoji: parsed.value.emoji,
    p_base_currency: parsed.value.baseCurrency,
    p_members: parsed.value.members
  });

  const ledgerId =
    data && typeof data === "object" && typeof (data as { ledger_id?: unknown }).ledger_id === "string"
      ? (data as { ledger_id: string }).ledger_id
      : null;
  const creatorUserId =
    data && typeof data === "object" && typeof (data as { creator_user_id?: unknown }).creator_user_id === "string"
      ? (data as { creator_user_id: string }).creator_user_id
      : null;

  if (error || !ledgerId || !creatorUserId) {
    console.error("createLedger:", error);
    return { ok: false, error: "Failed to create the group. Please try again." };
  }
  return { ok: true, data: { id: ledgerId, creatorUserId } };
}
