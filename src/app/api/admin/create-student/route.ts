import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  // 현재 사용자가 관리자인지 확인
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 })
  }

  const body = await request.json()
  const { email, password, name, grade, pin, department_id, class_id } = body

  // Service Role 키로 사용자 생성 (서버 사이드에서만 가능)
  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, role: 'student' },
  })

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 })
  }

  // 프로필 업데이트 (트리거가 기본 생성하지만, 추가 정보 업데이트)
  if (authData.user) {
    await adminSupabase
      .from('profiles')
      .update({
        grade,
        pin,
        department_id,
        class_id,
      })
      .eq('id', authData.user.id)
  }

  return NextResponse.json({ data: authData })
}
