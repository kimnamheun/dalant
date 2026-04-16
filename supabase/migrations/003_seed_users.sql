CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Teacher accounts
INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
) VALUES
  (uuid_generate_v4(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'teacher1@dalant-app.com', crypt('teacher123!', gen_salt('bf')),
   NOW(), '{"provider":"email","providers":["email"]}', '{"name":"김선생","role":"teacher"}',
   NOW(), NOW(), '', '', '', ''),
  (uuid_generate_v4(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'teacher2@dalant-app.com', crypt('teacher234!', gen_salt('bf')),
   NOW(), '{"provider":"email","providers":["email"]}', '{"name":"이선생","role":"teacher"}',
   NOW(), NOW(), '', '', '', ''),
  (uuid_generate_v4(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'teacher3@dalant-app.com', crypt('teacher345!', gen_salt('bf')),
   NOW(), '{"provider":"email","providers":["email"]}', '{"name":"박선생","role":"teacher"}',
   NOW(), NOW(), '', '', '', '');

-- Student accounts (PIN = password, 6 digits)
INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
) VALUES
  (uuid_generate_v4(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'student100100@dalant-app.com', crypt('100100', gen_salt('bf')),
   NOW(), '{"provider":"email","providers":["email"]}', '{"name":"김민준","role":"student"}',
   NOW(), NOW(), '', '', '', ''),
  (uuid_generate_v4(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'student100200@dalant-app.com', crypt('100200', gen_salt('bf')),
   NOW(), '{"provider":"email","providers":["email"]}', '{"name":"이서연","role":"student"}',
   NOW(), NOW(), '', '', '', ''),
  (uuid_generate_v4(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'student100300@dalant-app.com', crypt('100300', gen_salt('bf')),
   NOW(), '{"provider":"email","providers":["email"]}', '{"name":"박지호","role":"student"}',
   NOW(), NOW(), '', '', '', ''),
  (uuid_generate_v4(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'student100400@dalant-app.com', crypt('100400', gen_salt('bf')),
   NOW(), '{"provider":"email","providers":["email"]}', '{"name":"최수아","role":"student"}',
   NOW(), NOW(), '', '', '', ''),
  (uuid_generate_v4(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'student100500@dalant-app.com', crypt('100500', gen_salt('bf')),
   NOW(), '{"provider":"email","providers":["email"]}', '{"name":"정하은","role":"student"}',
   NOW(), NOW(), '', '', '', ''),
  (uuid_generate_v4(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'student200100@dalant-app.com', crypt('200100', gen_salt('bf')),
   NOW(), '{"provider":"email","providers":["email"]}', '{"name":"강도윤","role":"student"}',
   NOW(), NOW(), '', '', '', ''),
  (uuid_generate_v4(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'student200200@dalant-app.com', crypt('200200', gen_salt('bf')),
   NOW(), '{"provider":"email","providers":["email"]}', '{"name":"윤서준","role":"student"}',
   NOW(), NOW(), '', '', '', ''),
  (uuid_generate_v4(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'student200300@dalant-app.com', crypt('200300', gen_salt('bf')),
   NOW(), '{"provider":"email","providers":["email"]}', '{"name":"장하린","role":"student"}',
   NOW(), NOW(), '', '', '', ''),
  (uuid_generate_v4(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'student200400@dalant-app.com', crypt('200400', gen_salt('bf')),
   NOW(), '{"provider":"email","providers":["email"]}', '{"name":"한지우","role":"student"}',
   NOW(), NOW(), '', '', '', ''),
  (uuid_generate_v4(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'student300100@dalant-app.com', crypt('300100', gen_salt('bf')),
   NOW(), '{"provider":"email","providers":["email"]}', '{"name":"임건우","role":"student"}',
   NOW(), NOW(), '', '', '', ''),
  (uuid_generate_v4(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'student300200@dalant-app.com', crypt('300200', gen_salt('bf')),
   NOW(), '{"provider":"email","providers":["email"]}', '{"name":"오예은","role":"student"}',
   NOW(), NOW(), '', '', '', ''),
  (uuid_generate_v4(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'student300300@dalant-app.com', crypt('300300', gen_salt('bf')),
   NOW(), '{"provider":"email","providers":["email"]}', '{"name":"신준혁","role":"student"}',
   NOW(), NOW(), '', '', '', '');

-- Auth identities (required for login to work)
INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
SELECT id, id, json_build_object('sub', id::text, 'email', email), 'email', id, NOW(), NOW(), NOW()
FROM auth.users WHERE email LIKE '%@dalant-app.com';

-- Assign departments and classes to teachers
DO $$
DECLARE
  elem_dept UUID := (SELECT id FROM departments WHERE name = '초등부');
  mid_dept UUID := (SELECT id FROM departments WHERE name = '중등부');
  cls1 UUID := (SELECT id FROM classes WHERE name = '1반' AND department_id = elem_dept);
  cls2 UUID := (SELECT id FROM classes WHERE name = '2반' AND department_id = elem_dept);
  cls_eun UUID := (SELECT id FROM classes WHERE name = '은혜반' AND department_id = mid_dept);
BEGIN
  UPDATE profiles SET department_id=elem_dept, class_id=cls1 WHERE name='김선생' AND role='teacher';
  UPDATE profiles SET department_id=elem_dept, class_id=cls2 WHERE name='이선생' AND role='teacher';
  UPDATE profiles SET department_id=mid_dept, class_id=cls_eun WHERE name='박선생' AND role='teacher';

  UPDATE classes SET teacher_id = (SELECT id FROM profiles WHERE name='김선생' AND role='teacher') WHERE id = cls1;
  UPDATE classes SET teacher_id = (SELECT id FROM profiles WHERE name='이선생' AND role='teacher') WHERE id = cls2;
  UPDATE classes SET teacher_id = (SELECT id FROM profiles WHERE name='박선생' AND role='teacher') WHERE id = cls_eun;

  UPDATE profiles SET grade='초3', pin='100100', department_id=elem_dept, class_id=cls1 WHERE name='김민준' AND role='student';
  UPDATE profiles SET grade='초3', pin='100200', department_id=elem_dept, class_id=cls1 WHERE name='이서연' AND role='student';
  UPDATE profiles SET grade='초4', pin='100300', department_id=elem_dept, class_id=cls1 WHERE name='박지호' AND role='student';
  UPDATE profiles SET grade='초4', pin='100400', department_id=elem_dept, class_id=cls1 WHERE name='최수아' AND role='student';
  UPDATE profiles SET grade='초3', pin='100500', department_id=elem_dept, class_id=cls1 WHERE name='정하은' AND role='student';
  UPDATE profiles SET grade='초5', pin='200100', department_id=elem_dept, class_id=cls2 WHERE name='강도윤' AND role='student';
  UPDATE profiles SET grade='초5', pin='200200', department_id=elem_dept, class_id=cls2 WHERE name='윤서준' AND role='student';
  UPDATE profiles SET grade='초6', pin='200300', department_id=elem_dept, class_id=cls2 WHERE name='장하린' AND role='student';
  UPDATE profiles SET grade='초6', pin='200400', department_id=elem_dept, class_id=cls2 WHERE name='한지우' AND role='student';
  UPDATE profiles SET grade='중1', pin='300100', department_id=mid_dept, class_id=cls_eun WHERE name='임건우' AND role='student';
  UPDATE profiles SET grade='중1', pin='300200', department_id=mid_dept, class_id=cls_eun WHERE name='오예은' AND role='student';
  UPDATE profiles SET grade='중2', pin='300300', department_id=mid_dept, class_id=cls_eun WHERE name='신준혁' AND role='student';
END $$;

-- Sample talent transactions (attendance)
INSERT INTO talent_transactions (student_id, amount, type, description, granted_by, created_at)
SELECT s.id, 5, 'attendance', '주일예배 출석',
  (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1),
  NOW() - (floor(random() * 60) || ' days')::interval
FROM profiles s WHERE s.role = 'student';

INSERT INTO talent_transactions (student_id, amount, type, description, granted_by, created_at)
SELECT s.id, 5, 'attendance', '주일예배 출석',
  (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1),
  NOW() - (floor(random() * 50) || ' days')::interval
FROM profiles s WHERE s.role = 'student';

INSERT INTO talent_transactions (student_id, amount, type, description, granted_by, created_at)
SELECT s.id, 5, 'attendance', '주일예배 출석',
  (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1),
  NOW() - (floor(random() * 40) || ' days')::interval
FROM profiles s WHERE s.role = 'student';

-- Activity transactions
INSERT INTO talent_transactions (student_id, amount, type, description, granted_by, created_at)
SELECT s.id, 3, 'activity', '성경암송',
  (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1),
  NOW() - (floor(random() * 30) || ' days')::interval
FROM profiles s WHERE s.role = 'student';

INSERT INTO talent_transactions (student_id, amount, type, description, granted_by, created_at)
SELECT s.id, 5, 'activity', '전도',
  (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1),
  NOW() - (floor(random() * 20) || ' days')::interval
FROM profiles s WHERE s.role = 'student';

-- Bonus (random half of students)
INSERT INTO talent_transactions (student_id, amount, type, description, granted_by, created_at)
SELECT s.id, 10, 'bonus', '특별 보너스',
  (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1),
  NOW() - (floor(random() * 10) || ' days')::interval
FROM profiles s WHERE s.role = 'student' AND random() > 0.5;
