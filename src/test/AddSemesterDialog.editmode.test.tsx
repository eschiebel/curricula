import { fireEvent, render, waitFor } from '@testing-library/preact'
import { describe, expect, it, vi } from 'vitest'
import { AddSemesterDialog } from '../components/AddSemesterDialog'

function buildSemesters() {
  return [
    { id: 's1', name: 'Semester 1', order: 1 },
    { id: 's2', name: 'Semester 2', order: 2 },
    { id: 's3', name: 'Semester 3', order: 3 },
  ]
}

function buildCourses() {
  return [
    { semesterId: 's1', id: 'c1' },
    { semesterId: 's2', id: 'c2' },
    { semesterId: 's2', id: 'c3' },
  ]
}

describe('AddSemesterDialog - Edit Mode', () => {
  describe('Edit semester functionality', () => {
    it('shows Edit and Delete buttons in edit mode', () => {
      const onSave = vi.fn()
      const onClose = vi.fn()
      const onEdit = vi.fn()
      const onDelete = vi.fn()

      const { getAllByRole } = render(
        <AddSemesterDialog
          semesters={buildSemesters()}
          courses={buildCourses()}
          open
          onClose={onClose}
          onSave={onSave}
          onEdit={onEdit}
          onDelete={onDelete}
          isEditMode={true}
        />,
      )

      const editButtons = getAllByRole('button', { name: /Edit/i })
      const deleteButtons = getAllByRole('button', { name: /Delete/i })

      expect(editButtons.length).toBeGreaterThan(0)
      expect(deleteButtons.length).toBeGreaterThan(0)
    })

    it('calls onEdit when editing a semester name', () => {
      const onSave = vi.fn()
      const onClose = vi.fn()
      const onEdit = vi.fn()
      const onDelete = vi.fn()

      const { getAllByRole, getByDisplayValue } = render(
        <AddSemesterDialog
          semesters={buildSemesters()}
          courses={buildCourses()}
          open
          onClose={onClose}
          onSave={onSave}
          onEdit={onEdit}
          onDelete={onDelete}
          isEditMode={true}
        />,
      )

      const editButtons = getAllByRole('button', { name: /Edit/i })
      fireEvent.click(editButtons[0])

      const input = getByDisplayValue('Semester 1')
      fireEvent.input(input, { target: { value: 'Updated Semester' } })

      const saveButton = getAllByRole('button', { name: /Save/i })[0]
      fireEvent.click(saveButton)

      expect(onEdit).toHaveBeenCalledWith({
        semesterId: 's1',
        newName: 'Updated Semester',
      })
    })

    it('cancels editing when Cancel button is clicked', () => {
      const onSave = vi.fn()
      const onClose = vi.fn()
      const onEdit = vi.fn()
      const onDelete = vi.fn()

      const { getAllByRole, queryByDisplayValue } = render(
        <AddSemesterDialog
          semesters={buildSemesters()}
          courses={buildCourses()}
          open
          onClose={onClose}
          onSave={onSave}
          onEdit={onEdit}
          onDelete={onDelete}
          isEditMode={true}
        />,
      )

      const editButtons = getAllByRole('button', { name: /Edit/i })
      fireEvent.click(editButtons[0])

      const cancelButton = getAllByRole('button', { name: /Cancel/i })[0]
      fireEvent.click(cancelButton)

      expect(queryByDisplayValue('Semester 1')).not.toBeInTheDocument()
      expect(onEdit).not.toHaveBeenCalled()
    })

    it('prevents deleting semester with courses', () => {
      const onSave = vi.fn()
      const onClose = vi.fn()
      const onEdit = vi.fn()
      const onDelete = vi.fn()
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})

      const { getAllByRole } = render(
        <AddSemesterDialog
          semesters={buildSemesters()}
          courses={buildCourses()}
          open
          onClose={onClose}
          onSave={onSave}
          onEdit={onEdit}
          onDelete={onDelete}
          isEditMode={true}
        />,
      )

      const deleteButtons = getAllByRole('button', { name: /Delete/i })
      // Click delete on Semester 2 which has 2 courses
      fireEvent.click(deleteButtons[1])

      expect(alertSpy).toHaveBeenCalledWith(
        expect.stringContaining('Cannot delete semester "Semester 2": it contains 2 course(s).'),
      )
      expect(onDelete).not.toHaveBeenCalled()

      alertSpy.mockRestore()
    })

    it('allows deleting empty semester after confirmation', () => {
      const onSave = vi.fn()
      const onClose = vi.fn()
      const onEdit = vi.fn()
      const onDelete = vi.fn()
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)

      const { getAllByRole } = render(
        <AddSemesterDialog
          semesters={buildSemesters()}
          courses={buildCourses()}
          open
          onClose={onClose}
          onSave={onSave}
          onEdit={onEdit}
          onDelete={onDelete}
          isEditMode={true}
        />,
      )

      const deleteButtons = getAllByRole('button', { name: /Delete/i })
      // Click delete on Semester 3 which has no courses
      fireEvent.click(deleteButtons[2])

      expect(confirmSpy).toHaveBeenCalledWith(
        expect.stringContaining('Are you sure you want to delete semester "Semester 3"?'),
      )
      expect(onDelete).toHaveBeenCalledWith('s3')

      confirmSpy.mockRestore()
    })

    it('does not delete semester if user cancels confirmation', () => {
      const onSave = vi.fn()
      const onClose = vi.fn()
      const onEdit = vi.fn()
      const onDelete = vi.fn()
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)

      const { getAllByRole } = render(
        <AddSemesterDialog
          semesters={buildSemesters()}
          courses={buildCourses()}
          open
          onClose={onClose}
          onSave={onSave}
          onEdit={onEdit}
          onDelete={onDelete}
          isEditMode={true}
        />,
      )

      const deleteButtons = getAllByRole('button', { name: /Delete/i })
      fireEvent.click(deleteButtons[2]) // Semester 3 has no courses

      expect(confirmSpy).toHaveBeenCalled()
      expect(onDelete).not.toHaveBeenCalled()

      confirmSpy.mockRestore()
    })
  })

  describe('Drag-and-drop reordering', () => {
    it('shows drag handles in edit mode', () => {
      const onSave = vi.fn()
      const onClose = vi.fn()
      const onReorder = vi.fn()

      const { getAllByTitle } = render(
        <AddSemesterDialog
          semesters={buildSemesters()}
          courses={buildCourses()}
          open
          onClose={onClose}
          onSave={onSave}
          onReorder={onReorder}
          isEditMode={true}
        />,
      )

      const dragHandles = getAllByTitle('Drag to reorder, or use arrow keys')
      expect(dragHandles.length).toBe(3)
    })

    it('calls onReorder when semester is dragged and dropped', () => {
      const onSave = vi.fn()
      const onClose = vi.fn()
      const onReorder = vi.fn()

      const { getAllByTitle, getAllByText } = render(
        <AddSemesterDialog
          semesters={buildSemesters()}
          courses={buildCourses()}
          open
          onClose={onClose}
          onSave={onSave}
          onReorder={onReorder}
          isEditMode={true}
        />,
      )

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

      // Drag Semester 1
      const dragHandles = getAllByTitle('Drag to reorder, or use arrow keys')
      const semester1Row = dragHandles[0].closest('li') as HTMLElement
      fireEvent.dragStart(semester1Row, { dataTransfer })

      // Drop on Semester 3 position (index 2)
      const semester3Text = getAllByText('Semester 3')[0]
      const semester3Row = semester3Text.closest('li') as HTMLElement
      fireEvent.drop(semester3Row, { dataTransfer })

      expect(onReorder).toHaveBeenCalledWith({
        semesterId: 's1',
        newIndex: 2,
      })
    })

    it('reorders semester with ArrowUp key', () => {
      const onSave = vi.fn()
      const onClose = vi.fn()
      const onReorder = vi.fn()

      const { getAllByTitle } = render(
        <AddSemesterDialog
          semesters={buildSemesters()}
          courses={buildCourses()}
          open
          onClose={onClose}
          onSave={onSave}
          onReorder={onReorder}
          isEditMode={true}
        />,
      )

      const dragHandles = getAllByTitle('Drag to reorder, or use arrow keys')
      // Focus on Semester 2's drag handle (index 1)
      dragHandles[1].focus()
      fireEvent.keyDown(dragHandles[1], { key: 'ArrowUp' })

      expect(onReorder).toHaveBeenCalledWith({
        semesterId: 's2',
        newIndex: 0,
      })
    })

    it('reorders semester with ArrowDown key', () => {
      const onSave = vi.fn()
      const onClose = vi.fn()
      const onReorder = vi.fn()

      const { getAllByTitle } = render(
        <AddSemesterDialog
          semesters={buildSemesters()}
          courses={buildCourses()}
          open
          onClose={onClose}
          onSave={onSave}
          onReorder={onReorder}
          isEditMode={true}
        />,
      )

      const dragHandles = getAllByTitle('Drag to reorder, or use arrow keys')
      // Focus on Semester 2's drag handle (index 1)
      dragHandles[1].focus()
      fireEvent.keyDown(dragHandles[1], { key: 'ArrowDown' })

      expect(onReorder).toHaveBeenCalledWith({
        semesterId: 's2',
        newIndex: 2,
      })
    })

    it('does not reorder beyond boundaries with arrow keys', () => {
      const onSave = vi.fn()
      const onClose = vi.fn()
      const onReorder = vi.fn()

      const { getAllByTitle } = render(
        <AddSemesterDialog
          semesters={buildSemesters()}
          courses={buildCourses()}
          open
          onClose={onClose}
          onSave={onSave}
          onReorder={onReorder}
          isEditMode={true}
        />,
      )

      const dragHandles = getAllByTitle('Drag to reorder, or use arrow keys')

      // Try to move first semester up (should not call onReorder)
      dragHandles[0].focus()
      fireEvent.keyDown(dragHandles[0], { key: 'ArrowUp' })
      expect(onReorder).not.toHaveBeenCalled()

      // Try to move last semester down (should not call onReorder)
      dragHandles[2].focus()
      fireEvent.keyDown(dragHandles[2], { key: 'ArrowDown' })
      expect(onReorder).not.toHaveBeenCalled()
    })

    it('restores focus to drag handle after keyboard reorder with ArrowUp', async () => {
      const onSave = vi.fn()
      const onClose = vi.fn()
      const onReorder = vi.fn()

      const { getAllByTitle, rerender } = render(
        <AddSemesterDialog
          semesters={buildSemesters()}
          courses={buildCourses()}
          open
          onClose={onClose}
          onSave={onSave}
          onReorder={onReorder}
          isEditMode={true}
        />,
      )

      const dragHandles = getAllByTitle('Drag to reorder, or use arrow keys')
      const semester2Handle = dragHandles[1] // Semester 2
      const semesterId = semester2Handle.getAttribute('data-semester-id')

      semester2Handle.focus()
      expect(document.activeElement).toBe(semester2Handle)

      fireEvent.keyDown(semester2Handle, { key: 'ArrowUp' })

      // Simulate the reorder by updating semesters
      const reorderedSemesters = [
        { id: 's2', name: 'Semester 2', order: 1 },
        { id: 's1', name: 'Semester 1', order: 2 },
        { id: 's3', name: 'Semester 3', order: 3 },
      ]
      rerender(
        <AddSemesterDialog
          semesters={reorderedSemesters}
          courses={buildCourses()}
          open
          onClose={onClose}
          onSave={onSave}
          onReorder={onReorder}
          isEditMode={true}
        />,
      )

      // Focus should be restored to the same semester's drag handle
      await waitFor(() => {
        const focusedElement = document.activeElement as HTMLElement
        expect(focusedElement?.getAttribute('data-semester-id')).toBe(semesterId)
      })
    })

    it('restores focus to drag handle after keyboard reorder with ArrowDown', async () => {
      const onSave = vi.fn()
      const onClose = vi.fn()
      const onReorder = vi.fn()

      const { getAllByTitle, rerender } = render(
        <AddSemesterDialog
          semesters={buildSemesters()}
          courses={buildCourses()}
          open
          onClose={onClose}
          onSave={onSave}
          onReorder={onReorder}
          isEditMode={true}
        />,
      )

      const dragHandles = getAllByTitle('Drag to reorder, or use arrow keys')
      const semester2Handle = dragHandles[1] // Semester 2
      const semesterId = semester2Handle.getAttribute('data-semester-id')

      semester2Handle.focus()
      expect(document.activeElement).toBe(semester2Handle)

      fireEvent.keyDown(semester2Handle, { key: 'ArrowDown' })

      // Simulate the reorder by updating semesters
      const reorderedSemesters = [
        { id: 's1', name: 'Semester 1', order: 1 },
        { id: 's3', name: 'Semester 3', order: 2 },
        { id: 's2', name: 'Semester 2', order: 3 },
      ]
      rerender(
        <AddSemesterDialog
          semesters={reorderedSemesters}
          courses={buildCourses()}
          open
          onClose={onClose}
          onSave={onSave}
          onReorder={onReorder}
          isEditMode={true}
        />,
      )

      // Focus should be restored to the same semester's drag handle (this would have failed before the fix)
      await waitFor(() => {
        const focusedElement = document.activeElement as HTMLElement
        expect(focusedElement?.getAttribute('data-semester-id')).toBe(semesterId)
      })
    })
  })

  describe('Focus restoration after drag-and-drop', () => {
    it('restores focus to new semester drag handle after dragging', async () => {
      const onSave = vi.fn()
      const onClose = vi.fn()

      const { getByRole } = render(
        <AddSemesterDialog
          semesters={buildSemesters()}
          courses={buildCourses()}
          open
          onClose={onClose}
          onSave={onSave}
          isEditMode={false}
        />,
      )

      const handle = getByRole('button', {
        name: 'Drag or use up/down arrow keys to set semester position',
      })

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
      fireEvent.dragEnd(handle, { dataTransfer })

      // Focus should be restored via setTimeout
      await waitFor(() => {
        expect(document.activeElement).toBe(handle)
      })
    })
  })
})
