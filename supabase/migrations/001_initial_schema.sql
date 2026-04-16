-- 달란트 잔치 시스템 초기 스키마

-- ENUM 타입 생성
CREATE TYPE user_role AS ENUM ('admin', 'teacher', 'student');
CREATE TYPE transaction_type AS ENUM ('attendance', 'activity', 'purchase', 'bonus', 'adjustment');
CREATE TYPE event_status AS ENUM ('draft', 'active', 'closed');
CREATE TYPE product_category AS ENUM ('supply', 'food', 'toy', 'etc');

-- 부서 테이블
CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 반 테이블
CREATE TABLE classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  teacher_id UUID,  -- profiles 생성 후 FK 추가
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 사용자 프로필 테이블
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  role user_role NOT NULL DEFAULT 'student',
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
  grade VARCHAR(20),
  pin VARCHAR(10),  -- 학생 간편 로그인용
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- classes의 teacher_id FK 추가
ALTER TABLE classes
  ADD CONSTRAINT fk_classes_teacher
  FOREIGN KEY (teacher_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- 달란트 잔치 이벤트 테이블
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  status event_status NOT NULL DEFAULT 'draft',
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 달란트 트랜잭션 테이블
CREATE TABLE talent_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount INT NOT NULL,
  type transaction_type NOT NULL,
  description VARCHAR(500),
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  granted_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 잔치 상품 테이블
CREATE TABLE event_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  category product_category NOT NULL DEFAULT 'etc',
  price INT NOT NULL DEFAULT 0,
  stock INT NOT NULL DEFAULT 0,
  image_url VARCHAR(500),
  sort_order INT DEFAULT 0
);

-- 구매 내역 테이블
CREATE TABLE purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES event_products(id) ON DELETE CASCADE,
  quantity INT NOT NULL DEFAULT 1,
  total_price INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_class ON profiles(class_id);
CREATE INDEX idx_profiles_department ON profiles(department_id);
CREATE INDEX idx_transactions_student ON talent_transactions(student_id);
CREATE INDEX idx_transactions_type ON talent_transactions(type);
CREATE INDEX idx_transactions_created ON talent_transactions(created_at DESC);
CREATE INDEX idx_event_products_event ON event_products(event_id);
CREATE INDEX idx_purchases_student ON purchases(student_id);
CREATE INDEX idx_purchases_event ON purchases(event_id);

-- 달란트 잔액 조회 뷰
CREATE VIEW student_balances AS
SELECT
  p.id,
  p.name,
  p.grade,
  p.class_id,
  p.department_id,
  COALESCE(SUM(t.amount), 0) AS balance
FROM profiles p
LEFT JOIN talent_transactions t ON t.student_id = p.id
WHERE p.role = 'student'
GROUP BY p.id, p.name, p.grade, p.class_id, p.department_id;

-- RLS (Row Level Security) 정책
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE talent_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;

-- 관리자: 모든 테이블 접근 가능
CREATE POLICY "admin_all_departments" ON departments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "admin_all_classes" ON classes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "admin_all_profiles" ON profiles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "admin_all_transactions" ON talent_transactions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "admin_all_events" ON events
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "admin_all_products" ON event_products
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "admin_all_purchases" ON purchases
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 교사: 읽기 + 자기 반 관련 쓰기
CREATE POLICY "teacher_read_departments" ON departments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('teacher', 'student'))
  );

CREATE POLICY "teacher_read_classes" ON classes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('teacher', 'student'))
  );

CREATE POLICY "teacher_read_profiles" ON profiles
  FOR SELECT USING (
    auth.uid() = id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'teacher')
  );

CREATE POLICY "teacher_manage_transactions" ON talent_transactions
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'teacher')
  );

CREATE POLICY "teacher_read_transactions" ON talent_transactions
  FOR SELECT USING (
    student_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'teacher')
  );

-- 학생: 자기 정보 읽기만
CREATE POLICY "student_read_own_profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "student_read_own_transactions" ON talent_transactions
  FOR SELECT USING (student_id = auth.uid());

-- 이벤트/상품: 모든 인증 사용자 읽기
CREATE POLICY "all_read_events" ON events
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "all_read_products" ON event_products
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "all_read_purchases" ON purchases
  FOR SELECT USING (
    student_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'teacher'))
  );

-- 구매 처리 (교사/관리자만)
CREATE POLICY "staff_manage_purchases" ON purchases
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'teacher'))
  );

-- 프로필 자동 생성 함수 (Auth 회원가입 시)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'student')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
