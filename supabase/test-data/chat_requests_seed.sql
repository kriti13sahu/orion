-- Test data for the "respond to coffee chat requests" scenarios.
-- Run in the Supabase SQL Editor AFTER account A has signed in at localhost and finished onboarding.
--
-- Creates one test student (account B) who never needs to log in, and four pending
-- coffee chat requests from B to A, one per scenario. Safe to re-run: it reuses B and
-- only adds requests if A has no pending ones from B.
--
-- 1) Replace the email on the next line with account A's sign-in email.

do $$
declare
  a_email text := 'YOUR_EMAIL@darden.virginia.edu';   -- <-- account A (the alum)
  b_email text := 'orion.test.student@virginia.edu';  -- test-only address, never signs in
  a_id uuid;
  b_id uuid;
begin
  select id into a_id from public.profiles where lower(email) = lower(a_email);
  if a_id is null then
    raise exception 'No profile for %. Sign in at localhost and finish onboarding first.', a_email;
  end if;

  -- Account B: auth user + profile (student, graduates 2027)
  select id into b_id from auth.users where lower(email) = lower(b_email);
  if b_id is null then
    b_id := gen_random_uuid();
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password,
                            email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
                            created_at, updated_at)
    values ('00000000-0000-0000-0000-000000000000', b_id, 'authenticated', 'authenticated',
            b_email, '', now(),
            '{"provider":"email","providers":["email"]}', '{}', now(), now());
  end if;

  insert into public.profiles (id, email, full_name, graduation_year, program, is_verified)
  values (b_id, b_email, 'Test Student (chat request testing)', 2027, 'MBA', true)
  on conflict (id) do nothing;

  -- Four pending requests, B -> A
  if not exists (select 1 from public.chat_requests
                 where from_user_id = b_id and to_user_id = a_id and status = 'pending') then
    insert into public.chat_requests (from_user_id, to_user_id, message, status) values
      (b_id, a_id, 'TEST 1 (accept): Hi! Could we grab 20 minutes to talk about operations roles?', 'pending'),
      (b_id, a_id, 'TEST 2 (decline): Would you be open to a quick chat about healthcare strategy?', 'pending'),
      (b_id, a_id, 'TEST 3 (two tabs): Any chance you have time for a coffee chat next week?', 'pending'),
      (b_id, a_id, 'TEST 4 (offline): I would love your advice on recruiting outside campus channels.', 'pending');
  end if;
end $$;

-- 2) Check what is there (rerun this after each scenario to see the saved status):
-- select left(message, 22) as request, status, created_at
-- from public.chat_requests
-- where from_user_id = (select id from auth.users where email = 'orion.test.student@virginia.edu')
-- order by created_at;

-- 3) Clean up when finished (removes B, its profile, and its requests via ON DELETE CASCADE):
-- delete from auth.users where email = 'orion.test.student@virginia.edu';
