"use server";

// Every write to a ledger goes through these actions.
//
// They are reachable by a direct POST from anyone, so each one treats all of
// its arguments as untrusted: it parses them, and it scopes every row it
// touches to `ledgerId`. Knowing a ledger's id is what grants access to it, so
// the one thing an action must never allow is reaching a row in a *different*
// ledger by passing that row's id alongside a ledger id the caller knows.

import { db } from "@/src/lib/server/supabase";
import {
  isUuid,
  parseExpenseInput,
  parseMemberName,
  parsePaymentInput,
  type ActionResult
} from "@/src/lib/validation";

export type Member = { id: string; name: string; is_placeholder: boolean; archived_at: string | null };

const SAVE_FAILED = "Something went wrong saving that. Please try again.";

function rejected(error: string): ActionResult<never> {
  return { ok: false, error };
}

function failed(context: string, error: unknown): ActionResult<never> {
  console.error(`${context}:`, error);
  return rejected(SAVE_FAILED);
}

/** True when every id is a member of the ledger. */
async function allMembers(ledgerId: string, userIds: string[]): Promise<boolean> {
  const unique = [...new Set(userIds)];
  const { count, error } = await db
    .from("users")
    .select("id", { count: "exact", head: true })
    .eq("ledger_id", ledgerId)
    .in("id", unique);
  if (error) throw error;
  return count === unique.length;
}

// --- Members ---------------------------------------------------------------

export async function addMember(ledgerId: unknown, name: unknown): Promise<ActionResult<Member>> {
  if (!isUuid(ledgerId)) return rejected("Invalid request.");
  const parsed = parseMemberName(name);
  if (!parsed.ok) return parsed;

  // A ledger id that does not exist fails the foreign key, so this cannot
  // create members in thin air.
  const { data, error } = await db
    .from("users")
    .insert({ ledger_id: ledgerId, name: parsed.value, is_placeholder: true })
    .select("id, name, is_placeholder, archived_at")
    .single();

  if (error || !data) return failed("addMember", error);
  return { ok: true, data };
}

export async function renameMember(
  ledgerId: unknown,
  memberId: unknown,
  name: unknown
): Promise<ActionResult> {
  if (!isUuid(ledgerId) || !isUuid(memberId)) return rejected("Invalid request.");
  const parsed = parseMemberName(name);
  if (!parsed.ok) return parsed;

  const { data, error } = await db
    .from("users")
    .update({ name: parsed.value })
    .eq("id", memberId)
    .eq("ledger_id", ledgerId)
    .select("id");

  if (error) return failed("renameMember", error);
  if (!data?.length) return rejected("That member is no longer in this group.");
  return { ok: true, data: undefined };
}

/**
 * Remove a member. Someone with no activity is deleted; anyone on an expense
 * or payment is archived instead, so the balances they are part of still add
 * up. The database decides which, atomically — see the archive_members migration.
 */
export async function removeMember(
  ledgerId: unknown,
  memberId: unknown
): Promise<ActionResult<{ outcome: "deleted" | "archived" }>> {
  if (!isUuid(ledgerId) || !isUuid(memberId)) return rejected("Invalid request.");

  const { data, error } = await db.rpc("remove_member", { p_ledger_id: ledgerId, p_user_id: memberId });

  if (error?.code === "P0002") return rejected("That member is no longer in this group.");
  if (error || (data !== "deleted" && data !== "archived")) return failed("removeMember", error);
  return { ok: true, data: { outcome: data } };
}

export async function restoreMember(ledgerId: unknown, memberId: unknown): Promise<ActionResult> {
  if (!isUuid(ledgerId) || !isUuid(memberId)) return rejected("Invalid request.");

  const { data, error } = await db
    .from("users")
    .update({ archived_at: null })
    .eq("id", memberId)
    .eq("ledger_id", ledgerId)
    .select("id");

  if (error) return failed("restoreMember", error);
  if (!data?.length) return rejected("That member is no longer in this group.");
  return { ok: true, data: undefined };
}

// --- Expenses --------------------------------------------------------------

