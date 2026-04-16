'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { NavHeader } from '@/components/nav-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import Link from 'next/link'

export default function AdminTeachersPage() {
  const router = useRouter()
  const supabase = createClient()
  const [teachers, setTeachers] = useState<Record<string, any>[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '' })

  async function loadData() {
    const { data } = await supabase
      .from('profiles')
      .select('*, departments(*), classes(*)')
      .eq('role', 'teacher')
      .order('name')

    setTeachers(data || [])
  }

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
  }, [])

  async function addTeacher() {
    if (!form.name || !form.email || !form.password) return alert('모든 필드를 입력하세요.')
    setLoading(true)

    const res = await fetch('/api/admin/create-teacher', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    const result = await res.json()
    if (result.error) {
      alert('교사 추가 실패: ' + result.error)
    } else {
      setForm({ name: '', email: '', password: '' })
      setDialogOpen(false)
      loadData()
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NavHeader title="교사 관리" />

      <main className="p-4 max-w-2xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <Link href="/admin" className="text-sm text-blue-500">&larr; 돌아가기</Link>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">교사 추가</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>새 교사 추가</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>이름</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div>
                  <Label>이메일</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div>
                  <Label>비밀번호</Label>
                  <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                </div>
                <Button onClick={addTeacher} disabled={loading} className="w-full">
                  {loading ? '추가 중...' : '교사 추가'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">교사 목록 ({teachers.length}명)</CardTitle>
          </CardHeader>
          <CardContent>
            {teachers.length > 0 ? (
              <div className="space-y-2">
                {teachers.map((t) => (
                  <div key={t.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{t.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {t.departments?.name || '미배정'} | {t.classes?.name || '미배정'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">등록된 교사가 없습니다.</p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
