import { useState, type FormEvent } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { uploadVideo } from '@/lib/upload'
import { apiErrorMessage } from '@/lib/api'
import { useAddLesson, useUpdateLesson, type LessonInput } from '@/features/admin/manage'
import type { Lesson, LessonResource } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  courseId: string | number
  sectionId: number
  lesson?: Lesson | null
}

/**
 * Read a video file's duration in the browser by loading its metadata into a
 * detached <video> element. Resolves to the rounded seconds, or null if it
 * can't be determined (we still let the upload proceed in that case).
 */
function probeVideoDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.preload = 'metadata'
    const done = (value: number | null) => {
      URL.revokeObjectURL(url)
      resolve(value)
    }
    video.onloadedmetadata = () => {
      const d = video.duration
      done(Number.isFinite(d) && d > 0 ? Math.round(d) : null)
    }
    video.onerror = () => done(null)
    video.src = url
  })
}

export function LessonFormModal({ open, onClose, courseId, sectionId, lesson }: Props) {
  const editing = !!lesson
  const addLesson = useAddLesson(courseId)
  const updateLesson = useUpdateLesson(courseId)

  const [title, setTitle] = useState(lesson?.title ?? '')
  const [type, setType] = useState<'video' | 'text'>(lesson?.type ?? 'video')
  const [isPreview, setIsPreview] = useState(lesson?.isPreview ?? false)
  const [description, setDescription] = useState(lesson?.description ?? '')
  const [content, setContent] = useState(lesson?.content ?? '')
  const [resources, setResources] = useState<LessonResource[]>(
    lesson?.resources ?? []
  )
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

  const addResource = () =>
    setResources((rs) => [...rs, { title: '', url: '' }])
  const updateResource = (i: number, patch: Partial<LessonResource>) =>
    setResources((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  const removeResource = (i: number) =>
    setResources((rs) => rs.filter((_, idx) => idx !== i))

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (!title.trim()) {
      setError('Title is required')
      return
    }
    // Keep only complete rows; both fields required, url must be http(s).
    const cleanResources = resources
      .map((r) => ({ title: r.title.trim(), url: r.url.trim() }))
      .filter((r) => r.title || r.url)
    if (cleanResources.some((r) => !r.title || !r.url)) {
      setError('Each resource needs both a title and a URL')
      return
    }
    if (cleanResources.some((r) => !/^https?:\/\//i.test(r.url))) {
      setError('Resource URLs must start with http:// or https://')
      return
    }
    setBusy(true)
    try {
      // Upload the chosen video file to private storage (R2) and attach the asset.
      let videoAssetId: number | undefined
      let videoDurationSec: number | null | undefined
      if (type === 'video') {
        if (file) {
          // Probe the duration client-side before/while uploading.
          videoDurationSec = await probeVideoDuration(file)
          setProgress(0)
          videoAssetId = await uploadVideo(file, Number(courseId), setProgress)
          setProgress(null)
        } else if (!editing) {
          setError('Choose a video file to upload')
          setBusy(false)
          return
        }
      }

      if (editing) {
        const payload: { id: number } & Partial<LessonInput> = {
          id: lesson!.id,
          title: title.trim(),
          isPreview,
          description: description.trim() || null,
          resources: cleanResources,
        }
        if (type === 'text') payload.content = content
        if (type === 'video') {
          // For videos, `content` carries optional notes.
          payload.content = content.trim() || null
          if (videoAssetId) payload.videoAssetId = videoAssetId
          if (videoDurationSec != null) payload.videoDurationSec = videoDurationSec
        }
        await updateLesson.mutateAsync(payload)
      } else {
        const payload: LessonInput = {
          sectionId,
          title: title.trim(),
          type,
          isPreview,
          description: description.trim() || null,
          resources: cleanResources,
        }
        if (type === 'text') payload.content = content
        if (type === 'video') {
          payload.content = content.trim() || null
          if (videoAssetId) payload.videoAssetId = videoAssetId
          if (videoDurationSec != null) payload.videoDurationSec = videoDurationSec
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

        <div className="space-y-2">
          <Label htmlFor="lessonDesc">Description</Label>
          <Input
            id="lessonDesc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="One line summarising this lesson"
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
          <div className="space-y-2">
            <Label htmlFor="videoFile">Video file</Label>
            <label
              htmlFor="videoFile"
              className="flex h-11 w-full cursor-pointer items-center gap-3 rounded-xl border-2 border-input bg-card pl-1.5 pr-3.5 text-sm font-medium transition-all focus-within:border-ink focus-within:shadow-[3px_3px_0_var(--ink)]"
            >
              <span className="shrink-0 rounded-lg bg-secondary px-3 py-1.5 font-semibold text-primary-strong">
                Choose file
              </span>
              <span className="min-w-0 truncate text-muted-foreground">
                {file ? file.name : 'No file chosen'}
              </span>
              <input
                id="videoFile"
                type="file"
                accept="video/*"
                className="sr-only"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
            {progress !== null && (
              <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
            {/* <p className="text-xs text-muted-foreground">
              {editing
                ? 'Upload a new file to replace the current video. Stored privately and streamed as encrypted video.'
                : 'Uploaded straight to private storage (R2) and streamed as encrypted video, so it can’t be downloaded. Needs storage configured.'}
            </p> */}

            <div className="space-y-2 pt-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={content ?? ''}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Optional notes shown alongside the video"
                rows={4}
              />
            </div>
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

        {/* Resources */}
        <div className="space-y-2">
          <Label>Resources</Label>
          {resources.length > 0 && (
            <div className="space-y-2">
              {resources.map((r, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    value={r.title}
                    onChange={(e) => updateResource(i, { title: e.target.value })}
                    placeholder="Title"
                    className="flex-1"
                  />
                  <Input
                    value={r.url}
                    onChange={(e) => updateResource(i, { url: e.target.value })}
                    placeholder="https://…"
                    inputMode="url"
                    className="flex-[1.4]"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    title="Remove resource"
                    onClick={() => removeResource(i)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          <Button type="button" variant="outline" size="sm" onClick={addResource}>
            <Plus className="h-4 w-4" />
            Add resource
          </Button>
        </div>

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
