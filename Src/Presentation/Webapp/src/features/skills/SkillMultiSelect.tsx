import { toast } from 'sonner'
import { MultiSelect, type MultiSelectOption } from '@/components/ui/multi-select'
import { getErrorMessage } from '@/lib/api-error'
import { categoryLabels, SKILL_CATEGORIES } from './skillTypes'
import { useCreateSkills, useSkillOptions } from './useSkills'

interface SkillMultiSelectProps {
  value: MultiSelectOption[]
  onChange: (value: MultiSelectOption[]) => void
  /** Skills chosen in sibling fields, which can't be picked here as well. */
  excludeIds?: number[]
  placeholder?: string
  id?: string
  'aria-invalid'?: boolean
  'aria-describedby'?: string
  'aria-required'?: boolean
}

/** Picks skills from the shared library, grouped by category, with inline "add new skill". */
export function SkillMultiSelect({ value, onChange, excludeIds = [], placeholder, ...fieldProps }: SkillMultiSelectProps) {
  const optionsQuery = useSkillOptions()
  const createSkills = useCreateSkills()
  const excluded = new Set(excludeIds)

  const options: MultiSelectOption[] = (optionsQuery.data ?? [])
    .filter((skill) => !excluded.has(skill.id))
    .sort(
      (a, b) =>
        SKILL_CATEGORIES.indexOf(a.category) - SKILL_CATEGORIES.indexOf(b.category) || a.name.localeCompare(b.name),
    )
    .map((skill) => ({ value: skill.id, label: skill.name, group: categoryLabels[skill.category] }))

  const create = async (label: string) => {
    try {
      const result = await createSkills.mutateAsync({ names: [label], category: 'Other' })
      const skill = result.created[0] ?? result.existing[0]
      if (!skill) return undefined
      if (excluded.has(skill.id)) {
        toast.info(`${skill.name} is already selected in another skill group.`)
        return undefined
      }
      if (result.created.length) toast.success(`Added “${skill.name}” to the skill library`)
      return { value: skill.id, label: skill.name, group: categoryLabels[skill.category] }
    } catch (error) {
      toast.error(getErrorMessage(error, 'Unable to add the skill.'))
      return undefined
    }
  }

  return (
    <MultiSelect
      {...fieldProps}
      options={options}
      value={value}
      onChange={onChange}
      loading={optionsQuery.isLoading}
      placeholder={placeholder ?? 'Search skills…'}
      emptyMessage="No matching skills."
      onCreate={create}
      createLabel={(label) => `Add “${label}” to the skill library`}
      itemNoun="skill"
    />
  )
}
