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

INSERT INTO talent_transactions (student_id, amount, type, description, granted_by, created_at)
SELECT s.id, 5, 'attendance', '주일예배 출석', (SELECT id FROM profiles WHERE role='admin' LIMIT 1), NOW() - (floor(random()*60)||' days')::interval
FROM profiles s WHERE s.role = 'student';

INSERT INTO talent_transactions (student_id, amount, type, description, granted_by, created_at)
SELECT s.id, 5, 'attendance', '주일예배 출석', (SELECT id FROM profiles WHERE role='admin' LIMIT 1), NOW() - (floor(random()*50)||' days')::interval
FROM profiles s WHERE s.role = 'student';

INSERT INTO talent_transactions (student_id, amount, type, description, granted_by, created_at)
SELECT s.id, 5, 'attendance', '주일예배 출석', (SELECT id FROM profiles WHERE role='admin' LIMIT 1), NOW() - (floor(random()*40)||' days')::interval
FROM profiles s WHERE s.role = 'student';

INSERT INTO talent_transactions (student_id, amount, type, description, granted_by, created_at)
SELECT s.id, 3, 'activity', '성경암송', (SELECT id FROM profiles WHERE role='admin' LIMIT 1), NOW() - (floor(random()*30)||' days')::interval
FROM profiles s WHERE s.role = 'student';

INSERT INTO talent_transactions (student_id, amount, type, description, granted_by, created_at)
SELECT s.id, 5, 'activity', '전도', (SELECT id FROM profiles WHERE role='admin' LIMIT 1), NOW() - (floor(random()*20)||' days')::interval
FROM profiles s WHERE s.role = 'student';

INSERT INTO talent_transactions (student_id, amount, type, description, granted_by, created_at)
SELECT s.id, 10, 'bonus', '특별 보너스', (SELECT id FROM profiles WHERE role='admin' LIMIT 1), NOW() - (floor(random()*10)||' days')::interval
FROM profiles s WHERE s.role = 'student' AND random() > 0.5;
