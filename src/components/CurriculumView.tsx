import type { Curriculum, StatusSetter, RenderOptions } from './CurriculumGraph'
import { CurriculumGraph } from './CurriculumGraph'
import { CurriculumList } from './CurriculumList'

export interface CurriculumViewProps extends RenderOptions {
  curriculum: Curriculum
  setStatus: StatusSetter
}

export function CurriculumView(props: CurriculumViewProps) {
  const { curriculum, setStatus, movedCourseIds, onCourseMoved } = props

  return (
    <>
      <CurriculumGraph
        curriculum={curriculum}
        setStatus={setStatus}
        movedCourseIds={movedCourseIds}
        onCourseMoved={onCourseMoved}
      />
      <CurriculumList curriculum={curriculum} />
    </>
  )
}
