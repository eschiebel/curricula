import { fireEvent, render } from '@testing-library/preact'
import { describe, expect, it, vi } from 'vitest'
import type { Course, Curriculum, Semester, TrackDefinition } from '../components/CurriculumGraph'
import { TrackDialog } from '../components/TrackDialog'

function buildCurriculumFixture(overrides?: Partial<Curriculum>): Curriculum {
  const semesters: Semester[] = overrides?.semesters ?? [{ id: 's1', name: 'Semester 1', order: 1 }]

  const course = (c: Partial<Course> & Pick<Course, 'id' | 'semesterId'>): Course => ({
    id: c.id,
    semesterId: c.semesterId,
    name: c.name ?? c.id,
    credits: c.credits ?? 3,
    prerequisiteIds: c.prerequisiteIds ?? [],
    corequisiteIds: c.corequisiteIds ?? [],
    trackId: c.trackId,
  })

  const courses: Course[] = overrides?.courses ?? [
    course({ id: 'C1', semesterId: 's1', trackId: 't1' }),
    course({ id: 'C2', semesterId: 's1', trackId: 't2' }),
  ]

  const tracks: TrackDefinition[] | undefined = overrides?.tracks ?? [
    { id: 't1', name: 'Track One' },
    { id: 't2', name: 'Track Two' },
  ]

  return {
    curriculumId: overrides?.curriculumId ?? 'curr-1',
    name: overrides?.name ?? 'Test Curriculum',
    totalCredits: overrides?.totalCredits ?? 6,
    tracks,
    semesters,
    courses,
  }
}

describe('TrackDialog', () => {
  it('does not render when open is false', () => {
    const { queryByRole } = render(
      <TrackDialog curriculum={null} open={false} onClose={() => {}} />,
    )

    expect(queryByRole('dialog')).toBeNull()
  })

  it('renders when open is true', () => {
    const { getByRole, getByText } = render(
      <TrackDialog curriculum={null} open={true} onClose={() => {}} />,
    )

    expect(getByRole('dialog', { name: 'Help' })).toBeInTheDocument()
    expect(getByText('General info')).toBeInTheDocument()
    expect(getByText('Track legend')).toBeInTheDocument()
  })

  it('calls onClose when clicking the close button', () => {
    const onClose = vi.fn()

    const { getByRole } = render(<TrackDialog curriculum={null} open={true} onClose={onClose} />)

    fireEvent.click(getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('defaults to the General info tab and can switch to Track legend tab', () => {
    const { container, getByText } = render(
      <TrackDialog curriculum={null} open={true} onClose={() => {}} />,
    )

    const infoRadio = container.querySelector('#track-dialog-tab-info') as HTMLInputElement | null
    const legendRadio = container.querySelector(
      '#track-dialog-tab-legend',
    ) as HTMLInputElement | null

    expect(infoRadio).not.toBeNull()
    expect(legendRadio).not.toBeNull()

    expect(infoRadio?.checked).toBe(true)
    expect(legendRadio?.checked).toBe(false)

    fireEvent.click(getByText('Track legend'))
    expect(infoRadio?.checked).toBe(false)
    expect(legendRadio?.checked).toBe(true)

    fireEvent.click(getByText('General info'))
    expect(infoRadio?.checked).toBe(true)
    expect(legendRadio?.checked).toBe(false)
  })

  it('shows the track legend empty state when curriculum is null', () => {
    const { getByText } = render(<TrackDialog curriculum={null} open={true} onClose={() => {}} />)

    getByText('Load a curriculum to see tracks.')
  })

  it('renders track rows when curriculum is provided', () => {
    const curriculum = buildCurriculumFixture()

    const { getByText } = render(
      <TrackDialog curriculum={curriculum} open={true} onClose={() => {}} />,
    )

    getByText('Track One')
    getByText('Track Two')
  })
})
