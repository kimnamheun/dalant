import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NavHeader } from '@/components/nav-header'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

const typeLabels: Record<string, string> = {
  attendance: '출석',
  activity: '활동',
  purchase: '구매',
  bonus: '보너스',
  adjustment: '조정',
}

export default async function StudentHistory() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('name, role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'student') redirect('/')

  const { data: transactions } = await supabase
    .from('talent_transactions')
    .select('*')
    .eq('student_id', user.id)
    .order('created_at', { ascending: false })

  const balance = transactions?.reduce((sum, t) => sum + t.amount, 0) ?? 0

  return (
    <div className="min-h-screen bg-gray-50">
      <NavHeader title="달란트 내역" userName={profile.name} />

      <main className="p-4 max-w-lg mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <Link href="/student" className="text-sm text-blue-500">&larr; 돌아가기</Link>
          <p className="text-sm font-medium">총 잔액: <span className="text-blue-600 font-bold">{balance.toLocaleString()}</span></p>
        </div>

        <Card>
          <CardContent className="pt-4">
            {transactions && transactions.length > 0 ? (
              <div className="space-y-3">
                {transactions.map((t) => (
                  <div key={t.id} className="flex items-center justify-between py-3 border-b last:border-0">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {typeLabels[t.type] || t.type}
                        </Badge>
                        <p className="text-sm font-medium">{t.description}</p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(t.created_at).toLocaleDateString('ko-KR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          weekday: 'short',
                        })}
                      </p>
                    </div>
                    <span className={`text-lg font-bold ${t.amount > 0 ? 'text-blue-600' : 'text-red-500'}`}>
                      {t.amount > 0 ? '+' : ''}{t.amount}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                달란트 내역이 없습니다.
              </p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
