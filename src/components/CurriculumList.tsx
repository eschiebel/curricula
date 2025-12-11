import { useCallback, useEffect, useRef } from 'preact/hooks'
import type { Curriculum, Semester, Course } from './CurriculumGraph'

export interface CurriculumListProps {
  curriculum: Curriculum
  selectedCourseId: string | null
  onCourseSelect: (courseId: string) => void
  onCourseMoveBySemester: (courseId: string, direction: 'previous' | 'next') => void
}

export function CurriculumList(props: CurriculumListProps) {
  const { curriculum, selectedCourseId, onCourseSelect, onCourseMoveBySemester } = props
  const semestersSorted: Semester[] = [...(curriculum.semesters || [])].sort(
    (a, b) => a.order - b.order,
  )

  const coursesBySemester: Record<string, Course[]> = {}
  for (const course of curriculum.courses || []) {
    if (!coursesBySemester[course.semesterId]) {
      coursesBySemester[course.semesterId] = []
    }
    coursesBySemester[course.semesterId].push(course)
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
      {semestersSorted.map((semester) => {
        const courses = coursesBySemester[semester.id] || []
        return (
          <ul
            key={semester.id}
            aria-label={semester.name}
            role="listbox"
            tabIndex={0}
            data-semester-id={semester.id}
            onKeyDown={handleListKeyDown}
          >
            {courses.map((course) => {
              const isSelected = course.id === selectedCourseId
              return (
                <li
                  key={course.id}
                  data-course-id={course.id}
                  role="option"
                  aria-selected={isSelected ? 'true' : 'false'}
                  className={isSelected ? 'course-selected' : undefined}
                  tabIndex={-1}
                  ref={(el) => {
                    itemRefs.current[course.id] = el
                  }}
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
