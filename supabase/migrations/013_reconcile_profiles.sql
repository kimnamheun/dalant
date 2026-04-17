-- Step 1: See the actual mismatch
SELECT 'Current state:' AS step;
SELECT 'auth.users' AS source, id, email, raw_user_meta_data->>'role' AS role
FROM auth.users WHERE email LIKE '%dalant%';
SELECT 'profiles' AS source, id, name, role::text
FROM profiles ORDER BY role, name;

-- Step 2: Delete orphan profiles (profiles with no matching auth.users)
DELETE FROM profiles
WHERE id NOT IN (SELECT id FROM auth.users);

-- Step 3: For each auth.users that has NO profile, create one using metadata
INSERT INTO profiles (id, name, role)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)) AS name,
  CASE
    WHEN u.raw_user_meta_data->>'role' = 'admin' THEN 'admin'::user_role
    WHEN u.raw_user_meta_data->>'role' = 'teacher' THEN 'teacher'::user_role
    WHEN u.email LIKE 'admin@%' THEN 'admin'::user_role
    WHEN u.email LIKE 'teacher%' THEN 'teacher'::user_role
    ELSE 'student'::user_role
  END AS role
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
WHERE p.id IS NULL
  AND (u.email LIKE '%dalant%');

-- Step 4: Ensure raw_user_meta_data has correct role for every profile
-- (this is what get_my_role() reads from)
UPDATE auth.users u
SET raw_user_meta_data =
  COALESCE(u.raw_user_meta_data, '{}'::jsonb)
  || jsonb_build_object('role', p.role::text)
FROM profiles p
WHERE p.id = u.id
  AND (u.raw_user_meta_data->>'role' IS DISTINCT FROM p.role::text);

-- Step 5: Verify
SELECT 'After reconciliation:' AS step;
SELECT
  u.email,
  u.raw_user_meta_data->>'role' AS meta_role,
  p.name,
  p.role::text AS profile_role,
  CASE WHEN u.id = p.id THEN 'OK' ELSE 'MISMATCH' END AS sync_status
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
WHERE u.email LIKE '%dalant%'
ORDER BY p.role, p.name;

SELECT 'Counts by role:' AS step;
SELECT role, COUNT(*) AS cnt FROM profiles GROUP BY role ORDER BY role;
