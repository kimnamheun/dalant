import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NavHeader } from '@/components/nav-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

export default async function TeacherDashboard() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, classes(*), departments(*)')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'teacher') redirect('/')

  // 내 반 학생들 조회
  const { data: students } = await supabase
    .from('profiles')
    .select('id, name, grade')
    .eq('class_id', profile.class_id)
    .eq('role', 'student')
    .order('name')

  // 각 학생의 달란트 잔액 계산
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

  const menuItems = [
    { href: '/teacher/attendance', title: '출석 체크', desc: '출석 확인 + 달란트 일괄 지급', icon: '✅' },
    { href: '/teacher/grant', title: '달란트 지급', desc: '개별 달란트 지급/차감', icon: '💰' },
    { href: '/teacher/students', title: '학생 관리', desc: '학생 정보 관리', icon: '👥' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <NavHeader title="교사 페이지" userName={profile.name} />

      <main className="p-4 max-w-lg mx-auto space-y-4">
        {/* 메뉴 카드 */}
        <div className="grid grid-cols-3 gap-3">
          {menuItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardContent className="p-3 text-center">
                  <div className="text-2xl mb-1">{item.icon}</div>
                  <p className="text-sm font-medium">{item.title}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* 내 반 학생 현황 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              내 반 학생 ({students?.length || 0}명)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {students && students.length > 0 ? (
              <div className="space-y-2">
                {students.map((s) => (
                  <div key={s.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="text-sm font-medium">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{s.grade}</p>
                    </div>
                    <span className="text-sm font-bold text-blue-600">
                      {(balances[s.id] || 0).toLocaleString()} 달란트
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                아직 등록된 학생이 없습니다.
              </p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
