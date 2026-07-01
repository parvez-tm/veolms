import { useState } from 'react'
import { Plus, Pencil, Trash2, Tag, FolderTree } from 'lucide-react'
import {
  useAdminCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  type CategoryInput,
} from '@/features/admin/categories'
import { apiErrorMessage } from '@/lib/api'
import { Decor } from '@/components/layout/Decor'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Modal } from '@/components/ui/modal'
import type { Category } from '@/types'

export function AdminCategoriesPage() {
  const { data, isLoading } = useAdminCategories()
  const create = useCreateCategory()
  const update = useUpdateCategory()
  const remove = useDeleteCategory()
  const categories = data ?? []

  const [editing, setEditing] = useState<Category | null>(null)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<CategoryInput>({ name: '', description: '' })
  const [error, setError] = useState('')

  const openCreate = () => {
    setEditing(null)
    setForm({ name: '', description: '' })
    setError('')
    setOpen(true)
  }
  const openEdit = (c: Category) => {
    setEditing(c)
    setForm({ name: c.name, description: c.description ?? '' })
    setError('')
    setOpen(true)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, ...form })
      } else {
        await create.mutateAsync(form)
      }
      setOpen(false)
    } catch (err) {
      setError(apiErrorMessage(err))
    }
  }

  const onDelete = (c: Category) => {
    if (window.confirm(`Delete category “${c.name}”?`)) {
      remove.mutate(c.id, {
        onError: (err) => window.alert(apiErrorMessage(err)),
      })
    }
  }

  const saving = create.isPending || update.isPending

  return (
    <div className="space-y-8">
      <div className="relative">
        <Decor className="rounded-[22px]">
          <div className="absolute -top-16 -right-10 h-56 w-56 rounded-full bg-[#a7ecdd] opacity-70 blur-3xl" />
          <div className="absolute -bottom-20 left-1/3 h-48 w-48 rounded-full bg-[#c8c0ff] opacity-60 blur-3xl" />
        </Decor>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="eyebrow">Admin</span>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Categories
            </h1>
            <p className="mt-3 font-medium text-muted-foreground">
              Organize the catalog. Instructors pick a category when creating a course.
            </p>
          </div>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            New category
          </Button>
        </div>
      </div>

      <div className="pop overflow-hidden">
        {isLoading ? (
          <p className="px-5 py-10 text-sm font-medium text-muted-foreground">
            Loading…
          </p>
        ) : categories.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary">
              <FolderTree className="h-8 w-8 text-primary-strong" />
            </div>
            <p className="mt-4 font-semibold text-foreground">No categories yet.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Create the first category to organize courses.
            </p>
            <Button onClick={openCreate} className="mt-5">
              <Plus className="h-4 w-4" />
              New category
            </Button>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {categories.map((c) => (
              <li
                key={c.id}
                className="flex flex-wrap items-center gap-4 px-4 py-4 sm:px-5"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 border-ink bg-secondary text-primary-strong shadow-[2px_2px_0_var(--ink)]">
                  <Tag className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold tracking-tight">{c.name}</p>
                  {c.description && (
                    <p className="mt-0.5 truncate text-xs font-medium text-muted-foreground">
                      {c.description}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Edit"
                    onClick={() => openEdit(c)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Delete"
                    disabled={remove.isPending}
                    onClick={() => onDelete(c)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Edit category' : 'New category'}
      >
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="cat-name">Name</Label>
            <Input
              id="cat-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Web Development"
              required
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cat-desc">Description</Label>
            <Input
              id="cat-desc"
              value={form.description ?? ''}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Optional short description"
            />
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
            <Button type="submit" disabled={saving || !form.name.trim()}>
              {saving ? 'Saving…' : editing ? 'Save changes' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
