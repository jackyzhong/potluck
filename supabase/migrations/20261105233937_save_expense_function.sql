-- Save an expense and its splits in one transaction.
--
-- Before this, the app wrote the expense, deleted the old splits and inserted
-- the new ones as three separate requests, so a failure part-way left an
-- expense with no splits, or the old ones gone ("Expense saved, but failed to
-- save splits"). It also re-checks, in the database, the rules every balance
-- depends on, so no caller can break them however it is written:
--   * the expense belongs to the ledger it is being saved under,
--   * the payer and every split participant are members of that ledger,
--   * the shares add up to exactly the total.
--
-- Callable only with the secret key; the public roles cannot execute it.

create function public.save_expense(
  p_ledger_id    uuid,
  p_expense_id   uuid,   -- null to create
  p_payer_id     uuid,
  p_description  text,
  p_amount_cents bigint,
  p_currency     text,
  p_created_at   timestamptz,
  p_splits       jsonb   -- [{ "user_id": uuid, "amount_cents": int }, ...]
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_expense_id uuid;
  v_split_total bigint;
begin
  if jsonb_typeof(p_splits) <> 'array' or jsonb_array_length(p_splits) = 0 then
    raise exception 'an expense needs at least one split' using errcode = '22023';
  end if;

  select coalesce(sum((s ->> 'amount_cents')::bigint), 0)
    into v_split_total
    from jsonb_array_elements(p_splits) s;
  if v_split_total <> p_amount_cents then
    raise exception 'splits total % but the expense is %', v_split_total, p_amount_cents
      using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.users u where u.id = p_payer_id and u.ledger_id = p_ledger_id
  ) or exists (
    select 1
      from jsonb_array_elements(p_splits) s
     where not exists (
       select 1 from public.users u
        where u.id = (s ->> 'user_id')::uuid and u.ledger_id = p_ledger_id
     )
  ) then
    raise exception 'everyone on an expense must be a member of its ledger' using errcode = '22023';
  end if;

  if p_expense_id is null then
    insert into public.expenses
      (ledger_id, payer_id, description, amount_cents, original_currency, created_at)
    values
      (p_ledger_id, p_payer_id, p_description, p_amount_cents, p_currency, p_created_at)
    returning id into v_expense_id;
  else
    update public.expenses
       set payer_id = p_payer_id,
           description = p_description,
           amount_cents = p_amount_cents,
           original_currency = p_currency,
           created_at = p_created_at
     where id = p_expense_id
       and ledger_id = p_ledger_id
    returning id into v_expense_id;

    if v_expense_id is null then
      raise exception 'expense not found in this ledger' using errcode = 'P0002';
    end if;

    delete from public.splits where expense_id = v_expense_id;
  end if;

  insert into public.splits (expense_id, user_id, amount_cents)
  select v_expense_id, (s ->> 'user_id')::uuid, (s ->> 'amount_cents')::bigint
    from jsonb_array_elements(p_splits) s;

  return v_expense_id;
end;
$$;

revoke execute on function public.save_expense(uuid, uuid, uuid, text, bigint, text, timestamptz, jsonb)
  from public, anon, authenticated;
grant execute on function public.save_expense(uuid, uuid, uuid, text, bigint, text, timestamptz, jsonb)
  to service_role;
