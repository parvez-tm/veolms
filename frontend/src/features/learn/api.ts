import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { useAuth } from '@/context/AuthContext'

export interface ProgressSummary {
  courseId: number
  total: number
  completed: number
  percent: number
  lessons?: Array<{
    lessonId: number
    title: string
    completed: boolean
    lastPositionSec: number
  }>
}

export interface Playback {
  source: 'r2' | 'hls'
  url: string
  expiresIn?: number
}

export interface RecentlyWatched {
  lessonId: number
  courseId: number
  completed: boolean
  lastPositionSec: number
  updatedAt: string
  lessonTitle: string
  courseTitle: string
}

/** The student's most recently watched lessons (max 8, newest first). */
export function useRecentlyWatched() {
  const { isAuthenticated } = useAuth()
  return useQuery({
    queryKey: ['progress', 'recent'],
    queryFn: async () =>
      (await api.get<{ data: RecentlyWatched[] }>('/progress/recent')).data.data,
    enabled: isAuthenticated,
  })
}

export function useCourseProgress(courseId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['progress', String(courseId)],
    queryFn: async () =>
      (await api.get<{ data: ProgressSummary }>(`/progress/getCourseProgress/${courseId}`))
        .data.data,
    enabled: enabled && !!courseId,
  })
}

/** Playback source for a video lesson (encrypted HLS, or a presigned R2 MP4 fallback). */
export function usePlayback(lessonId: number | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['playback', lessonId],
    queryFn: async () =>
      (await api.get<{ data: Playback }>(`/lesson/getPlayback/${lessonId}`)).data.data,
    enabled: enabled && !!lessonId,
    staleTime: 60_000,
  })
}

export function useCompleteLesson(courseId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (lessonId: number) =>
      (await api.post<{ data: ProgressSummary }>('/progress/completeLesson', { lessonId }))
        .data.data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['progress', courseId] })
      qc.invalidateQueries({ queryKey: ['my-enrollments'] })
    },
  })
}

/** Fire-and-forget save of the current playback position (for resume). */
export function useUpdatePosition() {
  return useMutation({
    mutationFn: async (vars: { lessonId: number; positionSec: number }) =>
      api.post('/progress/updatePosition', vars),
  })
}
