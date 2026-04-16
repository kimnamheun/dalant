export const dynamic = 'force-dynamic'

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
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'teacher') redirect('/')

  const { data: students } = await supabase
    .from('profiles')
    .select('id, name, grade')
    .eq('class_id', profile.class_id)
    .eq('role', 'student')
    .order('name')

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
    { href: '/teacher/attendance', title: '출석 체크', desc: '출석 + 달란트 일괄 지급', icon: '✅', color: 'bg-green-50 text-green-600' },
    { href: '/teacher/grant', title: '달란트 지급', desc: '개별 달란트 지급/차감', icon: '💰', color: 'bg-yellow-50 text-yellow-600' },
    { href: '/teacher/purchase', title: '구매 처리', desc: '달란트 잔치 구매', icon: '🛒', color: 'bg-orange-50 text-orange-600' },
    { href: '/teacher/students', title: '학생 관리', desc: '학생 정보 관리', icon: '👥', color: 'bg-blue-50 text-blue-600' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <NavHeader title="교사 페이지" userName={profile.name} />

      <main className="p-4 max-w-lg mx-auto space-y-4 animate-fade-in">
        {/* Menu Grid */}
        <div className="grid grid-cols-2 gap-3">
          {menuItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <Card className="border-0 shadow-md card-hover cursor-pointer h-full">
                <CardContent className="p-4">
                  <div className={`w-10 h-10 rounded-xl ${item.color} flex items-center justify-center text-xl mb-2`}>
                    {item.icon}
                  </div>
                  <p className="font-semibold text-sm">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Student List */}
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <span>👥</span>
              내 반 학생 ({students?.length || 0}명)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {students && students.length > 0 ? (
              <div className="divide-y">
                {students.map((s) => (
                  <div key={s.id} className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full gradient-primary text-white flex items-center justify-center text-sm font-bold">
                        {s.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{s.name}</p>
                        <p className="text-xs text-muted-foreground">{s.grade}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-blue-600">
                        {(balances[s.id] || 0).toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">달란트</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <span className="text-3xl block mb-2">📭</span>
                <p className="text-sm text-muted-foreground">등록된 학생이 없습니다</p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
