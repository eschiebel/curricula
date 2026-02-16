import { fireEvent, render } from '@testing-library/preact'
import { describe, expect, it, vi } from 'vitest'
import { AddSemesterDialog } from '../components/AddSemesterDialog'

function buildSemesters() {
  return [
    { id: 's1', name: 'Semester 1', order: 1 },
    { id: 's2', name: 'Semester 2', order: 2 },
    { id: 's3', name: 'Semester 3', order: 3 },
  ]
}

describe('AddSemesterDialog', () => {
  it('disables Save until a name is entered', () => {
    const onSave = vi.fn<(args: { name: string; insertionIndex: number }) => void>()
    const onClose = vi.fn<() => void>()

    const { getByRole } = render(
      <AddSemesterDialog semesters={buildSemesters()} open onClose={onClose} onSave={onSave} />,
    )

    const saveButton = getByRole('button', { name: 'Save' })
    expect(saveButton).toBeDisabled()

    const input = getByRole('textbox', { name: 'Name' })
    fireEvent.input(input, { target: { value: '   ' } })
    expect(saveButton).toBeDisabled()

    fireEvent.input(input, { target: { value: 'Semester X' } })
    expect(saveButton).toBeEnabled()
  })

  it('calls onSave with name and insertionIndex (default end) when Save is clicked', () => {
    const onSave = vi.fn<(args: { name: string; insertionIndex: number }) => void>()
    const onClose = vi.fn<() => void>()

    const { getByRole } = render(
      <AddSemesterDialog semesters={buildSemesters()} open onClose={onClose} onSave={onSave} />,
    )

    const input = getByRole('textbox', { name: 'Name' })
    fireEvent.input(input, { target: { value: 'New Semester' } })

    fireEvent.click(getByRole('button', { name: 'Save' }))

    expect(onSave).toHaveBeenCalledWith({ name: 'New Semester', insertionIndex: 3 })
  })

  it('moves the new-semester row with ArrowUp/ArrowDown when drag handle is focused', () => {
    const onSave = vi.fn<(args: { name: string; insertionIndex: number }) => void>()
    const onClose = vi.fn<() => void>()

    const { getAllByRole, getByRole } = render(
      <AddSemesterDialog semesters={buildSemesters()} open onClose={onClose} onSave={onSave} />,
    )

    const handle = getByRole('button', { name: 'Drag to set semester position' })
    handle.focus()

    const getMeaningfulItems = () =>
      getAllByRole('listitem').filter((li) => (li.textContent ?? '').trim().length > 0)

    // Default position is at the end, so the last meaningful listitem is the new-semester row.
    let items = getMeaningfulItems()
    expect(items[items.length - 1]?.textContent).toContain('≡')

    // Move up one.
    fireEvent.keyDown(handle, { key: 'ArrowUp' })
    items = getMeaningfulItems()
    const newIdx = items.findIndex((li) => (li.textContent ?? '').includes('≡'))
    expect(items[newIdx - 1]?.textContent).toContain('Semester 2')
    expect(items[newIdx + 1]?.textContent).toContain('Semester 3')

    // Move down one (back toward the end).
    fireEvent.keyDown(handle, { key: 'ArrowDown' })
    items = getMeaningfulItems()
    expect(items[items.length - 1]?.textContent).toContain('≡')
  })

  it('updates insertionIndex when dropped on a semester row', () => {
    const onSave = vi.fn<(args: { name: string; insertionIndex: number }) => void>()
    const onClose = vi.fn<() => void>()

    const { getByText, getByRole } = render(
      <AddSemesterDialog semesters={buildSemesters()} open onClose={onClose} onSave={onSave} />,
    )

    const handle = getByRole('button', { name: 'Drag to set semester position' })

    // Start drag to set dragActive and set dataTransfer
    const dataTransfer = {
      data: new Map<string, string>(),
      setData(type: string, value: string) {
        this.data.set(type, value)
      },
      getData(type: string) {
        return this.data.get(type) ?? ''
      },
      effectAllowed: 'move',
      dropEffect: 'move',
    }

    fireEvent.dragStart(handle, { dataTransfer })

    // Drop on Semester 2 row => index 1
    const semester2 = getByText('Semester 2')
    fireEvent.drop(semester2.closest('li') as HTMLElement, { dataTransfer })

    const input = getByRole('textbox', { name: 'Name' })
    fireEvent.input(input, { target: { value: 'Inserted' } })
    fireEvent.click(getByRole('button', { name: 'Save' }))

    expect(onSave).toHaveBeenCalledWith({ name: 'Inserted', insertionIndex: 1 })
  })
})
