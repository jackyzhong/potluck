create table public.payments (
  id                uuid primary key default gen_random_uuid(),
  ledger_id         uuid not null references public.ledgers(id) on delete cascade,
  payer_id          uuid not null references public.users(id),
  payee_id          uuid not null references public.users(id),
  amount_cents      bigint not null check (amount_cents > 0),
  original_currency text not null default 'CAD',
  note              text,
  created_at        timestamptz not null default now(),
  constraint payments_payer_is_not_payee check (payer_id <> payee_id)
);

create index payments_ledger_id_idx on public.payments (ledger_id);

alter table public.payments enable row level security;

-- Every operation the app performs needs a policy: a missing one filters the
-- rows out and still answers 200, so the write silently does nothing.
create policy "Allow public read access on payments"
  on public.payments for select to public using (true);

create policy "Allow public insert on payments"
  on public.payments for insert to public with check (true);

create policy "Allow public update on payments"
  on public.payments for update to public using (true) with check (true);

create policy "Allow public delete on payments"
  on public.payments for delete to public using (true);
