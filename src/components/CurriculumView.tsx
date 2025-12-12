import { useCallback, useEffect, useState } from 'preact/hooks'
import type { Curriculum, StatusSetter } from './CurriculumGraph'
import { CurriculumGraph } from './CurriculumGraph'
import { CurriculumList } from './CurriculumList'
import { showScreenreaderAlert } from '../utils'

export interface CurriculumViewProps {
  curriculum: Curriculum
  setStatus: StatusSetter
  movedCourseIds?: string[]
  onCourseMoved?: (courseId: string, newSemesterId: string) => void
}

export function CurriculumView(props: CurriculumViewProps) {
  const { curriculum, setStatus, movedCourseIds, onCourseMoved } = props

  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null)
  const [focusedSemesterId, setFocusedSemesterId] = useState<string | null>(null)

  const handleCourseMoveBySemester = useCallback(
    (courseId: string, direction: 'previous' | 'next') => {
      if (!onCourseMoved) return

      const semestersSorted = [...(curriculum.semesters || [])].sort((a, b) => a.order - b.order)

      const course = curriculum.courses.find((c) => c.id === courseId)
      if (!course) return

      const currentIndex = semestersSorted.findIndex((s) => s.id === course.semesterId)
      if (currentIndex < 0) return

      const targetIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1
      if (targetIndex < 0 || targetIndex >= semestersSorted.length) return

      const newSemesterId = semestersSorted[targetIndex]?.id
      if (!newSemesterId || newSemesterId === course.semesterId) return

      onCourseMoved(courseId, newSemesterId)

      // Keep the moved course selected so the list and graph stay in sync
      setSelectedCourseId(courseId)

      showScreenreaderAlert(
        `Course ${course.name} moved to semester ${semestersSorted[targetIndex]?.name}`,
      )
    },
    [curriculum, onCourseMoved],
  )

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' || event.key === 'Esc') {
        if (selectedCourseId != null) {
          setSelectedCourseId(null)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [selectedCourseId])

  return (
    <>
      <CurriculumGraph
        curriculum={curriculum}
        setStatus={setStatus}
        movedCourseIds={movedCourseIds}
        onCourseMoved={onCourseMoved}
        selectedCourseId={selectedCourseId}
        onCourseSelect={setSelectedCourseId}
        onCourseMoveBySemester={handleCourseMoveBySemester}
        focusedSemesterId={focusedSemesterId}
      />
      <CurriculumList
        curriculum={curriculum}
        selectedCourseId={selectedCourseId}
        onCourseSelect={setSelectedCourseId}
        onCourseMoveBySemester={handleCourseMoveBySemester}
        onSemesterFocus={setFocusedSemesterId}
      />
    </>
  )
}
