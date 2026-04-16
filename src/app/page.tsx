export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export default async function Home() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // 1차: user_metadata에서 role 확인 (RLS 무관)
  const metaRole = user.user_metadata?.role as string | undefined

  // 2차: profiles 테이블에서 role 확인 (fallback)
  let role = metaRole
  if (!role) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    role = profile?.role
  }

  if (role === 'admin') {
    redirect('/admin')
  } else if (role === 'teacher') {
    redirect('/teacher')
  } else {
    redirect('/student')
  }
}
