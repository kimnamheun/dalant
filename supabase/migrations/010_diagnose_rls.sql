-- Run this in SQL Editor to see current policies
SELECT policyname, cmd, permissive, qual, with_check
FROM pg_policies
WHERE tablename = 'profiles' AND schemaname = 'public'
ORDER BY policyname;
