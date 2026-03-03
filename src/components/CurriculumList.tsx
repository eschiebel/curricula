import { useCallback, useEffect, useRef } from 'preact/hooks'
import { getCurriculumTrackInfo } from './CurriculumGraph'
import type { Curriculum, Semester, Course } from './CurriculumGraph'

export interface CurriculumListProps {
  curriculum: Curriculum
  selectedCourseId: string | null
  onCourseSelect: (courseId: string | null) => void
  onCourseMoveBySemester: (courseId: string, direction: 'previous' | 'next') => void
  onSemesterFocus: (semesterId: string | null) => void
}

export function CurriculumList(props: CurriculumListProps) {
  const { curriculum, selectedCourseId, onCourseSelect, onCourseMoveBySemester, onSemesterFocus } =
    props
  const semestersSorted: Semester[] = [...(curriculum.semesters || [])].sort(
    (a, b) => a.order - b.order,
  )

  const creditsBySemesterId: Record<string, number> = {}
  for (const semester of semestersSorted) {
    creditsBySemesterId[semester.id] = 0
  }
  for (const course of curriculum.courses || []) {
    const effectiveSemesterId = course.new_semester ?? course.semesterId
    if (creditsBySemesterId[effectiveSemesterId] == null) {
      creditsBySemesterId[effectiveSemesterId] = 0
    }
    creditsBySemesterId[effectiveSemesterId] += course.credits
  }

  const courseOrderIndex = new Map<string, number>()
  for (let i = 0; i < (curriculum.courses || []).length; i += 1) {
    const c = curriculum.courses[i]
    if (c) courseOrderIndex.set(c.id, i)
  }

  const trackIdsPresent = new Set<string>()
  for (const course of curriculum.courses || []) {
    trackIdsPresent.add(course.trackId ?? 'untracked')
  }

  const trackOrder = getCurriculumTrackInfo(curriculum).trackOrder
  const trackLaneIndex = new Map<string, number>()
  trackOrder.forEach((trackId, i) => {
    trackLaneIndex.set(trackId, i)
  })

  const coursesBySemester: Record<string, Course[]> = {}
  for (const course of curriculum.courses || []) {
    const effectiveSemesterId = course.new_semester ?? course.semesterId
    if (!coursesBySemester[effectiveSemesterId]) {
      coursesBySemester[effectiveSemesterId] = []
    }
    coursesBySemester[effectiveSemesterId].push(course)
  }

  for (const semesterId of Object.keys(coursesBySemester)) {
    coursesBySemester[semesterId]?.sort((a, b) => {
      const aTrack = a.trackId ?? 'untracked'
      const bTrack = b.trackId ?? 'untracked'
      const aLane = trackLaneIndex.get(aTrack) ?? trackOrder.length
      const bLane = trackLaneIndex.get(bTrack) ?? trackOrder.length
      if (aLane !== bLane) return aLane - bLane

      const aIdx = courseOrderIndex.get(a.id) ?? Number.POSITIVE_INFINITY
      const bIdx = courseOrderIndex.get(b.id) ?? Number.POSITIVE_INFINITY
      if (aIdx !== bIdx) return aIdx - bIdx

      return a.id.localeCompare(b.id)
    })
  }

  const itemRefs = useRef<Record<string, HTMLLIElement | null>>({})

  const handleListKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const { key } = event
      const isArrowNav = key === 'ArrowDown' || key === 'ArrowUp'
      const isMovePrev = key === 'ArrowLeft' && event.shiftKey
      const isMoveNext = key === 'ArrowRight' && event.shiftKey

      if (!isArrowNav && !isMovePrev && !isMoveNext) return

      const target = event.currentTarget as HTMLUListElement | null
      if (!target) return

      const semesterId = target.dataset.semesterId
      if (!semesterId) return

      const courses = coursesBySemester[semesterId] || []
      if (courses.length === 0) return

      // Handle Shift+Left / Shift+Right to move the currently selected course
      if (isMovePrev || isMoveNext) {
        if (!selectedCourseId) return
        const selectedCourse = courses.find((c) => c.id === selectedCourseId)
        if (!selectedCourse) return

        event.preventDefault()
        onCourseMoveBySemester(selectedCourseId, isMoveNext ? 'next' : 'previous')
        return
      }

      // ArrowUp / ArrowDown navigation within this semester
      let index = -1

      const active = event.target as HTMLElement | null
      const activeCourseId = active?.dataset?.courseId
      if (activeCourseId) {
        index = courses.findIndex((c) => c.id === activeCourseId)
      }

      if (index < 0 && selectedCourseId) {
        index = courses.findIndex((c) => c.id === selectedCourseId)
      }

      if (key === 'ArrowDown') {
        event.preventDefault()
        if (index < 0) {
          index = 0
        } else if (index < courses.length - 1) {
          index += 1
        }
      } else if (key === 'ArrowUp') {
        event.preventDefault()
        if (index < 0) {
          index = courses.length - 1
        } else if (index > 0) {
          index -= 1
        }
      }

      const nextCourse = courses[index]
      if (nextCourse) onCourseSelect(nextCourse.id)
    },
    [coursesBySemester, onCourseMoveBySemester, onCourseSelect, selectedCourseId],
  )

  useEffect(() => {
    if (!selectedCourseId) return
    const el = itemRefs.current[selectedCourseId]
    if (el) {
      el.focus()
    }
  }, [selectedCourseId, curriculum])

  return (
    <div className="curriculum-list-offscreen">
      <div id="user-course-edit-instructions">
        Press Enter or double-click to edit or delete this course.
      </div>
      {semestersSorted.map((semester) => {
        const courses = coursesBySemester[semester.id] || []
        const credits = creditsBySemesterId[semester.id] ?? 0
        return (
          <ul
            key={semester.id}
            aria-label={`${semester.name} (${credits} credits)`}
            role="listbox"
            tabIndex={0}
            data-semester-id={semester.id}
            onKeyDown={handleListKeyDown}
            onFocus={() => onSemesterFocus(semester.id)}
          >
            {courses.map((course) => {
              const isSelected = course.id === selectedCourseId
              const isUserAdded = course.userAdded === true
              return (
                <li
                  key={course.id}
                  data-course-id={course.id}
                  role="option"
                  aria-selected={isSelected ? 'true' : 'false'}
                  aria-describedby={isUserAdded ? 'user-course-edit-instructions' : undefined}
                  className={isSelected ? 'course-selected' : undefined}
                  tabIndex={-1}
                  ref={(el) => {
                    itemRefs.current[course.id] = el
                  }}
                  onFocus={() => onSemesterFocus(semester.id)}
                >
                  {course.id}
                </li>
              )
            })}
          </ul>
        )
      })}
    </div>
  )
}
