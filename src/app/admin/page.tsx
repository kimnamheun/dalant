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
    { label: '학생', value: studentCount || 0, icon: '👥', color: 'from-blue-500 to-blue-600' },
    { label: '교사', value: teacherCount || 0, icon: '👨‍🏫', color: 'from-green-500 to-green-600' },
    { label: '부서', value: deptCount || 0, icon: '🏫', color: 'from-purple-500 to-purple-600' },
  ]

  const menuItems = [
    { href: '/admin/departments', title: '부서/반 관리', desc: '부서와 반을 만들고 관리', icon: '🏫', color: 'bg-blue-50 text-blue-600' },
    { href: '/admin/teachers', title: '교사 관리', desc: '교사 계정 관리', icon: '👨‍🏫', color: 'bg-green-50 text-green-600' },
    { href: '/admin/students', title: '학생 관리', desc: '전체 학생 관리', icon: '👥', color: 'bg-purple-50 text-purple-600' },
    { href: '/admin/events', title: '달란트 잔치', desc: '이벤트와 상품 관리', icon: '🎉', color: 'bg-yellow-50 text-yellow-600' },
    { href: '/admin/reports', title: '리포트', desc: '달란트 통계 확인', icon: '📊', color: 'bg-indigo-50 text-indigo-600' },
    { href: '/teacher/purchase', title: '구매 처리', desc: '달란트 잔치 구매', icon: '🛒', color: 'bg-orange-50 text-orange-600' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <NavHeader title="관리자" userName={profile.name} />

      <main className="p-4 max-w-2xl mx-auto space-y-6 animate-fade-in">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {stats.map((stat) => (
            <Card key={stat.label} className="border-0 shadow-md overflow-hidden">
              <CardContent className="p-0">
                <div className={`bg-gradient-to-br ${stat.color} text-white p-4`}>
                  <span className="text-2xl">{stat.icon}</span>
                  <p className="text-3xl font-extrabold mt-1">{stat.value}</p>
                  <p className="text-xs opacity-80 font-medium">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Active Event */}
        {activeEvent && (
          <Card className="border-0 shadow-lg overflow-hidden">
            <CardContent className="p-0">
              <div className="gradient-gold text-white p-4 flex items-center gap-3">
                <span className="text-2xl">🎉</span>
                <div>
                  <p className="font-bold">진행 중인 달란트 잔치</p>
                  <p className="text-sm opacity-90">{activeEvent.name}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Menu Grid */}
        <div>
          <h2 className="text-base font-bold mb-3">관리 메뉴</h2>
          <div className="grid grid-cols-2 gap-3">
            {menuItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <Card className="border-0 shadow-md card-hover cursor-pointer h-full">
                  <CardContent className="p-4">
                    <div className={`w-10 h-10 rounded-xl ${item.color} flex items-center justify-center text-xl mb-3`}>
                      {item.icon}
                    </div>
                    <p className="font-semibold text-sm">{item.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
