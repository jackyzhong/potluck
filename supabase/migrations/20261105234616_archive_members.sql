-- Let members be removed (KNOWN-ISSUES §2.4, §4.4).
--
-- A member with no expenses, splits or payments is deleted outright. One with
-- any activity cannot be: their rows are what the balances are made of, and
-- deleting them would change what everyone else owes. They are archived
-- instead: hidden from the pickers for new expenses and payments, but still on
-- the records they are part of and still in the balances, so the books keep
-- adding up. An archived member can be restored.

alter table public.users add column archived_at timestamptz;

create function public.remove_member(p_ledger_id uuid, p_user_id uuid)
returns text  -- 'deleted' or 'archived'
language plpgsql
security invoker
set search_path = ''
as $$
begin
  -- Try the delete; any expense, split or payment that references the member
  -- makes it fail on a foreign key, and that is exactly the case to archive.
  -- Letting the database decide avoids a check-then-delete race with someone
  -- adding them to an expense in between.
  begin
    delete from public.users where id = p_user_id and ledger_id = p_ledger_id;
    if not found then
      raise exception 'member not found in this ledger' using errcode = 'P0002';
    end if;
    return 'deleted';
  exception when foreign_key_violation then
    update public.users
       set archived_at = coalesce(archived_at, now())
     where id = p_user_id and ledger_id = p_ledger_id;
    return 'archived';
  end;
end;
$$;

revoke execute on function public.remove_member(uuid, uuid) from public, anon, authenticated;
grant execute on function public.remove_member(uuid, uuid) to service_role;
