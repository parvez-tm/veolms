import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import type { Course, ListResponse } from '@/types'

export interface CatalogParams {
  search?: string
  level?: string
  categoryId?: number
}

async function fetchCatalog(params: CatalogParams): Promise<Course[]> {
  const query: Record<string, unknown> = {}
  if (params.search) query.search = params.search
  const res = await api.get<ListResponse<Course>>('/course/catalog', {
    params: {
      ...(params.level ? { level: params.level } : {}),
      ...(params.categoryId ? { categoryId: params.categoryId } : {}),
      // backend list filter envelope
      ...(params.search ? { data: JSON.stringify({ search: params.search }) } : {}),
    },
  })
  return res.data.data
}

export function useCatalog(params: CatalogParams = {}) {
  return useQuery({
    queryKey: ['catalog', params],
    queryFn: () => fetchCatalog(params),
  })
}
