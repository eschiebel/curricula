import { render, waitFor } from '@testing-library/preact'
import { describe, expect, it, vi } from 'vitest'
import type { Curriculum } from '../components/CurriculumGraph'

const cytoscapeCapture = vi.hoisted(() => {
  return {
    lastOptions: null as null | { elements?: unknown },
  }
})

vi.mock('cytoscape', () => {
  const cy = {
    on: vi.fn(),
    pan: vi.fn((value?: { x: number; y: number }) => {
      if (value) return value
      return { x: 0, y: 0 }
    }),
    zoom: vi.fn((value?: unknown) => {
      if (value != null && typeof value === 'object') return 1
      if (typeof value === 'number') return value
      return 1
    }),
    width: vi.fn(() => 800),
    height: vi.fn(() => 600),
    batch: vi.fn((fn: () => void) => fn()),
    $: vi.fn(() => ({
      length: 0,
      unselect: vi.fn(),
      removeClass: vi.fn(),
      addClass: vi.fn(),
      select: vi.fn(),
    })),
    destroy: vi.fn(),
  }

  const cytoscape = (options: { elements?: unknown }) => {
    cytoscapeCapture.lastOptions = options
    return cy
  }

  return { __esModule: true, default: cytoscape }
})

describe('CurriculumGraph (render)', () => {
  it('sets semester header label with total credits for currently placed courses (respects new_semester)', async () => {
    const curriculum: Curriculum = {
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
          prerequisiteIds: [],
          corequisiteIds: [],
          semesterId: 's1',
        },
        {
          id: 'C2',
          name: 'Course 2',
          credits: 4,
          prerequisiteIds: [],
          corequisiteIds: [],
          semesterId: 's2',
          new_semester: 's1',
        },
      ],
    }

    const { CurriculumGraph } = await import('../components/CurriculumGraph')

    render(
      <CurriculumGraph curriculum={curriculum} setStatus={() => {}} onCourseSelect={() => {}} />,
    )

    await waitFor(() => {
      expect(cytoscapeCapture.lastOptions).not.toBeNull()
    })

    const elements = (
      cytoscapeCapture.lastOptions as { elements: Array<{ data?: Record<string, unknown> }> }
    ).elements

    const headerS1 = elements.find((e) => e.data?.id === 'semester:s1')
    const headerS2 = elements.find((e) => e.data?.id === 'semester:s2')

    expect(headerS1?.data?.label).toBe('Semester 1\n7 credits')
    expect(headerS2?.data?.label).toBe('Semester 2\n0 credits')
  })
})
