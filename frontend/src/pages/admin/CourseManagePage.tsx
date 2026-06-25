import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Plus,
  Trash2,
  Pencil,
  Video,
  FileText,
  Globe,
  EyeOff,
  Eye,
  Lock,
  Settings,
} from 'lucide-react'
import {
  useCourse,
  useSetPublish,
  useAddSection,
  useUpdateSection,
  useDeleteSection,
  useDeleteLesson,
} from '@/features/admin/manage'
import { apiErrorMessage } from '@/lib/api'
import { formatPrice } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LessonFormModal } from '@/components/admin/LessonFormModal'
import { CourseDetailsModal } from '@/components/admin/CourseDetailsModal'
import { CourseStudents } from '@/components/admin/CourseStudents'
import type { Lesson } from '@/types'

export function CourseManagePage() {
  const { id } = useParams()
  const { data: course, isLoading } = useCourse(id)
  const courseId = id as string

  const setPublish = useSetPublish(courseId)
  const addSection = useAddSection(courseId)
  const updateSection = useUpdateSection(courseId)
  const deleteSection = useDeleteSection(courseId)
  const deleteLesson = useDeleteLesson(courseId)

  const [newSection, setNewSection] = useState('')
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [lessonModal, setLessonModal] = useState<{
    sectionId: number
    lesson: Lesson | null
  } | null>(null)
  const [actionError, setActionError] = useState('')

  if (isLoading) {
    return <p className="text-muted-foreground">Loading…</p>
  }
  if (!course) {
    return (
      <div className="pop p-10 text-center text-muted-foreground">
        Course not found.{' '}
        <Link to="/admin/courses" className="font-semibold text-primary-strong hover:underline">
          Back to courses
        </Link>
      </div>
    )
  }

  const sections = course.sections ?? []
  const lessonCount = sections.reduce((n, s) => n + (s.lessons?.length ?? 0), 0)

  const onAddSection = async (e: FormEvent) => {
    e.preventDefault()
    if (!newSection.trim()) return
    setActionError('')
    try {
      await addSection.mutateAsync({
        title: newSection.trim(),
        position: sections.length + 1,
      })
      setNewSection('')
    } catch (err) {
      setActionError(apiErrorMessage(err))
    }
  }

  const onTogglePublish = async () => {
    setActionError('')
    try {
      await setPublish.mutateAsync(course.status !== 'published')
    } catch (err) {
      setActionError(apiErrorMessage(err, 'Could not change publish state'))
    }
  }

  const onRenameSection = async (sectionId: number, current: string) => {
    const title = window.prompt('Rename section', current)
    if (title && title.trim() && title.trim() !== current) {
      await updateSection.mutateAsync({ id: sectionId, title: title.trim() })
    }
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link to="/admin/courses">
          <ArrowLeft className="h-4 w-4" />
          Back to courses
        </Link>
      </Button>

      {/* Header */}
      <div className="pop relative overflow-hidden p-6">
        <div className="pointer-events-none absolute -right-12 -top-16 -z-10 h-56 w-56 rounded-full bg-[#FFD9C9] opacity-60 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 -z-10 h-48 w-48 rounded-full bg-[#CFF4EC] opacity-60 blur-3xl" />
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="eyebrow">Manage course</span>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-extrabold tracking-tight">{course.title}</h1>
              <span
                className={
                  'rounded-full px-3 py-1 text-xs font-bold ' +
                  (course.status === 'published'
                    ? 'bg-teal/15 text-teal'
                    : 'bg-muted text-muted-foreground')
                }
              >
                {course.status}
              </span>
            </div>
            {course.subtitle && (
              <p className="mt-2 text-muted-foreground">{course.subtitle}</p>
            )}
            <p className="mt-3 text-sm font-medium text-muted-foreground">
              <span className="font-grotesk font-bold text-primary-strong">
                {formatPrice(course.price, course.currency)}
              </span>{' '}
              · {course.level} · {lessonCount} lesson{lessonCount === 1 ? '' : 's'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setDetailsOpen(true)}>
              <Settings className="h-4 w-4" />
              Edit details
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to={`/courses/${course.id}`}>
                <Eye className="h-4 w-4" />
                View
              </Link>
            </Button>
            <Button size="sm" onClick={onTogglePublish} disabled={setPublish.isPending}>
              {course.status === 'published' ? (
                <>
                  <EyeOff className="h-4 w-4" />
                  Unpublish
                </>
              ) : (
                <>
                  <Globe className="h-4 w-4" />
                  Publish
                </>
              )}
            </Button>
          </div>
        </div>
        {course.status !== 'published' && lessonCount === 0 && (
          <p className="mt-4 rounded-xl bg-tint px-3 py-2 text-sm font-medium text-muted-foreground">
            Add at least one lesson before publishing.
          </p>
        )}
        {actionError && (
          <p className="mt-4 rounded-xl bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
            {actionError}
          </p>
        )}
      </div>

      {/* Curriculum */}
      <div>
        <span className="eyebrow">Outline</span>
        <h2 className="mb-4 mt-1 text-xl font-extrabold tracking-tight">Curriculum</h2>

        <div className="space-y-4">
          {sections.map((section) => (
            <div key={section.id} className="pop overflow-hidden">
              <div className="flex items-center justify-between gap-3 border-b border-border bg-tint px-4 py-3">
                <h3 className="font-bold tracking-tight">{section.title}</h3>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Rename section"
                    onClick={() => onRenameSection(section.id, section.title)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Delete section"
                    onClick={() => {
                      if (window.confirm(`Delete section “${section.title}” and its lessons?`)) {
                        deleteSection.mutate(section.id)
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>

              <ul className="divide-y divide-border">
                {(section.lessons ?? []).map((lesson) => (
                  <li
                    key={lesson.id}
                    className="flex items-center justify-between gap-3 px-4 py-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-secondary text-primary-strong">
                        {lesson.type === 'video' ? (
                          <Video className="h-4 w-4" />
                        ) : (
                          <FileText className="h-4 w-4" />
                        )}
                      </span>
                      <span className="truncate font-medium">{lesson.title}</span>
                      {lesson.isPreview ? (
                        <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-xs font-bold text-primary-strong">
                          preview
                        </span>
                      ) : (
                        <Lock className="h-3 w-3 shrink-0 text-muted-foreground/60" />
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Edit lesson"
                        onClick={() => setLessonModal({ sectionId: section.id, lesson })}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Delete lesson"
                        onClick={() => {
                          if (window.confirm(`Delete lesson “${lesson.title}”?`)) {
                            deleteLesson.mutate(lesson.id)
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </li>
                ))}
                {(section.lessons ?? []).length === 0 && (
                  <li className="px-4 py-3 text-sm font-medium text-muted-foreground">
                    No lessons yet.
                  </li>
                )}
              </ul>

              <div className="border-t border-border bg-tint2 p-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setLessonModal({ sectionId: section.id, lesson: null })}
                >
                  <Plus className="h-4 w-4" />
                  Add lesson
                </Button>
              </div>
            </div>
          ))}

          {sections.length === 0 && (
            <p className="pop px-4 py-12 text-center font-medium text-muted-foreground">
              No sections yet. Add your first section below.
            </p>
          )}
        </div>

        {/* Add section */}
        <form onSubmit={onAddSection} className="mt-4 flex gap-2">
          <Input
            value={newSection}
            onChange={(e) => setNewSection(e.target.value)}
            placeholder="New section title (e.g. Getting started)"
            className="max-w-sm"
          />
          <Button type="submit" variant="outline" disabled={addSection.isPending}>
            <Plus className="h-4 w-4" />
            Add section
          </Button>
        </form>
      </div>

      {/* Enrolled students */}
      <CourseStudents courseId={courseId} />

      {detailsOpen && (
        <CourseDetailsModal
          open
          course={course}
          onClose={() => setDetailsOpen(false)}
        />
      )}
      {lessonModal && (
        <LessonFormModal
          key={lessonModal.lesson?.id ?? `new-${lessonModal.sectionId}`}
          open
          courseId={courseId}
          sectionId={lessonModal.sectionId}
          lesson={lessonModal.lesson}
          onClose={() => setLessonModal(null)}
        />
      )}
    </div>
  )
}
