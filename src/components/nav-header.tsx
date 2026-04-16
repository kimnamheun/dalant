'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

interface NavHeaderProps {
  title: string
  userName?: string
  backHref?: string
}

export function NavHeader({ title, userName, backHref }: NavHeaderProps) {
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-50 glass border-b px-4 py-3 safe-bottom">
      <div className="max-w-2xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          {backHref && (
            <button onClick={() => router.push(backHref)} className="text-muted-foreground hover:text-foreground transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <h1 className="text-lg font-bold tracking-tight">{title}</h1>
        </div>
        <div className="flex items-center gap-3">
          {userName && (
            <span className="text-sm text-muted-foreground hidden sm:block">{userName}</span>
          )}
          <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-muted-foreground hover:text-red-500">
            <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            로그아웃
          </Button>
        </div>
      </div>
    </header>
  )
}
