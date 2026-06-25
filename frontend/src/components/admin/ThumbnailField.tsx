import { useEffect, useRef, useState } from 'react'
import { ImageIcon, Loader2, Upload, X } from 'lucide-react'
import { uploadImage } from '@/lib/upload'
import { apiErrorMessage } from '@/lib/api'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

export interface ThumbnailValue {
  /** Uploaded image asset id (preferred when set). */
  assetId: number | null
  /** Externally-hosted image URL (used when no upload). */
  url: string
}

const MAX_MB = 5

/**
 * Course thumbnail picker: upload an image file (straight to R2) OR paste an
 * external image URL, with a live 16:9 preview. `previewFallback` is the
 * already-resolved display URL for a course that was saved with an uploaded
 * image (so the existing cover shows on edit).
 */
export function ThumbnailField({
  value,
  onChange,
  previewFallback,
}: {
  value: ThumbnailValue
  onChange: (v: ThumbnailValue) => void
  previewFallback?: string | null
}) {
  const [localPreview, setLocalPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [broken, setBroken] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // Revoke the object URL of a just-picked file when it's replaced/unmounted.
  useEffect(() => {
    return () => {
      if (localPreview) URL.revokeObjectURL(localPreview)
    }
  }, [localPreview])

  // Preview priority: a just-picked file > a typed URL > the existing cover.
  const preview =
    localPreview ??
    (value.url.trim() || (value.assetId ? previewFallback ?? null : null))

  useEffect(() => setBroken(false), [preview])

  const onPick = async (file: File) => {
    setError('')
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file')
      return
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      setError(`Image must be under ${MAX_MB} MB`)
      return
    }
    setLocalPreview(URL.createObjectURL(file))
    setUploading(true)
    setProgress(0)
    try {
      // Thumbnails live in their own dedicated `thumbnails/` folder (not per-course).
      const assetId = await uploadImage(file, null, setProgress)
      onChange({ assetId, url: '' })
    } catch (e) {
      setError(apiErrorMessage(e, 'Upload failed — please try again'))
      setLocalPreview(null)
    } finally {
      setUploading(false)
    }
  }

  const clear = () => {
    setLocalPreview(null)
    setError('')
    onChange({ assetId: null, url: '' })
    if (fileRef.current) fileRef.current.value = ''
  }

  const hasImage = !!preview && !broken

  return (
    <div className="space-y-2">
      <Label htmlFor="thumbnailUrl">Thumbnail</Label>

      <div className="relative aspect-video w-full overflow-hidden rounded-xl border-2 border-ink bg-muted">
        {hasImage ? (
          <img
            src={preview as string}
            alt="Course thumbnail preview"
            className="h-full w-full object-cover"
            onError={() => setBroken(true)}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-primary to-amber px-4 text-center text-white">
            <ImageIcon className="h-8 w-8" />
            <span className="text-xs font-semibold">
              {broken
                ? "Couldn't load that image — check the URL"
                : 'Upload an image or paste a URL'}
            </span>
          </div>
        )}

        {/* Uploading overlay */}
        {uploading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-ink/60 text-white">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="text-sm font-bold">Uploading… {progress}%</span>
          </div>
        )}

        {/* Remove */}
        {(value.assetId || value.url.trim() || localPreview) && !uploading && (
          <button
            type="button"
            onClick={clear}
            aria-label="Remove thumbnail"
            className="tag absolute right-2 top-2 rounded-full bg-card p-1.5 text-foreground transition-colors hover:text-primary-strong"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) void onPick(f)
        }}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
        >
          <Upload className="h-4 w-4" />
          {value.assetId ? 'Replace image' : 'Upload image'}
        </Button>
        <span className="text-xs font-medium text-muted-foreground">
          or paste a URL
        </span>
      </div>

      <Input
        id="thumbnailUrl"
        type="url"
        inputMode="url"
        placeholder="https://…/cover.jpg"
        value={value.url}
        disabled={uploading}
        onChange={(e) => {
          setLocalPreview(null)
          onChange({ assetId: null, url: e.target.value })
        }}
      />

      {error ? (
        <p className="text-xs font-semibold text-destructive">{error}</p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Upload a JPG/PNG (under {MAX_MB} MB) or paste a public URL. 16:9 looks best.
        </p>
      )}
    </div>
  )
}
