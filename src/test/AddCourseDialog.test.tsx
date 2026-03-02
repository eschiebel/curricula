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
    const onSave = vi.fn<(args: { courseId: string; credits: number; trackId: string; semesterId: string }) => void>()
    const onClose = vi.fn<() => void>()

    const { container } = render(
      <AddCourseDialog semesters={buildSemesters()} trackInfo={buildTrackInfo()} open={false} onClose={onClose} onSave={onSave} />,
    )

    expect(container.textContent).toBe('')
  })

  it('renders dialog when open is true', () => {
    const onSave = vi.fn<(args: { courseId: string; credits: number; trackId: string; semesterId: string }) => void>()
    const onClose = vi.fn<() => void>()

    const { getByRole } = render(
      <AddCourseDialog semesters={buildSemesters()} trackInfo={buildTrackInfo()} open onClose={onClose} onSave={onSave} />,
    )

    expect(getByRole('dialog', { name: 'Add Course' })).toBeInTheDocument()
  })

  it('disables Save button until all required fields are filled', () => {
    const onSave = vi.fn<(args: { courseId: string; credits: number; trackId: string; semesterId: string }) => void>()
    const onClose = vi.fn<() => void>()

    const { getByRole, getByLabelText } = render(
      <AddCourseDialog semesters={buildSemesters()} trackInfo={buildTrackInfo()} open onClose={onClose} onSave={onSave} />,
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
    const onSave = vi.fn<(args: { courseId: string; credits: number; trackId: string; semesterId: string }) => void>()
    const onClose = vi.fn<() => void>()

    const { getByRole, getByLabelText } = render(
      <AddCourseDialog semesters={buildSemesters()} trackInfo={buildTrackInfo()} open onClose={onClose} onSave={onSave} />,
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
    const onSave = vi.fn<(args: { courseId: string; credits: number; trackId: string; semesterId: string }) => void>()
    const onClose = vi.fn<() => void>()

    const { getByLabelText } = render(
      <AddCourseDialog semesters={buildSemesters()} trackInfo={buildTrackInfo()} open onClose={onClose} onSave={onSave} />,
    )

    const semesterSelect = getByLabelText(/Semester/) as HTMLSelectElement
    const trackSelect = getByLabelText(/Track/) as HTMLSelectElement
    expect(semesterSelect.value).toBe('s1')
    expect(trackSelect.value).toBe('math')
  })

  it('focuses close button when dialog opens', () => {
    const onSave = vi.fn<(args: { courseId: string; credits: number; trackId: string; semesterId: string }) => void>()
    const onClose = vi.fn<() => void>()

    const { getByRole } = render(
      <AddCourseDialog semesters={buildSemesters()} trackInfo={buildTrackInfo()} open onClose={onClose} onSave={onSave} />,
    )

    const closeButton = getByRole('button', { name: 'Close' })
    expect(document.activeElement).toBe(closeButton)
  })
})
