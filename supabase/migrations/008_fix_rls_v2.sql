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
DROP POLICY IF EXISTS "admin_full_access" ON departments;
DROP POLICY IF EXISTS "admin_full_access" ON classes;
DROP POLICY IF EXISTS "admin_full_access" ON profiles;
DROP POLICY IF EXISTS "admin_full_access" ON talent_transactions;
DROP POLICY IF EXISTS "admin_full_access" ON events;
DROP POLICY IF EXISTS "admin_full_access" ON event_products;
DROP POLICY IF EXISTS "admin_full_access" ON purchases;
DROP POLICY IF EXISTS "authenticated_read" ON departments;
DROP POLICY IF EXISTS "authenticated_read" ON classes;
DROP POLICY IF EXISTS "authenticated_read" ON events;
DROP POLICY IF EXISTS "authenticated_read" ON event_products;
DROP POLICY IF EXISTS "read_own_profile" ON profiles;
DROP POLICY IF EXISTS "teacher_read_all_profiles" ON profiles;
DROP POLICY IF EXISTS "teacher_insert_transactions" ON talent_transactions;
DROP POLICY IF EXISTS "read_own_transactions" ON talent_transactions;
DROP POLICY IF EXISTS "teacher_read_all_transactions" ON talent_transactions;
DROP POLICY IF EXISTS "read_own_purchases" ON purchases;
DROP POLICY IF EXISTS "staff_read_purchases" ON purchases;
DROP POLICY IF EXISTS "staff_insert_purchases" ON purchases;

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT AS $$
  SELECT COALESCE(
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()),
    'student'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE POLICY "dept_all" ON departments FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "class_all" ON classes FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "profile_select" ON profiles FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "profile_insert" ON profiles FOR INSERT WITH CHECK (public.get_my_role() IN ('admin', 'teacher'));
CREATE POLICY "profile_update" ON profiles FOR UPDATE USING (public.get_my_role() = 'admin' OR auth.uid() = id);
CREATE POLICY "profile_delete" ON profiles FOR DELETE USING (public.get_my_role() = 'admin');
CREATE POLICY "tx_select" ON talent_transactions FOR SELECT USING (student_id = auth.uid() OR public.get_my_role() IN ('admin', 'teacher'));
CREATE POLICY "tx_insert" ON talent_transactions FOR INSERT WITH CHECK (public.get_my_role() IN ('admin', 'teacher'));
CREATE POLICY "tx_update" ON talent_transactions FOR UPDATE USING (public.get_my_role() = 'admin');
CREATE POLICY "tx_delete" ON talent_transactions FOR DELETE USING (public.get_my_role() = 'admin');
CREATE POLICY "event_select" ON events FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "event_manage" ON events FOR ALL USING (public.get_my_role() = 'admin');
CREATE POLICY "product_select" ON event_products FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "product_manage" ON event_products FOR ALL USING (public.get_my_role() = 'admin');
CREATE POLICY "purchase_select" ON purchases FOR SELECT USING (student_id = auth.uid() OR public.get_my_role() IN ('admin', 'teacher'));
CREATE POLICY "purchase_insert" ON purchases FOR INSERT WITH CHECK (public.get_my_role() IN ('admin', 'teacher'));
