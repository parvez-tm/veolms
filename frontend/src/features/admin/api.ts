import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { Course, ListResponse } from '@/types'

/** Ownership-scoped course list: Admins see all courses, instructors see theirs. */
export function useManagedCourses(isAdmin: boolean) {
  return useQuery({
    queryKey: ['managed-courses', isAdmin],
    queryFn: async () => {
      const url = isAdmin ? '/course/all' : '/course/my-courses'
      return (await api.get<ListResponse<Course>>(url)).data.data
    },
  })
}

/** Platform/instructor overview metrics for the dashboard. `registeredUsers` is
 *  admin-only and may be undefined for instructors. */
export interface StatsOverview {
  totalCourses: number
  publishedCourses: number
  draftCourses: number
  totalEnrollments: number
  totalStudents: number
  payingStudents: number
  revenue: number // paise
  activeUsers: number
  registeredUsers?: number
}

export function useStats(enabled = true) {
  return useQuery({
    queryKey: ['stats-overview'],
    queryFn: async () =>
      (await api.get<{ data: StatsOverview }>('/stats/overview')).data.data,
    enabled,
  })
}

export interface NewCourseInput {
  title: string
  subtitle?: string
  description?: string
  thumbnailAssetId?: number | null
  bannerAssetId?: number | null
  level: 'beginner' | 'intermediate' | 'advanced'
  price: number // paise
  discountPrice?: number | null // paise, must be < price
  categoryId?: number | null
  language?: string
  tags?: string[]
  learningOutcomes?: string[]
  prerequisites?: string[]
  whoThisIsFor?: string[]
}

export function useCreateCourse() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: NewCourseInput) =>
      (await api.post<{ data: Course }>('/course/addCourse', payload)).data.data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['managed-courses'] })
      qc.invalidateQueries({ queryKey: ['catalog'] })
    },
  })
}

export function usePublishCourse() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, publish }: { id: number; publish: boolean }) =>
      api.post(`/course/${publish ? 'publishCourse' : 'unpublishCourse'}/${id}`),
    // Publishing/unpublishing changes what the PUBLIC catalog + detail show, so
    // refresh those too, not just the admin list.
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ['managed-courses'] })
      qc.invalidateQueries({ queryKey: ['catalog'] })
      qc.invalidateQueries({ queryKey: ['course', String(id)] })
    },
  })
}

export function useDeleteCourse() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => api.delete(`/course/deleteCourse/${id}`),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ['managed-courses'] })
      qc.invalidateQueries({ queryKey: ['catalog'] })
      qc.invalidateQueries({ queryKey: ['course', String(id)] })
    },
  })
}

/** Persist a new section order (section ids in the desired order) and refresh
 *  the manage view's course tree. */
export function useReorderSections(courseId: string | number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (order: number[]) =>
      api.post('/section/reorder', { courseId: Number(courseId), order }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['course', String(courseId)] })
    },
  })
}

/** Persist a new lesson order within a section (lesson ids in the desired order). */
export function useReorderLessons(courseId: string | number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ sectionId, order }: { sectionId: number; order: number[] }) =>
      api.post('/lesson/reorder', { sectionId, order }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['course', String(courseId)] })
    },
  })
}
