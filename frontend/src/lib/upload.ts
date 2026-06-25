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
 * Upload a video straight to R2 (the API never proxies the bytes):
 *   1. ask the API for a short-lived presigned PUT URL + assetId
 *   2. PUT the file directly to R2 (plain axios — no auth header / baseURL)
 *   3. confirm the upload so the asset is marked `ready`
 * Returns the assetId to attach to a lesson via `videoAssetId`.
 */
export async function uploadVideo(
  file: File,
  onProgress?: (percent: number) => void
): Promise<number> {
  const { data } = await api.post<UploadUrlResponse>('/media/upload-url', {
    kind: 'video',
    contentType: file.type || 'video/mp4',
    originalName: file.name,
  })
  const { assetId, uploadUrl } = data.data

  await axios.put(uploadUrl, file, {
    headers: { 'Content-Type': file.type || 'video/mp4' },
    onUploadProgress: (e) => {
      if (onProgress && e.total) {
        onProgress(Math.round((e.loaded / e.total) * 100))
      }
    },
  })

  await api.post(`/media/confirm/${assetId}`)
  return assetId
}