/** Create an expense (`expenseId` null) or replace one, together with its splits. */
export async function saveExpense(
  ledgerId: unknown,
  expenseId: unknown,
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  if (!isUuid(ledgerId)) return rejected("Invalid request.");
  if (expenseId !== null && !isUuid(expenseId)) return rejected("Invalid request.");
  const parsed = parseExpenseInput(input);
  if (!parsed.ok) return parsed;
  const expense = parsed.value;

  // One transaction, and the database re-checks ledger membership, the
  // expense's ledger, the creator's membership and the split total itself. See
  // the save_expense migrations.
  const { data, error } = await db.rpc("save_expense", {
    p_ledger_id: ledgerId,
    p_expense_id: expenseId,
    p_payer_id: expense.payerId,
    p_description: expense.description,
    p_amount_cents: expense.amountCents,
    p_currency: expense.currency,
    p_created_at: expense.createdAt,
    p_splits: expense.splits.map((s) => ({ user_id: s.userId, amount_cents: s.amountCents, weight: s.weight })),
    p_split_mode: expense.splitMode,
    p_created_by: expense.createdBy
  });

  if (error?.code === "P0002") return rejected("That expense no longer exists.");
  if (error?.code === "22023") return rejected("Everyone on an expense must be in this group.");
  if (error || typeof data !== "string") return failed("saveExpense", error);
  return { ok: true, data: { id: data } };
}

export async function deleteExpense(ledgerId: unknown, expenseId: unknown): Promise<ActionResult> {
  if (!isUuid(ledgerId) || !isUuid(expenseId)) return rejected("Invalid request.");

  // Splits go with it through their ON DELETE CASCADE.
  const { data, error } = await db
    .from("expenses")
    .delete()
    .eq("id", expenseId)
    .eq("ledger_id", ledgerId)
    .select("id");

  if (error) return failed("deleteExpense", error);
  if (!data?.length) return rejected("That expense no longer exists.");
  return { ok: true, data: undefined };
}

// --- Payments --------------------------------------------------------------

/** Record a payment (`paymentId` null) or correct an existing one. */
export async function savePayment(
  ledgerId: unknown,
  paymentId: unknown,
  input: unknown
): Promise<ActionResult> {
  if (!isUuid(ledgerId)) return rejected("Invalid request.");
  if (paymentId !== null && !isUuid(paymentId)) return rejected("Invalid request.");
  const parsed = parsePaymentInput(input);
  if (!parsed.ok) return parsed;
  const payment = parsed.value;

  try {
    if (!(await allMembers(ledgerId, [payment.payerId, payment.payeeId]))) {
      return rejected("Both people must be in this group.");
    }
  } catch (error) {
    return failed("savePayment membership check", error);
  }

  const fields = {
    payer_id: payment.payerId,
    payee_id: payment.payeeId,
    amount_cents: payment.amountCents,
    original_currency: payment.currency,
    note: payment.note,
    created_at: payment.createdAt
  };

  const { data, error } =
    paymentId === null
      ? await db.from("payments").insert({ ledger_id: ledgerId, ...fields }).select("id")
      : await db.from("payments").update(fields).eq("id", paymentId).eq("ledger_id", ledgerId).select("id");

  if (error) return failed("savePayment", error);
  if (!data?.length) return rejected("That payment no longer exists.");
  return { ok: true, data: undefined };
}

export async function deletePayment(ledgerId: unknown, paymentId: unknown): Promise<ActionResult> {
  if (!isUuid(ledgerId) || !isUuid(paymentId)) return rejected("Invalid request.");

  const { data, error } = await db
    .from("payments")
    .delete()
    .eq("id", paymentId)
    .eq("ledger_id", ledgerId)
    .select("id");

  if (error) return failed("deletePayment", error);
  if (!data?.length) return rejected("That payment no longer exists.");
  return { ok: true, data: undefined };
}

// --- Ledger settings -------------------------------------------------------

export async function setSimplifyDebts(ledgerId: unknown, value: unknown): Promise<ActionResult> {
  if (!isUuid(ledgerId) || typeof value !== "boolean") return rejected("Invalid request.");

  const { data, error } = await db
    .from("ledgers")
    .update({ simplify_debts: value })
    .eq("id", ledgerId)
    .select("id");

  if (error) return failed("setSimplifyDebts", error);
  if (!data?.length) return rejected("This group no longer exists.");
  return { ok: true, data: undefined };
}
