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
  thumbnail?: string
  thumbnailAssetId?: number | null
  level: 'beginner' | 'intermediate' | 'advanced'
  price: number // paise
}

export function useCreateCourse() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: NewCourseInput) =>
      (await api.post<{ data: Course }>('/course/addCourse', payload)).data.data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['managed-courses'] }),
  })
}

export function usePublishCourse() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, publish }: { id: number; publish: boolean }) =>
      api.post(`/course/${publish ? 'publishCourse' : 'unpublishCourse'}/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['managed-courses'] }),
  })
}

export function useDeleteCourse() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => api.delete(`/course/deleteCourse/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['managed-courses'] }),
  })
}
