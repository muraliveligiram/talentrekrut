import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AddSkillsDialog } from './SkillDialogs'
import { parseSkillNames } from './skillTypes'

const mocks = vi.hoisted(() => ({ create: vi.fn() }))

vi.mock('./useSkills', () => ({
  useCreateSkills: () => ({ mutateAsync: mocks.create, isPending: false, isError: false, error: null }),
  useUpdateSkill: () => ({ mutateAsync: vi.fn(), isPending: false, isError: false, error: null }),
}))

describe('parseSkillNames', () => {
  it('splits on commas and new lines, trims, collapses spaces and de-duplicates', () => {
    expect(parseSkillNames(' Kafka,  Spring   Boot\nkafka;GraphQL,, ')).toEqual(['Kafka', 'Spring Boot', 'GraphQL'])
  })
})

describe('AddSkillsDialog', () => {
  beforeEach(() => {
    mocks.create.mockReset()
  })

  it('adds several skills at once with a category', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    mocks.create.mockResolvedValue({ created: [{ id: 1 }, { id: 2 }], existing: [] })
    render(<AddSkillsDialog open onOpenChange={onOpenChange} />)

    await user.click(screen.getByRole('button', { name: 'Add skill' }))
    expect(await screen.findByText('Enter at least one skill name.')).toBeInTheDocument()

    await user.type(screen.getByRole('textbox', { name: 'Skill names' }), 'Kafka, RabbitMQ')
    await user.selectOptions(screen.getByRole('combobox', { name: 'Category' }), 'Tool')
    await user.click(screen.getByRole('button', { name: 'Add 2 skills' }))

    await waitFor(() => expect(mocks.create).toHaveBeenCalledWith({ names: ['Kafka', 'RabbitMQ'], category: 'Tool' }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
