import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks'
import type { JSX } from 'preact'
import type { Semester, TrackInfo } from './CurriculumGraph'

export interface AddCourseDialogProps {
  semesters: Semester[]
  trackInfo: TrackInfo | null
  open: boolean
  onClose: () => void
  onSave: (args: { courseId: string; credits: number; trackId: string; semesterId: string }) => void
}

export function AddCourseDialog(props: AddCourseDialogProps) {
  const { semesters, trackInfo, open, onClose, onSave } = props

  const courseIdInputRef = useRef<HTMLInputElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const [courseId, setCourseId] = useState<string>('')
  const [credits, setCredits] = useState<string>('')
  const [trackId, setTrackId] = useState<string>('')
  const [semesterId, setSemesterId] = useState<string>('')

  const semestersSorted = useMemo(() => {
    return [...(semesters || [])].sort((a, b) => a.order - b.order)
  }, [semesters])

  useEffect(() => {
    if (!open) return
    setCourseId('')
    setCredits('')
    setTrackId(trackInfo?.trackOrder[0] ?? '')
    setSemesterId(semestersSorted.length > 0 ? semestersSorted[0].id : '')
  }, [open, semestersSorted.length, trackInfo])

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

    onSave({ courseId: trimmedCourseId, credits: creditsNum, trackId, semesterId })
  }, [courseId, credits, trackId, semesterId, onSave])

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

  if (!open) return null

  const creditsNum = parseFloat(credits)
  const canSave =
    courseId.trim().length > 0 &&
    credits.trim().length > 0 &&
    !Number.isNaN(creditsNum) &&
    trackId.length > 0 &&
    semesterId.length > 0

  return (
    <div className="add-semester-dialog" role="dialog" aria-label="Add Course">
      <div className="add-semester-dialog-header">
        <h2 className="add-semester-dialog-title">Add Course</h2>
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
        </div>

        <div className="add-semester-dialog-actions">
          <button type="button" className="secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" onClick={handleSave} disabled={!canSave}>
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
