'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { NavHeader } from '@/components/nav-header'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'

export default function AdminManageHub() {
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
      title: '학생 관리 (개선판)',
      desc: '편집, 삭제, 검색, 필터, 달란트 잔액 표시',
      icon: '👥',
      color: 'bg-purple-50 text-purple-600',
    },
    {
      href: '/admin/teachers-v2',
      title: '교사 관리 (개선판)',
      desc: '편집, 삭제, 반 재배정, 담당 학생 수 표시',
      icon: '👨‍🏫',
      color: 'bg-green-50 text-green-600',
    },
    {
      href: '/admin/departments',
      title: '부서/반 관리',
      desc: '부서와 반 CRUD',
      icon: '🏫',
      color: 'bg-blue-50 text-blue-600',
    },
    {
      href: '/admin/events',
      title: '달란트 잔치',
      desc: '이벤트/상품 관리',
      icon: '🎉',
      color: 'bg-yellow-50 text-yellow-600',
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <NavHeader title="전체 관리" backHref="/admin" />

      <main className="p-4 max-w-2xl mx-auto space-y-4 animate-fade-in">
        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <p className="text-sm font-semibold">새로 개선된 관리 기능</p>
            <p className="text-xs text-muted-foreground mt-1">
              학생/교사 목록을 보고 편집·삭제·검색·필터를 할 수 있습니다.
            </p>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-3">
          {menus.map((m) => (
            <Link key={m.href} href={m.href}>
              <Card className="border-0 shadow-md card-hover cursor-pointer">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl ${m.color} flex items-center justify-center text-2xl`}>
                    {m.icon}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">{m.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{m.desc}</p>
                  </div>
                  <svg className="w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
