import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks'
import type { JSX } from 'preact'
import type { Course, Semester, TrackInfo } from './CurriculumGraph'

export interface CourseDialogProps {
  mode: 'add' | 'edit'
  course?: Course | null
  courses?: Course[]
  semesters: Semester[]
  trackInfo: TrackInfo | null
  open: boolean
  onClose: () => void
  onSave: (args: {
    oldCourseId?: string
    courseId: string
    name?: string
    credits: number
    trackId: string
    semesterId: string
    prerequisiteIds: string[]
    corequisiteIds: string[]
  }) => void
  onDelete?: (courseId: string) => void
}

export function CourseDialog(props: CourseDialogProps) {
  const { mode, course, courses, semesters, trackInfo, open, onClose, onSave, onDelete } = props

  const dialogRef = useRef<HTMLDivElement>(null)
  const courseIdInputRef = useRef<HTMLInputElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const saveButtonRef = useRef<HTMLButtonElement>(null)
  const [courseId, setCourseId] = useState<string>('')
  const [name, setName] = useState<string>('')
  const [credits, setCredits] = useState<string>('')
  const [trackId, setTrackId] = useState<string>('')
  const [semesterId, setSemesterId] = useState<string>('')
  const [prerequisiteIds, setPrerequisiteIds] = useState<string[]>([])
  const [corequisiteIds, setCorequisiteIds] = useState<string[]>([])

  const semestersSorted = useMemo(() => {
    return [...(semesters || [])].sort((a, b) => a.order - b.order)
  }, [semesters])

  useEffect(() => {
    if (!open) return

    if (mode === 'edit' && course) {
      setCourseId(course.id)
      setName(course.name || '')
      setCredits(String(course.credits))
      setTrackId(course.trackId ?? trackInfo?.trackOrder[0] ?? '')
      setSemesterId(course.semesterId)
      setPrerequisiteIds(course.prerequisiteIds || [])
      setCorequisiteIds(course.corequisiteIds || [])
    } else {
      setCourseId('')
      setName('')
      setCredits('')
      setTrackId(trackInfo?.trackOrder[0] ?? '')
      setSemesterId(semestersSorted.length > 0 ? semestersSorted[0].id : '')
      setPrerequisiteIds([])
      setCorequisiteIds([])
    }
  }, [open, mode, course, trackInfo, semestersSorted.length])

  useEffect(() => {
    if (!open) return
    closeButtonRef.current?.focus()
  }, [open])

  useEffect(() => {
    if (!open) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' || event.key === 'Esc') {
        event.preventDefault()
        onClose()
        return
      }

      if (event.key === 'Tab') {
        if (!dialogRef.current) return

        const focusableElements = dialogRef.current.querySelectorAll(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])',
        )
        const firstElement = focusableElements[0] as HTMLElement
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

        if (event.shiftKey) {
          // Shift+Tab: moving backwards
          if (document.activeElement === firstElement) {
            event.preventDefault()
            lastElement?.focus()
          }
        } else {
          // Tab: moving forwards
          if (document.activeElement === lastElement) {
            event.preventDefault()
            firstElement?.focus()
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, onClose])

  const handleSave = useCallback(() => {
    const trimmedCourseId = courseId.trim()
    const creditsNum = parseFloat(credits)

    if (trimmedCourseId.length === 0) return
    if (Number.isNaN(creditsNum) || creditsNum <= 0) return
    if (!trackId) return
    if (!semesterId) return

    const trimmedName = name.trim()

    if (mode === 'edit' && course) {
      onSave({
        oldCourseId: course.id,
        courseId: trimmedCourseId,
        name: trimmedName.length > 0 ? trimmedName : undefined,
        credits: creditsNum,
        trackId,
        semesterId,
        prerequisiteIds,
        corequisiteIds,
      })
    } else {
      onSave({
        courseId: trimmedCourseId,
        name: trimmedName.length > 0 ? trimmedName : undefined,
        credits: creditsNum,
        trackId,
        semesterId,
        prerequisiteIds,
        corequisiteIds,
      })
    }
  }, [
    mode,
    course,
    courseId,
    name,
    credits,
    trackId,
    semesterId,
    prerequisiteIds,
    corequisiteIds,
    onSave,
  ])

  const handleCourseIdKeyDown = useCallback(
    (event: JSX.TargetedKeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') {
        event.preventDefault()
        handleSave()
      }
    },
    [handleSave],
  )

  const handleCreditsKeyDown = useCallback(
    (event: JSX.TargetedKeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') {
        event.preventDefault()
        handleSave()
      }
    },
    [handleSave],
  )

  const handleTogglePrerequisite = useCallback((id: string) => {
    setPrerequisiteIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((p) => p !== id)
      }
      return [...prev, id]
    })
  }, [])

  const handleToggleCorequisite = useCallback((id: string) => {
    setCorequisiteIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((c) => c !== id)
      }
      return [...prev, id]
    })
  }, [])

  const availableCourses = useMemo(() => {
    if (!courses) return []
    const currentCourseId = mode === 'edit' && course ? course.id : courseId.trim()
    return courses.filter((c) => c.id !== currentCourseId)
  }, [courses, mode, course, courseId])

  if (!open) return null
  if (mode === 'edit' && !course) return null

  const creditsNum = parseFloat(credits)
  const canSave =
    courseId.trim().length > 0 &&
    credits.trim().length > 0 &&
    !Number.isNaN(creditsNum) &&
    trackId.length > 0 &&
    semesterId.length > 0

  const title = mode === 'add' ? 'Add Course' : 'Edit Course'

  return (
    <div ref={dialogRef} className="add-semester-dialog" role="dialog" aria-label={title}>
      <div className="add-semester-dialog-header">
        <h2 className="add-semester-dialog-title">{title}</h2>
        <button
          ref={closeButtonRef}
          type="button"
          className="close-button"
          onClick={onClose}
          aria-label="Close"
        >
          X
        </button>
      </div>

      <div className="add-semester-dialog-body">
        <div className="add-course-dialog-form">
          <div className="add-course-dialog-field">
            <label htmlFor="course-id-input">
              Course ID<sup aria-hidden="true">*</sup>
            </label>
            <input
              ref={courseIdInputRef}
              id="course-id-input"
              type="text"
              required={true}
              value={courseId}
              onInput={(e) => setCourseId((e.currentTarget as HTMLInputElement).value)}
              onKeyDown={handleCourseIdKeyDown}
              placeholder="e.g., EMEC-100"
            />
          </div>

          <div className="add-course-dialog-field">
            <label htmlFor="course-name-input">Course Name</label>
            <input
              id="course-name-input"
              type="text"
              value={name}
              onInput={(e) => setName((e.currentTarget as HTMLInputElement).value)}
              placeholder="e.g., Introduction to Engineering"
            />
          </div>

          <div className="add-course-dialog-field">
            <label htmlFor="credits-input">
              Credits<sup aria-hidden="true">*</sup>
            </label>
            <input
              id="credits-input"
              type="number"
              min="0"
              step="1"
              required={true}
              value={credits}
              onInput={(e) => setCredits((e.currentTarget as HTMLInputElement).value)}
              onKeyDown={handleCreditsKeyDown}
              placeholder="e.g., 3"
            />
          </div>

          <div className="add-course-dialog-field">
            <label htmlFor="track-select">Track</label>
            <select
              id="track-select"
              required={true}
              value={trackId}
              onChange={(e) => setTrackId((e.currentTarget as HTMLSelectElement).value)}
            >
              {trackInfo?.trackOrder.map((tId) => (
                <option key={tId} value={tId}>
                  {trackInfo.trackNameById[tId] ?? tId}
                </option>
              ))}
            </select>
          </div>

          <div className="add-course-dialog-field">
            <label htmlFor="semester-select">Semester</label>
            <select
              id="semester-select"
              required={true}
              value={semesterId}
              onChange={(e) => setSemesterId((e.currentTarget as HTMLSelectElement).value)}
            >
              {semestersSorted.map((sem) => (
                <option key={sem.id} value={sem.id}>
                  {sem.name}
                </option>
              ))}
            </select>
          </div>

          {availableCourses.length > 0 && (
            <>
              <div className="add-course-dialog-field">
                <div style={{ fontWeight: 600, marginBottom: '4px' }}>Prerequisites</div>
                <div
                  style={{
                    maxHeight: '120px',
                    overflowY: 'auto',
                    border: '1px solid #ccc',
                    padding: '8px',
                    borderRadius: '4px',
                  }}
                >
                  {availableCourses.map((c) => {
                    const isDisabled = corequisiteIds.includes(c.id)
                    return (
                      <div key={c.id} style={{ marginBottom: '4px' }}>
                        <label
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            cursor: isDisabled ? 'not-allowed' : 'pointer',
                            opacity: isDisabled ? 0.5 : 1,
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={prerequisiteIds.includes(c.id)}
                            disabled={isDisabled}
                            onChange={() => handleTogglePrerequisite(c.id)}
                            style={{ marginRight: '8px' }}
                          />
                          <span>
                            {c.id} {c.name && `- ${c.name}`}
                          </span>
                        </label>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="add-course-dialog-field">
                <div style={{ fontWeight: 600, marginBottom: '4px' }}>Corequisites</div>
                <div
                  style={{
                    maxHeight: '120px',
                    overflowY: 'auto',
                    border: '1px solid #ccc',
                    padding: '8px',
                    borderRadius: '4px',
                  }}
                >
                  {availableCourses.map((c) => {
                    const isDisabled = prerequisiteIds.includes(c.id)
                    return (
                      <div key={c.id} style={{ marginBottom: '4px' }}>
                        <label
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            cursor: isDisabled ? 'not-allowed' : 'pointer',
                            opacity: isDisabled ? 0.5 : 1,
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={corequisiteIds.includes(c.id)}
                            disabled={isDisabled}
                            onChange={() => handleToggleCorequisite(c.id)}
                            style={{ marginRight: '8px' }}
                          />
                          <span>
                            {c.id} {c.name && `- ${c.name}`}
                          </span>
                        </label>
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="add-semester-dialog-actions">
          {mode === 'edit' && onDelete && course && (
            <button
              type="button"
              className="danger"
              onClick={() => onDelete(course.id)}
              style={{ marginRight: 'auto' }}
            >
              Delete
            </button>
          )}
          <button type="button" className="secondary" onClick={onClose}>
            Cancel
          </button>
          <button ref={saveButtonRef} type="button" onClick={handleSave} disabled={!canSave}>
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
