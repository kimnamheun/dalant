import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NavHeader } from '@/components/nav-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

export default async function StudentDashboard() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'student') redirect('/')

  // 달란트 잔액 조회
  const { data: transactions } = await supabase
    .from('talent_transactions')
    .select('amount, type, description, created_at')
    .eq('student_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10)

  const balance = transactions?.reduce((sum, t) => sum + t.amount, 0) ?? 0

  // 진행 중인 이벤트 확인
  const { data: activeEvent } = await supabase
    .from('events')
    .select('id, name')
    .eq('status', 'active')
    .single()

  return (
    <div className="min-h-screen bg-gray-50">
      <NavHeader title="달란트 잔치" userName={profile.name} />

      <main className="p-4 max-w-lg mx-auto space-y-4">
        {/* 달란트 잔액 카드 */}
        <Card className="bg-gradient-to-br from-blue-500 to-blue-700 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium opacity-90">
              내 달란트
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{balance.toLocaleString()}</p>
            <p className="text-sm opacity-75 mt-1">{profile.grade} | {profile.name}</p>
          </CardContent>
        </Card>

        {/* 달란트 잔치 배너 */}
        {activeEvent && (
          <Link href="/student/event">
            <Card className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white cursor-pointer hover:shadow-lg transition-shadow">
              <CardContent className="py-4">
                <p className="font-bold text-lg">달란트 잔치 진행 중!</p>
                <p className="text-sm opacity-90">{activeEvent.name}</p>
                <p className="text-sm mt-1">상품 목록 보기 &rarr;</p>
              </CardContent>
            </Card>
          </Link>
        )}

        {/* 최근 내역 */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">최근 달란트 내역</CardTitle>
              <Link href="/student/history" className="text-sm text-blue-500">
                전체보기
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {transactions && transactions.length > 0 ? (
              <div className="space-y-3">
                {transactions.map((t, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="text-sm font-medium">{t.description || t.type}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(t.created_at).toLocaleDateString('ko-KR')}
                      </p>
                    </div>
                    <Badge variant={t.amount > 0 ? 'default' : 'destructive'}>
                      {t.amount > 0 ? '+' : ''}{t.amount}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                아직 달란트 내역이 없습니다.
              </p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
