import { useCallback, useEffect, useState } from 'preact/hooks'
import type { Curriculum, StatusSetter } from './CurriculumGraph'
import { CurriculumGraph } from './CurriculumGraph'
import { CurriculumList } from './CurriculumList'
import { showScreenreaderAlert } from '../utils'

export interface CurriculumViewProps {
  curriculum: Curriculum
  setStatus: StatusSetter
  movedCourseIds?: string[]
  selectedCourseId?: string | null
  onCourseSelect?: (courseId: string | null) => void
  onCourseMoved?: (courseId: string, newSemesterId: string) => void
  onRegisterResetViewport?: (reset: (() => void) | null) => void
  onRegisterPanBy?: (panBy: ((dx: number, dy: number) => void) | null) => void
  onRegisterZoomBy?: (zoomBy: ((delta: number) => void) | null) => void
}

export function CurriculumView(props: CurriculumViewProps) {
  const {
    curriculum,
    setStatus,
    movedCourseIds,
    selectedCourseId: externalSelectedCourseId,
    onCourseSelect: externalOnCourseSelect,
    onCourseMoved,
    onRegisterResetViewport,
    onRegisterPanBy,
    onRegisterZoomBy,
  } = props

  const [internalSelectedCourseId, setInternalSelectedCourseId] = useState<string | null>(null)
  const [focusedSemesterId, setFocusedSemesterId] = useState<string | null>(null)

  const selectedCourseId = externalSelectedCourseId ?? internalSelectedCourseId
  const setSelectedCourseId = externalOnCourseSelect ?? setInternalSelectedCourseId

  const handleCourseMoveBySemester = useCallback(
    (courseId: string, direction: 'previous' | 'next') => {
      if (!onCourseMoved) return

      const semestersSorted = [...(curriculum.semesters || [])].sort((a, b) => a.order - b.order)

      const course = curriculum.courses.find((c) => c.id === courseId)
      if (!course) return

      const currentSemesterId = course.new_semester ?? course.semesterId
      const currentIndex = semestersSorted.findIndex((s) => s.id === currentSemesterId)
      if (currentIndex < 0) return

      const targetIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1
      if (targetIndex < 0 || targetIndex >= semestersSorted.length) return

      const newSemesterId = semestersSorted[targetIndex]?.id
      if (!newSemesterId || newSemesterId === currentSemesterId) return

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
        onRegisterResetViewport={onRegisterResetViewport}
        onRegisterPanBy={onRegisterPanBy}
        onRegisterZoomBy={onRegisterZoomBy}
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
