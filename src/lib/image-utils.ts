/**
 * Resize an image file using Canvas API (client-side)
 * Preserves aspect ratio, limits max dimension, and compresses to JPEG.
 */
export interface ResizeOptions {
  maxWidth?: number
  maxHeight?: number
  quality?: number // 0.0 ~ 1.0
  mimeType?: 'image/jpeg' | 'image/webp' | 'image/png'
}

export async function resizeImage(
  file: File,
  options: ResizeOptions = {}
): Promise<Blob> {
  const {
    maxWidth = 1024,
    maxHeight = 1024,
    quality = 0.85,
    mimeType = 'image/jpeg',
  } = options

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        // Compute scaled dimensions
        let { width, height } = img
        const ratio = Math.min(maxWidth / width, maxHeight / height, 1)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Canvas context unavailable'))
          return
        }

        // Use high-quality smoothing
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob)
            else reject(new Error('Canvas toBlob failed'))
          },
          mimeType,
          quality
        )
      }
      img.onerror = () => reject(new Error('Image load failed'))
      img.src = e.target?.result as string
    }
    reader.onerror = () => reject(new Error('File read failed'))
    reader.readAsDataURL(file)
  })
}

/**
 * Format bytes to human-readable (KB, MB)
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

/**
 * Generate a unique filename based on timestamp + random
 */
export function generateFilename(originalName: string): string {
  const ext = originalName.split('.').pop()?.toLowerCase() || 'jpg'
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 10)
  return `${timestamp}-${random}.${ext === 'jpeg' ? 'jpg' : ext}`
}
