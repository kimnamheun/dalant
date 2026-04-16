'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function SetupPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [seedLoading, setSeedLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    setupKey: '',
  })

  async function handleCreateAdmin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const res = await fetch('/api/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const result = await res.json()

    if (result.error) {
      setMessage(result.error)
    } else {
      setMessage('관리자 계정이 생성되었습니다!')
      setStep(2)
    }
    setLoading(false)
  }

  async function handleSeedData() {
    setSeedLoading(true)
    setMessage('')

    const res = await fetch('/api/setup/seed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ setupKey: form.setupKey }),
    })
    const result = await res.json()

    if (result.error) {
      setMessage(result.error)
    } else {
      setMessage('샘플 데이터가 생성되었습니다!')
      setStep(3)
    }
    setSeedLoading(false)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="mb-6 text-center">
        <div className="w-16 h-16 mx-auto mb-3 rounded-2xl gradient-primary flex items-center justify-center shadow-lg shadow-blue-200">
          <span className="text-3xl text-white">T</span>
        </div>
        <h1 className="text-2xl font-extrabold">초기 설정</h1>
        <p className="text-sm text-muted-foreground mt-1">달란트 잔치 시스템을 시작합니다</p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-2 mb-6">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              step >= s ? 'gradient-primary text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              {step > s ? '✓' : s}
            </div>
            {s < 3 && <div className={`w-8 h-0.5 ${step > s ? 'bg-blue-500' : 'bg-gray-200'}`} />}
          </div>
        ))}
      </div>

      <Card className="w-full max-w-sm shadow-xl border-0 animate-fade-in">
        <CardContent className="pt-6">
          {step === 1 && (
            <form onSubmit={handleCreateAdmin} className="space-y-4">
              <CardHeader className="p-0 pb-4">
                <CardTitle className="text-lg">관리자 계정 생성</CardTitle>
                <CardDescription>최초 관리자 계정을 만듭니다</CardDescription>
              </CardHeader>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">이름</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-11" required />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">이메일</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="h-11" required />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">비밀번호</Label>
                <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="h-11" minLength={6} required />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">설정 키</Label>
                <Input value={form.setupKey} onChange={(e) => setForm({ ...form, setupKey: e.target.value })} placeholder="dalant-setup-2026" className="h-11" required />
              </div>
              {message && <p className="text-sm text-red-500 bg-red-50 p-2 rounded-lg">{message}</p>}
              <Button type="submit" className="w-full h-11 font-semibold gradient-primary border-0" disabled={loading}>
                {loading ? '생성 중...' : '관리자 계정 생성'}
              </Button>
            </form>
          )}

          {step === 2 && (
            <div className="space-y-4 text-center">
              <div className="text-4xl mb-2">🎉</div>
              <h3 className="font-bold text-lg">관리자 계정 생성 완료!</h3>
              <p className="text-sm text-muted-foreground">샘플 데이터(부서, 반, 상품)를 추가하시겠습니까?</p>
              {message && <p className="text-sm text-green-600 bg-green-50 p-2 rounded-lg">{message}</p>}
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 h-11" onClick={() => router.push('/login')}>
                  건너뛰기
                </Button>
                <Button className="flex-1 h-11 gradient-primary border-0" onClick={handleSeedData} disabled={seedLoading}>
                  {seedLoading ? '생성 중...' : '샘플 데이터 추가'}
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 text-center">
              <div className="text-4xl mb-2">✅</div>
              <h3 className="font-bold text-lg">설정 완료!</h3>
              <p className="text-sm text-muted-foreground">이제 로그인하여 시스템을 사용하세요.</p>
              <Button className="w-full h-11 font-semibold gradient-primary border-0" onClick={() => router.push('/login')}>
                로그인하기
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
