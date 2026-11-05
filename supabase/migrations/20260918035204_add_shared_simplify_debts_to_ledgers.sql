alter table public.ledgers
  add column simplify_debts boolean not null default true;

create policy "Allow public update on ledgers"
  on public.ledgers
  for update
  to anon
  using (true)
  with check (true);
