-- Baseline: the schema as it stood before Supabase started recording
-- migrations. Reconstructed from the live project's catalog on 2026-11-05;
-- the three migrations after this one are copied verbatim from
-- supabase_migrations.schema_migrations.
--
-- The live project already has this applied. If you link the Supabase CLI to
-- it, mark this version applied first so `db push` does not try to re-run it:
--   supabase migration repair --status applied 20260427000000

create table public.ledgers (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  base_currency text default 'CAD',
  created_at    timestamptz default now(),
  emoji         text default '🍲'
);

create table public.users (
  id             uuid primary key default gen_random_uuid(),
  ledger_id      uuid references public.ledgers(id) on delete cascade,
  name           text not null,
  -- Reserved for the deferred claim flow; no code reads these yet.
  is_placeholder boolean default true,
  device_token   text,
  created_at     timestamptz default now(),
  phone_number   text unique,
  auth_user_id   uuid references auth.users(id)
);

create index idx_users_phone on public.users (phone_number);

create table public.expenses (
  id                uuid primary key default gen_random_uuid(),
  ledger_id         uuid references public.ledgers(id) on delete cascade,
  payer_id          uuid references public.users(id),
  description       text not null,
  amount_cents      bigint not null,
  original_currency text default 'CAD',
  created_at        timestamptz default now()
);

create table public.splits (
  id           uuid primary key default gen_random_uuid(),
  expense_id   uuid references public.expenses(id) on delete cascade,
  user_id      uuid references public.users(id),
  amount_cents bigint not null
);

alter table public.ledgers  enable row level security;
alter table public.users    enable row level security;
alter table public.expenses enable row level security;
alter table public.splits   enable row level security;

create policy "Allow public to view ledgers"
  on public.ledgers for select to anon using (true);
create policy "Allow public to insert ledgers"
  on public.ledgers for insert to anon with check (true);

create policy "Allow public to view users"
  on public.users for select to anon using (true);
create policy "Allow public to insert users"
  on public.users for insert to anon with check (true);

create policy "Allow public read access on expenses"
  on public.expenses for select to public using (true);
create policy "Allow public insert on expenses"
  on public.expenses for insert to public with check (true);
create policy "Allow public delete on expenses"
  on public.expenses for delete to public using (true);

create policy "Allow public read access on splits"
  on public.splits for select to public using (true);
create policy "Allow public insert on splits"
  on public.splits for insert to public with check (true);
create policy "Allow public delete on splits"
  on public.splits for delete to public using (true);
