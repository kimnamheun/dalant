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

export default function GrantPage() {
  const router = useRouter()
  const supabase = createClient()
  const [students, setStudents] = useState<Profile[]>([])
  const [selectedStudent, setSelectedStudent] = useState('')
  const [amount, setAmount] = useState(1)
  const [description, setDescription] = useState('')
  const [type, setType] = useState<'activity' | 'bonus' | 'adjustment'>('activity')
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedStudent) return alert('학생을 선택하세요.')
    if (!description) return alert('사유를 입력하세요.')
    setLoading(true)

    const { error } = await supabase
      .from('talent_transactions')
      .insert({
        student_id: selectedStudent,
        amount,
        type,
        description,
        granted_by: teacherId,
      })

    if (error) {
      alert('달란트 처리에 실패했습니다.')
      console.error(error)
    } else {
      const studentName = students.find((s) => s.id === selectedStudent)?.name
      alert(`${studentName}에게 ${amount > 0 ? '+' : ''}${amount} 달란트 처리 완료`)
      setSelectedStudent('')
      setAmount(1)
      setDescription('')
    }
    setLoading(false)
  }

  const quickActions = [
    { label: '성경암송', amount: 3, desc: '성경암송' },
    { label: '전도', amount: 5, desc: '전도' },
    { label: '봉사', amount: 3, desc: '봉사활동' },
    { label: '과제', amount: 2, desc: '과제 제출' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <NavHeader title="달란트 지급" userName={teacherName} />

      <main className="p-4 max-w-lg mx-auto space-y-4">
        <Link href="/teacher" className="text-sm text-blue-500">&larr; 돌아가기</Link>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">빠른 지급</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-2">
              {quickActions.map((action) => (
                <Button
                  key={action.label}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => {
                    setAmount(action.amount)
                    setDescription(action.desc)
                    setType('activity')
                  }}
                >
                  {action.label}<br />+{action.amount}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">달란트 지급/차감</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>학생 선택</Label>
                <select
                  className="w-full mt-1 p-2 border rounded-md text-sm"
                  value={selectedStudent}
                  onChange={(e) => setSelectedStudent(e.target.value)}
                  required
                >
                  <option value="">학생을 선택하세요</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.grade})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label>유형</Label>
                <select
                  className="w-full mt-1 p-2 border rounded-md text-sm"
                  value={type}
                  onChange={(e) => setType(e.target.value as typeof type)}
                >
                  <option value="activity">활동</option>
                  <option value="bonus">보너스</option>
                  <option value="adjustment">조정 (차감 가능)</option>
                </select>
              </div>

              <div>
                <Label>달란트 수 (음수 = 차감)</Label>
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  required
                />
              </div>

              <div>
                <Label>사유</Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="달란트 지급/차감 사유"
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? '처리 중...' : '달란트 처리'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
