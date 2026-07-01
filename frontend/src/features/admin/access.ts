import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { ListResponse, MenuItem, PermissionEntry, Role } from '@/types'

/** All roles (Admin only). */
export function useRoles() {
  return useQuery({
    queryKey: ['admin-roles'],
    queryFn: async () =>
      (await api.get<ListResponse<Role>>('/role/getAllRoles')).data.data,
  })
}

/** All admin-panel menus — the resources RBAC permissions are granted over. */
export function useMenus() {
  return useQuery({
    queryKey: ['admin-menus'],
    queryFn: async () =>
      (await api.get<{ data: MenuItem[] }>('/menu/getAllMenus')).data.data,
  })
}

/** A single role's current permission set. */
export function useRolePermissions(roleId: number | undefined) {
  return useQuery({
    queryKey: ['role-permissions', roleId],
    queryFn: async () =>
      (
        await api.get<{ data: PermissionEntry[] }>(
          `/permission/getPermissionByRole/${roleId}`
        )
      ).data.data,
    enabled: roleId !== undefined,
  })
}

export interface PermissionFlag {
  menuId: number
  read: boolean
  create: boolean
  update: boolean
  delete: boolean
}

/**
 * Atomically REPLACE a role's whole permission set. This bumps the role's
 * permission version, so users on that role must re-login for the change to
 * take effect (their current token is rejected with 403).
 */
export function useSavePermissions() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      roleId,
      permissions,
    }: {
      roleId: number
      permissions: PermissionFlag[]
    }) => api.post('/permission/addPermission', { roleId, permissions }),
    onSuccess: (_data, { roleId }) =>
      qc.invalidateQueries({ queryKey: ['role-permissions', roleId] }),
  })
}

// ---- Role CRUD ----
export function useCreateRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (roleName: string) =>
      (await api.post<{ data: Role }>('/role/addRole', { roleName })).data.data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-roles'] }),
  })
}

export function useUpdateRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, roleName }: { id: number; roleName: string }) =>
      (await api.put<{ data: Role }>(`/role/updateRole/${id}`, { roleName })).data
        .data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-roles'] }),
  })
}

export function useDeleteRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => api.delete(`/role/deleteRole/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-roles'] }),
  })
}
