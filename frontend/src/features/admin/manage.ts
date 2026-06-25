import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { Course, Lesson, Section } from '@/types'

/** Full course tree (sections + lessons), for the manage view. */
export function useCourse(id: string | number | undefined) {
  return useQuery({
    queryKey: ['course', String(id)],
    queryFn: async () =>
      (await api.get<{ data: Course }>(`/course/getCourseById/${id}`)).data.data,
    enabled: id !== undefined && id !== null,
  })
}

export interface CourseStudent {
  id: number
  userId: number
  courseId: number
  status: 'active' | 'completed'
  createdAt: string
  student?: { id: number; firstName?: string; lastName?: string; email: string }
}

/** Roster of students enrolled in a course (instructor/admin). */
export function useCourseStudents(id: string | number) {
  return useQuery({
    queryKey: ['course-students', String(id)],
    queryFn: async () =>
      (await api.get<{ data: CourseStudent[] }>(`/enrollment/getCourseStudents/${id}`))
        .data.data,
  })
}

function useCourseInvalidator(courseId: string | number) {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: ['course', String(courseId)] })
    qc.invalidateQueries({ queryKey: ['managed-courses'] })
  }
}

// ---- Course details ----
export interface CourseDetailsInput {
  title?: string
  subtitle?: string | null
  description?: string | null
  thumbnail?: string | null
  thumbnailAssetId?: number | null
  level?: 'beginner' | 'intermediate' | 'advanced'
  price?: number
}

export function useUpdateCourse(courseId: string | number) {
  const invalidate = useCourseInvalidator(courseId)
  return useMutation({
    mutationFn: async (payload: CourseDetailsInput) =>
      (await api.put<{ data: Course }>(`/course/updateCourse/${courseId}`, payload))
        .data.data,
    onSuccess: invalidate,
  })
}

export function useSetPublish(courseId: string | number) {
  const invalidate = useCourseInvalidator(courseId)
  return useMutation({
    mutationFn: async (publish: boolean) =>
      api.post(`/course/${publish ? 'publishCourse' : 'unpublishCourse'}/${courseId}`),
    onSuccess: invalidate,
  })
}

// ---- Sections ----
export function useAddSection(courseId: string | number) {
  const invalidate = useCourseInvalidator(courseId)
  return useMutation({
    mutationFn: async (input: { title: string; position?: number }) =>
      (
        await api.post<{ data: Section }>('/section/addSection', {
          courseId: Number(courseId),
          ...input,
        })
      ).data.data,
    onSuccess: invalidate,
  })
}

export function useUpdateSection(courseId: string | number) {
  const invalidate = useCourseInvalidator(courseId)
  return useMutation({
    mutationFn: async ({
      id,
      ...input
    }: {
      id: number
      title?: string
      position?: number
    }) => api.put(`/section/updateSection/${id}`, input),
    onSuccess: invalidate,
  })
}

export function useDeleteSection(courseId: string | number) {
  const invalidate = useCourseInvalidator(courseId)
  return useMutation({
    mutationFn: async (id: number) => api.delete(`/section/deleteSection/${id}`),
    onSuccess: invalidate,
  })
}

// ---- Lessons ----
export interface LessonInput {
  sectionId: number
  title: string
  type: 'video' | 'text'
  isPreview?: boolean
  position?: number
  content?: string | null
  videoUrl?: string | null
  videoAssetId?: number | null
  videoDurationSec?: number | null
}

export function useAddLesson(courseId: string | number) {
  const invalidate = useCourseInvalidator(courseId)
  return useMutation({
    mutationFn: async (input: LessonInput) =>
      (await api.post<{ data: Lesson }>('/lesson/addLesson', input)).data.data,
    onSuccess: invalidate,
  })
}

export function useUpdateLesson(courseId: string | number) {
  const invalidate = useCourseInvalidator(courseId)
  return useMutation({
    mutationFn: async ({ id, ...input }: { id: number } & Partial<LessonInput>) =>
      api.put(`/lesson/updateLesson/${id}`, input),
    onSuccess: invalidate,
  })
}

export function useDeleteLesson(courseId: string | number) {
  const invalidate = useCourseInvalidator(courseId)
  return useMutation({
    mutationFn: async (id: number) => api.delete(`/lesson/deleteLesson/${id}`),
    onSuccess: invalidate,
  })
}
