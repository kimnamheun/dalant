'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { NavHeader } from '@/components/nav-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import type { Department, Class } from '@/types/database'

type StudentRow = {
  id: string
  name: string
  grade: string | null
  pin: string | null
  department_id: string | null
  class_id: string | null
  balance: number
}

export default function AdminStudentsPage() {
  const router = useRouter()
  const supabase = createClient()

  const [students, setStudents] = useState<StudentRow[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [loading, setLoading] = useState(false)

  const [searchQuery, setSearchQuery] = useState('')
  const [filterDept, setFilterDept] = useState<string>('')
  const [filterClass, setFilterClass] = useState<string>('')
  const [sortBy, setSortBy] = useState<'name' | 'balance' | 'grade'>('name')

  const [addOpen, setAddOpen] = useState(false)
  const [addForm, setAddForm] = useState({
    name: '', grade: '', pin: '', department_id: '', class_id: '',
  })

  const [editOpen, setEditOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<StudentRow | null>(null)
  const [editForm, setEditForm] = useState({
    name: '', grade: '', pin: '', department_id: '', class_id: '',
  })

  const loadData = useCallback(async () => {
    const [{ data: studentsData }, { data: deptsData }, { data: classesData }] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, name, grade, pin, department_id, class_id')
        .eq('role', 'student')
        .order('name'),
      supabase.from('departments').select('*').order('sort_order'),
      supabase.from('classes').select('*').order('sort_order'),
    ])

    const ids = (studentsData || []).map((s) => s.id)
    let balances: Record<string, number> = {}
    if (ids.length > 0) {
      const { data: txns } = await supabase
        .from('talent_transactions')
        .select('student_id, amount')
        .in('student_id', ids)
      if (txns) {
        balances = txns.reduce((acc: Record<string, number>, t) => {
          acc[t.student_id] = (acc[t.student_id] || 0) + t.amount
          return acc
        }, {})
      }
    }

    const enriched = (studentsData || []).map((s) => ({
      ...s,
      balance: balances[s.id] || 0,
    })) as StudentRow[]

    setStudents(enriched)
    setDepartments(deptsData || [])
    setClasses(classesData || [])
  }, [supabase])

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
  }, [supabase, router, loadData])

  const addFilteredClasses = classes.filter((c) => c.department_id === addForm.department_id)
  const editFilteredClasses = classes.filter((c) => c.department_id === editForm.department_id)
  const filterFilteredClasses = filterDept ? classes.filter((c) => c.department_id === filterDept) : classes

  const filtered = students
    .filter((s) => {
      if (searchQuery && !s.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
      if (filterDept && s.department_id !== filterDept) return false
      if (filterClass && s.class_id !== filterClass) return false
      return true
    })
    .sort((a, b) => {
      if (sortBy === 'balance') return b.balance - a.balance
      if (sortBy === 'grade') return (a.grade || '').localeCompare(b.grade || '')
      return a.name.localeCompare(b.name)
    })

  function deptName(id: string | null) {
    return departments.find((d) => d.id === id)?.name || '미배정'
  }

  function className(id: string | null) {
    return classes.find((c) => c.id === id)?.name || '미배정'
  }

  async function addStudent() {
    if (!addForm.name || !addForm.pin) return alert('이름과 PIN을 입력하세요.')
    if (addForm.pin.length < 6) return alert('PIN은 6자리 이상이어야 합니다.')
    setLoading(true)

    const email = `student${addForm.pin}@dalant-app.com`
    const res = await fetch('/api/admin/create-student', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password: addForm.pin,
        name: addForm.name,
        grade: addForm.grade,
        pin: addForm.pin,
        department_id: addForm.department_id || null,
        class_id: addForm.class_id || null,
      }),
    })
    const result = await res.json()

    if (result.error) {
      alert('학생 추가 실패: ' + (typeof result.error === 'string' ? result.error : JSON.stringify(result.error)))
    } else {
      setAddForm({ name: '', grade: '', pin: '', department_id: '', class_id: '' })
      setAddOpen(false)
      loadData()
    }
    setLoading(false)
  }

  function openEdit(s: StudentRow) {
    setEditTarget(s)
    setEditForm({
      name: s.name,
      grade: s.grade || '',
      pin: s.pin || '',
      department_id: s.department_id || '',
      class_id: s.class_id || '',
    })
    setEditOpen(true)
  }

  async function saveEdit() {
    if (!editTarget) return
    if (!editForm.name) return alert('이름을 입력하세요.')
    setLoading(true)

    const res = await fetch('/api/admin/update-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: editTarget.id,
        name: editForm.name,
        grade: editForm.grade,
        pin: editForm.pin,
        department_id: editForm.department_id || null,
        class_id: editForm.class_id || null,
      }),
    })
    const result = await res.json()

    if (result.error) {
      alert('수정 실패: ' + result.error)
    } else {
      setEditOpen(false)
      loadData()
    }
    setLoading(false)
  }

  async function deleteStudent(s: StudentRow) {
    if (!confirm(`학생 "${s.name}"을(를) 삭제하시겠습니까?\n달란트 내역과 구매 기록도 함께 삭제됩니다.`)) return

    const res = await fetch('/api/admin/delete-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: s.id }),
    })
    const result = await res.json()

    if (result.error) {
      alert('삭제 실패: ' + result.error)
    } else {
      loadData()
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <NavHeader title="학생 관리" backHref="/admin" />

      <main className="p-4 max-w-3xl mx-auto space-y-4 animate-fade-in">
        <Card className="border-0 shadow-md">
          <CardContent className="p-4 space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="이름 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
              />
              <Dialog open={addOpen} onOpenChange={setAddOpen}>
                <DialogTrigger asChild>
                  <Button className="gradient-primary border-0">+ 학생 추가</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>새 학생 추가</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    <div>
                      <Label>이름 *</Label>
                      <Input value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} />
                    </div>
                    <div>
                      <Label>학년</Label>
                      <Input value={addForm.grade} onChange={(e) => setAddForm({ ...addForm, grade: e.target.value })} placeholder="예: 초3" />
                    </div>
                    <div>
                      <Label>PIN 번호 * (6자리)</Label>
                      <Input
                        value={addForm.pin}
                        onChange={(e) => setAddForm({ ...addForm, pin: e.target.value })}
                        placeholder="6자리 숫자"
                        maxLength={6}
                        inputMode="numeric"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label>부서</Label>
                        <select
                          className="w-full p-2 border rounded-md text-sm h-10"
                          value={addForm.department_id}
                          onChange={(e) => setAddForm({ ...addForm, department_id: e.target.value, class_id: '' })}
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
                          className="w-full p-2 border rounded-md text-sm h-10"
                          value={addForm.class_id}
                          onChange={(e) => setAddForm({ ...addForm, class_id: e.target.value })}
                          disabled={!addForm.department_id}
                        >
                          <option value="">선택</option>
                          {addFilteredClasses.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <Button onClick={addStudent} disabled={loading} className="w-full gradient-primary border-0">
                      {loading ? '추가 중...' : '학생 추가'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <select
                className="p-2 border rounded-md text-sm h-10"
                value={filterDept}
                onChange={(e) => { setFilterDept(e.target.value); setFilterClass('') }}
              >
                <option value="">전체 부서</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
              <select
                className="p-2 border rounded-md text-sm h-10"
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
              >
                <option value="">전체 반</option>
                {filterFilteredClasses.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <select
                className="p-2 border rounded-md text-sm h-10"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'name' | 'balance' | 'grade')}
              >
                <option value="name">이름순</option>
                <option value="balance">달란트순</option>
                <option value="grade">학년순</option>
              </select>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              학생 목록 ({filtered.length} / {students.length}명)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {filtered.length > 0 ? (
              <div className="divide-y">
                {filtered.map((s) => (
                  <div key={s.id} className="flex items-center gap-3 p-4">
                    <div className="w-10 h-10 rounded-full gradient-primary text-white flex items-center justify-center font-bold shrink-0">
                      {s.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm truncate">{s.name}</p>
                        {s.grade && <Badge variant="outline" className="text-xs">{s.grade}</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {deptName(s.department_id)} · {className(s.class_id)} · PIN: {s.pin || '-'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-blue-600">{s.balance.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">달란트</p>
                    </div>
                    <div className="flex flex-col gap-1">
                      <Button size="sm" variant="outline" onClick={() => openEdit(s)} className="h-8 px-2 text-xs">
                        편집
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => deleteStudent(s)} className="h-8 px-2 text-xs text-red-500 hover:text-red-700 hover:bg-red-50">
                        삭제
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-3xl mb-2">📭</p>
                <p className="text-sm text-muted-foreground">
                  {students.length === 0 ? '등록된 학생이 없습니다.' : '검색 결과가 없습니다.'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>학생 정보 수정</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>이름 *</Label>
                <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
              </div>
              <div>
                <Label>학년</Label>
                <Input value={editForm.grade} onChange={(e) => setEditForm({ ...editForm, grade: e.target.value })} />
              </div>
              <div>
                <Label>PIN 번호</Label>
                <Input
                  value={editForm.pin}
                  onChange={(e) => setEditForm({ ...editForm, pin: e.target.value })}
                  maxLength={6}
                  inputMode="numeric"
                />
                <p className="text-xs text-muted-foreground mt-1">PIN 변경 시 로그인 비밀번호는 기존 그대로 유지됩니다.</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>부서</Label>
                  <select
                    className="w-full p-2 border rounded-md text-sm h-10"
                    value={editForm.department_id}
                    onChange={(e) => setEditForm({ ...editForm, department_id: e.target.value, class_id: '' })}
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
                    className="w-full p-2 border rounded-md text-sm h-10"
                    value={editForm.class_id}
                    onChange={(e) => setEditForm({ ...editForm, class_id: e.target.value })}
                    disabled={!editForm.department_id}
                  >
                    <option value="">선택</option>
                    {editFilteredClasses.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setEditOpen(false)}>취소</Button>
                <Button onClick={saveEdit} disabled={loading} className="flex-1 gradient-primary border-0">
                  {loading ? '저장 중...' : '저장'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  )
}
