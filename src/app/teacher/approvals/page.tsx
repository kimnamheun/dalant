'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { NavHeader } from '@/components/nav-header'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import Link from 'next/link'

type OrderItem = {
  name: string
  quantity: number
  price: number
  imageUrl: string | null
}

type Order = {
  cart_id: string
  student_id: string
  student_name: string
  student_grade: string | null
  student_class: string | null
  student_balance: number
  created_at: string
  total: number
  items: OrderItem[]
  status: 'pending' | 'approved' | 'rejected'
}

export default function TeacherApprovalsPage() {
  const router = useRouter()
  const supabase = createClient()

  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(false)
  const [teacherName, setTeacherName] = useState('')
  const [teacherRole, setTeacherRole] = useState<'teacher' | 'admin' | ''>('')
  const [teacherClassId, setTeacherClassId] = useState<string | null>(null)
  const [tab, setTab] = useState<'pending' | 'history'>('pending')

  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectTarget, setRejectTarget] = useState<Order | null>(null)
  const [rejectNote, setRejectNote] = useState('')

  const loadOrders = useCallback(async (role: 'teacher' | 'admin', classId: string | null) => {
    const statusFilter = tab === 'pending' ? ['pending'] : ['approved', 'rejected']

    const { data } = await supabase
      .from('purchases')
      .select(`
        cart_id,
        student_id,
        created_at,
        quantity,
        total_price,
        status,
        event_products(name, image_url, price),
        profiles:student_id(name, grade, class_id, classes(name))
      `)
      .in('status', statusFilter)
      .not('cart_id', 'is', null)
      .order('created_at', { ascending: false })

    if (!data) {
      setOrders([])
      return
    }

    // Get balances for all involved students
    const studentIds = Array.from(new Set(data.map((r) => r.student_id)))
    const balances: Record<string, number> = {}
    if (studentIds.length > 0) {
      const { data: txns } = await supabase
        .from('talent_transactions')
        .select('student_id, amount')
        .in('student_id', studentIds)
      for (const t of txns || []) {
        balances[t.student_id] = (balances[t.student_id] || 0) + t.amount
      }
    }

    // Group rows by cart_id
    const groups: Record<string, Order> = {}
    for (const row of data) {
      const ep = row.event_products as unknown as { name: string; image_url: string | null; price: number } | null
      const p = row.profiles as unknown as { name: string; grade: string | null; class_id: string | null; classes: { name: string } | null } | null

      // Teacher sees only their class; admin sees all
      if (role === 'teacher' && classId && p?.class_id !== classId) continue

      if (!groups[row.cart_id]) {
        groups[row.cart_id] = {
          cart_id: row.cart_id,
          student_id: row.student_id,
          student_name: p?.name || '알 수 없음',
          student_grade: p?.grade || null,
          student_class: p?.classes?.name || null,
          student_balance: balances[row.student_id] || 0,
          created_at: row.created_at,
          total: 0,
          items: [],
          status: row.status as 'pending' | 'approved' | 'rejected',
        }
      }
      const g = groups[row.cart_id]
      g.total += row.total_price
      g.items.push({
        name: ep?.name || '삭제된 상품',
        quantity: row.quantity,
        price: ep?.price || 0,
        imageUrl: ep?.image_url || null,
      })
    }

    setOrders(Object.values(groups))
  }, [supabase, tab])

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/login')
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, name, class_id')
        .eq('id', user.id)
        .single()
      if (!profile || !['teacher', 'admin'].includes(profile.role)) return router.push('/')
      setTeacherName(profile.name)
      setTeacherRole(profile.role as 'teacher' | 'admin')
      setTeacherClassId(profile.class_id || null)
      loadOrders(profile.role as 'teacher' | 'admin', profile.class_id || null)
    }
    init()
  }, [supabase, router, loadOrders])

  async function approveOrder(order: Order) {
    if (!confirm(`"${order.student_name}"의 구매를 승인하시겠습니까?\n${order.total} 달란트가 차감됩니다.`)) return

    setLoading(true)
    const { data, error } = await supabase.rpc('approve_purchase_cart', { p_cart_id: order.cart_id })

    if (error) {
      alert('승인 실패: ' + error.message)
    } else if (data?.error) {
      alert('승인 실패: ' + data.error + (data.balance !== undefined ? ` (잔액: ${data.balance}, 필요: ${data.needed})` : ''))
    } else {
      alert(`✅ 승인 완료!\n${order.student_name}에게 ${order.total} 달란트 차감`)
      if (teacherRole) loadOrders(teacherRole, teacherClassId)
    }
    setLoading(false)
  }

  function openReject(order: Order) {
    setRejectTarget(order)
    setRejectNote('')
    setRejectOpen(true)
  }

  async function confirmReject() {
    if (!rejectTarget) return
    setLoading(true)
    const { data, error } = await supabase.rpc('reject_purchase_cart', {
      p_cart_id: rejectTarget.cart_id,
      p_note: rejectNote || null,
    })

    if (error) {
      alert('거절 실패: ' + error.message)
    } else if (data?.error) {
      alert('거절 실패: ' + data.error)
    } else {
      alert(`❌ "${rejectTarget.student_name}"의 구매를 거절했습니다`)
      setRejectOpen(false)
      if (teacherRole) loadOrders(teacherRole, teacherClassId)
    }
    setLoading(false)
  }

  const pendingCount = tab === 'pending' ? orders.length : 0

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <NavHeader title="구매 승인" userName={teacherName} backHref="/teacher" />

      <main className="p-4 max-w-2xl mx-auto space-y-4 animate-fade-in">
        {/* Tabs */}
        <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setTab('pending')}
            className={`flex-1 py-2 rounded-md text-sm font-semibold transition-colors ${
              tab === 'pending' ? 'bg-white shadow-sm text-blue-600' : 'text-muted-foreground'
            }`}
          >
            ⏳ 승인 대기 {pendingCount > 0 && `(${pendingCount})`}
          </button>
          <button
            onClick={() => setTab('history')}
            className={`flex-1 py-2 rounded-md text-sm font-semibold transition-colors ${
              tab === 'history' ? 'bg-white shadow-sm text-blue-600' : 'text-muted-foreground'
            }`}
          >
            📋 처리 내역
          </button>
        </div>

        {orders.length > 0 ? (
          <div className="space-y-3">
            {orders.map((order) => (
              <Card key={order.cart_id} className="border-0 shadow-md">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full gradient-primary text-white flex items-center justify-center text-sm font-bold">
                          {order.student_name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold">{order.student_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {order.student_grade || '-'} · {order.student_class || '반 미배정'}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      {order.status === 'pending' && <Badge className="bg-yellow-100 text-yellow-700 border-0">⏳ 대기</Badge>}
                      {order.status === 'approved' && <Badge className="bg-green-100 text-green-700 border-0">✅ 승인</Badge>}
                      {order.status === 'rejected' && <Badge className="bg-red-100 text-red-700 border-0">❌ 거절</Badge>}
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(order.created_at).toLocaleString('ko-KR', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Items */}
                  <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                    {order.items.map((item, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <div className="w-10 h-10 bg-white rounded overflow-hidden shrink-0">
                          {item.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300">📦</div>
                          )}
                        </div>
                        <span className="flex-1 truncate">{item.name}</span>
                        <span className="text-xs text-muted-foreground">× {item.quantity}</span>
                        <span className="text-blue-600 font-semibold w-20 text-right">{item.price * item.quantity}</span>
                      </div>
                    ))}
                  </div>

                  {/* Summary + actions */}
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="bg-blue-50 rounded p-2 text-center">
                      <p className="text-xs text-muted-foreground">합계</p>
                      <p className="text-lg font-bold text-blue-600">{order.total}</p>
                    </div>
                    <div className={`rounded p-2 text-center ${order.student_balance >= order.total ? 'bg-green-50' : 'bg-red-50'}`}>
                      <p className="text-xs text-muted-foreground">학생 잔액</p>
                      <p className={`text-lg font-bold ${order.student_balance >= order.total ? 'text-green-600' : 'text-red-500'}`}>
                        {order.student_balance}
                      </p>
                    </div>
                  </div>

                  {order.status === 'pending' && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1 text-red-600 hover:bg-red-50"
                        onClick={() => openReject(order)}
                        disabled={loading}
                      >
                        ❌ 거절
                      </Button>
                      <Button
                        className="flex-1 gradient-primary border-0"
                        onClick={() => approveOrder(order)}
                        disabled={loading || order.student_balance < order.total}
                      >
                        ✅ 승인 (차감)
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-0 shadow-md">
            <CardContent className="text-center py-12">
              <p className="text-4xl mb-2">{tab === 'pending' ? '🌤️' : '📋'}</p>
              <p className="text-sm text-muted-foreground">
                {tab === 'pending' ? '승인 대기 중인 구매가 없습니다' : '처리 내역이 없습니다'}
              </p>
            </CardContent>
          </Card>
        )}

        <div className="text-center">
          <Link href="/teacher/purchase" className="text-xs text-muted-foreground hover:text-foreground">
            현장에서 직접 구매 처리 →
          </Link>
        </div>
      </main>

      {/* Reject dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>구매 거절</DialogTitle>
          </DialogHeader>
          {rejectTarget && (
            <div className="space-y-3">
              <p className="text-sm">
                <span className="font-semibold">{rejectTarget.student_name}</span>의 {rejectTarget.total} 달란트 구매를 거절합니다.
              </p>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">거절 사유 (선택)</label>
                <Input
                  value={rejectNote}
                  onChange={(e) => setRejectNote(e.target.value)}
                  placeholder="예: 재고 부족, 부적절한 상품 등"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setRejectOpen(false)}>취소</Button>
                <Button className="flex-1 bg-red-500 hover:bg-red-600 text-white border-0" onClick={confirmReject} disabled={loading}>
                  {loading ? '처리 중...' : '거절하기'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
