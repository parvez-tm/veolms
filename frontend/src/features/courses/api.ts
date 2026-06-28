import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import type { Course, Category, ListResponse } from '@/types'

export interface CatalogParams {
  /** Free-text query (matches title, category name, instructor name). */
  q?: string
  level?: string
  categoryId?: number
  /** 'popular' | 'newest' | 'oldest' | 'price-low' | 'price-high' */
  sort?: string
  limit?: number
}

async function fetchCatalog(params: CatalogParams): Promise<Course[]> {
  const res = await api.get<ListResponse<Course>>('/course/catalog', {
    params: {
      ...(params.q ? { q: params.q } : {}),
      ...(params.level ? { level: params.level } : {}),
      ...(params.categoryId ? { categoryId: params.categoryId } : {}),
      ...(params.sort ? { sort: params.sort } : {}),
      ...(params.limit ? { limit: params.limit } : {}),
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

export interface CategoryWithCount extends Category {
  courseCount?: number | string
}

/** Public category list (with published-course counts) for browse chips. */
export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () =>
      (await api.get<ListResponse<CategoryWithCount>>('/category/catalog')).data.data,
    staleTime: 5 * 60_000,
  })
}
