'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function redirectByRole(userId: string) {
    // Check role from user_metadata (avoids RLS recursion)
    const { data: { user } } = await supabase.auth.getUser()
    const metaRole = user?.user_metadata?.role as string | undefined

    let role = metaRole
    if (!role) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single()
      role = profile?.role
    }

    if (role === 'admin') {
      router.push('/admin')
    } else if (role === 'teacher') {
      router.push('/teacher')
    } else {
      // Student → back to shop landing (they can browse products)
      router.push('/')
    }
    router.refresh()
  }

  async function handleEmailLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error || !data.user) {
      setError('이메일 또는 비밀번호가 올바르지 않습니다.')
      setLoading(false)
      return
    }
    await redirectByRole(data.user.id)
  }

  async function handlePinLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const formData = new FormData(e.currentTarget)
    const pin = formData.get('pin') as string
    const email = `student${pin}@dalant-app.com`
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: pin })
    if (error || !data.user) {
      setError('PIN 번호가 올바르지 않습니다.')
      setLoading(false)
      return
    }
    await redirectByRole(data.user.id)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <Link href="/" className="mb-8 text-center">
        <div className="w-20 h-20 mx-auto mb-4 rounded-2xl gradient-primary flex items-center justify-center shadow-lg shadow-blue-200">
          <span className="text-4xl text-white">T</span>
        </div>
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">달란트 잔치</h1>
        <p className="text-sm text-muted-foreground mt-1">교회 주일학교 달란트 관리</p>
      </Link>

      <Card className="w-full max-w-sm shadow-xl shadow-gray-200/50 border-0 animate-fade-in">
        <CardContent className="pt-6">
          <Tabs defaultValue="student" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4 h-11">
              <TabsTrigger value="student" className="text-sm font-medium">학생</TabsTrigger>
              <TabsTrigger value="staff" className="text-sm font-medium">교사 · 관리자</TabsTrigger>
            </TabsList>

            <TabsContent value="student">
              <form onSubmit={handlePinLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="pin" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">PIN 번호 (6자리)</Label>
                  <Input
                    id="pin"
                    name="pin"
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    minLength={6}
                    placeholder="6자리 PIN 번호"
                    className="h-14 text-xl tracking-[0.5em] text-center"
                    required
                  />
                  <p className="text-xs text-muted-foreground text-center">선생님께 받은 PIN 번호를 입력하세요</p>
                </div>
                {error && <p className="text-sm text-red-500 bg-red-50 p-2 rounded-lg">{error}</p>}
                <Button type="submit" className="w-full h-12 text-base font-semibold gradient-primary border-0" disabled={loading}>
                  {loading ? <span className="flex items-center gap-2"><Spinner />로그인 중...</span> : '로그인'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="staff">
              <form onSubmit={handleEmailLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">이메일</Label>
                  <Input id="email" name="email" type="email" placeholder="이메일을 입력하세요" className="h-12 text-base" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">비밀번호</Label>
                  <Input id="password" name="password" type="password" placeholder="비밀번호 입력" className="h-12 text-base" required />
                </div>
                <p className="text-xs text-muted-foreground text-center bg-blue-50 py-2 px-3 rounded-md">
                  관리자와 교사 모두 같은 곳에서 로그인합니다.<br />
                  계정 종류는 자동으로 인식됩니다.
                </p>
                {error && <p className="text-sm text-red-500 bg-red-50 p-2 rounded-lg">{error}</p>}
                <Button type="submit" className="w-full h-12 text-base font-semibold gradient-primary border-0" disabled={loading}>
                  {loading ? <span className="flex items-center gap-2"><Spinner />로그인 중...</span> : '로그인'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Link href="/" className="mt-6 text-xs text-muted-foreground hover:text-foreground">
        ← 상품 둘러보기로 돌아가기
      </Link>
    </div>
  )
}

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}
