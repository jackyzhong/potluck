-- Remember how an expense was split, and who added it (Glow redesign, T04).
--
--   expenses.split_mode  'equal' | 'exact' | 'percent' | 'shares', so editing
--                        reopens the mode that was used and details can say
--                        "split equally, 6 ways". Null on every existing row
--                        and on anything saved by the current form, which
--                        sends no mode; the app shows those as "custom split".
--   splits.weight        the percent or share count typed for that person.
--                        Only set for the percent and shares modes.
--   expenses.created_by  the member who added the expense. Null on existing
--                        rows. A plain foreign key on purpose: a member who
--                        added something can't be deleted, so remove_member
--                        archives them instead, like a payer or a participant.
--
-- save_expense() takes all three. The two new arguments have defaults, so a
-- caller that sends neither keeps working. Changing the argument list means a
-- new function, so the old one is dropped first; leaving it would keep a
-- second overload that PostgREST can't choose between.

alter table public.expenses
  add column split_mode text
    constraint expenses_split_mode_check
    check (split_mode in ('equal', 'exact', 'percent', 'shares'));

alter table public.expenses
  add column created_by uuid references public.users(id);

alter table public.splits
  add column weight numeric
    constraint splits_weight_check
    check (weight >= 0);

drop function public.save_expense(uuid, uuid, uuid, text, bigint, text, timestamptz, jsonb);

create function public.save_expense(
  p_ledger_id    uuid,
  p_expense_id   uuid,   -- null to create
  p_payer_id     uuid,
  p_description  text,
  p_amount_cents bigint,
  p_currency     text,
  p_created_at   timestamptz,
  p_splits       jsonb,  -- [{ "user_id": uuid, "amount_cents": int, "weight": number|null }, ...]
  p_split_mode   text default null,
  p_created_by   uuid default null  -- who is adding it; ignored when editing
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

  if p_created_by is not null and not exists (
    select 1 from public.users u where u.id = p_created_by and u.ledger_id = p_ledger_id
  ) then
    raise exception 'the person adding an expense must be a member of its ledger' using errcode = '22023';
  end if;

  -- A weight means something only for percent and shares, and those modes
  -- can't be reopened without one.
  if p_split_mode in ('percent', 'shares') then
    if exists (
      select 1 from jsonb_array_elements(p_splits) s
       where jsonb_typeof(s -> 'weight') is distinct from 'number'
    ) then
      raise exception 'every split needs a weight in % mode', p_split_mode using errcode = '22023';
    end if;
  elsif exists (
    select 1 from jsonb_array_elements(p_splits) s
     where jsonb_typeof(s -> 'weight') not in ('null')
  ) then
    raise exception 'weights are only for percent and shares splits' using errcode = '22023';
  end if;

  if p_expense_id is null then
    insert into public.expenses
      (ledger_id, payer_id, description, amount_cents, original_currency, created_at,
       split_mode, created_by)
    values
      (p_ledger_id, p_payer_id, p_description, p_amount_cents, p_currency, p_created_at,
       p_split_mode, p_created_by)
    returning id into v_expense_id;
  else
    -- created_by is left alone: "added by" names whoever first added it, not
    -- whoever last edited it.
    update public.expenses
       set payer_id = p_payer_id,
           description = p_description,
           amount_cents = p_amount_cents,
           original_currency = p_currency,
           created_at = p_created_at,
           split_mode = p_split_mode
     where id = p_expense_id
       and ledger_id = p_ledger_id
    returning id into v_expense_id;

    if v_expense_id is null then
      raise exception 'expense not found in this ledger' using errcode = 'P0002';
    end if;

    delete from public.splits where expense_id = v_expense_id;
  end if;

  insert into public.splits (expense_id, user_id, amount_cents, weight)
  select v_expense_id, (s ->> 'user_id')::uuid, (s ->> 'amount_cents')::bigint, (s ->> 'weight')::numeric
    from jsonb_array_elements(p_splits) s;

  return v_expense_id;
end;
$$;

revoke execute on function public.save_expense(uuid, uuid, uuid, text, bigint, text, timestamptz, jsonb, text, uuid)
  from public, anon, authenticated;
grant execute on function public.save_expense(uuid, uuid, uuid, text, bigint, text, timestamptz, jsonb, text, uuid)
  to service_role;
