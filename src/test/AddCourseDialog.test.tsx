import { fireEvent, render } from '@testing-library/preact'
import { describe, expect, it, vi } from 'vitest'
import { AddCourseDialog } from '../components/AddCourseDialog'
import type { TrackInfo } from '../components/CurriculumGraph'

function buildSemesters() {
  return [
    { id: 's1', name: 'Semester 1', order: 1 },
    { id: 's2', name: 'Semester 2', order: 2 },
    { id: 's3', name: 'Semester 3', order: 3 },
  ]
}

function buildTrackInfo(): TrackInfo {
  return {
    trackOrder: ['math', 'physics', 'general_education'],
    trackNameById: {
      math: 'Math',
      physics: 'Physics',
      general_education: 'General Education',
    },
    trackColorById: {
      math: '#ff0000',
      physics: '#00ff00',
      general_education: '#0000ff',
    },
  }
}

describe('AddCourseDialog', () => {
  it('renders nothing when open is false', () => {
    const onSave =
      vi.fn<
        (args: { courseId: string; credits: number; trackId: string; semesterId: string }) => void
      >()
    const onClose = vi.fn<() => void>()

    const { container } = render(
      <AddCourseDialog
        semesters={buildSemesters()}
        trackInfo={buildTrackInfo()}
        open={false}
        onClose={onClose}
        onSave={onSave}
      />,
    )

    expect(container.textContent).toBe('')
  })

  it('renders dialog when open is true', () => {
    const onSave =
      vi.fn<
        (args: { courseId: string; credits: number; trackId: string; semesterId: string }) => void
      >()
    const onClose = vi.fn<() => void>()

    const { getByRole } = render(
      <AddCourseDialog
        semesters={buildSemesters()}
        trackInfo={buildTrackInfo()}
        open
        onClose={onClose}
        onSave={onSave}
      />,
    )

    expect(getByRole('dialog', { name: 'Add Course' })).toBeInTheDocument()
  })

  it('disables Save button until all required fields are filled', () => {
    const onSave =
      vi.fn<
        (args: { courseId: string; credits: number; trackId: string; semesterId: string }) => void
      >()
    const onClose = vi.fn<() => void>()

    const { getByRole, getByLabelText } = render(
      <AddCourseDialog
        semesters={buildSemesters()}
        trackInfo={buildTrackInfo()}
        open
        onClose={onClose}
        onSave={onSave}
      />,
    )

    const saveButton = getByRole('button', { name: 'Save' })
    expect(saveButton).toBeDisabled()

    const courseIdInput = getByLabelText(/Course ID/)
    fireEvent.input(courseIdInput, { target: { value: 'EMEC-100' } })
    expect(saveButton).toBeDisabled()

    const creditsInput = getByLabelText(/Credits/)
    fireEvent.input(creditsInput, { target: { value: '3' } })
    expect(saveButton).toBeEnabled()
  })

  it('calls onSave with correct values including trackId when Save is clicked', () => {
    const onSave =
      vi.fn<
        (args: { courseId: string; credits: number; trackId: string; semesterId: string }) => void
      >()
    const onClose = vi.fn<() => void>()

    const { getByRole, getByLabelText } = render(
      <AddCourseDialog
        semesters={buildSemesters()}
        trackInfo={buildTrackInfo()}
        open
        onClose={onClose}
        onSave={onSave}
      />,
    )

    const courseIdInput = getByLabelText(/Course ID/)
    const creditsInput = getByLabelText(/Credits/)
    const trackSelect = getByLabelText(/Track/)
    const semesterSelect = getByLabelText(/Semester/)

    fireEvent.input(courseIdInput, { target: { value: 'EMEC-100' } })
    fireEvent.input(creditsInput, { target: { value: '3' } })
    fireEvent.change(trackSelect, { target: { value: 'physics' } })
    fireEvent.change(semesterSelect, { target: { value: 's2' } })

    fireEvent.click(getByRole('button', { name: 'Save' }))

    expect(onSave).toHaveBeenCalledWith({
      courseId: 'EMEC-100',
      credits: 3,
      trackId: 'physics',
      semesterId: 's2',
    })
  })

  it('defaults to first semester and first track when dialog opens', () => {
    const onSave =
      vi.fn<
        (args: { courseId: string; credits: number; trackId: string; semesterId: string }) => void
      >()
    const onClose = vi.fn<() => void>()

    const { getByLabelText } = render(
      <AddCourseDialog
        semesters={buildSemesters()}
        trackInfo={buildTrackInfo()}
        open
        onClose={onClose}
        onSave={onSave}
      />,
    )

    const semesterSelect = getByLabelText(/Semester/) as HTMLSelectElement
    const trackSelect = getByLabelText(/Track/) as HTMLSelectElement
    expect(semesterSelect.value).toBe('s1')
    expect(trackSelect.value).toBe('math')
  })

  it('displays all tracks in the dropdown in correct order', () => {
    const onSave =
      vi.fn<
        (args: { courseId: string; credits: number; trackId: string; semesterId: string }) => void
      >()
    const onClose = vi.fn<() => void>()

    const { getByLabelText } = render(
      <AddCourseDialog
        semesters={buildSemesters()}
        trackInfo={buildTrackInfo()}
        open
        onClose={onClose}
        onSave={onSave}
      />,
    )

    const trackSelect = getByLabelText(/Track/) as HTMLSelectElement
    const options = Array.from(trackSelect.options).map((opt) => ({
      value: opt.value,
      text: opt.text,
    }))

    expect(options).toEqual([
      { value: 'math', text: 'Math' },
      { value: 'physics', text: 'Physics' },
      { value: 'general_education', text: 'General Education' },
    ])
  })

  it('calls onClose when Cancel button is clicked', () => {
    const onSave =
      vi.fn<
        (args: { courseId: string; credits: number; trackId: string; semesterId: string }) => void
      >()
    const onClose = vi.fn<() => void>()

    const { getByRole } = render(
      <AddCourseDialog
        semesters={buildSemesters()}
        trackInfo={buildTrackInfo()}
        open
        onClose={onClose}
        onSave={onSave}
      />,
    )

    fireEvent.click(getByRole('button', { name: 'Cancel' }))

    expect(onClose).toHaveBeenCalled()
  })

  it('calls onClose when close button is clicked', () => {
    const onSave =
      vi.fn<
        (args: { courseId: string; credits: number; trackId: string; semesterId: string }) => void
      >()
    const onClose = vi.fn<() => void>()

    const { getByRole } = render(
      <AddCourseDialog
        semesters={buildSemesters()}
        trackInfo={buildTrackInfo()}
        open
        onClose={onClose}
        onSave={onSave}
      />,
    )

    fireEvent.click(getByRole('button', { name: 'Close' }))

    expect(onClose).toHaveBeenCalled()
  })

  it('calls onClose when Escape key is pressed', () => {
    const onSave =
      vi.fn<
        (args: { courseId: string; credits: number; trackId: string; semesterId: string }) => void
      >()
    const onClose = vi.fn<() => void>()

    render(
      <AddCourseDialog
        semesters={buildSemesters()}
        trackInfo={buildTrackInfo()}
        open
        onClose={onClose}
        onSave={onSave}
      />,
    )

    fireEvent.keyDown(window, { key: 'Escape' })

    expect(onClose).toHaveBeenCalled()
  })

  it('resets form fields when dialog is reopened', () => {
    const onSave =
      vi.fn<
        (args: { courseId: string; credits: number; trackId: string; semesterId: string }) => void
      >()
    const onClose = vi.fn<() => void>()

    const { getByLabelText, rerender } = render(
      <AddCourseDialog
        semesters={buildSemesters()}
        trackInfo={buildTrackInfo()}
        open
        onClose={onClose}
        onSave={onSave}
      />,
    )

    let courseIdInput = getByLabelText(/Course ID/) as HTMLInputElement
    let creditsInput = getByLabelText(/Credits/) as HTMLInputElement

    fireEvent.input(courseIdInput, { target: { value: 'EMEC-100' } })
    fireEvent.input(creditsInput, { target: { value: '3' } })

    expect(courseIdInput.value).toBe('EMEC-100')
    expect(creditsInput.value).toBe('3')

    rerender(
      <AddCourseDialog
        semesters={buildSemesters()}
        trackInfo={buildTrackInfo()}
        open={false}
        onClose={onClose}
        onSave={onSave}
      />,
    )
    rerender(
      <AddCourseDialog
        semesters={buildSemesters()}
        trackInfo={buildTrackInfo()}
        open
        onClose={onClose}
        onSave={onSave}
      />,
    )

    courseIdInput = getByLabelText(/Course ID/) as HTMLInputElement
    creditsInput = getByLabelText(/Credits/) as HTMLInputElement

    expect(courseIdInput.value).toBe('')
    expect(creditsInput.value).toBe('')
  })

  it('focuses close button when dialog opens', () => {
    const onSave =
      vi.fn<
        (args: { courseId: string; credits: number; trackId: string; semesterId: string }) => void
      >()
    const onClose = vi.fn<() => void>()

    const { getByRole } = render(
      <AddCourseDialog
        semesters={buildSemesters()}
        trackInfo={buildTrackInfo()}
        open
        onClose={onClose}
        onSave={onSave}
      />,
    )

    const closeButton = getByRole('button', { name: 'Close' })
    expect(document.activeElement).toBe(closeButton)
  })
})
