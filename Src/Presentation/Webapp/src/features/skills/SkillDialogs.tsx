import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Checkbox, Input, Select, Textarea } from '@/components/ui/input'
import { getErrorMessage } from '@/lib/api-error'
import { categoryLabels, parseSkillNames, SKILL_CATEGORIES, type Skill, type SkillCategory } from './skillTypes'
import { useCreateSkills, useUpdateSkill } from './useSkills'

function CategorySelect({ value, onChange, ...props }: { value: SkillCategory; onChange: (value: SkillCategory) => void; id?: string }) {
  return (
    <Select {...props} value={value} onChange={(event) => onChange(event.target.value as SkillCategory)}>
      {SKILL_CATEGORIES.map((category) => (
        <option key={category} value={category}>
          {categoryLabels[category]}
        </option>
      ))}
    </Select>
  )
}

export function AddSkillsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <DialogContent title="Add skills" description="Add one or more skills to the shared library.">
          <AddSkillsForm onDone={() => onOpenChange(false)} />
        </DialogContent>
      )}
    </Dialog>
  )
}

function AddSkillsForm({ onDone }: { onDone: () => void }) {
  const create = useCreateSkills()
  const [text, setText] = useState('')
  const [category, setCategory] = useState<SkillCategory>('Other')
  const [fieldError, setFieldError] = useState<string>()
  const names = parseSkillNames(text)
  const tooLong = names.find((name) => name.length > 100)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (names.length === 0) return setFieldError('Enter at least one skill name.')
    if (names.length > 100) return setFieldError('Add at most 100 skills at a time.')
    if (tooLong) return setFieldError(`“${tooLong.slice(0, 30)}…” is longer than 100 characters.`)
    setFieldError(undefined)
    try {
      const result = await create.mutateAsync({ names, category })
      const added = result.created.length
      const existing = result.existing.length
      if (added) {
        toast.success(`Added ${added} skill${added === 1 ? '' : 's'}`, {
          description: existing ? `${existing} already in the library.` : undefined,
        })
      } else {
        toast.info('All of these skills are already in the library.')
      }
      onDone()
    } catch {
      // Rendered from mutation state.
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      {create.isError && <Alert>{getErrorMessage(create.error, 'Unable to add the skills.')}</Alert>}
      <Field
        label="Skill names"
        required
        error={fieldError}
        hint="Separate skills with commas or new lines, e.g. Kafka, GraphQL, Snowflake"
      >
        <Textarea rows={4} autoFocus value={text} onChange={(event) => setText(event.target.value)} />
      </Field>
      {names.length > 0 && (
        <div className="flex flex-wrap gap-1.5" aria-label="Skills to add">
          {names.slice(0, 30).map((name) => (
            <Badge key={name} tone="primary">
              {name}
            </Badge>
          ))}
          {names.length > 30 && <Badge>+{names.length - 30} more</Badge>}
        </div>
      )}
      <Field label="Category" hint="Applies to all skills added here. Admins can change it later.">
        <CategorySelect value={category} onChange={setCategory} />
      </Field>
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="outline">Cancel</Button>
        </DialogClose>
        <Button type="submit" loading={create.isPending}>
          {names.length > 1 ? `Add ${names.length} skills` : 'Add skill'}
        </Button>
      </DialogFooter>
    </form>
  )
}

export function EditSkillDialog({ skill, onClose }: { skill: Skill | null; onClose: () => void }) {
  return (
    <Dialog open={skill !== null} onOpenChange={(open) => !open && onClose()}>
      {skill && (
        <DialogContent
          title="Edit skill"
          description={
            skill.jobCount
              ? `Used by ${skill.jobCount} job${skill.jobCount === 1 ? '' : 's'}. Changes appear on those jobs too.`
              : 'Not used by any job yet.'
          }
        >
          <EditSkillForm skill={skill} onDone={onClose} />
        </DialogContent>
      )}
    </Dialog>
  )
}

function EditSkillForm({ skill, onDone }: { skill: Skill; onDone: () => void }) {
  const update = useUpdateSkill()
  const [name, setName] = useState(skill.name)
  const [category, setCategory] = useState(skill.category)
  const [isActive, setIsActive] = useState(skill.isActive)
  const [fieldError, setFieldError] = useState<string>()

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const trimmed = name.trim().replace(/\s+/g, ' ')
    if (!trimmed) return setFieldError('Skill name is required.')
    if (trimmed.length > 100) return setFieldError('Skill name must be 100 characters or fewer.')
    setFieldError(undefined)
    try {
      await update.mutateAsync({ id: skill.id, name: trimmed, category, isActive })
      toast.success('Skill updated', { description: trimmed })
      onDone()
    } catch {
      // Rendered below.
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      {update.isError && <Alert>{getErrorMessage(update.error, 'Unable to update the skill.')}</Alert>}
      <Field label="Name" required error={fieldError}>
        <Input autoFocus value={name} onChange={(event) => setName(event.target.value)} />
      </Field>
      <Field label="Category">
        <CategorySelect value={category} onChange={setCategory} />
      </Field>
      <label className="flex items-start gap-3">
        <Checkbox className="mt-0.5" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
        <span className="flex flex-col">
          <span className="text-sm font-medium">Active</span>
          <span className="text-xs text-muted">
            Inactive skills can't be added to new jobs but stay on jobs that already use them.
          </span>
        </span>
      </label>
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="outline">Cancel</Button>
        </DialogClose>
        <Button type="submit" loading={update.isPending}>
          Save changes
        </Button>
      </DialogFooter>
    </form>
  )
}
