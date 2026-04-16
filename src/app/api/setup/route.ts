import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  const body = await request.json()
  const { email, password, name, setupKey } = body

  if (setupKey !== 'dalant-setup-2026') {
    return NextResponse.json({ error: '잘못된 설정 키입니다.' }, { status: 403 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Check if admin already exists
  const { data: existingAdmin } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'admin')
    .limit(1)

  if (existingAdmin && existingAdmin.length > 0) {
    return NextResponse.json({ error: '이미 관리자 계정이 존재합니다.' }, { status: 400 })
  }

  // Try admin.createUser first, fallback to signUp
  let userId: string | undefined

  try {
    const { data: adminData, error: adminError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, role: 'admin' },
    })

    if (!adminError && adminData?.user) {
      userId = adminData.user.id
    }
  } catch {
    // admin API not available, use signUp
  }

  if (!userId) {
    // Fallback: use regular signUp
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, role: 'admin' },
      },
    })

    if (signUpError) {
      return NextResponse.json({ error: signUpError.message }, { status: 400 })
    }

    userId = signUpData.user?.id
  }

  if (!userId) {
    return NextResponse.json({ error: '사용자 생성에 실패했습니다.' }, { status: 500 })
  }

  // Ensure profile has admin role (trigger may have created it as 'student')
  const { error: updateError } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      name,
      role: 'admin',
    }, { onConflict: 'id' })

  if (updateError) {
    return NextResponse.json({ error: 'Profile update failed: ' + updateError.message }, { status: 500 })
  }

  return NextResponse.json({
    message: '관리자 계정이 생성되었습니다.',
    user: { id: userId, email },
  })
}
