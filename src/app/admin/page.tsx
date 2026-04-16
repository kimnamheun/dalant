import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NavHeader } from '@/components/nav-header'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'

export default async function AdminDashboard() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') redirect('/')

  // 통계 데이터
  const { count: studentCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'student')

  const { count: teacherCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'teacher')

  const { count: deptCount } = await supabase
    .from('departments')
    .select('*', { count: 'exact', head: true })

  const { data: activeEvent } = await supabase
    .from('events')
    .select('name')
    .eq('status', 'active')
    .single()

  const stats = [
    { label: '학생 수', value: studentCount || 0 },
    { label: '교사 수', value: teacherCount || 0 },
    { label: '부서 수', value: deptCount || 0 },
  ]

  const menuItems = [
    { href: '/admin/departments', title: '부서/반 관리', desc: '부서와 반을 만들고 관리합니다', icon: '🏫' },
    { href: '/admin/teachers', title: '교사 관리', desc: '교사 계정을 관리합니다', icon: '👨‍🏫' },
    { href: '/admin/students', title: '학생 관리', desc: '전체 학생을 관리합니다', icon: '👥' },
    { href: '/admin/events', title: '달란트 잔치', desc: '이벤트와 상품을 관리합니다', icon: '🎉' },
    { href: '/admin/reports', title: '리포트', desc: '달란트 통계를 확인합니다', icon: '📊' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <NavHeader title="관리자" userName={profile.name} />

      <main className="p-4 max-w-2xl mx-auto space-y-4">
        {/* 통계 카드 */}
        <div className="grid grid-cols-3 gap-3">
          {stats.map((stat) => (
            <Card key={stat.label}>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {activeEvent && (
          <Card className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white">
            <CardContent className="py-3">
              <p className="font-bold">진행 중인 달란트 잔치</p>
              <p className="text-sm opacity-90">{activeEvent.name}</p>
            </CardContent>
          </Card>
        )}

        {/* 메뉴 */}
        <div className="grid grid-cols-2 gap-3">
          {menuItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardContent className="p-4">
                  <div className="text-2xl mb-2">{item.icon}</div>
                  <p className="font-medium text-sm">{item.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}
