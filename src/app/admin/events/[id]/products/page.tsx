'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { NavHeader } from '@/components/nav-header'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ImageUploaderV2 } from '@/components/image-uploader-v2'
import type { Event, EventProduct, ProductCategory } from '@/types/database'

const categoryLabels: Record<string, string> = {
  supply: '학용품',
  food: '음식',
  toy: '장난감',
  etc: '기타',
}

const categoryColors: Record<string, string> = {
  supply: 'bg-blue-50 text-blue-700',
  food: 'bg-orange-50 text-orange-700',
  toy: 'bg-purple-50 text-purple-700',
  etc: 'bg-gray-50 text-gray-700',
}

type FormState = {
  name: string
  category: ProductCategory
  price: number
  stock: number
  image_url: string
}

const emptyForm: FormState = {
  name: '',
  category: 'etc',
  price: 0,
  stock: 0,
  image_url: '',
}

export default function EventProductsPage() {
  const router = useRouter()
  const params = useParams()
  const eventId = params.id as string
  const supabase = createClient()

  const [event, setEvent] = useState<Event | null>(null)
  const [products, setProducts] = useState<EventProduct[]>([])
  const [loading, setLoading] = useState(false)

  const [addOpen, setAddOpen] = useState(false)
  const [addForm, setAddForm] = useState<FormState>(emptyForm)

  const [editOpen, setEditOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<EventProduct | null>(null)
  const [editForm, setEditForm] = useState<FormState>(emptyForm)

  const [filterCategory, setFilterCategory] = useState<string>('')

  const loadData = useCallback(async () => {
    const [{ data: eventData }, { data: productsData }] = await Promise.all([
      supabase.from('events').select('*').eq('id', eventId).single(),
      supabase.from('event_products').select('*').eq('event_id', eventId).order('sort_order'),
    ])
    setEvent(eventData)
    setProducts(productsData || [])
  }, [supabase, eventId])

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

  const filtered = filterCategory
    ? products.filter((p) => p.category === filterCategory)
    : products

  async function addProduct() {
    if (!addForm.name || addForm.price <= 0) return alert('이름과 가격을 입력하세요.')
    setLoading(true)

    const { error } = await supabase.from('event_products').insert({
      event_id: eventId,
      name: addForm.name,
      category: addForm.category,
      price: addForm.price,
      stock: addForm.stock,
      image_url: addForm.image_url || null,
      sort_order: products.length,
    })

    if (error) {
      alert('상품 추가 실패: ' + error.message)
    } else {
      setAddForm(emptyForm)
      setAddOpen(false)
      loadData()
    }
    setLoading(false)
  }

  function openEdit(p: EventProduct) {
    setEditTarget(p)
    setEditForm({
      name: p.name,
      category: p.category,
      price: p.price,
      stock: p.stock,
      image_url: p.image_url || '',
    })
    setEditOpen(true)
  }

  async function saveEdit() {
    if (!editTarget) return
    if (!editForm.name || editForm.price <= 0) return alert('이름과 가격을 입력하세요.')
    setLoading(true)

    const { error } = await supabase
      .from('event_products')
      .update({
        name: editForm.name,
        category: editForm.category,
        price: editForm.price,
        stock: editForm.stock,
        image_url: editForm.image_url || null,
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

  async function deleteProduct(p: EventProduct) {
    if (!confirm(`상품 "${p.name}"을(를) 삭제하시겠습니까?`)) return
    const { error } = await supabase.from('event_products').delete().eq('id', p.id)
    if (error) {
      alert('삭제 실패: ' + error.message)
    } else {
      loadData()
    }
  }

  async function duplicateProduct(p: EventProduct) {
    setLoading(true)
    const { error } = await supabase.from('event_products').insert({
      event_id: eventId,
      name: p.name + ' (복사)',
      category: p.category,
      price: p.price,
      stock: p.stock,
      image_url: p.image_url,
      sort_order: products.length,
    })
    if (error) alert('복사 실패: ' + error.message)
    else loadData()
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <NavHeader title="상품 관리" backHref="/admin/events" />

      <main className="p-4 max-w-3xl mx-auto space-y-4 animate-fade-in">
        {event && (
          <Card className="border-0 shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-bold">{event.name}</h2>
                  <p className="text-xs text-muted-foreground mt-1">상품 {products.length}개 등록</p>
                </div>
                <Dialog open={addOpen} onOpenChange={setAddOpen}>
                  <DialogTrigger asChild>
                    <Button className="gradient-primary border-0">+ 상품 추가</Button>
                  </DialogTrigger>
                  <DialogContent className="max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>새 상품 추가</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                      <div>
                        <Label>상품명 *</Label>
                        <Input
                          value={addForm.name}
                          onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                          placeholder="예: 연필세트"
                        />
                      </div>
                      <div>
                        <Label>카테고리</Label>
                        <select
                          className="w-full p-2 border rounded-md text-sm h-10"
                          value={addForm.category}
                          onChange={(e) => setAddForm({ ...addForm, category: e.target.value as ProductCategory })}
                        >
                          {Object.entries(categoryLabels).map(([k, v]) => (
                            <option key={k} value={k}>{v}</option>
                          ))}
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>달란트 가격 *</Label>
                          <Input
                            type="number"
                            inputMode="numeric"
                            value={addForm.price || ''}
                            onChange={(e) => setAddForm({ ...addForm, price: Number(e.target.value) })}
                            min={1}
                          />
                        </div>
                        <div>
                          <Label>재고 수량</Label>
                          <Input
                            type="number"
                            inputMode="numeric"
                            value={addForm.stock || ''}
                            onChange={(e) => setAddForm({ ...addForm, stock: Number(e.target.value) })}
                            min={0}
                          />
                        </div>
                      </div>
                      <div>
                        <Label>상품 이미지</Label>
                        <ImageUploaderV2
                          value={addForm.image_url}
                          onChange={(url) => setAddForm({ ...addForm, image_url: url })}
                          folder={eventId}
                        />
                      </div>
                      <Button onClick={addProduct} disabled={loading} className="w-full gradient-primary border-0">
                        {loading ? '추가 중...' : '상품 추가'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setFilterCategory('')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
              filterCategory === '' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            전체 ({products.length})
          </button>
          {Object.entries(categoryLabels).map(([k, v]) => {
            const count = products.filter((p) => p.category === k).length
            return (
              <button
                key={k}
                onClick={() => setFilterCategory(k)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
                  filterCategory === k ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                {v} ({count})
              </button>
            )
          })}
        </div>

        {filtered.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map((p) => (
              <Card key={p.id} className="border-0 shadow-md overflow-hidden">
                <div className="aspect-square bg-gray-100 relative">
                  {p.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl text-gray-300">
                      📦
                    </div>
                  )}
                  <Badge className={`absolute top-2 left-2 text-xs ${categoryColors[p.category]} border-0`}>
                    {categoryLabels[p.category]}
                  </Badge>
                </div>
                <CardContent className="p-3 space-y-1">
                  <p className="font-semibold text-sm truncate">{p.name}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-blue-600 font-bold text-sm">{p.price} 달란트</span>
                    <span className={`text-xs ${p.stock > 0 ? 'text-muted-foreground' : 'text-red-500 font-semibold'}`}>
                      {p.stock > 0 ? `재고 ${p.stock}` : '품절'}
                    </span>
                  </div>
                  <div className="flex gap-1 pt-1">
                    <Button size="sm" variant="outline" className="flex-1 h-7 text-xs" onClick={() => openEdit(p)}>
                      편집
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={() => duplicateProduct(p)} title="복사">
                      ⧉
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs px-2 text-red-500 hover:bg-red-50" onClick={() => deleteProduct(p)}>
                      ✕
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-0 shadow-md">
            <CardContent className="text-center py-12">
              <p className="text-4xl mb-2">📦</p>
              <p className="text-sm text-muted-foreground">
                {products.length === 0
                  ? '상품을 추가하세요'
                  : `"${categoryLabels[filterCategory]}" 카테고리에 상품이 없습니다`}
              </p>
            </CardContent>
          </Card>
        )}

        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>상품 수정</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>상품명 *</Label>
                <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
              </div>
              <div>
                <Label>카테고리</Label>
                <select
                  className="w-full p-2 border rounded-md text-sm h-10"
                  value={editForm.category}
                  onChange={(e) => setEditForm({ ...editForm, category: e.target.value as ProductCategory })}
                >
                  {Object.entries(categoryLabels).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>달란트 가격 *</Label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={editForm.price || ''}
                    onChange={(e) => setEditForm({ ...editForm, price: Number(e.target.value) })}
                    min={1}
                  />
                </div>
                <div>
                  <Label>재고 수량</Label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={editForm.stock || ''}
                    onChange={(e) => setEditForm({ ...editForm, stock: Number(e.target.value) })}
                    min={0}
                  />
                </div>
              </div>
              <div>
                <Label>상품 이미지</Label>
                <ImageUploaderV2
                  value={editForm.image_url}
                  onChange={(url) => setEditForm({ ...editForm, image_url: url })}
                  folder={eventId}
                />
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
