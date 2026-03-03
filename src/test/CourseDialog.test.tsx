import { fireEvent, render } from '@testing-library/preact'
import { describe, expect, it, vi } from 'vitest'
import { CourseDialog } from '../components/CourseDialog'
import type { Course, TrackInfo } from '../components/CurriculumGraph'

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

function buildCourse(): Course {
  return {
    id: 'EMEC-100',
    name: 'EMEC-100',
    credits: 3,
    trackId: 'math',
    prerequisiteIds: [],
    corequisiteIds: [],
    semesterId: 's1',
    userAdded: true,
  }
}

describe('CourseDialog - Add Mode', () => {
  it('renders nothing when open is false', () => {
    const onSave = vi.fn()
    const onClose = vi.fn()

    const { container } = render(
      <CourseDialog
        mode="add"
        semesters={buildSemesters()}
        trackInfo={buildTrackInfo()}
        open={false}
        onClose={onClose}
        onSave={onSave}
      />,
    )

    expect(container.textContent).toBe('')
  })

  it('renders dialog with "Add Course" title when open is true', () => {
    const onSave = vi.fn()
    const onClose = vi.fn()

    const { getByRole } = render(
      <CourseDialog
        mode="add"
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
    const onSave = vi.fn()
    const onClose = vi.fn()

    const { getByRole, getByLabelText } = render(
      <CourseDialog
        mode="add"
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

  it('calls onSave without oldCourseId when Save is clicked in add mode', () => {
    const onSave = vi.fn()
    const onClose = vi.fn()

    const { getByRole, getByLabelText } = render(
      <CourseDialog
        mode="add"
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

  it('includes name in onSave when name field is provided', () => {
    const onSave = vi.fn()
    const onClose = vi.fn()

    const { getByRole, getByLabelText } = render(
      <CourseDialog
        mode="add"
        semesters={buildSemesters()}
        trackInfo={buildTrackInfo()}
        open
        onClose={onClose}
        onSave={onSave}
      />,
    )

    const courseIdInput = getByLabelText(/Course ID/)
    const nameInput = getByLabelText(/Course Name/)
    const creditsInput = getByLabelText(/Credits/)

    fireEvent.input(courseIdInput, { target: { value: 'EMEC-100' } })
    fireEvent.input(nameInput, { target: { value: 'Introduction to Engineering' } })
    fireEvent.input(creditsInput, { target: { value: '3' } })

    fireEvent.click(getByRole('button', { name: 'Save' }))

    expect(onSave).toHaveBeenCalledWith({
      courseId: 'EMEC-100',
      name: 'Introduction to Engineering',
      credits: 3,
      trackId: 'math',
      semesterId: 's1',
    })
  })

  it('defaults to first semester and first track when dialog opens', () => {
    const onSave = vi.fn()
    const onClose = vi.fn()

    const { getByLabelText } = render(
      <CourseDialog
        mode="add"
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
})

describe('CourseDialog - Edit Mode', () => {
  it('renders dialog with "Edit Course" title in edit mode', () => {
    const onSave = vi.fn()
    const onClose = vi.fn()

    const { getByRole } = render(
      <CourseDialog
        mode="edit"
        course={buildCourse()}
        semesters={buildSemesters()}
        trackInfo={buildTrackInfo()}
        open
        onClose={onClose}
        onSave={onSave}
      />,
    )

    expect(getByRole('dialog', { name: 'Edit Course' })).toBeInTheDocument()
  })

  it('pre-populates fields with course data in edit mode', () => {
    const onSave = vi.fn()
    const onClose = vi.fn()
    const course = buildCourse()

    const { getByLabelText } = render(
      <CourseDialog
        mode="edit"
        course={course}
        semesters={buildSemesters()}
        trackInfo={buildTrackInfo()}
        open
        onClose={onClose}
        onSave={onSave}
      />,
    )

    const courseIdInput = getByLabelText(/Course ID/) as HTMLInputElement
    const creditsInput = getByLabelText(/Credits/) as HTMLInputElement
    const trackSelect = getByLabelText(/Track/) as HTMLSelectElement
    const semesterSelect = getByLabelText(/Semester/) as HTMLSelectElement

    expect(courseIdInput.value).toBe('EMEC-100')
    expect(creditsInput.value).toBe('3')
    expect(trackSelect.value).toBe('math')
    expect(semesterSelect.value).toBe('s1')
  })

  it('calls onSave with oldCourseId when Save is clicked in edit mode', () => {
    const onSave = vi.fn()
    const onClose = vi.fn()
    const course = buildCourse()

    const { getByRole, getByLabelText } = render(
      <CourseDialog
        mode="edit"
        course={course}
        semesters={buildSemesters()}
        trackInfo={buildTrackInfo()}
        open
        onClose={onClose}
        onSave={onSave}
      />,
    )

    const courseIdInput = getByLabelText(/Course ID/)
    fireEvent.input(courseIdInput, { target: { value: 'EMEC-101' } })

    fireEvent.click(getByRole('button', { name: 'Save' }))

    expect(onSave).toHaveBeenCalledWith({
      oldCourseId: 'EMEC-100',
      courseId: 'EMEC-101',
      name: 'EMEC-100',
      credits: 3,
      trackId: 'math',
      semesterId: 's1',
    })
  })

  it('renders nothing when course is null in edit mode', () => {
    const onSave = vi.fn()
    const onClose = vi.fn()

    const { container } = render(
      <CourseDialog
        mode="edit"
        course={null}
        semesters={buildSemesters()}
        trackInfo={buildTrackInfo()}
        open
        onClose={onClose}
        onSave={onSave}
      />,
    )

    expect(container.textContent).toBe('')
  })
})

describe('CourseDialog - Common Behavior', () => {
  it('calls onClose when Cancel button is clicked', () => {
    const onSave = vi.fn()
    const onClose = vi.fn()

    const { getByRole } = render(
      <CourseDialog
        mode="add"
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
    const onSave = vi.fn()
    const onClose = vi.fn()

    const { getByRole } = render(
      <CourseDialog
        mode="add"
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
    const onSave = vi.fn()
    const onClose = vi.fn()

    render(
      <CourseDialog
        mode="add"
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

  it('focuses close button when dialog opens', () => {
    const onSave = vi.fn()
    const onClose = vi.fn()

    const { getByRole } = render(
      <CourseDialog
        mode="add"
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

  it('shows Delete button in edit mode when onDelete is provided', () => {
    const onSave = vi.fn()
    const onClose = vi.fn()
    const onDelete = vi.fn()
    const course = buildCourse()

    const { getByRole } = render(
      <CourseDialog
        mode="edit"
        course={course}
        semesters={buildSemesters()}
        trackInfo={buildTrackInfo()}
        open
        onClose={onClose}
        onSave={onSave}
        onDelete={onDelete}
      />,
    )

    expect(getByRole('button', { name: 'Delete' })).toBeInTheDocument()
  })

  it('does not show Delete button in add mode', () => {
    const onSave = vi.fn()
    const onClose = vi.fn()
    const onDelete = vi.fn()

    const { queryByRole } = render(
      <CourseDialog
        mode="add"
        semesters={buildSemesters()}
        trackInfo={buildTrackInfo()}
        open
        onClose={onClose}
        onSave={onSave}
        onDelete={onDelete}
      />,
    )

    expect(queryByRole('button', { name: 'Delete' })).toBeNull()
  })

  it('does not show Delete button in edit mode when onDelete is not provided', () => {
    const onSave = vi.fn()
    const onClose = vi.fn()
    const course = buildCourse()

    const { queryByRole } = render(
      <CourseDialog
        mode="edit"
        course={course}
        semesters={buildSemesters()}
        trackInfo={buildTrackInfo()}
        open
        onClose={onClose}
        onSave={onSave}
      />,
    )

    expect(queryByRole('button', { name: 'Delete' })).toBeNull()
  })

  it('calls onDelete with course ID when Delete button is clicked', () => {
    const onSave = vi.fn()
    const onClose = vi.fn()
    const onDelete = vi.fn()
    const course = buildCourse()

    const { getByRole } = render(
      <CourseDialog
        mode="edit"
        course={course}
        semesters={buildSemesters()}
        trackInfo={buildTrackInfo()}
        open
        onClose={onClose}
        onSave={onSave}
        onDelete={onDelete}
      />,
    )

    fireEvent.click(getByRole('button', { name: 'Delete' }))

    expect(onDelete).toHaveBeenCalledWith('EMEC-100')
  })
})
