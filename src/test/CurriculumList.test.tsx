import { fireEvent, render } from '@testing-library/preact'
import { describe, expect, it, vi } from 'vitest'
import type { Course, Curriculum, Semester } from '../components/CurriculumGraph'
import { CurriculumList } from '../components/CurriculumList'

function buildCurriculumFixture(): Curriculum {
  const semesters: Semester[] = [
    { id: 's1', name: 'Semester 1', order: 1 },
    { id: 's2', name: 'Semester 2', order: 2 },
  ]

  const course = (overrides: Partial<Course> & Pick<Course, 'id' | 'semesterId'>): Course => ({
    id: overrides.id,
    semesterId: overrides.semesterId,
    name: overrides.name ?? overrides.id,
    credits: overrides.credits ?? 3,
    prerequisiteIds: overrides.prerequisiteIds ?? [],
    corequisiteIds: overrides.corequisiteIds ?? [],
    trackId: overrides.trackId,
  })

  const courses: Course[] = [
    course({ id: 'C1', semesterId: 's1', trackId: 't1' }),
    course({ id: 'C2', semesterId: 's1', trackId: 't1' }),
    course({ id: 'C3', semesterId: 's2', trackId: 't1' }),
  ]

  return {
    curriculumId: 'curr-1',
    name: 'Test Curriculum',
    totalCredits: 9,
    semesters,
    courses,
  }
}

