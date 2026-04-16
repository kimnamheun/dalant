'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

interface NavHeaderProps {
  title: string
  userName?: string
}

export function NavHeader({ title, userName }: NavHeaderProps) {
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-50 bg-white border-b px-4 py-3 flex items-center justify-between">
      <h1 className="text-lg font-bold">{title}</h1>
      <div className="flex items-center gap-3">
        {userName && <span className="text-sm text-muted-foreground">{userName}</span>}
        <Button variant="outline" size="sm" onClick={handleSignOut}>
          로그아웃
        </Button>
      </div>
    </header>
  )
}
