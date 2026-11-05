create policy "Allow public update on expenses"
  on public.expenses
  for update
  to public
  using (true)
  with check (true);
