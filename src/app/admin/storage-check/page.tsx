'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { NavHeader } from '@/components/nav-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ImageUploaderV2 } from '@/components/image-uploader-v2'

type Check = { name: string; status: 'ok' | 'fail' | 'pending'; msg: string }

export default function StorageCheckPage() {
  const router = useRouter()
  const supabase = createClient()
  const [checks, setChecks] = useState<Check[]>([])
  const [testImage, setTestImage] = useState('')

  async function runChecks() {
    const results: Check[] = []

    // 1) Auth
    const { data: { user } } = await supabase.auth.getUser()
    results.push({
      name: '인증',
      status: user ? 'ok' : 'fail',
      msg: user ? `로그인: ${user.email}` : '로그인 안 됨',
    })

    // 2) List buckets
    try {
      const { data: buckets, error } = await supabase.storage.listBuckets()
      if (error) {
        results.push({ name: 'Storage 접근', status: 'fail', msg: error.message })
      } else {
        const hasBucket = buckets?.some((b) => b.name === 'product-images')
        results.push({
          name: 'Storage 접근',
          status: 'ok',
          msg: `버킷 ${buckets?.length || 0}개 발견: ${buckets?.map((b) => b.name).join(', ') || '없음'}`,
        })
        results.push({
          name: 'product-images 버킷',
          status: hasBucket ? 'ok' : 'fail',
          msg: hasBucket ? '존재함' : '없음 → 009_storage_setup.sql 실행 필요',
        })
      }
    } catch (e) {
      results.push({ name: 'Storage 접근', status: 'fail', msg: String(e) })
    }

    // 3) List files in product-images
    try {
      const { data, error } = await supabase.storage.from('product-images').list()
      if (error) {
        results.push({ name: '버킷 내용 조회', status: 'fail', msg: error.message })
      } else {
        results.push({
          name: '버킷 내용 조회',
          status: 'ok',
          msg: `${data?.length || 0}개 파일/폴더`,
        })
      }
    } catch (e) {
      results.push({ name: '버킷 내용 조회', status: 'fail', msg: String(e) })
    }

    setChecks(results)
  }

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/login')
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      if (!profile || profile.role !== 'admin') return router.push('/')
      runChecks()
    }
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <NavHeader title="Storage 진단" backHref="/admin" />

      <main className="p-4 max-w-2xl mx-auto space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">시스템 체크</CardTitle>
              <Button size="sm" onClick={runChecks}>다시 검사</Button>
            </div>
          </CardHeader>
          <CardContent>
            {checks.length === 0 ? (
              <p className="text-sm text-muted-foreground">검사 중...</p>
            ) : (
              <div className="space-y-2">
                {checks.map((c, i) => (
                  <div key={i} className={`p-3 rounded-md border ${
                    c.status === 'ok' ? 'bg-green-50 border-green-200' :
                    c.status === 'fail' ? 'bg-red-50 border-red-200' : 'bg-gray-50'
                  }`}>
                    <div className="flex items-center gap-2">
                      <span>{c.status === 'ok' ? '✅' : c.status === 'fail' ? '❌' : '⏳'}</span>
                      <span className="font-semibold text-sm">{c.name}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 break-all">{c.msg}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">업로드 테스트</CardTitle>
          </CardHeader>
          <CardContent>
            <ImageUploaderV2
              value={testImage}
              onChange={setTestImage}
              folder="test"
            />
            {testImage && (
              <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded text-xs break-all">
                ✅ 업로드된 URL: {testImage}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-xs text-muted-foreground">
            <p className="font-semibold mb-1">❓ 업로드가 안 될 때 확인 순서</p>
            <ol className="list-decimal ml-4 space-y-1">
              <li>상단 체크가 모두 ✅인지 확인</li>
              <li>❌가 있으면 Supabase SQL Editor에서 009_storage_setup.sql 실행</li>
              <li>모바일에서 카메라가 안 열리면 브라우저 권한 (Chrome: 설정 → 사이트 설정 → 카메라)</li>
              <li>HTTPS가 아니면 capture 속성이 차단됨 (Vercel 배포 URL 사용 필수)</li>
            </ol>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