describe('CurriculumList', () => {
  it('renders a listbox per semester and lists courses by id', () => {
    const curriculum = buildCurriculumFixture()

    const onCourseSelect = vi.fn()
    const onCourseMoveBySemester = vi.fn()
    const onSemesterFocus = vi.fn()

    const { getByRole, getByText } = render(
      <CurriculumList
        curriculum={curriculum}
        selectedCourseId={null}
        onCourseSelect={onCourseSelect}
        onCourseMoveBySemester={onCourseMoveBySemester}
        onSemesterFocus={onSemesterFocus}
      />,
    )

    getByRole('listbox', { name: 'Semester 1 (6 credits)' })
    getByRole('listbox', { name: 'Semester 2 (3 credits)' })

    getByText('C1')
    getByText('C2')
    getByText('C3')
  })

  it('ArrowDown selects the next course within the focused semester (using selectedCourseId)', () => {
    const curriculum = buildCurriculumFixture()

    const onCourseSelect = vi.fn()
    const onCourseMoveBySemester = vi.fn()
    const onSemesterFocus = vi.fn()

    const { getByRole } = render(
      <CurriculumList
        curriculum={curriculum}
        selectedCourseId={'C1'}
        onCourseSelect={onCourseSelect}
        onCourseMoveBySemester={onCourseMoveBySemester}
        onSemesterFocus={onSemesterFocus}
      />,
    )

    const semester1List = getByRole('listbox', { name: 'Semester 1 (6 credits)' })
    fireEvent.keyDown(semester1List, { key: 'ArrowDown' })

    expect(onCourseSelect).toHaveBeenCalledWith('C2')
  })

  it('ArrowUp selects the previous course within the focused semester (using selectedCourseId)', () => {
    const curriculum = buildCurriculumFixture()

    const onCourseSelect = vi.fn()
    const onCourseMoveBySemester = vi.fn()
    const onSemesterFocus = vi.fn()

    const { getByRole } = render(
      <CurriculumList
        curriculum={curriculum}
        selectedCourseId={'C2'}
        onCourseSelect={onCourseSelect}
        onCourseMoveBySemester={onCourseMoveBySemester}
        onSemesterFocus={onSemesterFocus}
      />,
    )

    const semester1List = getByRole('listbox', { name: 'Semester 1 (6 credits)' })
    fireEvent.keyDown(semester1List, { key: 'ArrowUp' })

    expect(onCourseSelect).toHaveBeenCalledWith('C1')
  })

  it('Arrow navigation uses the active item when present (event.target dataset)', () => {
    const curriculum = buildCurriculumFixture()

    const onCourseSelect = vi.fn()
    const onCourseMoveBySemester = vi.fn()
    const onSemesterFocus = vi.fn()

    const { getByText } = render(
      <CurriculumList
        curriculum={curriculum}
        selectedCourseId={null}
        onCourseSelect={onCourseSelect}
        onCourseMoveBySemester={onCourseMoveBySemester}
        onSemesterFocus={onSemesterFocus}
      />,
    )

    const c1 = getByText('C1')

    c1.focus()
    fireEvent.keyDown(c1, { key: 'ArrowDown' })

    expect(onCourseSelect).toHaveBeenCalledWith('C2')
  })

  it('Shift+ArrowRight calls onCourseMoveBySemester with next', () => {
    const curriculum = buildCurriculumFixture()

    const onCourseSelect = vi.fn()
    const onCourseMoveBySemester = vi.fn()
    const onSemesterFocus = vi.fn()

    const { getByRole } = render(
      <CurriculumList
        curriculum={curriculum}
        selectedCourseId={'C1'}
        onCourseSelect={onCourseSelect}
        onCourseMoveBySemester={onCourseMoveBySemester}
        onSemesterFocus={onSemesterFocus}
      />,
    )

    const semester1List = getByRole('listbox', { name: 'Semester 1 (6 credits)' })
    fireEvent.keyDown(semester1List, { key: 'ArrowRight', shiftKey: true })

    expect(onCourseMoveBySemester).toHaveBeenCalledWith('C1', 'next')
  })

  it('Shift+ArrowLeft calls onCourseMoveBySemester with previous', () => {
    const curriculum = buildCurriculumFixture()

    const onCourseSelect = vi.fn()
    const onCourseMoveBySemester = vi.fn()
    const onSemesterFocus = vi.fn()

    const { getByRole } = render(
      <CurriculumList
        curriculum={curriculum}
        selectedCourseId={'C2'}
        onCourseSelect={onCourseSelect}
        onCourseMoveBySemester={onCourseMoveBySemester}
        onSemesterFocus={onSemesterFocus}
      />,
    )

    const semester1List = getByRole('listbox', { name: 'Semester 1 (6 credits)' })
    fireEvent.keyDown(semester1List, { key: 'ArrowLeft', shiftKey: true })

    expect(onCourseMoveBySemester).toHaveBeenCalledWith('C2', 'previous')
  })

  it('focus events set the focused semester id', () => {
    const curriculum = buildCurriculumFixture()

    const onCourseSelect = vi.fn()
    const onCourseMoveBySemester = vi.fn()
    const onSemesterFocus = vi.fn()

    const { getByRole, getByText } = render(
      <CurriculumList
        curriculum={curriculum}
        selectedCourseId={null}
        onCourseSelect={onCourseSelect}
        onCourseMoveBySemester={onCourseMoveBySemester}
        onSemesterFocus={onSemesterFocus}
      />,
    )

    const semester2List = getByRole('listbox', { name: 'Semester 2 (3 credits)' })
    fireEvent.focus(semester2List)
    expect(onSemesterFocus).toHaveBeenCalledWith('s2')

    const c3 = getByText('C3')
    fireEvent.focus(c3)
    expect(onSemesterFocus).toHaveBeenCalledWith('s2')
  })

  it('focuses the selected course item when selectedCourseId changes', () => {
    const curriculum = buildCurriculumFixture()

    const onCourseSelect = vi.fn()
    const onCourseMoveBySemester = vi.fn()
    const onSemesterFocus = vi.fn()

    const { getByText, rerender } = render(
      <CurriculumList
        curriculum={curriculum}
        selectedCourseId={null}
        onCourseSelect={onCourseSelect}
        onCourseMoveBySemester={onCourseMoveBySemester}
        onSemesterFocus={onSemesterFocus}
      />,
    )

    rerender(
      <CurriculumList
        curriculum={curriculum}
        selectedCourseId={'C2'}
        onCourseSelect={onCourseSelect}
        onCourseMoveBySemester={onCourseMoveBySemester}
        onSemesterFocus={onSemesterFocus}
      />,
    )

    expect(document.activeElement).toBe(getByText('C2'))
  })

  it('includes credit totals in aria-label and respects new_semester overrides', () => {
    const semesters: Semester[] = [
      { id: 's1', name: 'Semester 1', order: 1 },
      { id: 's2', name: 'Semester 2', order: 2 },
    ]

    const courses: Course[] = [
      {
        id: 'C1',
        name: 'Course 1',
        credits: 3,
        prerequisiteIds: [],
        corequisiteIds: [],
        semesterId: 's1',
      },
      {
        id: 'C2',
        name: 'Course 2',
        credits: 3,
        prerequisiteIds: [],
        corequisiteIds: [],
        semesterId: 's1',
      },
      {
        id: 'C3',
        name: 'Course 3',
        credits: 4,
        prerequisiteIds: [],
        corequisiteIds: [],
        semesterId: 's2',
        new_semester: 's1',
      },
    ]

    const curriculum: Curriculum = {
      curriculumId: 'curr-1',
      name: 'Test Curriculum',
      totalCredits: 10,
      semesters,
      courses,
    }

    const { getByRole } = render(
      <CurriculumList
        curriculum={curriculum}
        selectedCourseId={null}
        onCourseSelect={vi.fn()}
        onCourseMoveBySemester={vi.fn()}
        onSemesterFocus={vi.fn()}
      />,
    )

    getByRole('listbox', { name: 'Semester 1 (10 credits)' })
    getByRole('listbox', { name: 'Semester 2 (0 credits)' })
  })
})
