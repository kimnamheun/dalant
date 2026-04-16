import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// 최초 관리자 계정 생성용 API (1회만 사용)
export async function POST(request: Request) {
  const body = await request.json()
  const { email, password, name, setupKey } = body

  // 간단한 보안 키 확인 (최초 설정 시만 사용)
  if (setupKey !== 'dalant-setup-2026') {
    return NextResponse.json({ error: '잘못된 설정 키입니다.' }, { status: 403 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // 이미 관리자가 있는지 확인
  const { data: existingAdmin } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'admin')
    .limit(1)

  if (existingAdmin && existingAdmin.length > 0) {
    return NextResponse.json({ error: '이미 관리자 계정이 존재합니다.' }, { status: 400 })
  }

  // 관리자 Auth 사용자 생성
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, role: 'admin' },
  })

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 })
  }

  return NextResponse.json({
    message: '관리자 계정이 생성되었습니다.',
    user: { id: authData.user?.id, email },
  })
}
