import { useEffect, useRef } from 'preact/hooks'
import type { Curriculum, Semester, Course } from './CurriculumGraph'

export interface CurriculumListProps {
  curriculum: Curriculum
  selectedCourseId: string | null
}

export function CurriculumList(props: CurriculumListProps) {
  const { curriculum, selectedCourseId } = props
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

  useEffect(() => {
    if (!selectedCourseId) return
    const el = itemRefs.current[selectedCourseId]
    if (el) {
      el.focus()
    }
  }, [selectedCourseId])

  return (
    <div className="curriculum-list-offscreen">
      {semestersSorted.map((semester) => {
        const courses = coursesBySemester[semester.id] || []
        return (
          <ul key={semester.id} aria-label={semester.name} role="listbox">
            {courses.map((course) => {
              const isSelected = course.id === selectedCourseId
              return (
                <li
                  key={course.id}
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
