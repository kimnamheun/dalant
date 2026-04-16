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
import type { Department, Class } from '@/types/database'

export default function AdminStudentsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [students, setStudents] = useState<Record<string, any>[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [filteredClasses, setFilteredClasses] = useState<Class[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  // 신규 학생 폼
  const [form, setForm] = useState({
    name: '',
    grade: '',
    pin: '',
    department_id: '',
    class_id: '',
  })

  async function loadData() {
    const [{ data: studentsData }, { data: deptsData }, { data: classesData }] = await Promise.all([
      supabase
        .from('profiles')
        .select('*, departments(*), classes(*)')
        .eq('role', 'student')
        .order('name'),
      supabase.from('departments').select('*').order('sort_order'),
      supabase.from('classes').select('*').order('sort_order'),
    ])

    setStudents(studentsData || [])
    setDepartments(deptsData || [])
    setClasses(classesData || [])
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

  useEffect(() => {
    if (form.department_id) {
      setFilteredClasses(classes.filter((c) => c.department_id === form.department_id))
      setForm((prev) => ({ ...prev, class_id: '' }))
    }
  }, [form.department_id, classes])

  async function addStudent() {
    if (!form.name || !form.pin) return alert('이름과 PIN을 입력하세요.')
    setLoading(true)

    // PIN 기반 이메일로 Auth 사용자 생성
    const email = `${form.pin}@dalant.church`
    const res = await fetch('/api/admin/create-student', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password: form.pin,
        name: form.name,
        grade: form.grade,
        pin: form.pin,
        department_id: form.department_id || null,
        class_id: form.class_id || null,
      }),
    })
    const result = await res.json()

    if (result.error) {
      alert('학생 추가에 실패했습니다: ' + (typeof result.error === 'string' ? result.error : JSON.stringify(result.error)))
    } else {
      setForm({ name: '', grade: '', pin: '', department_id: '', class_id: '' })
      setDialogOpen(false)
      loadData()
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NavHeader title="학생 관리" />

      <main className="p-4 max-w-2xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <Link href="/admin" className="text-sm text-blue-500">&larr; 돌아가기</Link>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">학생 추가</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>새 학생 추가</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>이름 *</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div>
                  <Label>학년</Label>
                  <Input value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} placeholder="예: 초3" />
                </div>
                <div>
                  <Label>PIN 번호 * (로그인용)</Label>
                  <Input
                    value={form.pin}
                    onChange={(e) => setForm({ ...form, pin: e.target.value })}
                    placeholder="4~6자리 숫자"
                    maxLength={6}
                  />
                </div>
                <div>
                  <Label>부서</Label>
                  <select
                    className="w-full p-2 border rounded-md text-sm"
                    value={form.department_id}
                    onChange={(e) => setForm({ ...form, department_id: e.target.value })}
                  >
                    <option value="">선택</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>반</Label>
                  <select
                    className="w-full p-2 border rounded-md text-sm"
                    value={form.class_id}
                    onChange={(e) => setForm({ ...form, class_id: e.target.value })}
                    disabled={!form.department_id}
                  >
                    <option value="">선택</option>
                    {filteredClasses.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <Button onClick={addStudent} disabled={loading} className="w-full">
                  {loading ? '추가 중...' : '학생 추가'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">전체 학생 ({students.length}명)</CardTitle>
          </CardHeader>
          <CardContent>
            {students.length > 0 ? (
              <div className="space-y-2">
                {students.map((s) => (
                  <div key={s.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{s.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.departments?.name || '미배정'} | {s.classes?.name || '미배정'} | {s.grade || '-'}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">PIN: {s.pin}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">등록된 학생이 없습니다.</p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
