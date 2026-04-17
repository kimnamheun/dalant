import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

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
  const { userId } = body

  if (!userId) {
    return NextResponse.json({ error: 'userId가 필요합니다.' }, { status: 400 })
  }

  if (userId === user.id) {
    return NextResponse.json({ error: '자기 자신은 삭제할 수 없습니다.' }, { status: 400 })
  }

  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Reset teacher_id on classes where this user was teacher
  await adminSupabase
    .from('classes')
    .update({ teacher_id: null })
    .eq('teacher_id', userId)

  // Delete from auth.users (cascades to profiles, talent_transactions, purchases)
  try {
    const { error: adminError } = await adminSupabase.auth.admin.deleteUser(userId)
    if (!adminError) {
      return NextResponse.json({ success: true })
    }
  } catch {
    // fallback to manual delete
  }

  // Fallback: delete profile only (auth.users may remain)
  const { error: profileError } = await adminSupabase
    .from('profiles')
    .delete()
    .eq('id', userId)

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 400 })
  }

  return NextResponse.json({ success: true, note: 'Profile deleted (auth record may remain)' })
}
