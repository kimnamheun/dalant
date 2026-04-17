export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NavHeader } from '@/components/nav-header'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

export default async function AdminV2Dashboard() {
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
    .select('id, name')
    .eq('status', 'active')
    .maybeSingle()

  const stats = [
    { href: '/admin/students-v2', label: '학생', value: studentCount || 0, icon: '👥', color: 'from-blue-500 to-blue-600' },
    { href: '/admin/teachers-v2', label: '교사', value: teacherCount || 0, icon: '👨‍🏫', color: 'from-green-500 to-green-600' },
    { href: '/admin/departments', label: '부서', value: deptCount || 0, icon: '🏫', color: 'from-purple-500 to-purple-600' },
  ]

  const menuItems = [
    { href: '/admin/students-v2', title: '학생 관리', desc: '편집·삭제·검색·잔액 표시', icon: '👥', color: 'bg-purple-50 text-purple-600', badge: '개선판' },
    { href: '/admin/teachers-v2', title: '교사 관리', desc: '편집·삭제·반 재배정', icon: '👨‍🏫', color: 'bg-green-50 text-green-600', badge: '개선판' },
    { href: '/admin/events-v2', title: '달란트 잔치', desc: '이벤트 + 이미지 업로드 상품', icon: '🎉', color: 'bg-yellow-50 text-yellow-600', badge: '개선판' },
    { href: '/admin/departments', title: '부서/반 관리', desc: '부서와 반을 만들고 관리', icon: '🏫', color: 'bg-blue-50 text-blue-600' },
    { href: '/admin/reports', title: '리포트', desc: '달란트 통계 확인', icon: '📊', color: 'bg-indigo-50 text-indigo-600' },
    { href: '/teacher/purchase', title: '구매 처리', desc: '달란트 잔치 구매', icon: '🛒', color: 'bg-orange-50 text-orange-600' },
    { href: '/admin/storage-check', title: 'Storage 진단', desc: '이미지 업로드 상태 체크', icon: '🔧', color: 'bg-gray-50 text-gray-600' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <NavHeader title="관리자" userName={profile.name} />

      <main className="p-4 max-w-2xl mx-auto space-y-6 animate-fade-in">
        {/* Stats - clickable cards */}
        <div className="grid grid-cols-3 gap-3">
          {stats.map((stat) => (
            <Link key={stat.label} href={stat.href}>
              <Card className="border-0 shadow-md overflow-hidden card-hover cursor-pointer h-full">
                <CardContent className="p-0">
                  <div className={`bg-gradient-to-br ${stat.color} text-white p-4`}>
                    <span className="text-2xl">{stat.icon}</span>
                    <p className="text-3xl font-extrabold mt-1">{stat.value}</p>
                    <p className="text-xs opacity-80 font-medium">{stat.label}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Active Event */}
        {activeEvent && (
          <Link href="/admin/events-v2">
            <Card className="border-0 shadow-lg overflow-hidden card-hover cursor-pointer">
              <CardContent className="p-0">
                <div className="gradient-gold text-white p-4 flex items-center gap-3">
                  <span className="text-2xl">🎉</span>
                  <div className="flex-1">
                    <p className="font-bold">진행 중인 달란트 잔치</p>
                    <p className="text-sm opacity-90">{activeEvent.name}</p>
                  </div>
                  <svg className="w-5 h-5 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </CardContent>
            </Card>
          </Link>
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
                    <div className="flex items-center gap-1">
                      <p className="font-semibold text-sm">{item.title}</p>
                      {item.badge && (
                        <Badge className="text-[10px] bg-blue-100 text-blue-700 border-0 px-1.5 py-0">
                          {item.badge}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        <div className="text-center pt-2">
          <Link href="/admin" className="text-xs text-muted-foreground hover:text-foreground">
            ← 기존 관리자 대시보드
          </Link>
        </div>
      </main>
    </div>
  )
}
