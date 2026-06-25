import { useState, type FormEvent } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { apiErrorMessage } from '@/lib/api'
import { useUpdateCourse } from '@/features/admin/manage'
import type { Course } from '@/types'

const LEVELS = ['beginner', 'intermediate', 'advanced'] as const

export function CourseDetailsModal({
  open,
  onClose,
  course,
}: {
  open: boolean
  onClose: () => void
  course: Course
}) {
  const update = useUpdateCourse(course.id)
  const [title, setTitle] = useState(course.title)
  const [subtitle, setSubtitle] = useState(course.subtitle ?? '')
  const [description, setDescription] = useState(course.description ?? '')
  const [level, setLevel] = useState<(typeof LEVELS)[number]>(course.level)
  const [priceRupees, setPriceRupees] = useState(String((course.price ?? 0) / 100))
  const [error, setError] = useState('')

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    const rupees = Number(priceRupees)
    if (!Number.isFinite(rupees) || rupees < 0 || (rupees > 0 && rupees < 1)) {
      setError('Price must be ₹0 (free) or at least ₹1')
      return
    }
    try {
      await update.mutateAsync({
        title: title.trim(),
        subtitle: subtitle.trim() || null,
        description: description.trim() || null,
        level,
        price: Math.round(rupees * 100),
      })
      onClose()
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not update course'))
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Edit course details">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="cTitle">Title</Label>
          <Input id="cTitle" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cSubtitle">Subtitle</Label>
          <Input
            id="cSubtitle"
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cDesc">Description</Label>
          <Textarea
            id="cDesc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="cLevel">Level</Label>
            <select
              id="cLevel"
              value={level}
              onChange={(e) => setLevel(e.target.value as (typeof LEVELS)[number])}
              className="flex h-11 w-full rounded-xl border-2 border-border bg-background px-3.5 py-2 text-sm font-medium capitalize transition-colors focus-visible:border-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
            >
              {LEVELS.map((l) => (
                <option key={l} value={l} className="bg-background capitalize">
                  {l}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cPrice">Price (₹)</Label>
            <Input
              id="cPrice"
              type="number"
              min={0}
              step="1"
              value={priceRupees}
              onChange={(e) => setPriceRupees(e.target.value)}
            />
          </div>
        </div>

        {error && (
          <p className="rounded-xl bg-destructive/10 px-3.5 py-2 text-sm font-medium text-destructive">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <Button type="submit" disabled={update.isPending}>
            {update.isPending ? 'Saving…' : 'Save changes'}
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  )
}
