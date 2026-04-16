'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleEmailLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError('이메일 또는 비밀번호가 올바르지 않습니다.'); setLoading(false); return }
    router.push('/')
    router.refresh()
  }

  async function handlePinLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const formData = new FormData(e.currentTarget)
    const pin = formData.get('pin') as string
    const email = `student${pin}@dalant-app.com`
    const { error } = await supabase.auth.signInWithPassword({ email, password: pin })
    if (error) { setError(`로그인 실패: ${error.message} (${email})`); setLoading(false); return }
    router.push('/')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Logo */}
      <div className="mb-8 text-center animate-fade-in">
        <div className="w-20 h-20 mx-auto mb-4 rounded-2xl gradient-primary flex items-center justify-center shadow-lg shadow-blue-200">
          <span className="text-4xl">T</span>
        </div>
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">달란트 잔치</h1>
        <p className="text-sm text-muted-foreground mt-1">교회 주일학교 달란트 관리</p>
      </div>

      <Card className="w-full max-w-sm shadow-xl shadow-gray-200/50 border-0 animate-fade-in">
        <CardContent className="pt-6">
          <Tabs defaultValue="student" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4 h-11">
              <TabsTrigger value="student" className="text-sm font-medium">학생 로그인</TabsTrigger>
              <TabsTrigger value="staff" className="text-sm font-medium">교사/관리자</TabsTrigger>
            </TabsList>

            <TabsContent value="student">
              <form onSubmit={handlePinLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">이름</Label>
                  <Input id="name" name="name" placeholder="이름을 입력하세요" className="h-12 text-base" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pin" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">PIN 번호</Label>
                  <Input id="pin" name="pin" type="password" inputMode="numeric" pattern="[0-9]*" maxLength={6}
                    placeholder="PIN 번호 입력" className="h-12 text-base tracking-[0.5em] text-center" required />
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
                {error && <p className="text-sm text-red-500 bg-red-50 p-2 rounded-lg">{error}</p>}
                <Button type="submit" className="w-full h-12 text-base font-semibold gradient-primary border-0" disabled={loading}>
                  {loading ? <span className="flex items-center gap-2"><Spinner />로그인 중...</span> : '로그인'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <p className="mt-6 text-xs text-muted-foreground">
        v1.0 &middot; Powered by Next.js + Supabase
      </p>
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
