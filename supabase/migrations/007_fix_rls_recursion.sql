-- Fix RLS recursion: use auth.users metadata instead of profiles table for role check

-- Drop old policies that cause recursion
DROP POLICY IF EXISTS "admin_all_departments" ON departments;
DROP POLICY IF EXISTS "admin_all_classes" ON classes;
DROP POLICY IF EXISTS "admin_all_profiles" ON profiles;
DROP POLICY IF EXISTS "admin_all_transactions" ON talent_transactions;
DROP POLICY IF EXISTS "admin_all_events" ON events;
DROP POLICY IF EXISTS "admin_all_products" ON event_products;
DROP POLICY IF EXISTS "admin_all_purchases" ON purchases;
DROP POLICY IF EXISTS "teacher_read_departments" ON departments;
DROP POLICY IF EXISTS "teacher_read_classes" ON classes;
DROP POLICY IF EXISTS "teacher_read_profiles" ON profiles;
DROP POLICY IF EXISTS "teacher_manage_transactions" ON talent_transactions;
DROP POLICY IF EXISTS "teacher_read_transactions" ON talent_transactions;
DROP POLICY IF EXISTS "student_read_own_profile" ON profiles;
DROP POLICY IF EXISTS "student_read_own_transactions" ON talent_transactions;
DROP POLICY IF EXISTS "all_read_events" ON events;
DROP POLICY IF EXISTS "all_read_products" ON event_products;
DROP POLICY IF EXISTS "all_read_purchases" ON purchases;
DROP POLICY IF EXISTS "staff_manage_purchases" ON purchases;

-- Helper function to get role from auth.users without hitting profiles RLS
CREATE OR REPLACE FUNCTION auth.get_user_role()
RETURNS TEXT AS $$
  SELECT COALESCE(
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()),
    'student'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ADMIN: full access to all tables
CREATE POLICY "admin_full_access" ON departments FOR ALL USING (auth.get_user_role() = 'admin');
CREATE POLICY "admin_full_access" ON classes FOR ALL USING (auth.get_user_role() = 'admin');
CREATE POLICY "admin_full_access" ON profiles FOR ALL USING (auth.get_user_role() = 'admin');
CREATE POLICY "admin_full_access" ON talent_transactions FOR ALL USING (auth.get_user_role() = 'admin');
CREATE POLICY "admin_full_access" ON events FOR ALL USING (auth.get_user_role() = 'admin');
CREATE POLICY "admin_full_access" ON event_products FOR ALL USING (auth.get_user_role() = 'admin');
CREATE POLICY "admin_full_access" ON purchases FOR ALL USING (auth.get_user_role() = 'admin');

-- TEACHER + STUDENT: read departments & classes
CREATE POLICY "authenticated_read" ON departments FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "authenticated_read" ON classes FOR SELECT USING (auth.uid() IS NOT NULL);

-- PROFILES: everyone can read own, teacher can read all, admin handled above
CREATE POLICY "read_own_profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "teacher_read_all_profiles" ON profiles FOR SELECT USING (auth.get_user_role() = 'teacher');

-- TRANSACTIONS: teacher can insert, students read own, teacher reads all
CREATE POLICY "teacher_insert_transactions" ON talent_transactions FOR INSERT WITH CHECK (auth.get_user_role() IN ('teacher', 'admin'));
CREATE POLICY "read_own_transactions" ON talent_transactions FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "teacher_read_all_transactions" ON talent_transactions FOR SELECT USING (auth.get_user_role() = 'teacher');

-- EVENTS & PRODUCTS: all authenticated read
CREATE POLICY "authenticated_read" ON events FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "authenticated_read" ON event_products FOR SELECT USING (auth.uid() IS NOT NULL);

-- PURCHASES: students read own, staff read all, staff insert
CREATE POLICY "read_own_purchases" ON purchases FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "staff_read_purchases" ON purchases FOR SELECT USING (auth.get_user_role() IN ('admin', 'teacher'));
CREATE POLICY "staff_insert_purchases" ON purchases FOR INSERT WITH CHECK (auth.get_user_role() IN ('admin', 'teacher'));
