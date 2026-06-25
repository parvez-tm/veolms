import { useState, type FormEvent } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { uploadVideo } from '@/lib/upload'
import { apiErrorMessage } from '@/lib/api'
import { useAddLesson, useUpdateLesson, type LessonInput } from '@/features/admin/manage'
import type { Lesson } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  courseId: string | number
  sectionId: number
  lesson?: Lesson | null
}

export function LessonFormModal({ open, onClose, courseId, sectionId, lesson }: Props) {
  const editing = !!lesson
  const addLesson = useAddLesson(courseId)
  const updateLesson = useUpdateLesson(courseId)

  const [title, setTitle] = useState(lesson?.title ?? '')
  const [type, setType] = useState<'video' | 'text'>(lesson?.type ?? 'video')
  const [isPreview, setIsPreview] = useState(lesson?.isPreview ?? false)
  const [content, setContent] = useState(lesson?.content ?? '')
  const [videoMode, setVideoMode] = useState<'url' | 'upload'>(
    lesson?.videoAssetId ? 'upload' : 'url'
  )
  const [videoUrl, setVideoUrl] = useState(lesson?.videoUrl ?? '')
  const [file, setFile] = useState<File | null>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const reset = () => {
    setFile(null)
    setProgress(null)
    setError('')
    setBusy(false)
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (!title.trim()) {
      setError('Title is required')
      return
    }
    setBusy(true)
    try {
      // Resolve the video source if needed.
      let videoAssetId: number | undefined
      let resolvedUrl: string | undefined
      if (type === 'video') {
        if (videoMode === 'upload') {
          if (file) {
            setProgress(0)
            videoAssetId = await uploadVideo(file, setProgress)
            setProgress(null)
          } else if (!editing) {
            setError('Choose a video file to upload')
            setBusy(false)
            return
          }
        } else {
          if (!videoUrl.trim() && !editing) {
            setError('Enter a video URL (e.g. a YouTube link)')
            setBusy(false)
            return
          }
          resolvedUrl = videoUrl.trim() || undefined
        }
      }

      if (editing) {
        const payload: Record<string, unknown> = { id: lesson!.id, title: title.trim(), isPreview }
        if (type === 'text') payload.content = content
        if (type === 'video') {
          if (videoAssetId) payload.videoAssetId = videoAssetId
          else if (resolvedUrl) payload.videoUrl = resolvedUrl
        }
        await updateLesson.mutateAsync(payload as { id: number } & Partial<LessonInput>)
      } else {
        const payload: LessonInput = {
          sectionId,
          title: title.trim(),
          type,
          isPreview,
        }
        if (type === 'text') payload.content = content
        if (type === 'video') {
          if (videoAssetId) payload.videoAssetId = videoAssetId
          else payload.videoUrl = resolvedUrl
        }
        await addLesson.mutateAsync(payload)
      }
      reset()
      onClose()
    } catch (err) {
      setProgress(null)
      setError(apiErrorMessage(err, 'Could not save lesson'))
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit lesson' : 'Add lesson'}>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="lessonTitle">Title</Label>
          <Input
            id="lessonTitle"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Introduction to variables"
            required
          />
        </div>

        {!editing && (
          <div className="space-y-2">
            <Label>Type</Label>
            <div className="flex gap-2">
              {(['video', 'text'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={
                    'flex-1 rounded-xl border-2 px-3 py-2 text-sm font-semibold capitalize transition-colors ' +
                    (type === t
                      ? 'border-primary bg-secondary text-primary-strong'
                      : 'border-border text-muted-foreground hover:border-foreground hover:text-foreground')
                  }
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}

        {type === 'video' ? (
          <div className="space-y-3">
            <div className="flex gap-2">
              {(['url', 'upload'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setVideoMode(m)}
                  className={
                    'flex-1 rounded-xl border-2 px-3 py-2 text-sm font-semibold transition-colors ' +
                    (videoMode === m
                      ? 'border-primary bg-secondary text-primary-strong'
                      : 'border-border text-muted-foreground hover:border-foreground hover:text-foreground')
                  }
                >
                  {m === 'url' ? 'YouTube / URL' : 'Upload video'}
                </button>
              ))}
            </div>

            {videoMode === 'url' ? (
              <div className="space-y-2">
                <Label htmlFor="videoUrl">Video URL</Label>
                <Input
                  id="videoUrl"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=…"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="videoFile">Video file</Label>
                <Input
                  id="videoFile"
                  type="file"
                  accept="video/*"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="cursor-pointer file:mr-3 file:rounded-lg file:border-0 file:bg-secondary file:px-3 file:py-1 file:font-semibold file:text-primary-strong"
                />
                {progress !== null && (
                  <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Uploaded straight to private storage (R2). Needs storage configured.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="content">Content (HTML allowed)</Label>
            <Textarea
              id="content"
              value={content ?? ''}
              onChange={(e) => setContent(e.target.value)}
              placeholder="<h2>Lesson notes</h2><p>…</p>"
              rows={6}
            />
          </div>
        )}

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isPreview}
            onChange={(e) => setIsPreview(e.target.checked)}
            className="h-4 w-4 accent-[var(--primary)]"
          />
          Free preview (viewable without enrolling)
        </label>

        {error && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="flex gap-3 pt-1">
          <Button type="submit" disabled={busy}>
            {busy
              ? progress !== null
                ? `Uploading ${progress}%`
                : 'Saving…'
              : editing
                ? 'Save lesson'
                : 'Add lesson'}
          </Button>
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  )
}
