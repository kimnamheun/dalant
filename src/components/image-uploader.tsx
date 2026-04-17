'use client'

import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { resizeImage, formatBytes, generateFilename } from '@/lib/image-utils'
import { Button } from '@/components/ui/button'

interface ImageUploaderProps {
  value?: string  // Current image URL
  onChange: (url: string) => void
  bucket?: string
  folder?: string
  maxDimension?: number
  quality?: number
}

export function ImageUploader({
  value,
  onChange,
  bucket = 'product-images',
  folder = '',
  maxDimension = 1024,
  quality = 0.85,
}: ImageUploaderProps) {
  const supabase = createClient()
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) {
      setError('이미지 파일만 업로드할 수 있습니다.')
      return
    }
    setError('')
    setUploading(true)
    try {
      setProgress(`원본: ${formatBytes(file.size)} · 리사이즈 중...`)

      // Resize
      const blob = await resizeImage(file, {
        maxWidth: maxDimension,
        maxHeight: maxDimension,
        quality,
        mimeType: 'image/jpeg',
      })

      setProgress(`리사이즈됨: ${formatBytes(blob.size)} · 업로드 중...`)

      // Upload
      const filename = generateFilename(file.name)
      const path = folder ? `${folder}/${filename}` : filename

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(path, blob, {
          cacheControl: '3600',
          upsert: false,
          contentType: 'image/jpeg',
        })

      if (uploadError) {
        throw new Error(uploadError.message)
      }

      // Get public URL
      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path)

      onChange(urlData.publicUrl)
      setProgress(`완료 (${formatBytes(blob.size)})`)
      setTimeout(() => setProgress(''), 2500)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setError('업로드 실패: ' + msg)
      setProgress('')
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
  }

  return (
    <div className="space-y-2">
      {/* Preview */}
      {value && (
        <div className="relative w-full aspect-square max-w-[200px] mx-auto bg-gray-100 rounded-lg overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="상품 이미지" className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={removeImage}
            className="absolute top-1 right-1 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center text-sm hover:bg-black/80"
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
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          className="flex-1 h-11"
          disabled={uploading}
          onClick={() => cameraInputRef.current?.click()}
        >
          <span className="mr-1">📷</span>
          카메라
        </Button>
        <Button
          type="button"
          variant="outline"
          className="flex-1 h-11"
          disabled={uploading}
          onClick={() => galleryInputRef.current?.click()}
        >
          <span className="mr-1">🖼️</span>
          갤러리
        </Button>
      </div>

      {/* Status */}
      {uploading && (
        <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 p-2 rounded-md">
          <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span>{progress || '처리 중...'}</span>
        </div>
      )}
      {!uploading && progress && (
        <p className="text-xs text-green-600 bg-green-50 p-2 rounded-md">✓ {progress}</p>
      )}
      {error && (
        <p className="text-xs text-red-500 bg-red-50 p-2 rounded-md">{error}</p>
      )}

      <p className="text-xs text-muted-foreground text-center">
        최대 {maxDimension}×{maxDimension}px로 자동 조정됩니다
      </p>
    </div>
  )
}
