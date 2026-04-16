export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NavHeader } from '@/components/nav-header'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

const categoryLabels: Record<string, string> = {
  supply: '학용품',
  food: '음식',
  toy: '장난감',
  etc: '기타',
}

export default async function StudentEvent() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('name, role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'student') redirect('/')

  // 활성 이벤트 조회
  const { data: event } = await supabase
    .from('events')
    .select('*')
    .eq('status', 'active')
    .single()

  let products: Record<string, any>[] = []
  if (event) {
    const { data } = await supabase
      .from('event_products')
      .select('*')
      .eq('event_id', event.id)
      .order('sort_order')

    products = data || []
  }

  // 잔액 조회
  const { data: transactions } = await supabase
    .from('talent_transactions')
    .select('amount')
    .eq('student_id', user.id)

  const balance = transactions?.reduce((sum, t) => sum + t.amount, 0) ?? 0

  return (
    <div className="min-h-screen bg-gray-50">
      <NavHeader title="달란트 잔치" userName={profile.name} />

      <main className="p-4 max-w-lg mx-auto space-y-4">
        <Link href="/student" className="text-sm text-blue-500">&larr; 돌아가기</Link>

        {event ? (
          <>
            <div className="text-center py-2">
              <h2 className="text-xl font-bold">{event.name}</h2>
              <p className="text-sm text-muted-foreground mt-1">
                내 잔액: <span className="text-blue-600 font-bold text-lg">{balance.toLocaleString()}</span> 달란트
              </p>
            </div>

            {/* 카테고리별 상품 목록 */}
            {['supply', 'food', 'toy', 'etc'].map((category) => {
              const categoryProducts = products.filter((p) => p.category === category)
              if (categoryProducts.length === 0) return null

              return (
                <div key={category}>
                  <h3 className="text-sm font-bold text-muted-foreground mb-2">
                    {categoryLabels[category]}
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {categoryProducts.map((product) => (
                      <Card key={product.id} className={product.stock <= 0 ? 'opacity-50' : ''}>
                        <CardContent className="p-3">
                          {product.image_url && (
                            <div className="w-full h-24 bg-gray-100 rounded mb-2 overflow-hidden">
                              <img
                                src={product.image_url}
                                alt={product.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          <p className="text-sm font-medium truncate">{product.name}</p>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-blue-600 font-bold">{product.price} 달란트</span>
                            <Badge variant={product.stock > 0 ? 'outline' : 'destructive'} className="text-xs">
                              {product.stock > 0 ? `${product.stock}개` : '품절'}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )
            })}
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-lg font-medium text-muted-foreground">
              현재 진행 중인 달란트 잔치가 없습니다.
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
