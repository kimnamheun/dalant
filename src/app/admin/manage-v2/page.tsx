'use client'

export const dynamic = 'force-dynamic'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { NavHeader } from '@/components/nav-header'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

export default function AdminManageV2Hub() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/login')
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      if (!profile || profile.role !== 'admin') return router.push('/')
    }
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const menus = [
    {
      href: '/admin/students-v2',
      title: '학생 관리',
      desc: '편집·삭제·검색·필터·잔액 표시',
      icon: '👥',
      color: 'bg-purple-50 text-purple-600',
      badge: '개선판',
    },
    {
      href: '/admin/teachers-v2',
      title: '교사 관리',
      desc: '편집·삭제·반 재배정·담당 학생 수',
      icon: '👨‍🏫',
      color: 'bg-green-50 text-green-600',
      badge: '개선판',
    },
    {
      href: '/admin/events-v2',
      title: '달란트 잔치 관리',
      desc: '이벤트 관리 + 이미지 업로드 상품 관리',
      icon: '🎉',
      color: 'bg-yellow-50 text-yellow-600',
      badge: '개선판',
    },
    {
      href: '/admin/departments',
      title: '부서/반 관리',
      desc: '부서와 반 CRUD',
      icon: '🏫',
      color: 'bg-blue-50 text-blue-600',
    },
    {
      href: '/admin/reports',
      title: '리포트',
      desc: '달란트 통계 확인',
      icon: '📊',
      color: 'bg-indigo-50 text-indigo-600',
    },
    {
      href: '/admin/storage-check',
      title: 'Storage 진단',
      desc: '이미지 업로드 상태 체크',
      icon: '🔧',
      color: 'bg-gray-50 text-gray-600',
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <NavHeader title="전체 관리" backHref="/admin" />

      <main className="p-4 max-w-2xl mx-auto space-y-4 animate-fade-in">
        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <p className="text-sm font-semibold">관리 허브</p>
            <p className="text-xs text-muted-foreground mt-1">
              &quot;개선판&quot; 배지가 있는 메뉴는 편집·삭제·이미지 업로드 등의 고급 기능을 제공합니다.
            </p>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-3">
          {menus.map((m) => (
            <Link key={m.href} href={m.href}>
              <Card className="border-0 shadow-md card-hover cursor-pointer">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl ${m.color} flex items-center justify-center text-2xl shrink-0`}>
                    {m.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{m.title}</p>
                      {m.badge && (
                        <Badge variant="default" className="text-xs bg-blue-100 text-blue-700 border-0">
                          {m.badge}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{m.desc}</p>
                  </div>
                  <svg className="w-5 h-5 text-muted-foreground shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}
