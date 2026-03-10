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
      prerequisiteIds: [],
      corequisiteIds: [],
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
      prerequisiteIds: [],
      corequisiteIds: [],
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
      prerequisiteIds: [],
      corequisiteIds: [],
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

describe('CourseDialog - Prerequisites and Corequisites Mutual Exclusion', () => {
  function buildCoursesForPrereqTests(): Course[] {
    return [
      {
        id: 'MATH-101',
        name: 'Calculus I',
        credits: 4,
        semesterId: 's1',
        trackId: 'math',
        prerequisiteIds: [],
        corequisiteIds: [],
      },
      {
        id: 'PHYS-201',
        name: 'Physics I',
        credits: 3,
        semesterId: 's1',
        trackId: 'physics',
        prerequisiteIds: [],
        corequisiteIds: [],
      },
      {
        id: 'CHEM-101',
        name: 'Chemistry I',
        credits: 3,
        semesterId: 's1',
        trackId: 'physics',
        prerequisiteIds: [],
        corequisiteIds: [],
      },
    ]
  }

  it('disables course in corequisites when selected as prerequisite', () => {
    const onSave = vi.fn()
    const onClose = vi.fn()

    const { getAllByRole } = render(
      <CourseDialog
        mode="add"
        courses={buildCoursesForPrereqTests()}
        semesters={buildSemesters()}
        trackInfo={buildTrackInfo()}
        open
        onClose={onClose}
        onSave={onSave}
      />,
    )

    const checkboxes = getAllByRole('checkbox') as HTMLInputElement[]

    // First 3 checkboxes are prerequisites, next 3 are corequisites
    const math101Prereq = checkboxes[0]
    const math101Coreq = checkboxes[3]

    // Initially both should be enabled
    expect(math101Prereq.disabled).toBe(false)
    expect(math101Coreq.disabled).toBe(false)

    // Select MATH-101 as prerequisite
    fireEvent.click(math101Prereq)

    // Now MATH-101 should be disabled in corequisites
    expect(math101Prereq.disabled).toBe(false)
    expect(math101Coreq.disabled).toBe(true)
  })

  it('disables course in prerequisites when selected as corequisite', () => {
    const onSave = vi.fn()
    const onClose = vi.fn()

    const { getAllByRole } = render(
      <CourseDialog
        mode="add"
        courses={buildCoursesForPrereqTests()}
        semesters={buildSemesters()}
        trackInfo={buildTrackInfo()}
        open
        onClose={onClose}
        onSave={onSave}
      />,
    )

    const checkboxes = getAllByRole('checkbox') as HTMLInputElement[]

    // First 3 checkboxes are prerequisites, next 3 are corequisites
    const phys201Prereq = checkboxes[1]
    const phys201Coreq = checkboxes[4]

    // Initially both should be enabled
    expect(phys201Prereq.disabled).toBe(false)
    expect(phys201Coreq.disabled).toBe(false)

    // Select PHYS-201 as corequisite
    fireEvent.click(phys201Coreq)

    // Now PHYS-201 should be disabled in prerequisites
    expect(phys201Prereq.disabled).toBe(true)
    expect(phys201Coreq.disabled).toBe(false)
  })

  it('re-enables course when deselected from opposite list', () => {
    const onSave = vi.fn()
    const onClose = vi.fn()

    const { getAllByRole } = render(
      <CourseDialog
        mode="add"
        courses={buildCoursesForPrereqTests()}
        semesters={buildSemesters()}
        trackInfo={buildTrackInfo()}
        open
        onClose={onClose}
        onSave={onSave}
      />,
    )

    const checkboxes = getAllByRole('checkbox') as HTMLInputElement[]

    const chem101Prereq = checkboxes[2]
    const chem101Coreq = checkboxes[5]

    // Select as prerequisite
    fireEvent.click(chem101Prereq)
    expect(chem101Coreq.disabled).toBe(true)

    // Deselect from prerequisites
    fireEvent.click(chem101Prereq)
    expect(chem101Coreq.disabled).toBe(false)
  })

  it('allows multiple courses to be selected as prerequisites without affecting each other', () => {
    const onSave = vi.fn()
    const onClose = vi.fn()

    const { getAllByRole } = render(
      <CourseDialog
        mode="add"
        courses={buildCoursesForPrereqTests()}
        semesters={buildSemesters()}
        trackInfo={buildTrackInfo()}
        open
        onClose={onClose}
        onSave={onSave}
      />,
    )

    const checkboxes = getAllByRole('checkbox') as HTMLInputElement[]

    const math101Prereq = checkboxes[0]
    const phys201Prereq = checkboxes[1]
    const math101Coreq = checkboxes[3]
    const phys201Coreq = checkboxes[4]

    // Select both as prerequisites
    fireEvent.click(math101Prereq)
    fireEvent.click(phys201Prereq)

    // Both should be disabled in corequisites
    expect(math101Coreq.disabled).toBe(true)
    expect(phys201Coreq.disabled).toBe(true)

    // Both should still be enabled in prerequisites
    expect(math101Prereq.disabled).toBe(false)
    expect(phys201Prereq.disabled).toBe(false)
  })

  it('prevents saving course with same course as both prerequisite and corequisite', () => {
    const onSave = vi.fn()
    const onClose = vi.fn()

    const { getAllByRole, getByRole, getByLabelText } = render(
      <CourseDialog
        mode="add"
        courses={buildCoursesForPrereqTests()}
        semesters={buildSemesters()}
        trackInfo={buildTrackInfo()}
        open
        onClose={onClose}
        onSave={onSave}
      />,
    )

    // Fill in required fields
    const courseIdInput = getByLabelText(/Course ID/)
    const creditsInput = getByLabelText(/Credits/)
    fireEvent.input(courseIdInput, { target: { value: 'EMEC-100' } })
    fireEvent.input(creditsInput, { target: { value: '3' } })

    const checkboxes = getAllByRole('checkbox') as HTMLInputElement[]

    // Select MATH-101 as prerequisite
    fireEvent.click(checkboxes[0])

    // Try to select MATH-101 as corequisite (should be disabled)
    const math101Coreq = checkboxes[3]
    expect(math101Coreq.disabled).toBe(true)

    // Save
    fireEvent.click(getByRole('button', { name: 'Save' }))

    // Should have saved with only prerequisite, not corequisite
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        prerequisiteIds: ['MATH-101'],
        corequisiteIds: [],
      }),
    )
  })

  it('pre-populates disabled state in edit mode', () => {
    const onSave = vi.fn()
    const onClose = vi.fn()

    const course: Course = {
      id: 'EMEC-200',
      name: 'Engineering Mechanics',
      credits: 3,
      semesterId: 's2',
      trackId: 'physics',
      prerequisiteIds: ['MATH-101'],
      corequisiteIds: ['PHYS-201'],
    }

    const { getAllByRole } = render(
      <CourseDialog
        mode="edit"
        course={course}
        courses={buildCoursesForPrereqTests()}
        semesters={buildSemesters()}
        trackInfo={buildTrackInfo()}
        open
        onClose={onClose}
        onSave={onSave}
      />,
    )

    const checkboxes = getAllByRole('checkbox') as HTMLInputElement[]

    // MATH-101 is selected as prerequisite, so should be disabled in corequisites
    const math101Coreq = checkboxes[3]
    expect(math101Coreq.disabled).toBe(true)
    expect(math101Coreq.checked).toBe(false)

    // PHYS-201 is selected as corequisite, so should be disabled in prerequisites
    const phys201Prereq = checkboxes[1]
    expect(phys201Prereq.disabled).toBe(true)
    expect(phys201Prereq.checked).toBe(false)
  })
})
