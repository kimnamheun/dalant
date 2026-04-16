import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
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
  const { name, email, password } = body

  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  let userId: string | undefined

  try {
    const { data, error } = await adminSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, role: 'teacher' },
    })
    if (!error && data?.user) userId = data.user.id
  } catch {
    // fallback
  }

  if (!userId) {
    const { data, error } = await adminSupabase.auth.signUp({
      email,
      password,
      options: { data: { name, role: 'teacher' } },
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    userId = data.user?.id
  }

  if (!userId) {
    return NextResponse.json({ error: '사용자 생성 실패' }, { status: 500 })
  }

  await adminSupabase
    .from('profiles')
    .upsert({
      id: userId,
      name,
      role: 'teacher',
    }, { onConflict: 'id' })

  return NextResponse.json({ data: { userId, email } })
}
