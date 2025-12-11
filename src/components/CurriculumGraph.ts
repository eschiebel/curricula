import cytoscape, { type Core, type ElementDefinition } from 'cytoscape'
import { h } from 'preact'
import { useEffect, useRef } from 'preact/hooks'

export interface Course {
  id: string
  name: string
  credits: number
  prerequisiteIds: string[]
  corequisiteIds: string[]
  /** Primary semester this course belongs to. */
  semesterId: string
}

export interface Semester {
  id: string
  name: string
  order: number
}

export interface Curriculum {
  curriculumId: string
  name: string
  totalCredits: number
  semesters: Semester[]
  courses: Course[]
}

export type StatusSetter = (text: string, isError?: boolean) => void

export interface RenderOptions {
  movedCourseIds?: string[]
  onCourseMoved?: (courseId: string, newSemesterId: string) => void
  selectedCourseId?: string | null
  onCourseSelect: (courseId: string) => void
}

export interface CurriculumGraphProps extends RenderOptions {
  curriculum: Curriculum
  setStatus: StatusSetter
}

export function CurriculumGraph(props: CurriculumGraphProps) {
  const { curriculum, setStatus, movedCourseIds, onCourseMoved, selectedCourseId, onCourseSelect } =
    props
  const containerRef = useRef<HTMLDivElement | null>(null)
  const cyRef = useRef<Core | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    setStatus(`Loaded: ${curriculum.name}`)

    while (container.firstChild) container.removeChild(container.firstChild)

    const semestersSorted = [...(curriculum.semesters || [])].sort((a, b) => a.order - b.order)
    const columnMap: Record<string, number> = {}
    semestersSorted.forEach((sem, i) => {
      columnMap[sem.id] = i * 300
    })

    const semesterIndex: Record<string, number> = {}
    const elements: ElementDefinition[] = []

    for (const sem of semestersSorted) {
      const x = columnMap[sem.id] ?? 0
      const y = 0
      elements.push({
        data: {
          id: `semester:${sem.id}`,
          label: sem.name,
          semester: sem.id,
          type: 'semester-header',
        },
        position: { x, y },
        grabbable: false,
        selectable: false,
      })
    }

    for (const course of curriculum.courses) {
      if (semesterIndex[course.semesterId] == null) {
        semesterIndex[course.semesterId] = 0
      }

      const idx = semesterIndex[course.semesterId]++
      const x = columnMap[course.semesterId] ?? 0
      const y = 120 + idx * 120

      let isMoved = false
      if (Array.isArray(movedCourseIds)) {
        isMoved = movedCourseIds.includes(course.id)
      }

      elements.push({
        data: {
          id: course.id,
          label: `${course.id}\n${course.name}\n${course.credits} cr`,
          semester: course.semesterId,
          moved: isMoved ? 'true' : 'false',
        },
        position: { x, y },
      })
    }

    for (const course of curriculum.courses) {
      if (Array.isArray(course.prerequisiteIds)) {
        for (const prereq of course.prerequisiteIds) {
          if (!prereq) continue
          elements.push({
            data: {
              id: `${prereq}->${course.id}`,
              source: prereq,
              target: course.id,
            },
          })
        }
      }
      if (Array.isArray(course.corequisiteIds)) {
        for (const coreq of course.corequisiteIds) {
          if (!coreq) continue
          elements.push({
            data: {
              id: `coreq:${coreq}->${course.id}`,
              source: coreq,
              target: course.id,
              type: 'coreq',
            },
          })
        }
      }
    }

    const cy: Core = cytoscape({
      container,
      elements,
      style: [
        {
          selector: 'node',
          style: {
            label: 'data(label)',
            'text-valign': 'center',
            'text-wrap': 'wrap',
            'text-max-width': '200px',
            color: '#000',
            'background-color': '#ecf0f1',
            'border-color': '#34495e',
            'border-width': 1.5,
            shape: 'round-rectangle',
            width: 220,
            height: 80,
          },
        },
        {
          selector: 'node[type = "semester-header"]',
          style: {
            'background-color': '#ffffff',
            'border-color': '#ffffff',
            'font-weight': 'bold',
            'text-valign': 'center',
            'text-halign': 'center',
            'font-size': '24px',
            width: 220,
            height: 40,
          },
        },
        {
          selector: 'node[moved = "true"]',
          style: {
            'border-color': '#2980b9',
            'border-style': 'dashed',
            'background-color': '#ffffff',
          },
        },
        {
          selector: 'node:selected',
          style: {
            'border-color': '#e67e22',
            'border-width': 3,
            'background-color': '#fff7e6',
          },
        },
        {
          selector: 'edge',
          style: {
            width: 2,
            'line-color': '#2c3e50',
            'curve-style': 'segments',
            'segment-distances': 40,
            'segment-weights': 0.5,
            'target-arrow-color': '#2c3e50',
            'target-arrow-shape': 'triangle',
            'arrow-scale': 1.2,
          },
        },
        {
          selector: 'edge[type = "coreq"]',
          style: {
            'line-style': 'dashed',
            'line-color': '#8e44ad',
            'curve-style': 'segments',
            'segment-distances': 40,
            'segment-weights': 0.5,
            'target-arrow-color': '#8e44ad',
            'target-arrow-shape': 'triangle',
          },
        },
      ],
      layout: {
        name: 'preset',
      },
    })

    cyRef.current = cy

    if (onCourseMoved) {
      cy.on('dragfree', 'node', (event) => {
        const node = event.target
        const data = node.data()
        if (!data || data.type === 'semester-header') return

        const courseId: string = data.id
        const position = node.position()

        let bestSemesterId: string | null = null
        let bestDistance = Number.POSITIVE_INFINITY
        for (const sem of semestersSorted) {
          const columnX = columnMap[sem.id] ?? 0
          const dist = Math.abs(columnX - position.x)
          if (dist < bestDistance) {
            bestDistance = dist
            bestSemesterId = sem.id
          }
        }

        if (!bestSemesterId) return
        const currentSemesterId: string = data.semester
        if (bestSemesterId === currentSemesterId) return

        onCourseMoved(courseId, bestSemesterId)
      })
    }

    if (onCourseSelect) {
      cy.on('tap', 'node', (event) => {
        const node = event.target
        const data = node.data()
        if (!data || data.type === 'semester-header') return

        const courseId: string = data.id

        cy.batch(() => {
          cy.$('node').unselect()
          node.select()
        })

        onCourseSelect(courseId)
      })
    }

    return () => {
      cy.destroy()
      cyRef.current = null
    }
  }, [curriculum, setStatus, movedCourseIds, onCourseMoved, onCourseSelect])

  useEffect(() => {
    const cy = cyRef.current
    if (!cy) return

    cy.batch(() => {
      cy.$('node').unselect()
      if (!selectedCourseId) return
      const node = cy.$(`node[id = "${selectedCourseId}"]`)
      if (node.length > 0) {
        node.select()
      }
    })
  }, [selectedCourseId])

  return h('div', { id: 'graph-cyto', ref: containerRef })
}
