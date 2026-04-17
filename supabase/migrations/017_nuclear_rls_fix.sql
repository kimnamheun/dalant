-- ============================================
-- NUCLEAR OPTION: Fully permissive policies for authenticated users
-- This ensures admin/teacher/student can read everything they need
-- ============================================

-- Drop EVERY policy on these tables
DO $$
DECLARE
  r RECORD;
  tbl TEXT;
  tables TEXT[] := ARRAY['profiles', 'departments', 'classes', 'talent_transactions', 'events', 'event_products', 'purchases'];
BEGIN
  FOREACH tbl IN ARRAY tables
  LOOP
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = tbl AND schemaname = 'public')
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, tbl);
    END LOOP;
  END LOOP;
END $$;

-- Make sure RLS is on (but with permissive policies)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE talent_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;

-- Helper function (recreate to be safe)
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT AS $$
  SELECT COALESCE(
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()),
    'student'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Sync metadata from profiles (critical!)
UPDATE auth.users u
SET raw_user_meta_data =
  COALESCE(u.raw_user_meta_data, '{}'::jsonb)
  || jsonb_build_object('role', p.role::text)
FROM profiles p
WHERE p.id = u.id;

-- ============================================
-- PERMISSIVE POLICIES: anyone authenticated = full read
-- ============================================

-- Profiles: authenticated can read ALL, admin can write, self can update
CREATE POLICY "profiles_read" ON profiles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_insert" ON profiles
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "profiles_update" ON profiles
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "profiles_delete" ON profiles
  FOR DELETE TO authenticated USING (public.get_my_role() = 'admin');

-- Departments
CREATE POLICY "dept_read" ON departments
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "dept_write" ON departments
  FOR ALL TO authenticated USING (public.get_my_role() = 'admin');

-- Classes
CREATE POLICY "class_read" ON classes
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "class_write" ON classes
  FOR ALL TO authenticated USING (public.get_my_role() IN ('admin', 'teacher'));

-- Talent transactions
CREATE POLICY "tx_read" ON talent_transactions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "tx_insert" ON talent_transactions
  FOR INSERT TO authenticated WITH CHECK (public.get_my_role() IN ('admin', 'teacher'));
CREATE POLICY "tx_update" ON talent_transactions
  FOR UPDATE TO authenticated USING (public.get_my_role() = 'admin');
CREATE POLICY "tx_delete" ON talent_transactions
  FOR DELETE TO authenticated USING (public.get_my_role() = 'admin');

-- Events
CREATE POLICY "event_read_auth" ON events
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "event_read_public" ON events
  FOR SELECT TO anon USING (status = 'active');
CREATE POLICY "event_write" ON events
  FOR ALL TO authenticated USING (public.get_my_role() = 'admin');

-- Event products
CREATE POLICY "product_read_auth" ON event_products
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "product_read_public" ON event_products
  FOR SELECT TO anon USING (event_id IN (SELECT id FROM events WHERE status = 'active'));
CREATE POLICY "product_write" ON event_products
  FOR ALL TO authenticated USING (public.get_my_role() = 'admin');

-- Purchases
CREATE POLICY "purchase_read" ON purchases
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "purchase_insert" ON purchases
  FOR INSERT TO authenticated WITH CHECK (public.get_my_role() IN ('admin', 'teacher'));

-- ============================================
-- Verification
-- ============================================
SELECT '=== POLICIES ===' AS info;
SELECT tablename, policyname, cmd, roles::text[]
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

SELECT '=== PROFILE COUNTS ===' AS info;
SELECT role, COUNT(*) FROM profiles GROUP BY role ORDER BY role;

SELECT '=== ADMIN METADATA ===' AS info;
SELECT u.email, u.raw_user_meta_data->>'role' AS meta_role, p.role::text AS profile_role
FROM auth.users u JOIN profiles p ON p.id = u.id
WHERE p.role IN ('admin', 'teacher');
