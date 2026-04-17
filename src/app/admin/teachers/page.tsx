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

type TeacherRow = {
  id: string
  name: string
  department_id: string | null
  class_id: string | null
  studentCount: number
}

export default function AdminTeachersPage() {
  const router = useRouter()
  const supabase = createClient()

  const [teachers, setTeachers] = useState<TeacherRow[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const [addOpen, setAddOpen] = useState(false)
  const [addForm, setAddForm] = useState({
    name: '', email: '', password: '', department_id: '', class_id: '',
  })

  const [editOpen, setEditOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<TeacherRow | null>(null)
  const [editForm, setEditForm] = useState({
    name: '', department_id: '', class_id: '',
  })

  const loadData = useCallback(async () => {
    const [{ data: teachersData }, { data: deptsData }, { data: classesData }, { data: studentsData }] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, name, department_id, class_id')
        .eq('role', 'teacher')
        .order('name'),
      supabase.from('departments').select('*').order('sort_order'),
      supabase.from('classes').select('*').order('sort_order'),
      supabase.from('profiles').select('class_id').eq('role', 'student'),
    ])

    const countByClass: Record<string, number> = {}
    for (const s of studentsData || []) {
      if (s.class_id) countByClass[s.class_id] = (countByClass[s.class_id] || 0) + 1
    }

    const enriched = (teachersData || []).map((t) => ({
      ...t,
      studentCount: t.class_id ? (countByClass[t.class_id] || 0) : 0,
    })) as TeacherRow[]

    setTeachers(enriched)
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

  const filtered = teachers.filter((t) =>
    !searchQuery || t.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  function deptName(id: string | null) {
    return departments.find((d) => d.id === id)?.name || '부서 미배정'
  }

  function className(id: string | null) {
    return classes.find((c) => c.id === id)?.name || '반 미배정'
  }

  async function addTeacher() {
    if (!addForm.name || !addForm.email || !addForm.password) return alert('이름, 이메일, 비밀번호를 입력하세요.')
    if (addForm.password.length < 6) return alert('비밀번호는 6자리 이상이어야 합니다.')
    setLoading(true)

    const createRes = await fetch('/api/admin/create-teacher', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: addForm.name,
        email: addForm.email,
        password: addForm.password,
      }),
    })
    const createResult = await createRes.json()

    if (createResult.error) {
      alert('교사 추가 실패: ' + createResult.error)
      setLoading(false)
      return
    }

    const newTeacherId = createResult.data?.userId || createResult.data?.user?.id

    if (newTeacherId && (addForm.department_id || addForm.class_id)) {
      await fetch('/api/admin/assign-teacher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherId: newTeacherId,
          department_id: addForm.department_id || null,
          class_id: addForm.class_id || null,
        }),
      })
    }

    setAddForm({ name: '', email: '', password: '', department_id: '', class_id: '' })
    setAddOpen(false)
    loadData()
    setLoading(false)
  }

  function openEdit(t: TeacherRow) {
    setEditTarget(t)
    setEditForm({
      name: t.name,
      department_id: t.department_id || '',
      class_id: t.class_id || '',
    })
    setEditOpen(true)
  }

  async function saveEdit() {
    if (!editTarget) return
    if (!editForm.name) return alert('이름을 입력하세요.')
    setLoading(true)

    const res = await fetch('/api/admin/assign-teacher', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        teacherId: editTarget.id,
        name: editForm.name,
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

  async function deleteTeacher(t: TeacherRow) {
    if (!confirm(`교사 "${t.name}"을(를) 삭제하시겠습니까?\n담당 반의 teacher_id가 초기화됩니다.`)) return

    const res = await fetch('/api/admin/delete-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: t.id }),
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
      <NavHeader title="교사 관리" backHref="/admin" />

      <main className="p-4 max-w-3xl mx-auto space-y-4 animate-fade-in">
        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex gap-2">
              <Input
                placeholder="이름 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
              />
              <Dialog open={addOpen} onOpenChange={setAddOpen}>
                <DialogTrigger asChild>
                  <Button className="gradient-primary border-0">+ 교사 추가</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>새 교사 추가</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    <div>
                      <Label>이름 *</Label>
                      <Input value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} />
                    </div>
                    <div>
                      <Label>이메일 *</Label>
                      <Input type="email" value={addForm.email} onChange={(e) => setAddForm({ ...addForm, email: e.target.value })} placeholder="teacher@example.com" />
                    </div>
                    <div>
                      <Label>비밀번호 * (6자리 이상)</Label>
                      <Input type="password" value={addForm.password} onChange={(e) => setAddForm({ ...addForm, password: e.target.value })} />
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
                        <Label>담당 반</Label>
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
                    <Button onClick={addTeacher} disabled={loading} className="w-full gradient-primary border-0">
                      {loading ? '추가 중...' : '교사 추가'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              교사 목록 ({filtered.length} / {teachers.length}명)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {filtered.length > 0 ? (
              <div className="divide-y">
                {filtered.map((t) => (
                  <div key={t.id} className="flex items-center gap-3 p-4">
                    <div className="w-10 h-10 rounded-full gradient-green text-white flex items-center justify-center font-bold shrink-0">
                      {t.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm">{t.name}</p>
                        <Badge variant="outline" className="text-xs">교사</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {deptName(t.department_id)} · {className(t.class_id)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-green-600">{t.studentCount}</p>
                      <p className="text-xs text-muted-foreground">학생</p>
                    </div>
                    <div className="flex flex-col gap-1">
                      <Button size="sm" variant="outline" onClick={() => openEdit(t)} className="h-8 px-2 text-xs">
                        편집
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => deleteTeacher(t)} className="h-8 px-2 text-xs text-red-500 hover:text-red-700 hover:bg-red-50">
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
                  {teachers.length === 0 ? '등록된 교사가 없습니다.' : '검색 결과가 없습니다.'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>교사 정보 수정</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>이름 *</Label>
                <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
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
                  <Label>담당 반</Label>
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
              <p className="text-xs text-muted-foreground">
                담당 반 변경 시 기존 반의 교사 정보는 자동으로 해제됩니다.
              </p>
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
