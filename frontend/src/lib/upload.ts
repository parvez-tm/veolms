import axios from 'axios'
import api from '@/lib/api'

interface UploadUrlResponse {
  data: {
    assetId: number
    uploadUrl: string
    method: string
    headers: Record<string, string>
    expiresIn: number
  }
}

/**
 * Upload a file straight to R2 (the API never proxies the bytes):
 *   1. ask the API for a short-lived presigned PUT URL + assetId (creates the row)
 *   2. PUT the file directly to R2
 *   3. confirm the upload so the asset is marked `ready`
 *
 * If step 2 or 3 fails (e.g. a server error on confirm), the half-created asset
 * is rolled back (object + row deleted, best-effort) before the error is
 * rethrown — so a retry starts clean and never leaves a duplicate behind.
 */
async function uploadToR2(
  kind: 'video' | 'image',
  file: File,
  fallbackType: string,
  courseId?: number | null,
  onProgress?: (percent: number) => void
): Promise<number> {
  const contentType = file.type || fallbackType

  const { data } = await api.post<UploadUrlResponse>('/media/upload-url', {
    kind,
    contentType,
    originalName: file.name,
    ...(courseId != null ? { courseId } : {}),
  })
  const { assetId, uploadUrl } = data.data

  try {
    await axios.put(uploadUrl, file, {
      headers: { 'Content-Type': contentType },
      onUploadProgress: (e) => {
        if (onProgress && e.total) {
          onProgress(Math.round((e.loaded / e.total) * 100))
        }
      },
    })
    await api.post(`/media/confirm/${assetId}`)
    return assetId
  } catch (err) {
    // Roll back the reserved asset so a failed upload doesn't linger (and a retry
    // doesn't create a second copy). Best-effort: never mask the original error.
    await api.delete(`/media/${assetId}`).catch(() => undefined)
    throw err
  }
}

/**
 * Upload a video to R2 and return the assetId to attach via `videoAssetId`.
 */
export function uploadVideo(
  file: File,
  courseId?: number | null,
  onProgress?: (percent: number) => void
): Promise<number> {
  return uploadToR2('video', file, 'video/mp4', courseId, onProgress)
}

/**
 * Upload an image to R2 and return the assetId to attach via `thumbnailAssetId`.
 */
export function uploadImage(
  file: File,
  courseId?: number | null,
  onProgress?: (percent: number) => void
): Promise<number> {
  return uploadToR2('image', file, 'image/jpeg', courseId, onProgress)
}
