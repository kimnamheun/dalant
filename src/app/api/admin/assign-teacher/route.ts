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
  const { teacherId, name, department_id, class_id } = body

  if (!teacherId) {
    return NextResponse.json({ error: 'teacherId가 필요합니다.' }, { status: 400 })
  }

  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // 1. Clear this teacher from any existing classes
  await adminSupabase
    .from('classes')
    .update({ teacher_id: null })
    .eq('teacher_id', teacherId)

  // 2. Update profile (name, dept, class)
  const updates: Record<string, unknown> = {
    department_id: department_id || null,
    class_id: class_id || null,
  }
  if (name !== undefined && name !== null) updates.name = name

  const { error: profileError } = await adminSupabase
    .from('profiles')
    .update(updates)
    .eq('id', teacherId)

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 400 })
  }

  // 3. Set teacher_id on the new class
  if (class_id) {
    const { error: classError } = await adminSupabase
      .from('classes')
      .update({ teacher_id: teacherId })
      .eq('id', class_id)

    if (classError) {
      return NextResponse.json({ error: classError.message }, { status: 400 })
    }
  }

  return NextResponse.json({ success: true })
}
