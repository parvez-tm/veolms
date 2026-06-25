import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useCreateCourse } from '@/features/admin/api'
import { apiErrorMessage } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

const LEVELS = ['beginner', 'intermediate', 'advanced'] as const

export function NewCoursePage() {
  const navigate = useNavigate()
  const create = useCreateCourse()

  const [title, setTitle] = useState('')
  const [subtitle, setSubtitle] = useState('')
  const [description, setDescription] = useState('')
  const [level, setLevel] = useState<(typeof LEVELS)[number]>('beginner')
  const [priceRupees, setPriceRupees] = useState('0')
  const [error, setError] = useState('')

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    const rupees = Number(priceRupees)
    if (!Number.isFinite(rupees) || rupees < 0) {
      setError('Enter a valid price (₹0 for free)')
      return
    }
    if (rupees > 0 && rupees < 1) {
      setError('Paid courses must be at least ₹1')
      return
    }
    try {
      const course = await create.mutateAsync({
        title: title.trim(),
        subtitle: subtitle.trim() || undefined,
        description: description.trim() || undefined,
        level,
        price: Math.round(rupees * 100), // ₹ -> paise
      })
      navigate('/admin/courses', { replace: true })
      void course
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not create course'))
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Button variant="ghost" size="sm" asChild className="mb-4">
        <Link to="/admin/courses">
          <ArrowLeft className="h-4 w-4" />
          Back to courses
        </Link>
      </Button>

      <span className="eyebrow">New course</span>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Create a course</h1>
      <p className="mt-2 text-muted-foreground">
        Start with the basics. You can add sections, lessons and videos next.
      </p>

      <form
        onSubmit={onSubmit}
        className="pop mt-6 space-y-5 p-6"
      >
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. The Complete JavaScript Course"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="subtitle">Subtitle</Label>
          <Input
            id="subtitle"
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            placeholder="One line that sells the course"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What will students learn?"
            rows={5}
          />
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="level">Level</Label>
            <select
              id="level"
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
            <Label htmlFor="price">Price (₹)</Label>
            <Input
              id="price"
              type="number"
              min={0}
              step="1"
              value={priceRupees}
              onChange={(e) => setPriceRupees(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Set 0 for a free course.</p>
          </div>
        </div>

        {error && (
          <p className="rounded-xl bg-destructive/10 px-3.5 py-2 text-sm font-medium text-destructive">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? 'Creating…' : 'Create course'}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link to="/admin/courses">Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  )
}
