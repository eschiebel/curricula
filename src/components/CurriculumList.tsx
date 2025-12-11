import type { Curriculum, Semester, Course } from './CurriculumGraph'

export interface CurriculumListProps {
  curriculum: Curriculum
}

export function CurriculumList(props: CurriculumListProps) {
  const { curriculum } = props
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

  return (
    <div className="curriculum-list-offscreen">
      {semestersSorted.map((semester) => {
        const courses = coursesBySemester[semester.id] || []
        return (
          <ul key={semester.id} aria-label={semester.name}>
            {courses.map((course) => (
              <li key={course.id}>{course.id}</li>
            ))}
          </ul>
        )
      })}
    </div>
  )
}
