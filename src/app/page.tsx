export const dynamic = 'force-dynamic'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ShopLanding } from '@/components/shop-landing'

export default async function Home() {
  const supabase = createServerSupabaseClient()

  // Fetch current user (optional)
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch active event (public)
  const { data: event } = await supabase
    .from('events')
    .select('id, name, status')
    .eq('status', 'active')
    .maybeSingle()

  // Fetch products for active event
  let products: Array<{
    id: string
    name: string
    category: string
    price: number
    stock: number
    image_url: string | null
  }> = []

  if (event) {
    const { data } = await supabase
      .from('event_products')
      .select('id, name, category, price, stock, image_url')
      .eq('event_id', event.id)
      .order('sort_order')
    products = data || []
  }

  // If user is logged in, fetch profile + balance
  type ProfileShape = { id: string; name: string; role: 'admin' | 'teacher' | 'student' }
  let profile: ProfileShape | null = null
  let balance = 0

  if (user) {
    const { data: p } = await supabase
      .from('profiles')
      .select('id, name, role')
      .eq('id', user.id)
      .maybeSingle()

    if (p) {
      profile = p as unknown as ProfileShape

      if (profile.role === 'student') {
        const { data: txns } = await supabase
          .from('talent_transactions')
          .select('amount')
          .eq('student_id', user.id)
        balance = (txns || []).reduce((sum, t) => sum + ((t as { amount: number }).amount || 0), 0)
      }
    }
  }

  return (
    <ShopLanding
      event={event}
      products={products}
      profile={profile}
      balance={balance}
    />
  )
}
