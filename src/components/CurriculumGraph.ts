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
  trackId?: string
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
  tracks?: TrackDefinition[]
  semesters: Semester[]
  courses: Course[]
}

export type TrackDefinition = Record<string, string> | { id: string; name: string }

export interface TrackInfo {
  trackOrder: string[]
  trackNameById: Record<string, string>
  trackColorById: Record<string, string>
}

export type StatusSetter = (text: string, isError?: boolean) => void

export interface RenderOptions {
  movedCourseIds?: string[]
  onCourseMoved?: (courseId: string, newSemesterId: string) => void
  selectedCourseId?: string | null
  onCourseSelect: (courseId: string) => void
  onCourseMoveBySemester?: (courseId: string, direction: 'previous' | 'next') => void
  focusedSemesterId?: string | null
}

export interface CurriculumGraphProps extends RenderOptions {
  curriculum: Curriculum
  setStatus: StatusSetter
}

const violationHatchDataUri =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12">' +
      '<path d="M-3 3 L3 -3 M0 12 L12 0 M9 15 L15 9" stroke="rgba(0,0,0,0.35)" stroke-width="1"/>' +
      '<path d="M15 3 L9 -3 M12 12 L0 0 M3 15 L-3 9" stroke="rgba(0,0,0,0.35)" stroke-width="1"/>' +
      '</svg>',
  )

function clamp01(n: number) {
  if (n < 0) return 0
  if (n > 1) return 1
  return n
}

