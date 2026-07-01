import { useState } from 'react'
import { Plus, Pencil, Trash2, Users as UsersIcon, Shield } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import {
  useUsers,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
} from '@/features/admin/users'
import { useRoles } from '@/features/admin/access'
import { apiErrorMessage } from '@/lib/api'
import { Decor } from '@/components/layout/Decor'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Modal } from '@/components/ui/modal'
import { Badge, type BadgeTone } from '@/components/ui/badge'
import type { AdminUser } from '@/types'

interface FormState {
  userName: string
  firstName: string
  lastName: string
  email: string
  password: string
  roleId: string
  phone: string
}

const EMPTY: FormState = {
  userName: '',
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  roleId: '',
  phone: '',
}

const ROLE_TONE: Record<string, BadgeTone> = {
  Admin: 'amber',
  Instructor: 'coral',
  Student: 'success',
}

export function AdminUsersPage() {
  const { user: current } = useAuth()
  const { data, isLoading } = useUsers()
  const { data: roles } = useRoles()
  const create = useCreateUser()
  const update = useUpdateUser()
  const remove = useDeleteUser()

  const users = data ?? []
  const roleOptions = (roles ?? []).map((r) => ({
    value: String(r.id),
    label: r.roleName,
  }))

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<AdminUser | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY)
  const [error, setError] = useState('')

  const openCreate = () => {
    setEditing(null)
    setForm({ ...EMPTY, roleId: roleOptions[0]?.value ?? '' })
    setError('')
    setOpen(true)
  }
  const openEdit = (u: AdminUser) => {
    setEditing(u)
    setForm({
      userName: u.userName,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      password: '',
      roleId: String(u.roleId),
      phone: u.phone ?? '',
    })
    setError('')
    setOpen(true)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const roleId = Number(form.roleId)
    if (!roleId) {
      setError('Please select a role')
      return
    }
    try {
      if (editing) {
        // Only send a password when the admin actually typed a new one.
        await update.mutateAsync({
          id: editing.id,
          userName: form.userName,
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          roleId,
          phone: form.phone || null,
          ...(form.password ? { password: form.password } : {}),
        })
      } else {
        await create.mutateAsync({
          userName: form.userName,
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          password: form.password,
          roleId,
          phone: form.phone || null,
        })
      }
      setOpen(false)
    } catch (err) {
      setError(apiErrorMessage(err))
    }
  }

  const onDelete = (u: AdminUser) => {
    if (
      window.confirm(
        `Delete ${u.firstName} ${u.lastName} (${u.email})? This cannot be undone.`
      )
    ) {
      remove.mutate(u.id, {
        onError: (err) => window.alert(apiErrorMessage(err)),
      })
    }
  }

  const saving = create.isPending || update.isPending

  return (
    <div className="space-y-8">
      <div className="relative">
        <Decor className="rounded-[22px]">
          <div className="absolute -top-16 -right-10 h-56 w-56 rounded-full bg-[#ffb59c] opacity-70 blur-3xl" />
          <div className="absolute -bottom-20 left-1/3 h-48 w-48 rounded-full bg-[#a7ecdd] opacity-70 blur-3xl" />
        </Decor>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="eyebrow">Admin</span>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Users
            </h1>
            <p className="mt-3 font-medium text-muted-foreground">
              Manage accounts and assign roles across the platform.
            </p>
          </div>
          <Button onClick={openCreate} disabled={!roleOptions.length}>
            <Plus className="h-4 w-4" />
            New user
          </Button>
        </div>
      </div>

      <div className="pop overflow-hidden">
        {isLoading ? (
          <p className="px-5 py-10 text-sm font-medium text-muted-foreground">
            Loading…
          </p>
        ) : users.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary">
              <UsersIcon className="h-8 w-8 text-primary-strong" />
            </div>
            <p className="mt-4 font-semibold text-foreground">No users yet.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {users.map((u) => {
              const name = [u.firstName, u.lastName].filter(Boolean).join(' ')
              const roleName = u.role?.roleName ?? ''
              return (
                <li
                  key={u.id}
                  className="flex flex-wrap items-center gap-4 px-4 py-4 sm:px-5"
                >
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 border-ink bg-primary text-sm font-bold text-primary-foreground shadow-[2px_2px_0_var(--ink)]">
                    {(name || u.userName || '?').charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold tracking-tight">
                      {name || u.userName}
                      {current?.id === u.id && (
                        <span className="ml-2 text-xs font-semibold text-muted-foreground">
                          (you)
                        </span>
                      )}
                    </p>
                    <p className="truncate text-xs font-medium text-muted-foreground">
                      {u.email}
                    </p>
                  </div>
                  {roleName && (
                    <Badge tone={ROLE_TONE[roleName] ?? 'neutral'} className="shrink-0">
                      <Shield className="h-3 w-3" />
                      {roleName}
                    </Badge>
                  )}
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Edit"
                      onClick={() => openEdit(u)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Delete"
                      disabled={remove.isPending || current?.id === u.id}
                      onClick={() => onDelete(u)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Edit user' : 'New user'}
      >
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="u-first">First name</Label>
              <Input
                id="u-first"
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                required
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="u-last">Last name</Label>
              <Input
                id="u-last"
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="u-username">Username</Label>
              <Input
                id="u-username"
                value={form.userName}
                onChange={(e) => setForm({ ...form, userName: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="u-phone">Phone</Label>
              <Input
                id="u-phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="Optional"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="u-email">Email</Label>
            <Input
              id="u-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="u-password">
                Password{editing && ' (leave blank to keep)'}
              </Label>
              <Input
                id="u-password"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder={editing ? '••••••••' : 'Min 8 characters'}
                required={!editing}
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="u-role">Role</Label>
              <Select
                id="u-role"
                value={form.roleId}
                onChange={(v) => setForm({ ...form, roleId: v })}
                options={roleOptions}
                placeholder="Select a role"
              />
            </div>
          </div>
          {error && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Save changes' : 'Create user'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
