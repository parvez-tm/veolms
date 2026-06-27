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

export interface NewCourseInput {
  title: string
  subtitle?: string
  description?: string
  thumbnailAssetId?: number | null
  level: 'beginner' | 'intermediate' | 'advanced'
  price: number // paise
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
    // refresh those too — not just the admin list.
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