function hslToHex(h: number, s: number, l: number) {
  const hh = ((h % 360) + 360) % 360
  const ss = clamp01(s / 100)
  const ll = clamp01(l / 100)

  const c = (1 - Math.abs(2 * ll - 1)) * ss
  const x = c * (1 - Math.abs(((hh / 60) % 2) - 1))
  const m = ll - c / 2

  let r = 0
  let g = 0
  let b = 0
  if (hh < 60) {
    r = c
    g = x
    b = 0
  } else if (hh < 120) {
    r = x
    g = c
    b = 0
  } else if (hh < 180) {
    r = 0
    g = c
    b = x
  } else if (hh < 240) {
    r = 0
    g = x
    b = c
  } else if (hh < 300) {
    r = x
    g = 0
    b = c
  } else {
    r = c
    g = 0
    b = x
  }

  const toHex = (v: number) => {
    const n = Math.round((v + m) * 255)
    return n.toString(16).padStart(2, '0')
  }

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

function parseTrackDefinitions(tracks?: TrackDefinition[]) {
  const order: string[] = []
  const nameById: Record<string, string> = {}

  if (!Array.isArray(tracks)) {
    return { order, nameById }
  }

  for (const entry of tracks) {
    if (!entry || typeof entry !== 'object') continue

    if ('id' in entry && 'name' in entry) {
      const maybeId = (entry as { id?: unknown }).id
      const maybeName = (entry as { name?: unknown }).name
      if (typeof maybeId === 'string' && typeof maybeName === 'string') {
        if (nameById[maybeId] == null) order.push(maybeId)
        nameById[maybeId] = maybeName
      }
      continue
    }

    for (const [k, v] of Object.entries(entry as Record<string, unknown>)) {
      if (typeof k !== 'string' || typeof v !== 'string') continue
      if (nameById[k] == null) order.push(k)
      nameById[k] = v
    }
  }

  return { order, nameById }
}

function buildTrackColors(trackOrder: string[]) {
  const colorById: Record<string, string> = {}
  const ids = trackOrder.filter((t) => t !== 'untracked')
  const n = ids.length

  for (let i = 0; i < n; i += 1) {
    const trackId = ids[i]
    const hue = (360 * i) / Math.max(1, n)
    colorById[trackId] = hslToHex(hue, 65, 90)
  }

  if (trackOrder.includes('untracked')) {
    colorById.untracked = '#ecf0f1'
  }

  return colorById
}

export function getCurriculumTrackInfo(curriculum: Curriculum): TrackInfo {
  const { order: configuredOrder, nameById: configuredNames } = parseTrackDefinitions(
    curriculum.tracks,
  )
  const trackIdsPresent = new Set<string>()
  for (const course of curriculum.courses || []) {
    trackIdsPresent.add(course.trackId ?? 'untracked')
  }

  const unknownTrackOrder = [...trackIdsPresent]
    .filter((t) => !configuredOrder.includes(t))
    .sort((a, b) => a.localeCompare(b))

  const trackOrder = [...configuredOrder, ...unknownTrackOrder].filter((t) =>
    trackIdsPresent.has(t),
  )

  const trackNameById: Record<string, string> = { ...configuredNames }
  for (const trackId of trackOrder) {
    if (trackNameById[trackId] == null) {
      trackNameById[trackId] = trackId
    }
  }

  const trackColorById = buildTrackColors(trackOrder)

  return { trackOrder, trackNameById, trackColorById }
}

export function getTrackColor(trackInfo: TrackInfo, trackId?: string) {
  const id = trackId ?? 'untracked'
  return trackInfo.trackColorById[id] ?? '#ecf0f1'
}

export function CurriculumGraph(props: CurriculumGraphProps) {
  const {
    curriculum,
    setStatus,
    movedCourseIds,
    onCourseMoved,
    selectedCourseId,
    onCourseSelect,
    onCourseMoveBySemester,
    focusedSemesterId,
  } = props
  const containerRef = useRef<HTMLDivElement | null>(null)
  const cyRef = useRef<Core | null>(null)
  const viewportRef = useRef<{ zoom: number; pan: { x: number; y: number } } | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    setStatus(`Loaded: ${curriculum.name}`)

    while (container.firstChild) container.removeChild(container.firstChild)

    const semestersSorted = [...(curriculum.semesters || [])].sort((a, b) => a.order - b.order)
    const semesterOrderById: Record<string, number> = {}
    semestersSorted.forEach((sem, i) => {
      semesterOrderById[sem.id] = i
    })

    const courseById: Record<string, Course> = {}
    for (const course of curriculum.courses) {
      courseById[course.id] = course
    }

    const violatingCourseIds = new Set<string>()
    const violatingEdgeIds = new Set<string>()
    for (const course of curriculum.courses) {
      const courseSemOrder = semesterOrderById[course.semesterId] ?? Number.POSITIVE_INFINITY

      if (Array.isArray(course.prerequisiteIds)) {
        for (const prereqId of course.prerequisiteIds) {
          if (!prereqId) continue
          const prereq = courseById[prereqId]
          if (!prereq) continue
          const prereqSemOrder = semesterOrderById[prereq.semesterId] ?? Number.POSITIVE_INFINITY

          // Course must be strictly AFTER prerequisite.
          if (courseSemOrder <= prereqSemOrder) {
            violatingCourseIds.add(course.id)
            violatingEdgeIds.add(`${prereqId}->${course.id}`)
          }
        }
      }

      if (Array.isArray(course.corequisiteIds)) {
        for (const coreqId of course.corequisiteIds) {
          if (!coreqId) continue
          const coreq = courseById[coreqId]
          if (!coreq) continue
          const coreqSemOrder = semesterOrderById[coreq.semesterId] ?? Number.POSITIVE_INFINITY

          // Course must NOT be before a corequisite (coreq must be same semester or earlier).
          if (courseSemOrder < coreqSemOrder) {
            violatingCourseIds.add(course.id)
            violatingEdgeIds.add(`coreq:${coreqId}->${course.id}`)
          }
        }
      }
    }

    const columnMap: Record<string, number> = {}
    semestersSorted.forEach((sem, i) => {
      columnMap[sem.id] = i * 300
    })

    const trackInfo = getCurriculumTrackInfo(curriculum)
    const trackOrder = trackInfo.trackOrder
    const trackLaneIndex: Record<string, number> = {}
    trackOrder.forEach((trackId, i) => {
      trackLaneIndex[trackId] = i
    })

    const laneSemesterIndex: Record<string, Record<string, number>> = {}
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
      const laneTrackId = course.trackId ?? 'untracked'

      if (!laneSemesterIndex[laneTrackId]) {
        laneSemesterIndex[laneTrackId] = {}
      }

      const bySemester = laneSemesterIndex[laneTrackId]
      if (bySemester[course.semesterId] == null) {
        bySemester[course.semesterId] = 0
      }

      const idx = bySemester[course.semesterId]++
      const x = columnMap[course.semesterId] ?? 0
      const lane = trackLaneIndex[laneTrackId] ?? trackOrder.length
      const laneBaseY = 120 + lane * 200
      const y = laneBaseY + idx * 95

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
          violation: violatingCourseIds.has(course.id) ? 'true' : 'false',
          trackId: laneTrackId,
          trackColor: getTrackColor(trackInfo, laneTrackId),
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
              type: 'prereq',
              violation: violatingEdgeIds.has(`${prereq}->${course.id}`) ? 'true' : 'false',
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
              violation: violatingEdgeIds.has(`coreq:${coreq}->${course.id}`) ? 'true' : 'false',
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
            'background-color': 'data(trackColor)',
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
          },
        },
        {
          selector: 'node[violation = "true"]',
          style: {
            'border-color': '#c0392b',
            'border-width': 3,
            'background-image': `url("${violationHatchDataUri}")`,
            'background-image-opacity': 1,
            'background-repeat': 'repeat',
            'background-fit': 'none',
          },
        },
        {
          selector: 'node[type = "semester-header"].focused-semester',
          style: {
            'border-color': '#e67e22',
            'border-width': 3,
          },
        },
        {
          selector: 'node:selected',
          style: {
            'border-color': '#e67e22',
            'border-width': 3,
            'overlay-color': '#fff7e6',
            'overlay-opacity': 0.35,
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
        {
          selector: 'edge[violation = "true"]',
          style: {
            width: 4,
            'line-color': '#c0392b',
            'target-arrow-color': '#c0392b',
          },
        },
      ],
      layout: {
        name: 'preset',
      },
    })

    cyRef.current = cy

    if (viewportRef.current) {
      cy.zoom(viewportRef.current.zoom)
      cy.pan(viewportRef.current.pan)
    }

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

        // Inform parent of move direction, if requested
        if (onCourseMoveBySemester) {
          const fromIndex = semestersSorted.findIndex((s) => s.id === currentSemesterId)
          const toIndex = semestersSorted.findIndex((s) => s.id === bestSemesterId)
          if (fromIndex >= 0 && toIndex >= 0 && fromIndex !== toIndex) {
            const direction: 'previous' | 'next' = toIndex > fromIndex ? 'next' : 'previous'
            onCourseMoveBySemester(courseId, direction)
          }
        }

        // Ensure the dragged course becomes the selected course
        onCourseSelect(courseId)

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
      viewportRef.current = { zoom: cy.zoom(), pan: cy.pan() }
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
  }, [selectedCourseId, curriculum])

  useEffect(() => {
    const cy = cyRef.current
    if (!cy) return

    cy.batch(() => {
      cy.$('node[type = "semester-header"]').removeClass('focused-semester')
      if (!focusedSemesterId) return
      const header = cy.$(`node[id = "semester:${focusedSemesterId}"]`)
      if (header.length > 0) {
        header.addClass('focused-semester')
      }
    })
  }, [focusedSemesterId])

  return h('div', { id: 'graph-cyto', ref: containerRef })
}
