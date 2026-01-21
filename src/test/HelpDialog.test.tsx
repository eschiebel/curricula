import { fireEvent, render } from '@testing-library/preact'
import { describe, expect, it, vi } from 'vitest'
import type { Course, Curriculum, Semester, TrackDefinition } from '../components/CurriculumGraph'
import { HelpDialog } from '../components/HelpDialog'

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

describe('HelpDialog', () => {
  it('does not render when open is false', () => {
    const { queryByRole } = render(<HelpDialog curriculum={null} open={false} onClose={() => {}} />)

    expect(queryByRole('dialog')).toBeNull()
  })

  it('renders when open is true', () => {
    const { getByRole, getByText } = render(
      <HelpDialog curriculum={null} open={true} onClose={() => {}} />,
    )

    expect(getByRole('dialog', { name: 'Help' })).toBeInTheDocument()
    expect(getByText('General')).toBeInTheDocument()
    expect(getByText('Legend')).toBeInTheDocument()
    expect(getByText('Tracks')).toBeInTheDocument()
    expect(getByText('Accessibility')).toBeInTheDocument()
  })

  it('focuses the close button when opening', () => {
    const { getByRole, rerender } = render(
      <HelpDialog curriculum={null} open={false} onClose={() => {}} />,
    )

    rerender(<HelpDialog curriculum={null} open={true} onClose={() => {}} />)

    const closeButton = getByRole('button', { name: 'Close' })
    expect(document.activeElement).toBe(closeButton)
  })

  it('calls onClose when clicking the close button', () => {
    const onClose = vi.fn()

    const { getByRole } = render(<HelpDialog curriculum={null} open={true} onClose={onClose} />)

    fireEvent.click(getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('defaults to the General tab and can switch between tabs', () => {
    const { getByRole } = render(<HelpDialog curriculum={null} open={true} onClose={() => {}} />)

    const generalTab = getByRole('tab', { name: 'General' })
    const legendTab = getByRole('tab', { name: 'Legend' })
    const tracksTab = getByRole('tab', { name: 'Tracks' })
    const a11yTab = getByRole('tab', { name: 'Accessibility' })

    expect(generalTab).toHaveAttribute('aria-selected', 'true')
    expect(legendTab).toHaveAttribute('aria-selected', 'false')
    expect(tracksTab).toHaveAttribute('aria-selected', 'false')
    expect(a11yTab).toHaveAttribute('aria-selected', 'false')

    fireEvent.click(legendTab)
    expect(legendTab).toHaveAttribute('aria-selected', 'true')

    fireEvent.click(tracksTab)
    expect(tracksTab).toHaveAttribute('aria-selected', 'true')

    fireEvent.click(a11yTab)
    expect(a11yTab).toHaveAttribute('aria-selected', 'true')

    fireEvent.click(generalTab)
    expect(generalTab).toHaveAttribute('aria-selected', 'true')
  })

  it('activates the next/previous tab with arrow keys', () => {
    const { getByRole } = render(<HelpDialog curriculum={null} open={true} onClose={() => {}} />)

    const generalTab = getByRole('tab', { name: 'General' }) as HTMLButtonElement
    const legendTab = getByRole('tab', { name: 'Legend' })
    const a11yTab = getByRole('tab', { name: 'Accessibility' })

    generalTab.focus()
    expect(document.activeElement).toBe(generalTab)

    fireEvent.keyDown(generalTab, { key: 'ArrowRight' })
    expect(legendTab).toHaveAttribute('aria-selected', 'true')
    expect(document.activeElement).toBe(legendTab)

    fireEvent.keyDown(legendTab, { key: 'ArrowLeft' })
    expect(generalTab).toHaveAttribute('aria-selected', 'true')
    expect(document.activeElement).toBe(generalTab)

    fireEvent.keyDown(generalTab, { key: 'ArrowLeft' })
    expect(a11yTab).toHaveAttribute('aria-selected', 'true')
    expect(document.activeElement).toBe(a11yTab)
  })

  it('shows the track legend empty state when curriculum is null', () => {
    const { getByRole, getByText } = render(
      <HelpDialog curriculum={null} open={true} onClose={() => {}} />,
    )

    fireEvent.click(getByRole('tab', { name: 'Tracks' }))

    expect(getByRole('tabpanel', { name: 'Tracks' })).toBeInTheDocument()
    getByText('Load a curriculum to see tracks.')
  })

  it('renders track rows when curriculum is provided', () => {
    const curriculum = buildCurriculumFixture()

    const { getByRole, getByText } = render(
      <HelpDialog curriculum={curriculum} open={true} onClose={() => {}} />,
    )

    fireEvent.click(getByRole('tab', { name: 'Tracks' }))

    expect(getByRole('tabpanel', { name: 'Tracks' })).toBeInTheDocument()

    getByText('Track One')
    getByText('Track Two')
  })
})
