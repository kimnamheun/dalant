'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { NavHeader } from '@/components/nav-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import type { Profile } from '@/types/database'

export default function AttendancePage() {
  const router = useRouter()
  const supabase = createClient()
  const [students, setStudents] = useState<Profile[]>([])
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [talentAmount, setTalentAmount] = useState(5)
  const [description, setDescription] = useState('주일예배 출석')
  const [loading, setLoading] = useState(false)
  const [teacherName, setTeacherName] = useState('')
  const [teacherId, setTeacherId] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/login')

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (!profile || profile.role !== 'teacher') return router.push('/')
      setTeacherName(profile.name)
      setTeacherId(profile.id)

      const { data: studentList } = await supabase
        .from('profiles')
        .select('*')
        .eq('class_id', profile.class_id)
        .eq('role', 'student')
        .order('name')

      setStudents(studentList || [])
    }
    load()
  }, [])

  function toggleStudent(id: string) {
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAll() {
    if (checked.size === students.length) {
      setChecked(new Set())
    } else {
      setChecked(new Set(students.map((s) => s.id)))
    }
  }

  async function handleSubmit() {
    if (checked.size === 0) return alert('출석 체크된 학생이 없습니다.')
    setLoading(true)

    const transactions = Array.from(checked).map((studentId) => ({
      student_id: studentId,
      amount: talentAmount,
      type: 'attendance' as const,
      description,
      granted_by: teacherId,
    }))

    const { error } = await supabase
      .from('talent_transactions')
      .insert(transactions)

    if (error) {
      alert('달란트 지급에 실패했습니다.')
      console.error(error)
    } else {
      alert(`${checked.size}명에게 ${talentAmount} 달란트를 지급했습니다.`)
      setChecked(new Set())
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NavHeader title="출석 체크" userName={teacherName} />

      <main className="p-4 max-w-lg mx-auto space-y-4">
        <Link href="/teacher" className="text-sm text-blue-500">&larr; 돌아가기</Link>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">달란트 설정</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">달란트 수</Label>
                <Input
                  type="number"
                  value={talentAmount}
                  onChange={(e) => setTalentAmount(Number(e.target.value))}
                  min={1}
                />
              </div>
              <div>
                <Label className="text-xs">사유</Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                학생 목록 ({checked.size}/{students.length})
              </CardTitle>
              <Button variant="outline" size="sm" onClick={selectAll}>
                {checked.size === students.length ? '전체 해제' : '전체 선택'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {students.length > 0 ? (
              <div className="space-y-1">
                {students.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => toggleStudent(s.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${
                      checked.has(s.id)
                        ? 'bg-blue-50 border border-blue-200'
                        : 'bg-white border border-gray-100 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        checked.has(s.id) ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                      }`}>
                        {checked.has(s.id) && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <span className="text-sm font-medium">{s.name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{s.grade}</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                등록된 학생이 없습니다.
              </p>
            )}
          </CardContent>
        </Card>

        {checked.size > 0 && (
          <Button className="w-full" onClick={handleSubmit} disabled={loading}>
            {loading
              ? '처리 중...'
              : `${checked.size}명에게 ${talentAmount} 달란트 지급`}
          </Button>
        )}
      </main>
    </div>
  )
}
