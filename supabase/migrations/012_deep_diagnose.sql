-- 1) All profiles (raw)
SELECT id, name, role, created_at FROM profiles ORDER BY role, name;

-- 2) All auth.users with our app's emails
SELECT id, email, raw_user_meta_data, created_at
FROM auth.users
WHERE email LIKE '%dalant%'
ORDER BY created_at;

-- 3) Orphan check: profiles without matching auth.users
SELECT p.id, p.name, p.role
FROM profiles p
LEFT JOIN auth.users u ON u.id = p.id
WHERE u.id IS NULL;

-- 4) Missing profiles: auth.users without matching profile
SELECT u.id, u.email
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
WHERE p.id IS NULL AND u.email LIKE '%dalant%';

-- 5) get_my_role function status
SELECT proname, prosecdef AS security_definer
FROM pg_proc
WHERE proname = 'get_my_role';

-- 6) RLS policies on profiles
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'profiles' AND schemaname = 'public';
