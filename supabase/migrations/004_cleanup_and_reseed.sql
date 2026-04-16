-- STEP 1: Clean up broken data
DELETE FROM talent_transactions WHERE student_id IN (SELECT id FROM profiles WHERE role = 'student');
DELETE FROM profiles WHERE role IN ('teacher', 'student');
DELETE FROM auth.identities WHERE user_id IN (SELECT id FROM auth.users WHERE email LIKE '%@dalant-app.com');
DELETE FROM auth.users WHERE email LIKE '%@dalant-app.com';
