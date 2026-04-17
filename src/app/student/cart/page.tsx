'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { NavHeader } from '@/components/nav-header'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useCart } from '@/lib/use-cart'
import { updateQuantity, removeFromCart, clearCart, cartTotal } from '@/lib/cart'
import Link from 'next/link'

type PendingOrder = {
  cart_id: string
  created_at: string
  total: number
  items: Array<{ name: string; quantity: number; price: number; imageUrl: string | null }>
  status: 'pending' | 'approved' | 'rejected'
  note: string | null
}

export default function StudentCartPage() {
  const router = useRouter()
  const supabase = createClient()
  const { items } = useCart()

  const [userId, setUserId] = useState<string>('')
  const [userName, setUserName] = useState<string>('')
  const [balance, setBalance] = useState(0)
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([])
  const [loading, setLoading] = useState(false)

  const loadPendingOrders = useCallback(async (uid: string) => {
    const { data } = await supabase
      .from('purchases')
      .select('cart_id, created_at, total_price, quantity, status, note, event_products(name, image_url, price)')
      .eq('student_id', uid)
      .in('status', ['pending', 'rejected'])
      .not('cart_id', 'is', null)
      .order('created_at', { ascending: false })

    if (!data) {
      setPendingOrders([])
      return
    }

    // Group by cart_id
    const groups: Record<string, PendingOrder> = {}
    for (const row of data) {
      const ep = row.event_products as unknown as { name: string; image_url: string | null; price: number } | null
      if (!groups[row.cart_id]) {
        groups[row.cart_id] = {
          cart_id: row.cart_id,
          created_at: row.created_at,
          total: 0,
          items: [],
          status: row.status as 'pending' | 'approved' | 'rejected',
          note: row.note,
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
    setPendingOrders(Object.values(groups))
  }, [supabase])

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/login')

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, name')
        .eq('id', user.id)
        .single()

      if (!profile || profile.role !== 'student') return router.push('/')
      setUserId(user.id)
      setUserName(profile.name)

      const { data: txns } = await supabase
        .from('talent_transactions')
        .select('amount')
        .eq('student_id', user.id)

      setBalance((txns || []).reduce((s, t) => s + t.amount, 0))

      loadPendingOrders(user.id)
    }
    init()
  }, [supabase, router, loadPendingOrders])

  const total = cartTotal(items)
  const canAfford = balance >= total

  async function submitOrder() {
    if (items.length === 0) return alert('장바구니가 비어있습니다')
    if (!canAfford) return alert('달란트 잔액이 부족합니다')

    setLoading(true)

    // Generate cart_id
    const cartId = crypto.randomUUID()

    // Insert one row per item with status=pending
    const rows = items.map((i) => ({
      event_id: i.eventId,
      student_id: userId,
      product_id: i.productId,
      quantity: i.quantity,
      total_price: i.price * i.quantity,
      status: 'pending' as const,
      cart_id: cartId,
    }))

    const { error } = await supabase.from('purchases').insert(rows)

    if (error) {
      alert('구매 요청 실패: ' + error.message)
      setLoading(false)
      return
    }

    alert('선생님께 구매 요청이 전달되었습니다!\n승인되면 달란트가 차감됩니다.')
    clearCart()
    loadPendingOrders(userId)
    setLoading(false)
  }

  async function cancelPendingOrder(cartId: string) {
    if (!confirm('이 구매 요청을 취소하시겠습니까?')) return
    const { error } = await supabase.from('purchases').delete().eq('cart_id', cartId).eq('student_id', userId).eq('status', 'pending')
    if (error) alert('취소 실패: ' + error.message)
    else loadPendingOrders(userId)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pb-32">
      <NavHeader title="장바구니" userName={userName} backHref="/" />

      <main className="p-4 max-w-lg mx-auto space-y-4 animate-fade-in">
        {/* Balance */}
        <Card className="border-0 shadow-md overflow-hidden">
          <CardContent className="p-0">
            <div className="gradient-primary text-white p-4 flex items-center justify-between">
              <div>
                <p className="text-xs opacity-80">내 달란트</p>
                <p className="text-2xl font-extrabold">{balance.toLocaleString()}</p>
              </div>
              <span className="text-3xl">💰</span>
            </div>
          </CardContent>
        </Card>

        {/* Cart items */}
        <div>
          <h2 className="text-base font-bold mb-2">🛒 장바구니 ({items.length}개 상품)</h2>
          {items.length > 0 ? (
            <Card className="border-0 shadow-md">
              <CardContent className="p-0 divide-y">
                {items.map((item) => (
                  <div key={item.productId} className="p-3 flex items-center gap-3">
                    <div className="w-14 h-14 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                      {item.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl text-gray-300">📦</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.price} × {item.quantity} = <span className="text-blue-600 font-semibold">{item.price * item.quantity}</span> 달란트
                      </p>
                      <div className="flex items-center gap-1 mt-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 w-7 p-0"
                          onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                        >
                          −
                        </Button>
                        <span className="w-6 text-center text-sm font-semibold">{item.quantity}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 w-7 p-0"
                          onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                          disabled={item.quantity >= item.stock}
                        >
                          +
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 ml-auto text-xs text-red-500"
                          onClick={() => removeFromCart(item.productId)}
                        >
                          삭제
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : (
            <Card className="border-0 shadow-md">
              <CardContent className="text-center py-10">
                <p className="text-3xl mb-2">🛒</p>
                <p className="text-sm text-muted-foreground">장바구니가 비어있습니다</p>
                <Link href="/">
                  <Button className="mt-3 gradient-primary border-0" size="sm">상품 둘러보기</Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Pending & Rejected orders */}
        {pendingOrders.length > 0 && (
          <div>
            <h2 className="text-base font-bold mb-2">📋 내 구매 요청</h2>
            <div className="space-y-2">
              {pendingOrders.map((order) => (
                <Card key={order.cart_id} className="border-0 shadow-md">
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge
                        className={`text-xs border-0 ${
                          order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {order.status === 'pending' ? '⏳ 승인 대기' : '❌ 거절됨'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(order.created_at).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="text-xs space-y-0.5">
                      {order.items.map((item, i) => (
                        <p key={i} className="text-muted-foreground">
                          {item.name} × {item.quantity}
                        </p>
                      ))}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">
                        합계: <span className="font-bold text-blue-600">{order.total}</span> 달란트
                      </span>
                      {order.status === 'pending' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-red-500"
                          onClick={() => cancelPendingOrder(order.cart_id)}
                        >
                          취소
                        </Button>
                      )}
                    </div>
                    {order.status === 'rejected' && order.note && (
                      <p className="text-xs text-red-600 bg-red-50 p-2 rounded">사유: {order.note}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Fixed bottom checkout bar */}
      {items.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.1)] safe-bottom">
          <div className="max-w-lg mx-auto space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                총 {items.reduce((s, i) => s + i.quantity, 0)}개
              </span>
              <span className="font-bold text-lg">
                <span className={canAfford ? 'text-blue-600' : 'text-red-500'}>{total.toLocaleString()}</span> 달란트
              </span>
            </div>
            {!canAfford && (
              <p className="text-xs text-red-500 text-center">달란트 부족 ({total - balance}만큼 더 필요)</p>
            )}
            <Button
              className="w-full h-12 gradient-primary border-0 font-semibold"
              onClick={submitOrder}
              disabled={loading || !canAfford}
            >
              {loading ? '요청 중...' : '✅ 선생님께 구매 요청'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
