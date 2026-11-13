"use server";

import { db } from "@/src/lib/server/supabase";
import { parseLedgerInput, type ActionResult } from "@/src/lib/validation";

/** Create a group and return its id, which becomes the secret in its URL. */
export async function createLedger(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = parseLedgerInput(input);
  if (!parsed.ok) return parsed;

  const { data, error } = await db
    .from("ledgers")
    .insert({ title: parsed.value.title, emoji: parsed.value.emoji, base_currency: parsed.value.baseCurrency })
    .select("id")
    .single();

  if (error || !data) {
    console.error("createLedger:", error);
    return { ok: false, error: "Failed to create the group. Please try again." };
  }
  return { ok: true, data: { id: data.id } };
}
