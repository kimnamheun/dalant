'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { NavHeader } from '@/components/nav-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

const categoryLabels: Record<string, string> = {
  supply: '학용품',
  food: '음식',
  toy: '장난감',
  etc: '기타',
}

export default function PurchasePage() {
  const router = useRouter()
  const supabase = createClient()
  const [teacherName, setTeacherName] = useState('')
  const [teacherId, setTeacherId] = useState('')
  const [students, setStudents] = useState<Record<string, any>[]>([])
  const [balances, setBalances] = useState<Record<string, number>>({})
  const [products, setProducts] = useState<Record<string, any>[]>([])
  const [activeEvent, setActiveEvent] = useState<Record<string, any> | null>(null)
  const [selectedStudent, setSelectedStudent] = useState('')
  const [cart, setCart] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/login')

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (!profile || !['teacher', 'admin'].includes(profile.role)) return router.push('/')
      setTeacherName(profile.name)
      setTeacherId(profile.id)

      // 활성 이벤트
      const { data: event } = await supabase
        .from('events')
        .select('*')
        .eq('status', 'active')
        .single()

      if (event) {
        setActiveEvent(event)
        const { data: prods } = await supabase
          .from('event_products')
          .select('*')
          .eq('event_id', event.id)
          .order('sort_order')
        setProducts(prods || [])
      }

      // 학생 목록 (교사면 자기 반, 관리자면 전체)
      let query = supabase.from('profiles').select('*').eq('role', 'student').order('name')
      if (profile.role === 'teacher' && profile.class_id) {
        query = query.eq('class_id', profile.class_id)
      }
      const { data: studentList } = await query
      setStudents(studentList || [])

      // 잔액 계산
      if (studentList && studentList.length > 0) {
        const ids = studentList.map((s) => s.id)
        const { data: txns } = await supabase
          .from('talent_transactions')
          .select('student_id, amount')
          .in('student_id', ids)

        if (txns) {
          const bals = txns.reduce((acc: Record<string, number>, t) => {
            acc[t.student_id] = (acc[t.student_id] || 0) + t.amount
            return acc
          }, {})
          setBalances(bals)
        }
      }
    }
    load()
  }, [])

  function addToCart(productId: string) {
    setCart((prev) => ({ ...prev, [productId]: (prev[productId] || 0) + 1 }))
  }

  function removeFromCart(productId: string) {
    setCart((prev) => {
      const next = { ...prev }
      if (next[productId] > 1) next[productId]--
      else delete next[productId]
      return next
    })
  }

  const totalCost = Object.entries(cart).reduce((sum, [pid, qty]) => {
    const product = products.find((p) => p.id === pid)
    return sum + (product?.price || 0) * qty
  }, 0)

  const studentBalance = balances[selectedStudent] || 0

  async function handlePurchase() {
    if (!selectedStudent) return alert('학생을 선택하세요.')
    if (Object.keys(cart).length === 0) return alert('상품을 선택하세요.')
    if (totalCost > studentBalance) return alert('달란트가 부족합니다.')

    setLoading(true)

    // 구매 내역 저장 + 달란트 차감
    const purchasePromises = Object.entries(cart).map(([productId, quantity]) => {
      const product = products.find((p) => p.id === productId)
      return supabase.from('purchases').insert({
        event_id: activeEvent!.id,
        student_id: selectedStudent,
        product_id: productId,
        quantity,
        total_price: (product?.price || 0) * quantity,
      })
    })

    // 달란트 차감 트랜잭션
    const itemNames = Object.entries(cart)
      .map(([pid, qty]) => {
        const product = products.find((p) => p.id === pid)
        return `${product?.name}x${qty}`
      })
      .join(', ')

    const talentPromise = supabase.from('talent_transactions').insert({
      student_id: selectedStudent,
      amount: -totalCost,
      type: 'purchase',
      description: `달란트 잔치 구매: ${itemNames}`,
      event_id: activeEvent!.id,
      granted_by: teacherId,
    })

    // 재고 차감
    const stockPromises = Object.entries(cart).map(([productId, quantity]) => {
      const product = products.find((p) => p.id === productId)
      return supabase
        .from('event_products')
        .update({ stock: Math.max(0, (product?.stock || 0) - quantity) })
        .eq('id', productId)
    })

    await Promise.all([...purchasePromises, talentPromise, ...stockPromises])

    const studentName = students.find((s) => s.id === selectedStudent)?.name
    alert(`${studentName}: ${itemNames} 구매 완료! (${totalCost} 달란트 차감)`)

    // 상태 초기화
    setCart({})
    setBalances((prev) => ({
      ...prev,
      [selectedStudent]: (prev[selectedStudent] || 0) - totalCost,
    }))

    // 상품 재고 갱신
    setProducts((prev) =>
      prev.map((p) => {
        if (cart[p.id]) {
          return { ...p, stock: Math.max(0, p.stock - cart[p.id]) }
        }
        return p
      })
    )

    setLoading(false)
  }

  if (!activeEvent) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavHeader title="구매 처리" userName={teacherName} />
        <main className="p-4 max-w-lg mx-auto">
          <Link href="/teacher" className="text-sm text-blue-500">&larr; 돌아가기</Link>
          <div className="text-center py-12">
            <p className="text-muted-foreground">현재 진행 중인 달란트 잔치가 없습니다.</p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NavHeader title="구매 처리" userName={teacherName} />

      <main className="p-4 max-w-lg mx-auto space-y-4 pb-32">
        <Link href="/teacher" className="text-sm text-blue-500">&larr; 돌아가기</Link>

        {/* 학생 선택 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">학생 선택</CardTitle>
          </CardHeader>
          <CardContent>
            <select
              className="w-full p-2 border rounded-md text-sm"
              value={selectedStudent}
              onChange={(e) => setSelectedStudent(e.target.value)}
            >
              <option value="">학생을 선택하세요</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.grade}) - {(balances[s.id] || 0).toLocaleString()} 달란트
                </option>
              ))}
            </select>
            {selectedStudent && (
              <p className="mt-2 text-sm">
                잔액: <span className="text-blue-600 font-bold text-lg">{studentBalance.toLocaleString()}</span> 달란트
              </p>
            )}
          </CardContent>
        </Card>

        {/* 상품 목록 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">상품 선택</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {products.map((p) => (
                <div key={p.id} className={`flex items-center justify-between p-2 border rounded-lg ${p.stock <= 0 ? 'opacity-40' : ''}`}>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">{categoryLabels[p.category]}</Badge>
                      <span className="text-sm font-medium">{p.name}</span>
                    </div>
                    <div className="flex gap-2 mt-1 text-xs text-muted-foreground">
                      <span className="text-blue-600 font-bold">{p.price} 달란트</span>
                      <span>재고: {p.stock}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {cart[p.id] ? (
                      <>
                        <Button size="sm" variant="outline" onClick={() => removeFromCart(p.id)}>-</Button>
                        <span className="w-6 text-center text-sm font-bold">{cart[p.id]}</span>
                        <Button size="sm" variant="outline" onClick={() => addToCart(p.id)} disabled={cart[p.id] >= p.stock}>+</Button>
                      </>
                    ) : (
                      <Button size="sm" onClick={() => addToCart(p.id)} disabled={p.stock <= 0}>
                        담기
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>

      {/* 하단 결제 바 */}
      {Object.keys(cart).length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 shadow-lg">
          <div className="max-w-lg mx-auto">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">
                {Object.values(cart).reduce((a, b) => a + b, 0)}개 상품
              </span>
              <span className="font-bold text-lg">
                합계: <span className={totalCost > studentBalance ? 'text-red-500' : 'text-blue-600'}>
                  {totalCost.toLocaleString()}
                </span> 달란트
              </span>
            </div>
            {totalCost > studentBalance && selectedStudent && (
              <p className="text-xs text-red-500 mb-2">달란트가 부족합니다 (잔액: {studentBalance})</p>
            )}
            <Button
              className="w-full"
              onClick={handlePurchase}
              disabled={loading || !selectedStudent || totalCost > studentBalance}
            >
              {loading ? '처리 중...' : '구매 확인'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
