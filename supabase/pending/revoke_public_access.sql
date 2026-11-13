-- Remove all public access to the tables (KNOWN-ISSUES §2.1).
--
-- !! Do not apply this until the server-actions release is live on Vercel with
-- !! SUPABASE_SECRET_KEY set. The previous release talks to the database with
-- !! the public key, and this migration is what stops that key working; apply
-- !! it early and production breaks. Order of operations:
-- !!   1. add SUPABASE_SECRET_KEY to Vercel,
-- !!   2. deploy the release and check it works,
-- !!   3. apply this, then move it into supabase/migrations/ under the version
-- !!      Supabase records for it.
--
-- Every policy was `using (true)`, so anyone holding the public key from the
-- deployed JavaScript could read, change or delete every group's data without
-- knowing any link. The app now reaches the database only from the server,
-- with the secret key, which bypasses RLS; the public key needs no access.
--
-- RLS stays enabled with no policies, so even a grant added by mistake later
-- exposes nothing.

drop policy "Allow public to view ledgers"   on public.ledgers;
drop policy "Allow public to insert ledgers" on public.ledgers;
drop policy "Allow public update on ledgers" on public.ledgers;

drop policy "Allow public to view users"   on public.users;
drop policy "Allow public to insert users" on public.users;

drop policy "Allow public read access on expenses" on public.expenses;
drop policy "Allow public insert on expenses"      on public.expenses;
drop policy "Allow public update on expenses"      on public.expenses;
drop policy "Allow public delete on expenses"      on public.expenses;

drop policy "Allow public read access on splits" on public.splits;
drop policy "Allow public insert on splits"      on public.splits;
drop policy "Allow public delete on splits"      on public.splits;

drop policy "Allow public read access on payments" on public.payments;
drop policy "Allow public insert on payments"      on public.payments;
drop policy "Allow public update on payments"      on public.payments;
drop policy "Allow public delete on payments"      on public.payments;

revoke all on public.ledgers, public.users, public.expenses, public.splits, public.payments
  from anon, authenticated;

-- Supabase grants the public roles access to every new table by default. Stop
-- that, so a table added later is private until someone decides otherwise.
alter default privileges in schema public revoke all on tables    from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke all on functions from anon, authenticated;
