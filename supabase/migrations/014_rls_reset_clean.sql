-- ============================================
-- FINAL RLS RESET: simplified policies
-- ============================================

-- Drop ALL existing policies on profiles
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'profiles' AND schemaname = 'public')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON profiles', r.policyname);
  END LOOP;
END $$;

-- Drop ALL existing policies on talent_transactions
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'talent_transactions' AND schemaname = 'public')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON talent_transactions', r.policyname);
  END LOOP;
END $$;

-- Drop ALL existing policies on classes
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'classes' AND schemaname = 'public')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON classes', r.policyname);
  END LOOP;
END $$;

-- Drop ALL existing policies on departments
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'departments' AND schemaname = 'public')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON departments', r.policyname);
  END LOOP;
END $$;

-- Drop ALL existing policies on events
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'events' AND schemaname = 'public')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON events', r.policyname);
  END LOOP;
END $$;

-- Drop ALL existing policies on event_products
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'event_products' AND schemaname = 'public')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON event_products', r.policyname);
  END LOOP;
END $$;

-- Drop ALL existing policies on purchases
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'purchases' AND schemaname = 'public')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON purchases', r.policyname);
  END LOOP;
END $$;

-- Recreate helper function
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT AS $$
  SELECT COALESCE(
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()),
    'student'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Make sure admin metadata is correct (critical for get_my_role)
UPDATE auth.users u
SET raw_user_meta_data =
  COALESCE(u.raw_user_meta_data, '{}'::jsonb)
  || jsonb_build_object('role', p.role::text)
FROM profiles p
WHERE p.id = u.id;

-- ============================================
-- NEW SIMPLE POLICIES (all authenticated can read everything)
-- ============================================

-- departments
CREATE POLICY "auth_read_dept" ON departments FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "admin_write_dept" ON departments FOR ALL USING (public.get_my_role() = 'admin');

-- classes
CREATE POLICY "auth_read_class" ON classes FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "admin_write_class" ON classes FOR ALL USING (public.get_my_role() = 'admin');
CREATE POLICY "teacher_update_own_class" ON classes FOR UPDATE USING (
  public.get_my_role() = 'teacher' AND teacher_id = auth.uid()
);

-- profiles: ALL authenticated users can read ALL profiles (simplified for admin counting)
CREATE POLICY "auth_read_all_profiles" ON profiles FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "admin_write_profiles" ON profiles FOR ALL USING (public.get_my_role() = 'admin');
CREATE POLICY "self_update_profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- talent_transactions
CREATE POLICY "student_read_own_tx" ON talent_transactions FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "staff_read_all_tx" ON talent_transactions FOR SELECT USING (
  public.get_my_role() IN ('admin', 'teacher')
);
CREATE POLICY "staff_insert_tx" ON talent_transactions FOR INSERT WITH CHECK (
  public.get_my_role() IN ('admin', 'teacher')
);
CREATE POLICY "admin_modify_tx" ON talent_transactions FOR UPDATE USING (public.get_my_role() = 'admin');
CREATE POLICY "admin_delete_tx" ON talent_transactions FOR DELETE USING (public.get_my_role() = 'admin');

-- events
CREATE POLICY "auth_read_events" ON events FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "admin_write_events" ON events FOR ALL USING (public.get_my_role() = 'admin');

-- event_products
CREATE POLICY "auth_read_products" ON event_products FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "admin_write_products" ON event_products FOR ALL USING (public.get_my_role() = 'admin');

-- purchases
CREATE POLICY "student_read_own_purchase" ON purchases FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "staff_read_all_purchases" ON purchases FOR SELECT USING (
  public.get_my_role() IN ('admin', 'teacher')
);
CREATE POLICY "staff_insert_purchases" ON purchases FOR INSERT WITH CHECK (
  public.get_my_role() IN ('admin', 'teacher')
);

-- ============================================
-- ALSO: make events & event_products readable to anonymous (public home page)
-- ============================================
DROP POLICY IF EXISTS "public_read_events" ON events;
CREATE POLICY "public_read_events" ON events FOR SELECT TO anon USING (status = 'active');

DROP POLICY IF EXISTS "public_read_active_products" ON event_products;
CREATE POLICY "public_read_active_products" ON event_products FOR SELECT TO anon USING (
  event_id IN (SELECT id FROM events WHERE status = 'active')
);

-- ============================================
-- Verification
-- ============================================
SELECT 'Policies after reset:' AS info;
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

SELECT 'Profile counts:' AS info;
SELECT role, COUNT(*) AS cnt FROM profiles GROUP BY role ORDER BY role;

SELECT 'Admin metadata check:' AS info;
SELECT u.email, u.raw_user_meta_data->>'role' AS meta_role, p.role::text AS profile_role
FROM auth.users u
JOIN profiles p ON p.id = u.id
WHERE p.role = 'admin';
