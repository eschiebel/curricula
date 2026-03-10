import { render, waitFor } from '@testing-library/preact'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Curriculum } from '../components/CurriculumGraph'

type CytoscapeTapEvent = { target: unknown }
type CytoscapeHandler = (evt: unknown) => void

type CytoscapeHandlerRegistration = {
  event: string
  selector: string | null
  handler: CytoscapeHandler
}

type CytoscapeStyleEntry = { selector: string; style: Record<string, unknown> }
type CurriculumGraphComponent = typeof import('../components/CurriculumGraph').CurriculumGraph

let CurriculumGraph: CurriculumGraphComponent

const cytoscapeCapture = vi.hoisted(() => {
  return {
    lastOptions: null as null | { elements?: unknown; style?: unknown },
    cy: null as unknown,
    handlers: [] as CytoscapeHandlerRegistration[],
    spies: {
      nodeUnselect: vi.fn(),
      nodeRemoveClass: vi.fn(),
      nodeAddClass: vi.fn(),
      nodeSelect: vi.fn(),
      edgeRemoveClass: vi.fn(),
      edgeAddClass: vi.fn(),
    },
  }
})

vi.mock('cytoscape', () => {
  const makeNodeCollection = (length: number) => {
    return {
      length,
      unselect: cytoscapeCapture.spies.nodeUnselect,
      removeClass: cytoscapeCapture.spies.nodeRemoveClass,
      addClass: cytoscapeCapture.spies.nodeAddClass,
      select: cytoscapeCapture.spies.nodeSelect,
      filter: vi.fn(() => makeNodeCollection(length)),
    }
  }

  const makeEdgeCollection = (length: number) => {
    return {
      length,
      removeClass: cytoscapeCapture.spies.edgeRemoveClass,
      addClass: cytoscapeCapture.spies.edgeAddClass,
      sources: vi.fn(() => makeNodeCollection(length)),
    }
  }

  const cy = {
    on: vi.fn((event: string, selectorOrHandler: unknown, maybeHandler?: unknown) => {
      if (typeof selectorOrHandler === 'function') {
        cytoscapeCapture.handlers.push({
          event,
          selector: null,
          handler: selectorOrHandler as CytoscapeHandler,
        })
        return
      }

      if (typeof maybeHandler === 'function') {
        cytoscapeCapture.handlers.push({
          event,
          selector: String(selectorOrHandler),
          handler: maybeHandler as CytoscapeHandler,
        })
      }
    }),
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
    nodes: vi.fn(() => makeNodeCollection(0)),
    elements: vi.fn(() => ({
      boundingBox: () => ({
        x1: 0,
        y1: 0,
        x2: 800,
        y2: 600,
        w: 800,
        h: 600,
      }),
    })),
    fit: vi.fn(),
    center: vi.fn(),
    $: vi.fn((selector: string) => {
      if (selector === 'node') return makeNodeCollection(1)
      if (selector === 'edge') return makeEdgeCollection(1)

      if (selector.startsWith('node[') || selector.startsWith('node[id')) {
        // Used for selecting the selectedCourseId node. Assume it exists.
        return makeNodeCollection(1)
      }

      if (selector.startsWith('edge[')) {
        return makeEdgeCollection(1)
      }

      return makeNodeCollection(0)
    }),
    destroy: vi.fn(),
  }

  const cytoscape = (options: { elements?: unknown }) => {
    cytoscapeCapture.lastOptions = options
    cytoscapeCapture.cy = cy
    return cy
  }

  return { __esModule: true, default: cytoscape }
})

