import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { AdminUser, ListResponse } from '@/types'

/** All users on the platform (Admin only). */
export function useUsers() {
  return useQuery({
    queryKey: ['admin-users'],
    queryFn: async () =>
      (await api.get<ListResponse<AdminUser>>('/user/getAllUsers')).data.data,
  })
}

export interface UserInput {
  userName: string
  firstName: string
  lastName: string
  email: string
  roleId: number
  password?: string
  phone?: string | null
}

export function useCreateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: UserInput) =>
      (await api.post<{ data: AdminUser }>('/user/addUser', payload)).data.data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  })
}

export function useUpdateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: number } & Partial<UserInput>) =>
      (await api.put<{ data: AdminUser }>(`/user/updateUser/${id}`, payload)).data
        .data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  })
}

export function useDeleteUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => api.delete(`/user/deleteUser/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  })
}
