import { useEffect, useMemo, useState } from 'react'
import {
  Plus,
  Pencil,
  Trash2,
  Check,
  ShieldCheck,
  Save,
  Info,
} from 'lucide-react'
import {
  useRoles,
  useMenus,
  useRolePermissions,
  useSavePermissions,
  useCreateRole,
  useUpdateRole,
  useDeleteRole,
  type PermissionFlag,
} from '@/features/admin/access'
import { apiErrorMessage } from '@/lib/api'
import { Decor } from '@/components/layout/Decor'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Modal } from '@/components/ui/modal'
import { Badge } from '@/components/ui/badge'
import { Notice } from '@/components/ui/notice'
import { cn } from '@/lib/utils'
import type { Role } from '@/types'

type FlagKey = 'read' | 'create' | 'update' | 'delete'
const FLAGS: { key: FlagKey; label: string }[] = [
  { key: 'read', label: 'View' },
  { key: 'create', label: 'Create' },
  { key: 'update', label: 'Update' },
  { key: 'delete', label: 'Delete' },
]

function FlagBox({
  checked,
  onToggle,
}: {
  checked: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onToggle}
      className={cn(
        'grid h-7 w-7 place-items-center rounded-md border-2 border-ink transition-all',
        checked
          ? 'bg-primary text-primary-foreground shadow-[2px_2px_0_var(--ink)]'
          : 'bg-card hover:bg-tint'
      )}
    >
      {checked && <Check className="h-4 w-4" />}
    </button>
  )
}

