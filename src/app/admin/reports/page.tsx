import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NavHeader } from '@/components/nav-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

export default async function AdminReports() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') redirect('/')

  // 부서별 통계
  const { data: departments } = await supabase
    .from('departments')
    .select('id, name')
    .order('sort_order')

  const deptStats = await Promise.all(
    (departments || []).map(async (dept) => {
      const { count: studentCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('department_id', dept.id)
        .eq('role', 'student')

      const { data: students } = await supabase
        .from('profiles')
        .select('id')
        .eq('department_id', dept.id)
        .eq('role', 'student')

      let totalTalents = 0
      if (students && students.length > 0) {
        const { data: transactions } = await supabase
          .from('talent_transactions')
          .select('amount')
          .in('student_id', students.map((s) => s.id))

        totalTalents = transactions?.reduce((sum, t) => sum + t.amount, 0) || 0
      }

      return {
        name: dept.name,
        students: studentCount || 0,
        totalTalents,
        avg: studentCount ? Math.round(totalTalents / studentCount) : 0,
      }
    })
  )

  // 최근 달란트 지급 현황
  const { data: recentTransactions } = await supabase
    .from('talent_transactions')
    .select('amount, type, description, created_at, profiles!talent_transactions_student_id_fkey(name)')
    .order('created_at', { ascending: false })
    .limit(20)

  return (
    <div className="min-h-screen bg-gray-50">
      <NavHeader title="리포트" />

      <main className="p-4 max-w-2xl mx-auto space-y-4">
        <Link href="/admin" className="text-sm text-blue-500">&larr; 돌아가기</Link>

        {/* 부서별 통계 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">부서별 달란트 현황</CardTitle>
          </CardHeader>
          <CardContent>
            {deptStats.length > 0 ? (
              <div className="space-y-3">
                {deptStats.map((dept) => (
                  <div key={dept.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{dept.name}</p>
                      <p className="text-xs text-muted-foreground">{dept.students}명</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-blue-600">{dept.totalTalents.toLocaleString()} 달란트</p>
                      <p className="text-xs text-muted-foreground">평균 {dept.avg}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">데이터가 없습니다.</p>
            )}
          </CardContent>
        </Card>

        {/* 최근 활동 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">최근 달란트 활동</CardTitle>
          </CardHeader>
          <CardContent>
            {recentTransactions && recentTransactions.length > 0 ? (
              <div className="space-y-2">
                {recentTransactions.map((t: Record<string, any>, i: number) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b last:border-0 text-sm">
                    <div>
                      <span className="font-medium">{t.profiles?.name}</span>
                      <span className="text-muted-foreground ml-2">{t.description}</span>
                    </div>
                    <span className={t.amount > 0 ? 'text-blue-600 font-bold' : 'text-red-500 font-bold'}>
                      {t.amount > 0 ? '+' : ''}{t.amount}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">활동 내역이 없습니다.</p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
