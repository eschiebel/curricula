import { fireEvent, render, waitFor } from '@testing-library/preact'
import { describe, expect, it, vi } from 'vitest'
import type { Curriculum } from '../components/CurriculumGraph'

vi.mock('../components/CurriculumGraph', () => {
  return {
    CurriculumGraph: () => <div data-testid="graph" />,
  }
})

vi.mock('../components/CurriculumList', () => {
  return {
    CurriculumList: (props: {
      selectedCourseId: string | null
      onCourseMoveBySemester?: (courseId: string, direction: 'previous' | 'next') => void
    }) => (
      <div>
        <div data-testid="selected">{props.selectedCourseId ?? 'none'}</div>
        <button type="button" onClick={() => props.onCourseMoveBySemester?.('C1', 'next')}>
          Move C1 next
        </button>
        <button type="button" onClick={() => props.onCourseMoveBySemester?.('C1', 'previous')}>
          Move C1 previous
        </button>
      </div>
    ),
  }
})

describe('CurriculumView', () => {
  function buildCurriculumFixture(): Curriculum {
    return {
      curriculumId: 'curr-1',
      name: 'Test Curriculum',
      totalCredits: 0,
      semesters: [
        { id: 's1', name: 'Semester 1', order: 1 },
        { id: 's2', name: 'Semester 2', order: 2 },
      ],
      courses: [
        {
          id: 'C1',
          name: 'Course 1',
          credits: 3,
          semesterId: 's1',
          prerequisiteIds: [],
          corequisiteIds: [],
        },
      ],
    }
  }

  it('moves a course to the next semester via onCourseMoveBySemester and keeps it selected', async () => {
    vi.useFakeTimers()

    document.body.innerHTML = '<div id="screenreader-alert"></div>'

    const onCourseMoved = vi.fn()
    const setStatus = vi.fn()

    const { CurriculumView } = await import('../components/CurriculumView')
    const { getByRole, getByTestId } = render(
      <CurriculumView
        curriculum={buildCurriculumFixture()}
        setStatus={setStatus}
        onCourseMoved={onCourseMoved}
      />,
    )

    fireEvent.click(getByRole('button', { name: 'Move C1 next' }))

    expect(onCourseMoved).toHaveBeenCalledWith('C1', 's2')
    expect(getByTestId('selected').textContent).toBe('C1')

    vi.advanceTimersByTime(11)

    await waitFor(() => {
      const region = document.getElementById('screenreader-alert')
      expect(region?.textContent).toContain('Course Course 1 moved to semester Semester 2')
    })

    vi.useRealTimers()
  })

  it('does not move a course to the previous semester when it is already in the first semester', async () => {
    const onCourseMoved = vi.fn()
    const setStatus = vi.fn()

    const { CurriculumView } = await import('../components/CurriculumView')
    const { getByRole } = render(
      <CurriculumView
        curriculum={buildCurriculumFixture()}
        setStatus={setStatus}
        onCourseMoved={onCourseMoved}
      />,
    )

    fireEvent.click(getByRole('button', { name: 'Move C1 previous' }))

    expect(onCourseMoved).not.toHaveBeenCalled()
  })

  it('clears selection on Escape when a course is selected', async () => {
    const onCourseMoved = vi.fn()
    const setStatus = vi.fn()

    const { CurriculumView } = await import('../components/CurriculumView')
    const { getByRole, getByTestId } = render(
      <CurriculumView
        curriculum={buildCurriculumFixture()}
        setStatus={setStatus}
        onCourseMoved={onCourseMoved}
      />,
    )

    fireEvent.click(getByRole('button', { name: 'Move C1 next' }))
    expect(getByTestId('selected').textContent).toBe('C1')

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(getByTestId('selected').textContent).toBe('none')
  })
})
