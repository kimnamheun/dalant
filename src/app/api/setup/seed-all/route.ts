import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  const body = await request.json()
  const { setupKey } = body

  if (setupKey !== 'dalant-setup-2026') {
    return NextResponse.json({ error: '잘못된 설정 키입니다.' }, { status: 403 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const results: string[] = []

  try {
    // 1. Get departments and classes
    const { data: depts } = await supabase.from('departments').select('id, name')
    const { data: classes } = await supabase.from('classes').select('id, name, department_id')

    if (!depts || depts.length === 0) {
      return NextResponse.json({ error: '먼저 샘플 데이터(부서/반)를 생성하세요. /api/setup/seed 호출' }, { status: 400 })
    }

    // Find specific departments and classes
    const elemDept = depts.find(d => d.name === '초등부')
    const middleDept = depts.find(d => d.name === '중등부')
    const elemClasses = classes?.filter(c => c.department_id === elemDept?.id) || []
    const middleClasses = classes?.filter(c => c.department_id === middleDept?.id) || []

    // 2. Create teacher accounts
    const teachers = [
      { email: 'teacher1@dalant-app.com', password: 'teacher123!', name: '김선생', dept: elemDept, cls: elemClasses[0] },
      { email: 'teacher2@dalant-app.com', password: 'teacher234!', name: '이선생', dept: elemDept, cls: elemClasses[1] },
      { email: 'teacher3@dalant-app.com', password: 'teacher345!', name: '박선생', dept: middleDept, cls: middleClasses[0] },
    ]

    for (const t of teachers) {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: t.email,
        password: t.password,
        options: { data: { name: t.name, role: 'teacher' } },
      })

      if (signUpError) {
        results.push(`Teacher ${t.name}: FAILED - ${signUpError.message}`)
        continue
      }

      if (signUpData.user) {
        await supabase.from('profiles').upsert({
          id: signUpData.user.id,
          name: t.name,
          role: 'teacher',
          department_id: t.dept?.id || null,
          class_id: t.cls?.id || null,
        }, { onConflict: 'id' })

        // Update class teacher_id
        if (t.cls) {
          await supabase.from('classes').update({ teacher_id: signUpData.user.id }).eq('id', t.cls.id)
        }
      }
      results.push(`Teacher ${t.name}: OK`)
    }

    // 3. Create student accounts
    const studentData = [
      // Elementary Class 1
      { name: '김민준', grade: '초3', pin: '100100', dept: elemDept, cls: elemClasses[0] },
      { name: '이서연', grade: '초3', pin: '100200', dept: elemDept, cls: elemClasses[0] },
      { name: '박지호', grade: '초4', pin: '100300', dept: elemDept, cls: elemClasses[0] },
      { name: '최수아', grade: '초4', pin: '100400', dept: elemDept, cls: elemClasses[0] },
      { name: '정하은', grade: '초3', pin: '100500', dept: elemDept, cls: elemClasses[0] },
      // Elementary Class 2
      { name: '강도윤', grade: '초5', pin: '200100', dept: elemDept, cls: elemClasses[1] },
      { name: '윤서준', grade: '초5', pin: '200200', dept: elemDept, cls: elemClasses[1] },
      { name: '장하린', grade: '초6', pin: '200300', dept: elemDept, cls: elemClasses[1] },
      { name: '한지우', grade: '초6', pin: '200400', dept: elemDept, cls: elemClasses[1] },
      // Middle School
      { name: '임건우', grade: '중1', pin: '300100', dept: middleDept, cls: middleClasses[0] },
      { name: '오예은', grade: '중1', pin: '300200', dept: middleDept, cls: middleClasses[0] },
      { name: '신준혁', grade: '중2', pin: '300300', dept: middleDept, cls: middleClasses[0] },
    ]

    const studentIds: { id: string; name: string }[] = []

    for (const s of studentData) {
      const email = `student${s.pin}@dalant-app.com`
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password: s.pin,
        options: { data: { name: s.name, role: 'student' } },
      })

      if (signUpError) {
        results.push(`Student ${s.name}: FAILED - ${signUpError.message}`)
        continue
      }

      if (signUpData.user) {
        await supabase.from('profiles').upsert({
          id: signUpData.user.id,
          name: s.name,
          role: 'student',
          grade: s.grade,
          pin: s.pin,
          department_id: s.dept?.id || null,
          class_id: s.cls?.id || null,
        }, { onConflict: 'id' })

        studentIds.push({ id: signUpData.user.id, name: s.name })
      }
      results.push(`Student ${s.name}: OK`)
    }

    // 4. Get admin user ID for granted_by
    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'admin')
      .limit(1)
      .single()

    const grantedBy = adminProfile?.id

    // 5. Create sample talent transactions
    if (grantedBy && studentIds.length > 0) {
      const transactions = []
      const descriptions = [
        { type: 'attendance', desc: '주일예배 출석', amount: 5 },
        { type: 'attendance', desc: '주일예배 출석', amount: 5 },
        { type: 'attendance', desc: '주일예배 출석', amount: 5 },
        { type: 'activity', desc: '성경암송', amount: 3 },
        { type: 'activity', desc: '전도', amount: 5 },
        { type: 'bonus', desc: '특별 보너스', amount: 10 },
      ]

      for (const student of studentIds) {
        // Each student gets random subset of transactions
        const count = 3 + Math.floor(Math.random() * 4) // 3~6 transactions
        for (let i = 0; i < count; i++) {
          const t = descriptions[i % descriptions.length]
          const daysAgo = Math.floor(Math.random() * 60)
          transactions.push({
            student_id: student.id,
            amount: t.amount,
            type: t.type,
            description: t.desc,
            granted_by: grantedBy,
            created_at: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString(),
          })
        }
      }

      const { error: txError } = await supabase.from('talent_transactions').insert(transactions)
      if (txError) {
        results.push(`Transactions: FAILED - ${txError.message}`)
      } else {
        results.push(`Transactions: ${transactions.length} created`)
      }
    }

    return NextResponse.json({
      message: '전체 샘플 데이터 생성 완료!',
      results,
      summary: {
        teachers: teachers.length,
        students: studentData.length,
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message, results }, { status: 500 })
  }
}
