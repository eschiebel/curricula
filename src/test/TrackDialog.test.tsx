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
    expect(getByText('General')).toBeInTheDocument()
    expect(getByText('Curriculum')).toBeInTheDocument()
    expect(getByText('Tracks')).toBeInTheDocument()
    expect(getByText('A11y')).toBeInTheDocument()
  })

  it('calls onClose when clicking the close button', () => {
    const onClose = vi.fn()

    const { getByRole } = render(<TrackDialog curriculum={null} open={true} onClose={onClose} />)

    fireEvent.click(getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('defaults to the General tab and can switch between tabs', () => {
    const { container, getByText } = render(
      <TrackDialog curriculum={null} open={true} onClose={() => {}} />,
    )

    const infoRadio = container.querySelector('#track-dialog-tab-info') as HTMLInputElement | null
    const curriculumLegendRadio = container.querySelector(
      '#track-dialog-tab-curriculum-legend',
    ) as HTMLInputElement | null
    const trackLegendRadio = container.querySelector(
      '#track-dialog-tab-track-legend',
    ) as HTMLInputElement | null
    const a11yRadio = container.querySelector('#track-dialog-tab-a11y') as HTMLInputElement | null

    expect(infoRadio).not.toBeNull()
    expect(curriculumLegendRadio).not.toBeNull()
    expect(trackLegendRadio).not.toBeNull()
    expect(a11yRadio).not.toBeNull()

    expect(infoRadio?.checked).toBe(true)
    expect(curriculumLegendRadio?.checked).toBe(false)
    expect(trackLegendRadio?.checked).toBe(false)
    expect(a11yRadio?.checked).toBe(false)

    fireEvent.click(getByText('Curriculum'))
    expect(infoRadio?.checked).toBe(false)
    expect(curriculumLegendRadio?.checked).toBe(true)
    expect(trackLegendRadio?.checked).toBe(false)

    fireEvent.click(getByText('Tracks'))
    expect(infoRadio?.checked).toBe(false)
    expect(curriculumLegendRadio?.checked).toBe(false)
    expect(trackLegendRadio?.checked).toBe(true)
    expect(a11yRadio?.checked).toBe(false)

    fireEvent.click(getByText('A11y'))
    expect(infoRadio?.checked).toBe(false)
    expect(curriculumLegendRadio?.checked).toBe(false)
    expect(trackLegendRadio?.checked).toBe(false)
    expect(a11yRadio?.checked).toBe(true)

    fireEvent.click(getByText('General'))
    expect(infoRadio?.checked).toBe(true)
    expect(curriculumLegendRadio?.checked).toBe(false)
    expect(trackLegendRadio?.checked).toBe(false)
    expect(a11yRadio?.checked).toBe(false)
  })

  it('shows the track legend empty state when curriculum is null', () => {
    const { getByText } = render(<TrackDialog curriculum={null} open={true} onClose={() => {}} />)

    fireEvent.click(getByText('Tracks'))

    getByText('Load a curriculum to see tracks.')
  })

  it('renders track rows when curriculum is provided', () => {
    const curriculum = buildCurriculumFixture()

    const { getByText } = render(
      <TrackDialog curriculum={curriculum} open={true} onClose={() => {}} />,
    )

    fireEvent.click(getByText('Tracks'))

    getByText('Track One')
    getByText('Track Two')
  })
})
