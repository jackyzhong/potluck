"use client";

import {
  SIMPLIFIED_CAPTION,
  planSubtitle,
  transferText,
  type SettlePlan,
  type SettleTransfer
} from "@/src/lib/glow/balances";
import { formatMoney } from "@/src/lib/glow/money";
import { Avatar } from "./Avatar";
import { Button } from "./Button";
import { Money } from "./Money";
import { Switch } from "./Switch";
import { CheckIcon } from "./icons";
import { useOpenPayment } from "./paymentPrefill";
import { useGlowData, useViewer } from "./ViewerProvider";

export type SettleUpPlanProps = {
  plan: SettlePlan;
  simplified: boolean;
  onSimplifiedChange: (next: boolean) => void;
  saving: boolean;
  /** Shown inline under the header when the toggle couldn't be saved. */
  error: string | null;
};

const eyebrow =
  "m-0 mt-3 text-[length:var(--text-small)] font-bold uppercase tracking-[var(--tracking-label)] text-text-muted sm:mt-3.5";
const rowBase = "grid grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3 border-b border-line py-2 last:border-b-0";

/**
 * The settle-up plan card (docs/03 "SettleUpPlan"): the group-wide Simplify
 * switch, the transfers that involve the viewer (each with Mark paid) and the
 * rest of the group. Mark paid opens the Add payment panel prefilled with
 * exactly that transfer, so nothing is saved until the person presses Save.
 */
export function SettleUpPlan({ plan, simplified, onSimplifiedChange, saving, error }: SettleUpPlanProps) {
  const { viewerId, members } = useViewer();
  const { currency, slots } = useGlowData();
  const openPayment = useOpenPayment();

  const byId = new Map(members.map((m) => [m.id, m]));
  const nameOf = (id: string) => byId.get(id)?.name ?? "Someone";
  const avatar = (id: string) => (
    <Avatar name={nameOf(id)} slot={slots.get(id)} id={id} size={36} />
  );
  const empty = plan.transfers.length === 0;

  return (
    <section
      aria-labelledby="settle-plan-title"
      className="flex min-w-0 flex-[1_1_360px] flex-col rounded-card bg-surface px-3.5 pb-1 pt-3.5 shadow-card sm:rounded-hero sm:px-5 sm:pb-2 sm:pt-[18px]"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col">
          <h2
            id="settle-plan-title"
            className="m-0 text-[length:var(--text-card-title)] font-extrabold sm:text-[18px]"
          >
            Settle-up plan
          </h2>
          <span className="text-[length:var(--text-meta)] text-text-muted">
            {planSubtitle(plan.transfers.length)}
          </span>
        </div>
        <Switch
          checked={simplified}
          // Not disabled while saving: that would drop keyboard focus off the switch.
          onCheckedChange={(next) => {
            if (!saving) onSimplifiedChange(next);
          }}
          aria-busy={saving || undefined}
          className="shrink-0"
          label={
            <>
              <span className="sm:hidden">Simplify</span>
              <span className="max-sm:hidden">Simplify debts</span>
            </>
          }
        />
      </div>
      {simplified && !empty ? (
        <p className="m-0 text-[length:var(--text-small)] text-text-muted">{SIMPLIFIED_CAPTION}</p>
      ) : null}
      {error ? (
        <p role="alert" className="m-0 mt-1 text-[length:var(--text-meta)] font-semibold text-negative">
          {error}
        </p>
      ) : null}

      {empty ? (
        <div className="flex flex-col items-center gap-1 px-2 py-10 text-center">
          <span className="grid size-11 place-items-center rounded-full bg-positive-soft text-positive">
            <CheckIcon />
          </span>
          <p className="m-0 mt-2 font-extrabold">Nothing to settle</p>
          <p className="m-0 text-[length:var(--text-meta)] text-text-muted">
            Nobody owes anybody. Add an expense and the plan updates.
          </p>
        </div>
      ) : null}

      {plan.involving.length > 0 ? (
        <>
          <h3 className={eyebrow}>Involving you</h3>
          <ul className="m-0 list-none p-0">
            {plan.involving.map((t) => {
              const receives = t.toId === viewerId;
              const text = transferText(t, viewerId, nameOf);
              return (
                <li key={`${t.fromId}>${t.toId}`} className={`${rowBase} min-h-[60px]`}>
                  {avatar(receives ? t.fromId : t.toId)}
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate font-bold">{text}</span>
                    <Money
                      cents={t.amountCents}
                      currency={currency}
                      tone={receives ? "positive" : "negative"}
                      className="font-bold"
                    />
                  </span>
                  <Button
                    variant="soft"
                    inPanel
                    aria-label={`Mark paid: ${text}, ${formatMoney(t.amountCents, { currency })}`}
                    onClick={() => markPaid(t)}
                  >
                    Mark paid
                  </Button>
                </li>
              );
            })}
          </ul>
        </>
      ) : null}

      {plan.rest.length > 0 ? (
        <>
          {/* With nobody picked as the viewer there is no "you" to separate out. */}
          {viewerId ? <h3 className={eyebrow}>Rest of the group</h3> : null}
          <ul className={`m-0 list-none p-0 ${viewerId ? "" : "mt-2"}`}>
            {plan.rest.map((t) => (
              <li key={`${t.fromId}>${t.toId}`} className={`${rowBase} min-h-14`}>
                {avatar(t.fromId)}
                <span className="min-w-0 truncate font-semibold">{transferText(t, viewerId, nameOf)}</span>
                <Money cents={t.amountCents} currency={currency} className="font-bold" />
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );

  function markPaid(t: SettleTransfer) {
    openPayment({ payerId: t.fromId, payeeId: t.toId, amountCents: t.amountCents });
  }
}
