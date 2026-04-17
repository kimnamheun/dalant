'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { NavHeader } from '@/components/nav-header'
import { Card, CardContent } from '@/components/ui/card'
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

const statusColors: Record<string, 'default' | 'destructive' | 'outline' | 'secondary'> = {
  draft: 'outline',
  active: 'default',
  closed: 'secondary',
}

type EventWithCount = Event & { productCount: number }

export default function AdminEventsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [events, setEvents] = useState<EventWithCount[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Event | null>(null)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: '', start_date: '', end_date: '' })
  const [editForm, setEditForm] = useState({ name: '', start_date: '', end_date: '' })

  const loadData = useCallback(async () => {
    const { data } = await supabase
      .from('events')
      .select('*')
      .order('created_at', { ascending: false })

    if (!data) {
      setEvents([])
      return
    }

    const ids = data.map((e) => e.id)
    const counts: Record<string, number> = {}
    if (ids.length > 0) {
      const { data: prods } = await supabase
        .from('event_products')
        .select('event_id')
        .in('event_id', ids)
      for (const p of prods || []) {
        counts[p.event_id] = (counts[p.event_id] || 0) + 1
      }
    }

    setEvents(data.map((e) => ({ ...e, productCount: counts[e.id] || 0 })))
  }, [supabase])

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
  }, [supabase, router, loadData])

  async function createEvent() {
    if (!form.name) return alert('이벤트 이름을 입력하세요.')
    setLoading(true)

    const { error } = await supabase.from('events').insert({
      name: form.name,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
    })

    if (error) {
      alert('이벤트 생성 실패: ' + error.message)
    } else {
      setForm({ name: '', start_date: '', end_date: '' })
      setDialogOpen(false)
      loadData()
    }
    setLoading(false)
  }

  function openEdit(e: Event) {
    setEditTarget(e)
    setEditForm({
      name: e.name,
      start_date: e.start_date ? e.start_date.slice(0, 10) : '',
      end_date: e.end_date ? e.end_date.slice(0, 10) : '',
    })
    setEditOpen(true)
  }

  async function saveEdit() {
    if (!editTarget || !editForm.name) return alert('이벤트 이름을 입력하세요.')
    setLoading(true)

    const { error } = await supabase
      .from('events')
      .update({
        name: editForm.name,
        start_date: editForm.start_date || null,
        end_date: editForm.end_date || null,
      })
      .eq('id', editTarget.id)

    if (error) {
      alert('수정 실패: ' + error.message)
    } else {
      setEditOpen(false)
      loadData()
    }
    setLoading(false)
  }

  async function updateStatus(id: string, status: string) {
    if (status === 'active') {
      await supabase
        .from('events')
        .update({ status: 'closed' })
        .eq('status', 'active')
        .neq('id', id)
    }

    const { error } = await supabase
      .from('events')
      .update({ status })
      .eq('id', id)

    if (error) alert('상태 변경 실패: ' + error.message)
    else loadData()
  }

  async function deleteEvent(e: Event) {
    if (!confirm(`이벤트 "${e.name}"을(를) 삭제하시겠습니까?\n등록된 모든 상품도 함께 삭제됩니다.`)) return
    const { error } = await supabase.from('events').delete().eq('id', e.id)
    if (error) alert('삭제 실패: ' + error.message)
    else loadData()
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <NavHeader title="달란트 잔치 관리" backHref="/admin" />

      <main className="p-4 max-w-2xl mx-auto space-y-4 animate-fade-in">
        <Card className="border-0 shadow-md">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="font-semibold text-sm">이벤트 {events.length}개</p>
              <p className="text-xs text-muted-foreground">
                진행 중: {events.filter((e) => e.status === 'active').length}개
              </p>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gradient-primary border-0">+ 새 이벤트</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>달란트 잔치 생성</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label>이벤트 이름 *</Label>
                    <Input
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="예: 2026 상반기 달란트 잔치"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
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
                  </div>
                  <Button onClick={createEvent} disabled={loading} className="w-full gradient-primary border-0">
                    {loading ? '생성 중...' : '이벤트 생성'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        {events.map((event) => (
          <Card key={event.id} className="border-0 shadow-md">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-base truncate">{event.name}</h3>
                    <Badge variant={statusColors[event.status]}>{statusLabels[event.status]}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    <p>
                      상품 <span className="font-semibold">{event.productCount}</span>개 등록됨
                    </p>
                    {(event.start_date || event.end_date) && (
                      <p>
                        {event.start_date && new Date(event.start_date).toLocaleDateString('ko-KR')}
                        {' ~ '}
                        {event.end_date && new Date(event.end_date).toLocaleDateString('ko-KR')}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link href={`/admin/events/${event.id}/products`} className="flex-1 min-w-[120px]">
                  <Button variant="default" size="sm" className="w-full gradient-primary border-0">
                    🛍️ 상품 관리
                  </Button>
                </Link>
                <Button variant="outline" size="sm" onClick={() => openEdit(event)}>
                  편집
                </Button>
                {event.status === 'draft' && (
                  <Button variant="default" size="sm" onClick={() => updateStatus(event.id, 'active')}>
                    시작
                  </Button>
                )}
                {event.status === 'active' && (
                  <Button variant="secondary" size="sm" onClick={() => updateStatus(event.id, 'closed')}>
                    종료
                  </Button>
                )}
                {event.status === 'closed' && (
                  <Button variant="outline" size="sm" onClick={() => updateStatus(event.id, 'active')}>
                    재개
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  onClick={() => deleteEvent(event)}
                >
                  삭제
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {events.length === 0 && (
          <Card className="border-0 shadow-md">
            <CardContent className="text-center py-12">
              <p className="text-3xl mb-2">🎉</p>
              <p className="text-sm text-muted-foreground">달란트 잔치 이벤트를 생성하세요.</p>
            </CardContent>
          </Card>
        )}

        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>이벤트 수정</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>이벤트 이름 *</Label>
                <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>시작일</Label>
                  <Input
                    type="date"
                    value={editForm.start_date}
                    onChange={(e) => setEditForm({ ...editForm, start_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label>종료일</Label>
                  <Input
                    type="date"
                    value={editForm.end_date}
                    onChange={(e) => setEditForm({ ...editForm, end_date: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setEditOpen(false)}>취소</Button>
                <Button onClick={saveEdit} disabled={loading} className="flex-1 gradient-primary border-0">
                  {loading ? '저장 중...' : '저장'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  )
}
