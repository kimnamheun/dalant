-- Check current policies across all tables involved in the join
SELECT 'Current policies on involved tables:' AS info;
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'departments', 'classes')
ORDER BY tablename, policyname;

-- Simulate the query that the admin/students page runs
SELECT 'Direct query (service_role - bypasses RLS):' AS info;
SELECT
  p.name AS student,
  d.name AS department,
  c.name AS class
FROM profiles p
LEFT JOIN departments d ON d.id = p.department_id
LEFT JOIN classes c ON c.id = p.class_id
WHERE p.role = 'student'
ORDER BY p.name;

-- Check role_count
SELECT 'Role counts:' AS info;
SELECT role, COUNT(*) FROM profiles GROUP BY role;
