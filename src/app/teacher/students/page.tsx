export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NavHeader } from '@/components/nav-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

export default async function TeacherStudents() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'teacher') redirect('/')

  const { data: students } = await supabase
    .from('profiles')
    .select('*')
    .eq('class_id', profile.class_id)
    .eq('role', 'student')
    .order('name')

  // 잔액 계산
  const studentIds = students?.map((s) => s.id) || []
  let balances: Record<string, number> = {}

  if (studentIds.length > 0) {
    const { data: transactions } = await supabase
      .from('talent_transactions')
      .select('student_id, amount')
      .in('student_id', studentIds)

    if (transactions) {
      balances = transactions.reduce((acc, t) => {
        acc[t.student_id] = (acc[t.student_id] || 0) + t.amount
        return acc
      }, {} as Record<string, number>)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NavHeader title="학생 관리" userName={profile.name} />

      <main className="p-4 max-w-lg mx-auto space-y-4">
        <Link href="/teacher" className="text-sm text-blue-500">&larr; 돌아가기</Link>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">내 반 학생 목록 ({students?.length || 0}명)</CardTitle>
          </CardHeader>
          <CardContent>
            {students && students.length > 0 ? (
              <div className="space-y-2">
                {students.map((s) => (
                  <div key={s.id} className="flex items-center justify-between p-3 bg-white border rounded-lg">
                    <div>
                      <p className="font-medium">{s.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.grade} | PIN: {s.pin || '미설정'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-blue-600 font-bold">
                        {(balances[s.id] || 0).toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">달란트</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                등록된 학생이 없습니다.
              </p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
