-- Make the constraints say what the product actually requires
-- (KNOWN-ISSUES §1.1, §2.3, §2.5).

-- The form has always labelled the description optional and the app shows
-- "Untitled Expense" when it is missing, but the column refused nulls, so
-- saving an expense without one failed.
alter table public.expenses alter column description drop not null;

-- Every row has always had these; a null in any of them would orphan the row
-- or break the balance maths without an error.
alter table public.expenses alter column ledger_id set not null;
alter table public.expenses alter column payer_id  set not null;
alter table public.splits   alter column expense_id set not null;
alter table public.splits   alter column user_id    set not null;
alter table public.users    alter column ledger_id set not null;

-- These have defaults and the app never writes null to them, but nothing
-- stopped a null either. created_at is the sort key for the expense list.
alter table public.expenses alter column original_currency set not null;
alter table public.expenses alter column created_at        set not null;
alter table public.ledgers  alter column base_currency     set not null;

-- A second split row for the same person on the same expense would quietly
-- double their share in every balance.
create unique index splits_expense_id_user_id_key
  on public.splits (expense_id, user_id);
