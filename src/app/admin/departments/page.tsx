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
import type { Department, Class, Profile } from '@/types/database'

export default function DepartmentsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [departments, setDepartments] = useState<(Department & { classes: (Class & { teacher: Profile | null })[] })[]>([])
  const [newDeptName, setNewDeptName] = useState('')
  const [newClassName, setNewClassName] = useState('')
  const [selectedDeptId, setSelectedDeptId] = useState('')
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [classDialogOpen, setClassDialogOpen] = useState(false)

  async function loadData() {
    const { data: depts } = await supabase
      .from('departments')
      .select('*')
      .order('sort_order')

    if (!depts) return

    const deptsWithClasses = await Promise.all(
      depts.map(async (dept) => {
        const { data: classes } = await supabase
          .from('classes')
          .select('*, teacher:profiles!classes_teacher_id_fkey(*)')
          .eq('department_id', dept.id)
          .order('sort_order')

        return { ...dept, classes: classes || [] }
      })
    )

    setDepartments(deptsWithClasses as any)
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

  async function addDepartment() {
    if (!newDeptName.trim()) return
    setLoading(true)

    const { error } = await supabase
      .from('departments')
      .insert({ name: newDeptName.trim(), sort_order: departments.length })

    if (error) {
      alert('부서 추가에 실패했습니다.')
    } else {
      setNewDeptName('')
      setDialogOpen(false)
      loadData()
    }
    setLoading(false)
  }

  async function addClass() {
    if (!newClassName.trim() || !selectedDeptId) return
    setLoading(true)

    const dept = departments.find((d) => d.id === selectedDeptId)
    const { error } = await supabase
      .from('classes')
      .insert({
        department_id: selectedDeptId,
        name: newClassName.trim(),
        sort_order: dept?.classes.length || 0,
      })

    if (error) {
      alert('반 추가에 실패했습니다.')
    } else {
      setNewClassName('')
      setClassDialogOpen(false)
      loadData()
    }
    setLoading(false)
  }

  async function deleteDepartment(id: string) {
    if (!confirm('이 부서를 삭제하시겠습니까? 하위 반도 모두 삭제됩니다.')) return

    const { error } = await supabase.from('departments').delete().eq('id', id)
    if (error) alert('삭제에 실패했습니다.')
    else loadData()
  }

  async function deleteClass(id: string) {
    if (!confirm('이 반을 삭제하시겠습니까?')) return

    const { error } = await supabase.from('classes').delete().eq('id', id)
    if (error) alert('삭제에 실패했습니다.')
    else loadData()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NavHeader title="부서/반 관리" />

      <main className="p-4 max-w-2xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <Link href="/admin" className="text-sm text-blue-500">&larr; 돌아가기</Link>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">부서 추가</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>새 부서 추가</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>부서 이름</Label>
                  <Input
                    value={newDeptName}
                    onChange={(e) => setNewDeptName(e.target.value)}
                    placeholder="예: 초등부, 중등부"
                  />
                </div>
                <Button onClick={addDepartment} disabled={loading} className="w-full">
                  {loading ? '추가 중...' : '추가'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {departments.map((dept) => (
          <Card key={dept.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{dept.name}</CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedDeptId(dept.id)
                      setClassDialogOpen(true)
                    }}
                  >
                    반 추가
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteDepartment(dept.id)}
                  >
                    삭제
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {dept.classes.length > 0 ? (
                <div className="space-y-2">
                  {dept.classes.map((cls) => (
                    <div key={cls.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div>
                        <span className="text-sm font-medium">{cls.name}</span>
                        {cls.teacher && (
                          <span className="text-xs text-muted-foreground ml-2">
                            담당: {cls.teacher.name}
                          </span>
                        )}
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => deleteClass(cls.id)}>
                        삭제
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">등록된 반이 없습니다.</p>
              )}
            </CardContent>
          </Card>
        ))}

        {departments.length === 0 && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">부서를 추가하세요.</p>
          </div>
        )}

        {/* 반 추가 다이얼로그 */}
        <Dialog open={classDialogOpen} onOpenChange={setClassDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>새 반 추가</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>반 이름</Label>
                <Input
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  placeholder="예: 1반, 사랑반"
                />
              </div>
              <Button onClick={addClass} disabled={loading} className="w-full">
                {loading ? '추가 중...' : '추가'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  )
}
