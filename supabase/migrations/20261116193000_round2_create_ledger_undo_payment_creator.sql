-- Glow Round 2 schema & RPC support (T22, T23):
--   * payments.created_by so PaymentDetails can show "added by {name}" (D29).
--   * public.create_ledger for atomic group + initial member creation (D24).
--   * public.restore_expense for undo after delete without soft-delete columns (D26).

alter table public.payments
  add column created_by uuid references public.users(id);

-- Create a ledger and its initial members in one transaction.
-- Members receive 1ms-stepped created_at timestamps so ledger order (creator first)
-- is preserved across both Postgres sorting and JS Date.parse tie-breaking.
create function public.create_ledger(
  p_title         text,
  p_emoji         text,
  p_base_currency text,
  p_members       text[]
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_ledger_id  uuid;
  v_creator_id uuid;
  v_now        timestamptz := now();
begin
  if length(trim(coalesce(p_title, ''))) = 0 then
    raise exception 'title is required' using errcode = '22023';
  end if;
  if length(trim(coalesce(p_emoji, ''))) = 0 then
    raise exception 'emoji is required' using errcode = '22023';
  end if;
  if coalesce(array_length(p_members, 1), 0) = 0 then
    raise exception 'at least one member is required' using errcode = '22023';
  end if;
  if exists (select 1 from unnest(p_members) m where length(trim(coalesce(m, ''))) = 0) then
    raise exception 'member names cannot be blank' using errcode = '22023';
  end if;

  insert into public.ledgers (title, emoji, base_currency)
  values (trim(p_title), trim(p_emoji), p_base_currency)
  returning id into v_ledger_id;

  insert into public.users (ledger_id, name, is_placeholder, created_at)
  select v_ledger_id,
         trim(m.name),
         true,
         v_now + ((m.ord - 1) * interval '1 millisecond')
    from unnest(p_members) with ordinality as m(name, ord)
   order by m.ord;

  select u.id
    into v_creator_id
    from public.users u
   where u.ledger_id = v_ledger_id
   order by u.created_at asc, u.id asc
   limit 1;

  return jsonb_build_object(
    'ledger_id', v_ledger_id,
    'creator_user_id', v_creator_id
  );
end;
$$;

revoke execute on function public.create_ledger(text, text, text, text[])
  from public, anon, authenticated;
grant execute on function public.create_ledger(text, text, text, text[])
  to service_role;

-- Re-insert a deleted expense with its original id, timestamps, split_mode,
-- created_by, and splits in one transaction for Delete -> Undo (D26).
create function public.restore_expense(
  p_ledger_id    uuid,
  p_expense_id   uuid,
  p_payer_id     uuid,
  p_description  text,
  p_amount_cents bigint,
  p_currency     text,
  p_created_at   timestamptz,
  p_splits       jsonb,
  p_split_mode   text default null,
  p_created_by   uuid default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_split_total bigint;
begin
  if p_expense_id is null then
    raise exception 'expense id is required' using errcode = '22023';
  end if;

  if not exists (select 1 from public.ledgers l where l.id = p_ledger_id) then
    raise exception 'ledger not found' using errcode = 'P0002';
  end if;

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

  -- Idempotent guard for repeated Undo clicks within the same ledger.
  if exists (
    select 1 from public.expenses e
     where e.id = p_expense_id and e.ledger_id = p_ledger_id
  ) then
    return p_expense_id;
  end if;

  insert into public.expenses
    (id, ledger_id, payer_id, description, amount_cents, original_currency, created_at,
     split_mode, created_by)
  values
    (p_expense_id, p_ledger_id, p_payer_id, p_description, p_amount_cents, p_currency, p_created_at,
     p_split_mode, p_created_by);

  insert into public.splits (expense_id, user_id, amount_cents, weight)
  select p_expense_id, (s ->> 'user_id')::uuid, (s ->> 'amount_cents')::bigint, (s ->> 'weight')::numeric
    from jsonb_array_elements(p_splits) s;

  return p_expense_id;
end;
$$;

revoke execute on function public.restore_expense(
  uuid, uuid, uuid, text, bigint, text, timestamptz, jsonb, text, uuid
) from public, anon, authenticated;
grant execute on function public.restore_expense(
  uuid, uuid, uuid, text, bigint, text, timestamptz, jsonb, text, uuid
) to service_role;
