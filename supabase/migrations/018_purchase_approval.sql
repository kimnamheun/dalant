-- ============================================
-- Purchase Approval Workflow
-- Students can create pending purchases (cart).
-- Teachers/admins approve to debit talents + decrement stock.
-- ============================================

-- 1) Create status enum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'purchase_status') THEN
    CREATE TYPE purchase_status AS ENUM ('pending', 'approved', 'rejected');
  END IF;
END $$;

-- 2) Add new columns to purchases
ALTER TABLE purchases
  ADD COLUMN IF NOT EXISTS status purchase_status NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS cart_id UUID,
  ADD COLUMN IF NOT EXISTS note TEXT,
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- 3) Mark all existing purchases as approved (backfill)
UPDATE purchases SET status = 'approved' WHERE status IS NULL;

-- 4) Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_purchases_cart ON purchases(cart_id);
CREATE INDEX IF NOT EXISTS idx_purchases_status ON purchases(status);
CREATE INDEX IF NOT EXISTS idx_purchases_pending ON purchases(status, created_at) WHERE status = 'pending';

-- 5) Drop old purchase policies and recreate
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'purchases' AND schemaname = 'public')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON purchases', r.policyname);
  END LOOP;
END $$;

-- Everyone authenticated can read purchases
CREATE POLICY "purchase_select_auth" ON purchases
  FOR SELECT TO authenticated USING (true);

-- Students can insert pending purchases for themselves
CREATE POLICY "purchase_insert_student_pending" ON purchases
  FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid() AND status = 'pending');

-- Staff can insert any purchase (for direct sales)
CREATE POLICY "purchase_insert_staff" ON purchases
  FOR INSERT TO authenticated
  WITH CHECK (public.get_my_role() IN ('admin', 'teacher'));

-- Staff can update purchases (approve/reject)
CREATE POLICY "purchase_update_staff" ON purchases
  FOR UPDATE TO authenticated
  USING (public.get_my_role() IN ('admin', 'teacher'));

-- Students can cancel (delete) their own pending purchases
CREATE POLICY "purchase_delete_own_pending" ON purchases
  FOR DELETE TO authenticated
  USING (student_id = auth.uid() AND status = 'pending');

-- Staff can delete any purchase
CREATE POLICY "purchase_delete_staff" ON purchases
  FOR DELETE TO authenticated
  USING (public.get_my_role() IN ('admin', 'teacher'));

-- ============================================
-- 6) RPC: approve a cart (approve all purchases with given cart_id)
-- ============================================
CREATE OR REPLACE FUNCTION public.approve_purchase_cart(p_cart_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_student_id UUID;
  v_total INT;
  v_balance INT;
  v_student_name TEXT;
  v_event_id UUID;
  v_names TEXT;
  v_approver UUID := auth.uid();
  v_role TEXT := public.get_my_role();
BEGIN
  IF v_role NOT IN ('admin', 'teacher') THEN
    RETURN jsonb_build_object('success', false, 'error', '권한이 없습니다');
  END IF;

  -- Get cart info
  SELECT student_id, SUM(total_price), MAX(event_id)
  INTO v_student_id, v_total, v_event_id
  FROM purchases
  WHERE cart_id = p_cart_id AND status = 'pending'
  GROUP BY student_id;

  IF v_student_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', '이미 처리됐거나 없는 주문입니다');
  END IF;

  -- Check student balance
  SELECT COALESCE(SUM(amount), 0) INTO v_balance
  FROM talent_transactions
  WHERE student_id = v_student_id;

  IF v_balance < v_total THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', '달란트 잔액 부족',
      'balance', v_balance,
      'needed', v_total
    );
  END IF;

  -- Get student name + products description
  SELECT name INTO v_student_name FROM profiles WHERE id = v_student_id;

  SELECT string_agg(ep.name || ' x' || p.quantity, ', ')
  INTO v_names
  FROM purchases p
  JOIN event_products ep ON ep.id = p.product_id
  WHERE p.cart_id = p_cart_id;

  -- Decrement stock
  UPDATE event_products ep
  SET stock = GREATEST(0, ep.stock - p.quantity)
  FROM purchases p
  WHERE p.cart_id = p_cart_id AND p.product_id = ep.id;

  -- Create debit transaction
  INSERT INTO talent_transactions (student_id, amount, type, description, event_id, granted_by)
  VALUES (v_student_id, -v_total, 'purchase', '달란트 잔치 구매: ' || COALESCE(v_names, ''), v_event_id, v_approver);

  -- Mark all cart rows as approved
  UPDATE purchases
  SET status = 'approved',
      approved_by = v_approver,
      approved_at = NOW()
  WHERE cart_id = p_cart_id;

  RETURN jsonb_build_object(
    'success', true,
    'student', v_student_name,
    'total', v_total,
    'items', v_names
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 7) RPC: reject a cart
-- ============================================
CREATE OR REPLACE FUNCTION public.reject_purchase_cart(p_cart_id UUID, p_note TEXT DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
  v_approver UUID := auth.uid();
  v_role TEXT := public.get_my_role();
  v_affected INT;
BEGIN
  IF v_role NOT IN ('admin', 'teacher') THEN
    RETURN jsonb_build_object('success', false, 'error', '권한이 없습니다');
  END IF;

  UPDATE purchases
  SET status = 'rejected',
      approved_by = v_approver,
      approved_at = NOW(),
      note = COALESCE(p_note, note)
  WHERE cart_id = p_cart_id AND status = 'pending';

  GET DIAGNOSTICS v_affected = ROW_COUNT;

  IF v_affected = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', '이미 처리됐거나 없는 주문입니다');
  END IF;

  RETURN jsonb_build_object('success', true, 'affected', v_affected);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execution
GRANT EXECUTE ON FUNCTION public.approve_purchase_cart(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_purchase_cart(UUID, TEXT) TO authenticated;

-- Verification
SELECT 'purchase_status enum:' AS info;
SELECT enumlabel FROM pg_enum WHERE enumtypid = 'purchase_status'::regtype;

SELECT 'purchases columns:' AS info;
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'purchases' AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT 'RPC functions:' AS info;
SELECT proname FROM pg_proc WHERE proname IN ('approve_purchase_cart', 'reject_purchase_cart');
