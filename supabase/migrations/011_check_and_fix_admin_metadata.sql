-- 1) Check admin's metadata and profile role
SELECT
  u.id,
  u.email,
  u.raw_user_meta_data,
  p.name,
  p.role AS profile_role
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
WHERE p.role = 'admin';

-- 2) Check what get_my_role() returns for admin user
-- (run this while logged in as admin in the app, but we can simulate here)

-- 3) Check if function exists
SELECT proname, pronamespace::regnamespace, prosrc
FROM pg_proc
WHERE proname = 'get_my_role';
