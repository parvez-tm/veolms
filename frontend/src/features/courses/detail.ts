import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import type { Course } from '@/types'

/** Public course detail (curriculum). Non-enrolled viewers get preview-only content. */
export function useCourseDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['course', String(id)],
    queryFn: async () =>
      (await api.get<{ data: Course }>(`/course/getCourseById/${id}`)).data.data,
    enabled: !!id,
  })
}
