import { useState } from 'preact/hooks'
import type { Curriculum, StatusSetter } from './CurriculumGraph'
import { CurriculumGraph } from './CurriculumGraph'
import { CurriculumList } from './CurriculumList'

export interface CurriculumViewProps {
  curriculum: Curriculum
  setStatus: StatusSetter
  movedCourseIds?: string[]
  onCourseMoved?: (courseId: string, newSemesterId: string) => void
}

export function CurriculumView(props: CurriculumViewProps) {
  const { curriculum, setStatus, movedCourseIds, onCourseMoved } = props

  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null)

  return (
    <>
      <CurriculumGraph
        curriculum={curriculum}
        setStatus={setStatus}
        movedCourseIds={movedCourseIds}
        onCourseMoved={onCourseMoved}
        selectedCourseId={selectedCourseId}
        onCourseSelect={setSelectedCourseId}
      />
      <CurriculumList curriculum={curriculum} selectedCourseId={selectedCourseId} />
    </>
  )
}
