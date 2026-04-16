'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { NavHeader } from '@/components/nav-header'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import Link from 'next/link'
import type { Event, EventProduct, ProductCategory } from '@/types/database'

const categoryLabels: Record<string, string> = {
  supply: '학용품',
  food: '음식',
  toy: '장난감',
  etc: '기타',
}

export default function EventProductsPage() {
  const router = useRouter()
  const params = useParams()
  const eventId = params.id as string
  const supabase = createClient()

  const [event, setEvent] = useState<Event | null>(null)
  const [products, setProducts] = useState<EventProduct[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '',
    category: 'etc' as ProductCategory,
    price: 0,
    stock: 0,
    image_url: '',
  })

  async function loadData() {
    const [{ data: eventData }, { data: productsData }] = await Promise.all([
      supabase.from('events').select('*').eq('id', eventId).single(),
      supabase.from('event_products').select('*').eq('event_id', eventId).order('sort_order'),
    ])

    setEvent(eventData)
    setProducts(productsData || [])
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

  async function addProduct() {
    if (!form.name || form.price <= 0) return alert('이름과 가격을 입력하세요.')
    setLoading(true)

    const { error } = await supabase.from('event_products').insert({
      event_id: eventId,
      name: form.name,
      category: form.category,
      price: form.price,
      stock: form.stock,
      image_url: form.image_url || null,
      sort_order: products.length,
    })

    if (error) {
      alert('상품 추가 실패')
    } else {
      setForm({ name: '', category: 'etc', price: 0, stock: 0, image_url: '' })
      setDialogOpen(false)
      loadData()
    }
    setLoading(false)
  }

  async function deleteProduct(id: string) {
    if (!confirm('이 상품을 삭제하시겠습니까?')) return
    await supabase.from('event_products').delete().eq('id', id)
    loadData()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NavHeader title="상품 관리" />

      <main className="p-4 max-w-2xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <Link href="/admin/events" className="text-sm text-blue-500">&larr; 돌아가기</Link>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">상품 추가</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>새 상품 추가</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>상품명</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="예: 연필세트" />
                </div>
                <div>
                  <Label>카테고리</Label>
                  <select
                    className="w-full p-2 border rounded-md text-sm"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value as ProductCategory })}
                  >
                    {Object.entries(categoryLabels).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>달란트 가격</Label>
                    <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} min={1} />
                  </div>
                  <div>
                    <Label>재고 수량</Label>
                    <Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })} min={0} />
                  </div>
                </div>
                <div>
                  <Label>이미지 URL (선택)</Label>
                  <Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://..." />
                </div>
                <Button onClick={addProduct} disabled={loading} className="w-full">
                  {loading ? '추가 중...' : '상품 추가'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {event && (
          <div className="text-center py-2">
            <h2 className="text-lg font-bold">{event.name}</h2>
            <p className="text-sm text-muted-foreground">상품 {products.length}개</p>
          </div>
        )}

        {products.length > 0 ? (
          <div className="space-y-2">
            {products.map((p) => (
              <Card key={p.id}>
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {p.image_url && (
                      <div className="w-12 h-12 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                        <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-sm">{p.name}</p>
                      <div className="flex gap-2 items-center mt-1">
                        <Badge variant="outline" className="text-xs">{categoryLabels[p.category]}</Badge>
                        <span className="text-blue-600 font-bold text-sm">{p.price} 달란트</span>
                        <span className="text-xs text-muted-foreground">재고: {p.stock}</span>
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => deleteProduct(p.id)}>
                    삭제
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">상품을 추가하세요.</p>
          </div>
        )}
      </main>
    </div>
  )
}
