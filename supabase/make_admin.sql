-- Run this in Supabase -> SQL Editor to grant the admin role.
-- Requires: you have already signed up with this email at
-- https://fitplancoach.com/auth (the insert finds nothing if the account
-- doesn't exist yet).

insert into public.user_roles (user_id, role)
select id, 'admin' from auth.users where email = 'abuzarelahi01@gmail.com'
on conflict (user_id, role) do nothing;

-- Verify it worked — should return one row: abuzarelahi01@gmail.com | admin
select u.email, r.role from auth.users u
join public.user_roles r on r.user_id = u.id
where u.email = 'abuzarelahi01@gmail.com';
