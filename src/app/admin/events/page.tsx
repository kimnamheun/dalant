'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { NavHeader } from '@/components/nav-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import Link from 'next/link'
import type { Event } from '@/types/database'

const statusLabels: Record<string, string> = {
  draft: '준비 중',
  active: '진행 중',
  closed: '종료',
}

const statusColors: Record<string, 'default' | 'destructive' | 'outline'> = {
  draft: 'outline',
  active: 'default',
  closed: 'destructive',
}

export default function AdminEventsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [events, setEvents] = useState<Event[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: '', start_date: '', end_date: '' })

  async function loadData() {
    const { data } = await supabase
      .from('events')
      .select('*')
      .order('created_at', { ascending: false })

    setEvents(data || [])
  }

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
      loadData()
    }
    init()
  }, [])

  async function createEvent() {
    if (!form.name) return alert('이벤트 이름을 입력하세요.')
    setLoading(true)

    const { error } = await supabase.from('events').insert({
      name: form.name,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
    })

    if (error) {
      alert('이벤트 생성 실패')
    } else {
      setForm({ name: '', start_date: '', end_date: '' })
      setDialogOpen(false)
      loadData()
    }
    setLoading(false)
  }

  async function updateStatus(id: string, status: string) {
    const { error } = await supabase
      .from('events')
      .update({ status })
      .eq('id', id)

    if (error) alert('상태 변경 실패')
    else loadData()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NavHeader title="달란트 잔치 관리" />

      <main className="p-4 max-w-2xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <Link href="/admin" className="text-sm text-blue-500">&larr; 돌아가기</Link>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">새 이벤트</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>달란트 잔치 생성</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>이벤트 이름</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="예: 2026 상반기 달란트 잔치"
                  />
                </div>
                <div>
                  <Label>시작일</Label>
                  <Input
                    type="date"
                    value={form.start_date}
                    onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label>종료일</Label>
                  <Input
                    type="date"
                    value={form.end_date}
                    onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                  />
                </div>
                <Button onClick={createEvent} disabled={loading} className="w-full">
                  {loading ? '생성 중...' : '이벤트 생성'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {events.map((event) => (
          <Card key={event.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{event.name}</CardTitle>
                <Badge variant={statusColors[event.status]}>
                  {statusLabels[event.status]}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground">
                  {event.start_date && `${new Date(event.start_date).toLocaleDateString('ko-KR')}`}
                  {event.end_date && ` ~ ${new Date(event.end_date).toLocaleDateString('ko-KR')}`}
                </div>
                <div className="flex gap-2">
                  <Link href={`/admin/events/${event.id}/products`}>
                    <Button variant="outline" size="sm">상품 관리</Button>
                  </Link>
                  {event.status === 'draft' && (
                    <Button size="sm" onClick={() => updateStatus(event.id, 'active')}>
                      시작
                    </Button>
                  )}
                  {event.status === 'active' && (
                    <Button variant="destructive" size="sm" onClick={() => updateStatus(event.id, 'closed')}>
                      종료
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {events.length === 0 && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">달란트 잔치 이벤트를 생성하세요.</p>
          </div>
        )}
      </main>
    </div>
  )
}
