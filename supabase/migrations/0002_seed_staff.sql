-- St Thomas OPC -- seed demo staff accounts.
-- Run this AFTER 0001_p0_scope.sql.
-- Edit the email/password literals before running.
--
-- Three accounts:
--   admin@stthomas.demo       (admin)
--   clinician@stthomas.demo   (clinician)
--   pharmacist@stthomas.demo  (pharmacist)
--
-- Default password for all three: DemoPass1!
-- Change in production. To rotate later, use the Supabase dashboard
-- (Authentication -> Users) or update auth.users.encrypted_password
-- with crypt(new_password, gen_salt('bf')).

create extension if not exists pgcrypto;

do $$
declare
  v_password text := 'DemoPass1!';
  v_admin_id uuid;
  v_clin_id uuid;
  v_pharm_id uuid;
begin
  -- admin
  insert into auth.users (
    instance_id, id, aud, role, email,
    encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  )
  values (
    '00000000-0000-0000-0000-000000000000', gen_random_uuid(),
    'authenticated', 'authenticated', 'admin@stthomas.demo',
    crypt(v_password, gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now(), '', '', '', ''
  )
  on conflict (email) do update set encrypted_password = excluded.encrypted_password
  returning id into v_admin_id;

  -- clinician
  insert into auth.users (
    instance_id, id, aud, role, email,
    encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  )
  values (
    '00000000-0000-0000-0000-000000000000', gen_random_uuid(),
    'authenticated', 'authenticated', 'clinician@stthomas.demo',
    crypt(v_password, gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now(), '', '', '', ''
  )
  on conflict (email) do update set encrypted_password = excluded.encrypted_password
  returning id into v_clin_id;

  -- pharmacist
  insert into auth.users (
    instance_id, id, aud, role, email,
    encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  )
  values (
    '00000000-0000-0000-0000-000000000000', gen_random_uuid(),
    'authenticated', 'authenticated', 'pharmacist@stthomas.demo',
    crypt(v_password, gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now(), '', '', '', ''
  )
  on conflict (email) do update set encrypted_password = excluded.encrypted_password
  returning id into v_pharm_id;

  -- Role rows. on conflict (id) so re-running is safe.
  insert into public.staff_users (id, email, role)
  values
    (v_admin_id, 'admin@stthomas.demo', 'admin'),
    (v_clin_id, 'clinician@stthomas.demo', 'clinician'),
    (v_pharm_id, 'pharmacist@stthomas.demo', 'pharmacist')
  on conflict (id) do update set role = excluded.role;
end$$;
