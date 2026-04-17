'use client'

import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { resizeImage, formatBytes, generateFilename } from '@/lib/image-utils'
import { Button } from '@/components/ui/button'

interface ImageUploaderV2Props {
  value?: string
  onChange: (url: string) => void
  bucket?: string
  folder?: string
  maxDimension?: number
  quality?: number
}

export function ImageUploaderV2({
  value,
  onChange,
  bucket = 'product-images',
  folder = '',
  maxDimension = 1024,
  quality = 0.85,
}: ImageUploaderV2Props) {
  const supabase = createClient()
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  const [uploading, setUploading] = useState(false)
  const [logs, setLogs] = useState<string[]>([])
  const [showLogs, setShowLogs] = useState(false)
  const [error, setError] = useState('')

  function addLog(msg: string) {
    // eslint-disable-next-line no-console
    console.log('[ImageUploader]', msg)
    setLogs((prev) => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`])
  }

  async function handleFile(file: File) {
    setError('')
    setLogs([])
    setShowLogs(true)
    addLog(`선택된 파일: ${file.name} (${file.type}, ${formatBytes(file.size)})`)

    if (!file.type.startsWith('image/')) {
      const msg = `이미지 파일이 아닙니다 (${file.type || '알 수 없음'})`
      setError(msg)
      addLog('ERROR: ' + msg)
      return
    }

    setUploading(true)
    try {
      // 1) Auth check
      addLog('인증 상태 확인 중...')
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('로그인되지 않았습니다. 재로그인 후 시도해주세요.')
      }
      addLog(`✓ 인증됨: ${user.email}`)

      // 2) Resize
      addLog('이미지 리사이즈 시작...')
      const blob = await resizeImage(file, {
        maxWidth: maxDimension,
        maxHeight: maxDimension,
        quality,
        mimeType: 'image/jpeg',
      })
      addLog(`✓ 리사이즈 완료: ${formatBytes(blob.size)} (JPEG)`)

      // 3) Upload
      const filename = generateFilename(file.name)
      const path = folder ? `${folder}/${filename}` : filename
      addLog(`업로드 시작: ${bucket}/${path}`)

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(path, blob, {
          cacheControl: '3600',
          upsert: false,
          contentType: 'image/jpeg',
        })

      if (uploadError) {
        addLog(`ERROR: ${JSON.stringify(uploadError)}`)
        throw new Error(`Storage 업로드 실패: ${uploadError.message}`)
      }
      addLog(`✓ 업로드 완료: ${uploadData?.path}`)

      // 4) Public URL
      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path)
      addLog(`✓ Public URL: ${urlData.publicUrl}`)

      onChange(urlData.publicUrl)
      addLog('✓ 완료')

      // Hide logs after success
      setTimeout(() => setShowLogs(false), 3000)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(msg)
      addLog('ERROR: ' + msg)
    } finally {
      setUploading(false)
    }
  }

  function onCameraChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  function onGalleryChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  function removeImage() {
    onChange('')
    setLogs([])
    setShowLogs(false)
    setError('')
  }

  return (
    <div className="space-y-2">
      {/* Preview */}
      {value && (
        <div className="relative w-full aspect-square max-w-[220px] mx-auto bg-gray-100 rounded-lg overflow-hidden border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="상품 이미지" className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={removeImage}
            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/70 text-white flex items-center justify-center text-lg hover:bg-black"
            aria-label="이미지 제거"
          >
            ×
          </button>
        </div>
      )}

      {/* Hidden inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={onCameraChange}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onGalleryChange}
      />

      {/* Buttons */}
      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="outline"
          className="h-12"
          disabled={uploading}
          onClick={() => {
            addLog('카메라 버튼 클릭')
            cameraInputRef.current?.click()
          }}
        >
          <span className="mr-1">📷</span>
          카메라 촬영
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-12"
          disabled={uploading}
          onClick={() => {
            addLog('갤러리 버튼 클릭')
            galleryInputRef.current?.click()
          }}
        >
          <span className="mr-1">🖼️</span>
          갤러리 선택
        </Button>
      </div>

      {/* Progress / Status */}
      {uploading && (
        <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 p-3 rounded-md">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span>업로드 중...</span>
        </div>
      )}

      {error && (
        <div className="text-xs bg-red-50 border border-red-200 p-3 rounded-md space-y-1">
          <p className="text-red-700 font-semibold">❌ 업로드 실패</p>
          <p className="text-red-600 break-all">{error}</p>
          <p className="text-xs text-red-500 mt-2">
            Storage 버킷 설정이 필요하거나 권한이 없을 수 있습니다. 아래 로그를 확인해주세요.
          </p>
        </div>
      )}

      {/* Debug logs (toggleable) */}
      {logs.length > 0 && (
        <div className="border rounded-md">
          <button
            type="button"
            onClick={() => setShowLogs(!showLogs)}
            className="w-full px-3 py-2 text-xs text-left text-muted-foreground hover:bg-gray-50 flex items-center justify-between"
          >
            <span>🔍 디버그 로그 ({logs.length})</span>
            <span>{showLogs ? '▲' : '▼'}</span>
          </button>
          {showLogs && (
            <div className="px-3 py-2 bg-gray-900 text-green-400 text-xs font-mono max-h-60 overflow-y-auto">
              {logs.map((log, i) => (
                <div key={i} className="whitespace-pre-wrap break-all">{log}</div>
              ))}
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center">
        📷 모바일에서 카메라가 열리지 않으면 갤러리를 사용하세요 · 최대 {maxDimension}px로 자동 조정
      </p>
    </div>
  )
}
