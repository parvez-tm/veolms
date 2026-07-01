import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { Category, ListResponse } from '@/types'

/** Full category list for admin management (any usage count). */
export function useAdminCategories() {
  return useQuery({
    queryKey: ['admin-categories'],
    queryFn: async () =>
      (await api.get<ListResponse<Category>>('/category/getAllCategories')).data
        .data,
  })
}

export interface CategoryInput {
  name: string
  description?: string | null
}

// Creating/renaming a category changes the public browse filters, so refresh the
// public catalog category query too.
function useCategoryInvalidator() {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: ['admin-categories'] })
    qc.invalidateQueries({ queryKey: ['categories'] })
  }
}

export function useCreateCategory() {
  const invalidate = useCategoryInvalidator()
  return useMutation({
    mutationFn: async (payload: CategoryInput) =>
      (await api.post<{ data: Category }>('/category/addCategory', payload)).data
        .data,
    onSuccess: invalidate,
  })
}

export function useUpdateCategory() {
  const invalidate = useCategoryInvalidator()
  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: number } & CategoryInput) =>
      (await api.put<{ data: Category }>(`/category/updateCategory/${id}`, payload))
        .data.data,
    onSuccess: invalidate,
  })
}

export function useDeleteCategory() {
  const invalidate = useCategoryInvalidator()
  return useMutation({
    mutationFn: async (id: number) => api.delete(`/category/deleteCategory/${id}`),
    onSuccess: invalidate,
  })
}
