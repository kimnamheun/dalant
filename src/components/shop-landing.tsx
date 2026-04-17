'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import Link from 'next/link'

interface Product {
  id: string
  name: string
  category: string
  price: number
  stock: number
  image_url: string | null
}

interface Event {
  id: string
  name: string
  status: string
}

interface Profile {
  id: string
  name: string
  role: 'admin' | 'teacher' | 'student'
}

interface ShopLandingProps {
  event: Event | null
  products: Product[]
  profile: Profile | null
  balance: number
}

const categoryLabels: Record<string, string> = {
  supply: '학용품',
  food: '음식',
  toy: '장난감',
  etc: '기타',
}

const categoryColors: Record<string, string> = {
  supply: 'bg-blue-100 text-blue-700',
  food: 'bg-orange-100 text-orange-700',
  toy: 'bg-purple-100 text-purple-700',
  etc: 'bg-gray-100 text-gray-700',
}

export function ShopLanding({ event, products, profile, balance }: ShopLandingProps) {
  const router = useRouter()
  const supabase = createClient()
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [filterCategory, setFilterCategory] = useState<string>('')

  const filtered = filterCategory
    ? products.filter((p) => p.category === filterCategory)
    : products

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.refresh()
  }

  function handleProductClick(p: Product) {
    // Not logged in → go to login
    if (!profile) {
      router.push('/login')
      return
    }
    // Logged in → show purchase intent dialog
    setSelectedProduct(p)
  }

  function goToDashboard() {
    if (profile?.role === 'admin') router.push('/admin')
    else if (profile?.role === 'teacher') router.push('/teacher')
    else router.push('/student')
  }

  const canAfford = selectedProduct && profile?.role === 'student' && balance >= selectedProduct.price

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-indigo-50">
      {/* Top Nav */}
      <header className="sticky top-0 z-50 glass border-b px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center text-white font-bold text-sm">T</div>
            <h1 className="text-base font-bold tracking-tight">달란트 잔치</h1>
          </div>
          <div className="flex items-center gap-2">
            {profile ? (
              <>
                <div className="text-right hidden sm:block">
                  <p className="text-xs text-muted-foreground">{profile.name}</p>
                  {profile.role === 'student' && (
                    <p className="text-sm font-bold text-blue-600">{balance.toLocaleString()} 달란트</p>
                  )}
                </div>
                <Button size="sm" variant="outline" onClick={goToDashboard}>
                  내 페이지
                </Button>
                <Button size="sm" variant="ghost" onClick={handleSignOut} className="text-muted-foreground">
                  로그아웃
                </Button>
              </>
            ) : (
              <Link href="/login">
                <Button size="sm" className="gradient-primary border-0">로그인</Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="p-4 max-w-4xl mx-auto space-y-4 animate-fade-in">
        {/* Hero / Event banner */}
        {event ? (
          <Card className="border-0 shadow-xl overflow-hidden">
            <div className="gradient-gold text-white p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl">🎉</span>
                    <Badge className="bg-white/20 text-white border-0 text-xs">진행 중</Badge>
                  </div>
                  <h2 className="text-xl font-extrabold tracking-tight">{event.name}</h2>
                  <p className="text-sm opacity-90 mt-1">상품 {products.length}개 준비됨</p>
                </div>
                {profile?.role === 'student' && (
                  <div className="bg-white/20 backdrop-blur rounded-xl px-3 py-2 text-right shrink-0">
                    <p className="text-xs opacity-80">내 달란트</p>
                    <p className="text-lg font-bold">{balance.toLocaleString()}</p>
                  </div>
                )}
              </div>
            </div>
          </Card>
        ) : (
          <Card className="border-0 shadow-md">
            <CardContent className="p-6 text-center">
              <p className="text-3xl mb-2">🕊️</p>
              <p className="font-semibold">현재 진행 중인 달란트 잔치가 없습니다</p>
              <p className="text-xs text-muted-foreground mt-1">다음 잔치를 기대해주세요!</p>
            </CardContent>
          </Card>
        )}

        {/* Category filter */}
        {products.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            <button
              onClick={() => setFilterCategory('')}
              className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                filterCategory === '' ? 'bg-blue-500 text-white shadow-md' : 'bg-white text-gray-700 border'
              }`}
            >
              전체 ({products.length})
            </button>
            {Object.entries(categoryLabels).map(([k, v]) => {
              const count = products.filter((p) => p.category === k).length
              if (count === 0) return null
              return (
                <button
                  key={k}
                  onClick={() => setFilterCategory(k)}
                  className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                    filterCategory === k ? 'bg-blue-500 text-white shadow-md' : 'bg-white text-gray-700 border'
                  }`}
                >
                  {v} ({count})
                </button>
              )
            })}
          </div>
        )}

        {/* Product grid */}
        {filtered.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {filtered.map((p) => (
              <button
                key={p.id}
                onClick={() => handleProductClick(p)}
                disabled={p.stock <= 0}
                className="text-left disabled:opacity-50"
              >
                <Card className="border-0 shadow-md card-hover overflow-hidden h-full">
                  <div className="aspect-square bg-gray-100 relative">
                    {p.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-5xl text-gray-300">📦</div>
                    )}
                    <Badge className={`absolute top-2 left-2 text-xs border-0 ${categoryColors[p.category]}`}>
                      {categoryLabels[p.category]}
                    </Badge>
                    {p.stock <= 0 && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <Badge variant="destructive">품절</Badge>
                      </div>
                    )}
                  </div>
                  <CardContent className="p-3">
                    <p className="font-semibold text-sm truncate">{p.name}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-blue-600 font-extrabold">{p.price}</span>
                      <span className="text-xs text-muted-foreground">재고 {p.stock}</span>
                    </div>
                  </CardContent>
                </Card>
              </button>
            ))}
          </div>
        ) : products.length > 0 ? (
          <Card className="border-0 shadow-md">
            <CardContent className="text-center py-8">
              <p className="text-sm text-muted-foreground">이 카테고리에 상품이 없습니다</p>
            </CardContent>
          </Card>
        ) : null}

        <div className="text-center py-4">
          <p className="text-xs text-muted-foreground">
            상품을 클릭하면 구매 안내가 표시됩니다
          </p>
        </div>
      </main>

      {/* Product detail / purchase intent dialog */}
      <Dialog open={!!selectedProduct} onOpenChange={(open) => !open && setSelectedProduct(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedProduct?.name}</DialogTitle>
          </DialogHeader>
          {selectedProduct && (
            <div className="space-y-4">
              {selectedProduct.image_url && (
                <div className="w-full aspect-square max-w-[240px] mx-auto bg-gray-100 rounded-lg overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={selectedProduct.image_url} alt={selectedProduct.name} className="w-full h-full object-cover" />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">가격</p>
                  <p className="text-xl font-bold text-blue-600">{selectedProduct.price}</p>
                  <p className="text-xs text-muted-foreground">달란트</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">재고</p>
                  <p className="text-xl font-bold">{selectedProduct.stock}</p>
                  <p className="text-xs text-muted-foreground">개</p>
                </div>
              </div>

              {profile?.role === 'student' && (
                <div className={`rounded-lg p-3 ${canAfford ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                  <p className="text-xs text-muted-foreground">내 달란트</p>
                  <p className={`text-lg font-bold ${canAfford ? 'text-green-600' : 'text-red-500'}`}>
                    {balance.toLocaleString()} 달란트
                  </p>
                  {canAfford ? (
                    <p className="text-xs text-green-700 mt-1">
                      ✓ 구매 가능합니다. <strong>선생님께 구매를 요청하세요.</strong>
                    </p>
                  ) : (
                    <p className="text-xs text-red-600 mt-1">
                      달란트가 부족합니다 ({selectedProduct.price - balance} 부족)
                    </p>
                  )}
                </div>
              )}

              {(profile?.role === 'teacher' || profile?.role === 'admin') && (
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-sm text-blue-700">
                    학생의 구매를 처리하려면 구매 처리 페이지로 이동하세요.
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setSelectedProduct(null)}>
                  닫기
                </Button>
                {(profile?.role === 'teacher' || profile?.role === 'admin') && (
                  <Button
                    className="flex-1 gradient-primary border-0"
                    onClick={() => router.push('/teacher/purchase')}
                  >
                    구매 처리하기
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
