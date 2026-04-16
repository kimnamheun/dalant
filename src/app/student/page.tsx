export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NavHeader } from '@/components/nav-header'
import { Card, CardContent } from '@/components/ui/card'
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

  const { data: transactions } = await supabase
    .from('talent_transactions')
    .select('amount, type, description, created_at')
    .eq('student_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10)

  const balance = transactions?.reduce((sum, t) => sum + t.amount, 0) ?? 0

  const earned = transactions?.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0) ?? 0
  const spent = transactions?.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0) ?? 0

  const { data: activeEvent } = await supabase
    .from('events')
    .select('id, name')
    .eq('status', 'active')
    .single()

  const typeIcons: Record<string, string> = {
    attendance: '✅',
    activity: '⭐',
    purchase: '🛒',
    bonus: '🎁',
    adjustment: '🔧',
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-gray-50">
      <NavHeader title="달란트 잔치" userName={profile.name} />

      <main className="p-4 max-w-lg mx-auto space-y-4 animate-fade-in">
        {/* Balance Card */}
        <Card className="overflow-hidden border-0 shadow-xl shadow-blue-100">
          <CardContent className="p-0">
            <div className="gradient-primary text-white p-6 pb-8">
              <p className="text-sm opacity-80 font-medium">내 달란트 잔액</p>
              <p className="text-5xl font-extrabold mt-2 tracking-tight">{balance.toLocaleString()}</p>
              <p className="text-sm opacity-70 mt-2">{profile.grade} &middot; {profile.name}</p>
            </div>
            <div className="grid grid-cols-2 -mt-4 px-4 pb-4">
              <div className="bg-white rounded-xl p-3 shadow-sm mr-1">
                <p className="text-xs text-muted-foreground">총 적립</p>
                <p className="text-lg font-bold text-blue-600">+{earned.toLocaleString()}</p>
              </div>
              <div className="bg-white rounded-xl p-3 shadow-sm ml-1">
                <p className="text-xs text-muted-foreground">총 사용</p>
                <p className="text-lg font-bold text-orange-500">-{spent.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Event Banner */}
        {activeEvent && (
          <Link href="/student/event">
            <Card className="border-0 shadow-lg overflow-hidden card-hover cursor-pointer">
              <CardContent className="p-0">
                <div className="gradient-gold text-white p-4 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">🎉</span>
                      <p className="font-bold text-lg">달란트 잔치 진행 중!</p>
                    </div>
                    <p className="text-sm opacity-90 mt-1">{activeEvent.name}</p>
                  </div>
                  <svg className="w-6 h-6 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </CardContent>
            </Card>
          </Link>
        )}

        {/* Recent History */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold">최근 달란트 내역</h2>
            <Link href="/student/history" className="text-sm text-blue-500 font-medium">
              전체보기 &rarr;
            </Link>
          </div>

          <Card className="border-0 shadow-md">
            <CardContent className="p-0">
              {transactions && transactions.length > 0 ? (
                <div className="divide-y">
                  {transactions.map((t, i) => (
                    <div key={i} className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{typeIcons[t.type] || '📌'}</span>
                        <div>
                          <p className="text-sm font-medium">{t.description || t.type}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(t.created_at).toLocaleDateString('ko-KR', {
                              month: 'short', day: 'numeric', weekday: 'short'
                            })}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant={t.amount > 0 ? 'default' : 'destructive'}
                        className={`text-sm font-bold px-3 py-1 ${
                          t.amount > 0
                            ? 'bg-blue-100 text-blue-700 hover:bg-blue-100'
                            : 'bg-red-100 text-red-600 hover:bg-red-100'
                        }`}
                      >
                        {t.amount > 0 ? '+' : ''}{t.amount}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <span className="text-4xl block mb-2">📭</span>
                  <p className="text-sm text-muted-foreground">아직 달란트 내역이 없습니다</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
