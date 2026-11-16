import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { MultiSelect, type MultiSelectOption } from './multi-select'

const options: MultiSelectOption[] = [
  { value: 1, label: 'React', group: 'Framework' },
  { value: 2, label: 'Angular', group: 'Framework' },
  { value: 3, label: 'Redis', group: 'Database' },
]

function Harness() {
  const [value, setValue] = useState<MultiSelectOption[]>([])
  return (
    <>
      <label htmlFor="skills">Skills</label>
      <MultiSelect id="skills" options={options} value={value} onChange={setValue} itemNoun="skill" />
      <output>{value.map((option) => option.label).join(',')}</output>
    </>
  )
}

describe('MultiSelect', () => {
  it('filters, picks with the keyboard and removes with backspace', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const input = screen.getByRole('combobox', { name: 'Skills' })

    await user.click(input)
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    expect(screen.getByText('Framework')).toBeInTheDocument()

    await user.type(input, 're')
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(['React', 'Redis'])
    await user.keyboard('{ArrowDown}{Enter}')
    expect(document.querySelector('output')).toHaveTextContent('Redis')

    await user.type(input, 'ang{Enter}')
    expect(document.querySelector('output')).toHaveTextContent('Redis,Angular')
    expect(input).toHaveValue('')

    await user.keyboard('{Backspace}')
    expect(document.querySelector('output')).toHaveTextContent(/^Redis$/)

    await user.click(screen.getByRole('button', { name: 'Remove skill Redis' }))
    expect(document.querySelector('output')).toHaveTextContent(/^$/)

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })
})