beforeEach(async () => {
  ;({ CurriculumGraph } = await import('../components/CurriculumGraph'))
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

  it('includes highlight selectors for selected course relations', async () => {
    const curriculum: Curriculum = {
      curriculumId: 'curr-1',
      name: 'Test Curriculum',
      totalCredits: 0,
      semesters: [{ id: 's1', name: 'Semester 1', order: 1 }],
      courses: [
        {
          id: 'C1',
          name: 'Course 1',
          credits: 3,
          prerequisiteIds: [],
          corequisiteIds: [],
          semesterId: 's1',
        },
      ],
    }

    render(
      <CurriculumGraph curriculum={curriculum} setStatus={() => {}} onCourseSelect={() => {}} />,
    )

    await waitFor(() => {
      expect(cytoscapeCapture.lastOptions).not.toBeNull()
    })

    const style = (cytoscapeCapture.lastOptions as { style?: unknown })
      .style as CytoscapeStyleEntry[]
    const edgeRule = style.find((s) => s.selector === 'edge.selected-course-relation')
    const nodeRule = style.find((s) => s.selector === 'node.selected-course-relation-node')

    expect(edgeRule).toBeTruthy()
    expect(nodeRule).toBeTruthy()
    expect(edgeRule?.style?.width as number).toBeGreaterThan(2)
    expect(nodeRule?.style?.['border-width'] as number).toBeGreaterThan(1.5)
  })

  it('applies highlight classes to relation edges and nodes when selectedCourseId is set', async () => {
    cytoscapeCapture.spies.edgeAddClass.mockClear()
    cytoscapeCapture.spies.nodeAddClass.mockClear()
    cytoscapeCapture.spies.edgeRemoveClass.mockClear()
    cytoscapeCapture.spies.nodeRemoveClass.mockClear()

    const curriculum: Curriculum = {
      curriculumId: 'curr-1',
      name: 'Test Curriculum',
      totalCredits: 0,
      semesters: [{ id: 's1', name: 'Semester 1', order: 1 }],
      courses: [
        {
          id: 'C1',
          name: 'Course 1',
          credits: 3,
          prerequisiteIds: ['C0'],
          corequisiteIds: [],
          semesterId: 's1',
        },
        {
          id: 'C0',
          name: 'Course 0',
          credits: 3,
          prerequisiteIds: [],
          corequisiteIds: [],
          semesterId: 's1',
        },
      ],
    }

    render(
      <CurriculumGraph
        curriculum={curriculum}
        setStatus={() => {}}
        onCourseSelect={() => {}}
        selectedCourseId={'C1'}
      />,
    )

    await waitFor(() => {
      expect(cytoscapeCapture.cy).not.toBeNull()
    })

    expect(cytoscapeCapture.spies.edgeRemoveClass).toHaveBeenCalledWith('selected-course-relation')
    expect(cytoscapeCapture.spies.nodeRemoveClass).toHaveBeenCalledWith(
      'selected-course-relation-node',
    )

    expect(cytoscapeCapture.spies.edgeAddClass).toHaveBeenCalledWith('selected-course-relation')
    expect(cytoscapeCapture.spies.nodeAddClass).toHaveBeenCalledWith(
      'selected-course-relation-node',
    )
  })

  it('tapping the graph background deselects via onCourseSelect(null)', async () => {
    cytoscapeCapture.handlers.length = 0
    const onCourseSelect = vi.fn()

    const curriculum: Curriculum = {
      curriculumId: 'curr-1',
      name: 'Test Curriculum',
      totalCredits: 0,
      semesters: [{ id: 's1', name: 'Semester 1', order: 1 }],
      courses: [
        {
          id: 'C1',
          name: 'Course 1',
          credits: 3,
          prerequisiteIds: [],
          corequisiteIds: [],
          semesterId: 's1',
        },
      ],
    }

    render(
      <CurriculumGraph
        curriculum={curriculum}
        setStatus={() => {}}
        onCourseSelect={onCourseSelect}
        selectedCourseId={'C1'}
      />,
    )

    await waitFor(() => {
      expect(cytoscapeCapture.cy).not.toBeNull()
    })

    const cy = cytoscapeCapture.cy
    const backgroundTap = cytoscapeCapture.handlers.find(
      (h) => h.event === 'tap' && h.selector == null,
    )
    expect(backgroundTap).toBeTruthy()

    backgroundTap?.handler({ target: cy } satisfies CytoscapeTapEvent)

    expect(onCourseSelect).toHaveBeenCalledWith(null)
  })

  it('selects a course when beginning a drag (grab)', async () => {
    cytoscapeCapture.handlers.length = 0
    const onCourseSelect = vi.fn()

    const curriculum: Curriculum = {
      curriculumId: 'curr-1',
      name: 'Test Curriculum',
      totalCredits: 0,
      semesters: [{ id: 's1', name: 'Semester 1', order: 1 }],
      courses: [
        {
          id: 'C1',
          name: 'Course 1',
          credits: 3,
          prerequisiteIds: [],
          corequisiteIds: [],
          semesterId: 's1',
        },
      ],
    }

    render(
      <CurriculumGraph
        curriculum={curriculum}
        setStatus={() => {}}
        onCourseSelect={onCourseSelect}
      />,
    )

    await waitFor(() => {
      expect(cytoscapeCapture.cy).not.toBeNull()
    })

    const grabHandler = cytoscapeCapture.handlers.find(
      (h) => h.event === 'grab' && h.selector === 'node',
    )
    expect(grabHandler).toBeTruthy()

    const node = {
      data: () => ({ id: 'C1' }),
      select: vi.fn(),
    }

    grabHandler?.handler({ target: node })

    expect(onCourseSelect).toHaveBeenCalledWith('C1')
  })
})