export function AdminAccessPage() {
  const { data: roles } = useRoles()
  const { data: menus } = useMenus()
  const create = useCreateRole()
  const update = useUpdateRole()
  const remove = useDeleteRole()
  const save = useSavePermissions()

  const [selectedRoleId, setSelectedRoleId] = useState<number | undefined>()
  const { data: perms, isLoading: permsLoading } =
    useRolePermissions(selectedRoleId)

  const [draft, setDraft] = useState<Record<number, PermissionFlag>>({})

  // Role add/rename modal.
  const [roleModal, setRoleModal] = useState<{ role: Role | null } | null>(null)
  const [roleName, setRoleName] = useState('')
  const [roleError, setRoleError] = useState('')

  // Default to the first role once loaded.
  useEffect(() => {
    if (selectedRoleId === undefined && roles?.length) {
      setSelectedRoleId(roles[0].id)
    }
  }, [roles, selectedRoleId])

  // Rebuild the editable draft whenever the selected role's permissions load.
  useEffect(() => {
    if (!menus || perms === undefined) return
    const byMenu = new Map(perms.map((p) => [p.menuId, p]))
    const next: Record<number, PermissionFlag> = {}
    for (const m of menus) {
      const p = byMenu.get(m.id)
      next[m.id] = {
        menuId: m.id,
        read: !!p?.canRead,
        create: !!p?.canCreate,
        update: !!p?.canUpdate,
        delete: !!p?.canDelete,
      }
    }
    setDraft(next)
  }, [perms, menus])

  const dirty = useMemo(() => {
    if (!menus || perms === undefined) return false
    const byMenu = new Map(perms.map((p) => [p.menuId, p]))
    return menus.some((m) => {
      const d = draft[m.id]
      if (!d) return false
      const p = byMenu.get(m.id)
      return (
        d.read !== !!p?.canRead ||
        d.create !== !!p?.canCreate ||
        d.update !== !!p?.canUpdate ||
        d.delete !== !!p?.canDelete
      )
    })
  }, [draft, perms, menus])

  const toggle = (menuId: number, key: FlagKey) =>
    setDraft((d) => ({
      ...d,
      [menuId]: { ...d[menuId], [key]: !d[menuId][key] },
    }))

  const onSave = () => {
    if (selectedRoleId === undefined) return
    const permissions = Object.values(draft).filter(
      (p) => p.read || p.create || p.update || p.delete
    )
    save.mutate(
      { roleId: selectedRoleId, permissions },
      { onError: (err) => window.alert(apiErrorMessage(err)) }
    )
  }

  const openRoleModal = (role: Role | null) => {
    setRoleModal({ role })
    setRoleName(role?.roleName ?? '')
    setRoleError('')
  }

  const submitRole = async (e: React.FormEvent) => {
    e.preventDefault()
    setRoleError('')
    try {
      if (roleModal?.role) {
        await update.mutateAsync({ id: roleModal.role.id, roleName })
      } else {
        const created = await create.mutateAsync(roleName)
        setSelectedRoleId(created.id)
      }
      setRoleModal(null)
    } catch (err) {
      setRoleError(apiErrorMessage(err))
    }
  }

  const onDeleteRole = (role: Role) => {
    if (window.confirm(`Delete role “${role.roleName}”?`)) {
      remove.mutate(role.id, {
        onSuccess: () => {
          if (selectedRoleId === role.id) setSelectedRoleId(undefined)
        },
        onError: (err) => window.alert(apiErrorMessage(err)),
      })
    }
  }

  return (
    <div className="space-y-8">
      <div className="relative">
        <Decor className="rounded-[22px]">
          <div className="absolute -top-16 -right-10 h-56 w-56 rounded-full bg-[#c8c0ff] opacity-60 blur-3xl" />
          <div className="absolute -bottom-20 left-1/3 h-48 w-48 rounded-full bg-[#a7ecdd] opacity-70 blur-3xl" />
        </Decor>
        <span className="eyebrow">Admin</span>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
          Access control
        </h1>
        <p className="mt-3 font-medium text-muted-foreground">
          Define roles and what each can do in the admin panel.
        </p>
      </div>

      <Notice tone="future" title="Fine-grained permissions are a preview — not enforced yet">
        Access is currently governed by <strong>roles</strong> (Admin, Instructor,
        Student). The matrix below is saved to the database, but it doesn't restrict
        access today — enforcing per-menu permissions is planned for a future release
        and is out of the current scope. <strong>Role management above is fully
        active.</strong>
      </Notice>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Roles */}
        <div className="pop overflow-hidden">
          <div className="flex items-center justify-between border-b-2 border-foreground/10 px-5 py-4">
            <h2 className="text-lg font-bold tracking-tight">Roles</h2>
            <Button size="sm" onClick={() => openRoleModal(null)}>
              <Plus className="h-4 w-4" />
              New
            </Button>
          </div>
          <ul className="divide-y divide-border">
            {(roles ?? []).map((r) => (
              <li
                key={r.id}
                className={cn(
                  'flex items-center gap-2 px-4 py-3 transition-colors',
                  selectedRoleId === r.id ? 'bg-secondary/60' : 'hover:bg-tint'
                )}
              >
                <button
                  type="button"
                  onClick={() => setSelectedRoleId(r.id)}
                  className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                >
                  <span
                    className={cn(
                      'grid h-9 w-9 shrink-0 place-items-center rounded-lg border-2 border-ink',
                      selectedRoleId === r.id
                        ? 'bg-primary text-primary-foreground shadow-[2px_2px_0_var(--ink)]'
                        : 'bg-card text-muted-foreground'
                    )}
                  >
                    <ShieldCheck className="h-4 w-4" />
                  </span>
                  <span className="truncate font-bold tracking-tight">
                    {r.roleName}
                  </span>
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  title="Rename"
                  onClick={() => openRoleModal(r)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  title="Delete"
                  disabled={remove.isPending}
                  onClick={() => onDeleteRole(r)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </li>
            ))}
          </ul>
        </div>

        {/* Permission matrix */}
        <div className="pop overflow-hidden lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-foreground/10 px-5 py-4">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold tracking-tight">
                Permissions
                {selectedRoleId !== undefined &&
                  roles?.find((r) => r.id === selectedRoleId) && (
                    <span className="ml-2 text-sm font-semibold text-muted-foreground">
                      · {roles.find((r) => r.id === selectedRoleId)!.roleName}
                    </span>
                  )}
              </h2>
              <Badge tone="amber" title="Saved, but not enforced yet">
                Preview
              </Badge>
            </div>
            <Button
              size="sm"
              onClick={onSave}
              disabled={!dirty || save.isPending}
            >
              <Save className="h-4 w-4" />
              {save.isPending ? 'Saving…' : 'Save changes'}
            </Button>
          </div>

          {selectedRoleId === undefined ? (
            <p className="px-5 py-10 text-sm font-medium text-muted-foreground">
              Select a role to edit its permissions.
            </p>
          ) : permsLoading || !menus ? (
            <p className="px-5 py-10 text-sm font-medium text-muted-foreground">
              Loading…
            </p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[420px]">
                  <thead>
                    <tr className="border-b-2 border-foreground/10 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      <th className="px-5 py-3 text-left">Menu</th>
                      {FLAGS.map((f) => (
                        <th key={f.key} className="px-2 py-3 text-center">
                          {f.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {menus.map((m) => (
                      <tr key={m.id} className="hover:bg-tint">
                        <td className="px-5 py-3">
                          <span
                            className={cn(
                              'font-semibold tracking-tight',
                              m.parentId !== null && 'pl-4 text-sm font-medium'
                            )}
                          >
                            {m.label}
                          </span>
                        </td>
                        {FLAGS.map((f) => (
                          <td key={f.key} className="px-2 py-3">
                            <div className="flex justify-center">
                              <FlagBox
                                checked={!!draft[m.id]?.[f.key]}
                                onToggle={() => toggle(m.id, f.key)}
                              />
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-start gap-2 border-t-2 border-foreground/10 px-5 py-3.5 text-xs font-medium text-muted-foreground">
                <Info className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  Saving bumps this role's permission version, which signs its users
                  out — they must log in again. Editing your own role logs{' '}
                  <strong>you</strong> out too.
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      <Modal
        open={roleModal !== null}
        onClose={() => setRoleModal(null)}
        title={roleModal?.role ? 'Rename role' : 'New role'}
      >
        <form onSubmit={submitRole} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="role-name">Role name</Label>
            <Input
              id="role-name"
              value={roleName}
              onChange={(e) => setRoleName(e.target.value)}
              placeholder="e.g. Editor"
              required
              autoFocus
            />
          </div>
          {roleError && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
              {roleError}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => setRoleModal(null)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                create.isPending || update.isPending || !roleName.trim()
              }
            >
              {roleModal?.role ? 'Save' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
