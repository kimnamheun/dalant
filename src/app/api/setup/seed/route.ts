import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  const body = await request.json()
  const { setupKey } = body

  if (setupKey !== 'dalant-setup-2026') {
    return NextResponse.json({ error: '잘못된 설정 키입니다.' }, { status: 403 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  try {
    // 1. Create departments
    const { data: depts, error: deptError } = await supabase
      .from('departments')
      .insert([
        { name: '유치부', sort_order: 0 },
        { name: '초등부', sort_order: 1 },
        { name: '중등부', sort_order: 2 },
      ])
      .select()

    if (deptError) throw deptError

    // 2. Create classes for each department
    const classData = []
    if (depts) {
      const classNames: Record<string, string[]> = {
        '유치부': ['사랑반', '믿음반'],
        '초등부': ['1반', '2반'],
        '중등부': ['은혜반', '소망반'],
      }

      for (const dept of depts) {
        const names = classNames[dept.name] || ['1반', '2반']
        for (let i = 0; i < names.length; i++) {
          classData.push({
            department_id: dept.id,
            name: names[i],
            sort_order: i,
          })
        }
      }
    }

    const { error: classError } = await supabase.from('classes').insert(classData)
    if (classError) throw classError

    // 3. Create event
    const { data: event, error: eventError } = await supabase
      .from('events')
      .insert({
        name: '2026 상반기 달란트 잔치',
        status: 'active',
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single()

    if (eventError) throw eventError

    // 4. Create products
    const products = [
      { event_id: event.id, name: '연필세트', category: 'supply', price: 5, stock: 20, sort_order: 0 },
      { event_id: event.id, name: '공책', category: 'supply', price: 3, stock: 30, sort_order: 1 },
      { event_id: event.id, name: '떡볶이', category: 'food', price: 10, stock: 15, sort_order: 2 },
      { event_id: event.id, name: '핫도그', category: 'food', price: 8, stock: 20, sort_order: 3 },
      { event_id: event.id, name: '솜사탕', category: 'food', price: 5, stock: 25, sort_order: 4 },
      { event_id: event.id, name: '레고미니', category: 'toy', price: 15, stock: 10, sort_order: 5 },
      { event_id: event.id, name: '슬라임', category: 'toy', price: 7, stock: 20, sort_order: 6 },
      { event_id: event.id, name: '스티커북', category: 'etc', price: 4, stock: 30, sort_order: 7 },
    ]

    const { error: productError } = await supabase.from('event_products').insert(products)
    if (productError) throw productError

    return NextResponse.json({
      message: '샘플 데이터가 생성되었습니다.',
      summary: {
        departments: depts?.length || 0,
        classes: classData.length,
        products: products.length,
        event: event.name,
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || '데이터 생성 실패' }, { status: 500 })
  }
}
