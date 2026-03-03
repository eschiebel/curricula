import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks'
import type { Course, Curriculum, Semester } from './CurriculumGraph'
import { getCurriculumTrackInfo } from './CurriculumGraph'
import { CurriculumView } from './CurriculumView'
import { AddSemesterDialog } from './AddSemesterDialog'
import { CourseDialog } from './CourseDialog'
import { HelpDialog } from './HelpDialog'

export function CurriculumApp() {
  const resetViewportRef = useRef<(() => void) | null>(null)
  const panByRef = useRef<((dx: number, dy: number) => void) | null>(null)
  const zoomByRef = useRef<((delta: number) => void) | null>(null)
  const addSemesterButtonRef = useRef<HTMLButtonElement>(null)
  const addCourseButtonRef = useRef<HTMLButtonElement>(null)
  const [status, setStatusState] = useState<string>('No file loaded.')
  const [statusError, setStatusError] = useState<boolean>(false)
  const [curriculum, setCurriculum] = useState<Curriculum | null>(null)
  const [loadedFileName, setLoadedFileName] = useState<string | null>(null)
  const [movedCourseIds, setMovedCourseIds] = useState<string[]>([])
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false)
  const [helpDialogOpen, setHelpDialogOpen] = useState<boolean>(false)
  const [addSemesterDialogOpen, setAddSemesterDialogOpen] = useState<boolean>(false)
  const [courseDialogOpen, setCourseDialogOpen] = useState<boolean>(false)
  const [courseDialogMode, setCourseDialogMode] = useState<'add' | 'edit'>('add')
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null)
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null)

  const trackInfo = useMemo(() => {
    return curriculum ? getCurriculumTrackInfo(curriculum) : null
  }, [curriculum])

  const setStatus = useCallback((text: string, isError = false) => {
    setStatusState(text)
    setStatusError(!!isError)
  }, [])

  const handleCourseMoved = useCallback(
    (courseId: string, newSemesterId: string) => {
      setCurriculum((prev) => {
        if (!prev) return prev
        const existing = prev.courses.find((c) => c.id === courseId)
        if (!existing) return prev

        const defaultSemesterId = existing.semesterId
        const currentSemesterId = existing.new_semester ?? existing.semesterId
        if (newSemesterId === currentSemesterId) return prev

        const updatedCourses: Course[] = prev.courses.map((c): Course => {
          if (c.id !== courseId) return c
          if (newSemesterId === defaultSemesterId) {
            const { new_semester: _new_semester, ...rest } = c
            return rest as Course
          }
          return { ...c, new_semester: newSemesterId }
        })

        const updated = { ...prev, courses: updatedCourses }
        const movedIds = updatedCourses.filter((c) => c.new_semester != null).map((c) => c.id)
        setMovedCourseIds(movedIds)
        setHasUnsavedChanges(true)

        return updated
      })
      setStatus(`Moved ${courseId} to semester ${newSemesterId}`)
    },
    [setStatus],
  )

  type InputChangeEvent = Event & {
    currentTarget: HTMLInputElement
    target: HTMLInputElement
  }

  const loadCurriculumFromJsonText = (jsonText: string, sourceDescription: string) => {
    try {
      const json = JSON.parse(jsonText)
      setCurriculum(json)
      const movedIds = Array.isArray(json?.courses)
        ? (json.courses as Array<{ id?: unknown; new_semester?: unknown }>)
            .filter((c) => typeof c?.id === 'string' && c?.new_semester != null)
            .map((c) => String(c.id))
        : []
      setMovedCourseIds(movedIds)
      setHasUnsavedChanges(false)
      setLoadedFileName(sourceDescription)
      setStatus(`Loaded ${sourceDescription}.`)
    } catch (err) {
      console.error(err)
      setStatus(`Failed to parse ${sourceDescription} as JSON`, true)
    }
  }

  const handleFileChange = (event: InputChangeEvent) => {
    const input = event.target
    if (!input.files || input.files.length === 0) return
    const file = input.files[0]
    const reader = new FileReader()
    reader.onload = () => {
      loadCurriculumFromJsonText(String(reader.result), file.name)
    }
    reader.readAsText(file)
  }

  const loadCurriculumFromPath = (relativePath: string) => {
    const samplePath = `${import.meta.env.BASE_URL}data/${relativePath}`
    fetch(samplePath)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load ${relativePath}: ${response.status}`)
        }
        return response.text()
      })
      .then((text) => loadCurriculumFromJsonText(text, relativePath))
      .catch((err) => {
        console.error('Failed to load curriculum from', relativePath, err)
        setStatus(`Failed to load ${relativePath}`, true)
      })
  }

  const zoomIn = useCallback(() => {
    zoomByRef.current?.(0.1)
  }, [])

  const zoomOut = useCallback(() => {
    zoomByRef.current?.(-0.1)
  }, [])

  const resetZoom = useCallback(() => {
    resetViewportRef.current?.()
  }, [])

  const handleRegisterResetViewport = useCallback((reset: (() => void) | null) => {
    resetViewportRef.current = reset
  }, [])

  const handleRegisterPanBy = useCallback((panBy: ((dx: number, dy: number) => void) | null) => {
    panByRef.current = panBy
  }, [])

  const handleRegisterZoomBy = useCallback((zoomBy: ((delta: number) => void) | null) => {
    zoomByRef.current = zoomBy
  }, [])

  const panStep = 80

  const handleSave = useCallback(() => {
    if (!curriculum) {
      setStatus('No curriculum loaded to save.', true)
      return
    }

    try {
      const defaultFileName =
        loadedFileName ?? `${curriculum.curriculumId || curriculum.name || 'curriculum'}.json`
      const requestedName = window.prompt('Save curriculum as:', defaultFileName)
      if (requestedName == null) {
        setStatus('Save canceled.')
        return
      }

      const trimmed = requestedName.trim()
      const baseName = trimmed.length === 0 ? defaultFileName : trimmed
      const withoutIllegalChars = baseName.replace(/[/\\?%*:|"<>]/g, '-')
      const hasJsonExtension = withoutIllegalChars.toLowerCase().endsWith('.json')
      const fileName = hasJsonExtension ? withoutIllegalChars : `${withoutIllegalChars}.json`

      const jsonString = JSON.stringify(curriculum, null, 2)
      const blob = new Blob([jsonString], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      setHasUnsavedChanges(false)
      setStatus('Saved updated curriculum JSON.')
    } catch (err) {
      console.error('Failed to save curriculum', err)
      setStatus('Failed to save curriculum JSON.', true)
    }
  }, [curriculum, loadedFileName, setStatus])

  const handleCloseDialog = useCallback(() => {
    setHelpDialogOpen(false)
    ;(document.querySelector('button.help-button') as HTMLButtonElement)?.focus()
  }, [])

  const handleAddSemester = useCallback(() => {
    if (!curriculum) {
      setStatus('No curriculum loaded.', true)
      return
    }
    setAddSemesterDialogOpen(true)
  }, [curriculum, setStatus])

  const handleCloseAddSemesterDialog = useCallback(() => {
    setAddSemesterDialogOpen(false)
    addSemesterButtonRef.current?.focus()
  }, [])

  const handleSaveAddSemesterDialog = useCallback(
    (args: { name: string; insertionIndex: number }) => {
      const { name, insertionIndex } = args

      if (!curriculum) {
        setStatus('No curriculum loaded.', true)
        return
      }

      const slugBase = name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')

      setCurriculum((prev) => {
        if (!prev) return prev

        const semestersSorted = [...(prev.semesters || [])].sort((a, b) => a.order - b.order)
        const existingIds = new Set(semestersSorted.map((s) => s.id))
        const baseId = slugBase.length > 0 ? slugBase : `semester-${semestersSorted.length + 1}`
        let id = baseId
        let suffix = 2
        while (existingIds.has(id)) {
          id = `${baseId}-${suffix}`
          suffix += 1
        }

        const index = Math.min(Math.max(0, insertionIndex), semestersSorted.length)
        const newSemester: Semester = { id, name, order: 0 }
        const withInsert = [...semestersSorted]
        withInsert.splice(index, 0, newSemester)

        const normalized = withInsert.map((s, i) => ({ ...s, order: i + 1 }))
        return { ...prev, semesters: normalized }
      })

      setAddSemesterDialogOpen(false)
      addSemesterButtonRef.current?.focus()
      setHasUnsavedChanges(true)
      setStatus(`Added semester: ${name}`)
    },
    [curriculum, setStatus],
  )

  const handleAddCourse = useCallback(() => {
    if (!curriculum) {
      setStatus('No curriculum loaded.', true)
      return
    }
    setCourseDialogMode('add')
    setEditingCourseId(null)
    setCourseDialogOpen(true)
  }, [curriculum, setStatus])

  const handleEditCourse = useCallback(
    (courseId: string) => {
      if (!curriculum) return

      const course = curriculum.courses.find((c) => c.id === courseId)
      if (!course || !course.userAdded) {
        setStatus('Only user-added courses can be edited.', true)
        return
      }

      setCourseDialogMode('edit')
      setEditingCourseId(courseId)
      setCourseDialogOpen(true)
    },
    [curriculum, setStatus],
  )

  const handleCloseCourseDialog = useCallback(() => {
    setCourseDialogOpen(false)
    setEditingCourseId(null)
    addCourseButtonRef.current?.focus()
  }, [])

  const handleSaveCourseDialog = useCallback(
    (args: {
      oldCourseId?: string
      courseId: string
      credits: number
      trackId: string
      semesterId: string
    }) => {
      const { oldCourseId, courseId, credits, trackId, semesterId } = args

      if (!curriculum) {
        setStatus('No curriculum loaded.', true)
        return
      }

      if (oldCourseId) {
        // Edit mode
        setCurriculum((prev) => {
          if (!prev) return prev

          const existingCourse = prev.courses.find((c) => c.id === oldCourseId)
          if (!existingCourse) {
            setStatus(`Course ${oldCourseId} not found.`, true)
            return prev
          }

          // If courseId changed, check for duplicates
          if (oldCourseId !== courseId) {
            const duplicate = prev.courses.find((c) => c.id === courseId)
            if (duplicate) {
              setStatus(`Course ${courseId} already exists.`, true)
              return prev
            }
          }

          const updatedCourses = prev.courses.map((c) => {
            if (c.id === oldCourseId) {
              return {
                ...c,
                id: courseId,
                name: courseId,
                credits,
                trackId,
                semesterId,
              }
            }
            return c
          })

          return { ...prev, courses: updatedCourses }
        })

        setHasUnsavedChanges(true)
        setStatus(`Updated course: ${courseId}`)
        setCourseDialogOpen(false)
        setEditingCourseId(null)
        setSelectedCourseId(courseId)
      } else {
        // Add mode
        setCurriculum((prev) => {
          if (!prev) return prev

          const existingCourse = prev.courses.find((c) => c.id === courseId)
          if (existingCourse) {
            setStatus(`Course ${courseId} already exists.`, true)
            return prev
          }

          const newCourse: Course = {
            id: courseId,
            name: courseId,
            credits,
            trackId,
            prerequisiteIds: [],
            corequisiteIds: [],
            semesterId,
            userAdded: true,
          }

          return { ...prev, courses: [...prev.courses, newCourse] }
        })

        setHasUnsavedChanges(true)
        setStatus(`Added course: ${courseId}`)
        setCourseDialogOpen(false)
        setSelectedCourseId(courseId)
      }
    },
    [curriculum, setStatus],
  )

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' || event.key === 'Esc') {
        setHelpDialogOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  return (
    <div className="app-shell">
      <div className="top-bar">
        <div className="top-bar-title">
          <img
            src={`${import.meta.env.BASE_URL}curricula.svg`}
            alt="Curricula logo"
            className="top-bar-logo"
          />
          <h1>Curriculum Visualizer</h1>
          <button
            className="help-button"
            type="button"
            onClick={() => setHelpDialogOpen((prev) => !prev)}
            aria-expanded={helpDialogOpen}
            aria-controls="help-dialog"
            aria-label="Help"
            title="Help"
          >
            ?
          </button>
        </div>
        <div className="controls">
          <div className="file-controls">
            <span>Load curriculum JSON:</span>
            <input
              id="file-input"
              className="file-input"
              type="file"
              accept="application/json,.json"
              onChange={handleFileChange}
            />
            <label
              htmlFor="file-input"
              className="file-input-button"
              title="Load a curriculum JSON file"
            >
              Choose File
            </label>
            <span className={`status-text${statusError ? ' error' : ''}`}>{status}</span>

            <button
              type="button"
              onClick={() => loadCurriculumFromPath('bs-me.json')}
              title="Load sample curriculum"
              aria-describedby="sample-curriculum-description"
            >
              Load BSME
            </button>
            <span id="sample-curriculum-description" className="sr-only">
              Loads a sample curriculum which is the '25-'26 Montana State University B.S. in
              Mechanical Engineering curriculum
            </span>
            <button
              type="button"
              onClick={handleSave}
              disabled={!hasUnsavedChanges}
              style={{
                cursor: !hasUnsavedChanges ? 'not-allowed' : 'pointer',
              }}
              title="Save curriculum"
            >
              Save
            </button>
          </div>

          <div className="data-controls">
            <button
              ref={addSemesterButtonRef}
              type="button"
              onClick={handleAddSemester}
              disabled={!curriculum}
            >
              Add Semester
            </button>
            <button
              ref={addCourseButtonRef}
              type="button"
              onClick={handleAddCourse}
              disabled={!curriculum}
            >
              Add Course
            </button>
          </div>

          <div className="zoom-and-pan-controls">
            <fieldset className="pan-controls" aria-label="Pan view">
              <button
                type="button"
                className="secondary pan-button pan-up"
                onClick={() => panByRef.current?.(0, -panStep)}
                title="Pan up"
                aria-label="Pan up"
              >
                ↑
              </button>
              <button
                type="button"
                className="secondary pan-button pan-left"
                onClick={() => panByRef.current?.(-panStep, 0)}
                title="Pan left"
                aria-label="Pan left"
              >
                ←
              </button>
              <button
                type="button"
                className="secondary pan-button pan-right"
                onClick={() => panByRef.current?.(panStep, 0)}
                title="Pan right"
                aria-label="Pan right"
              >
                →
              </button>
              <button
                type="button"
                className="secondary pan-button pan-down"
                onClick={() => panByRef.current?.(0, panStep)}
                title="Pan down"
                aria-label="Pan down"
              >
                ↓
              </button>
            </fieldset>
            <fieldset className="zoom-controls">
              <button type="button" className="secondary" onClick={zoomOut} title="Zoom out">
                -
              </button>
              <button type="button" className="secondary" onClick={zoomIn} title="Zoom in">
                +
              </button>
              <button type="button" className="secondary" onClick={resetZoom} title="Reset zoom">
                Reset
              </button>
            </fieldset>
          </div>
        </div>
        <HelpDialog curriculum={curriculum} open={helpDialogOpen} onClose={handleCloseDialog} />
        <AddSemesterDialog
          semesters={curriculum?.semesters || []}
          open={addSemesterDialogOpen}
          onClose={handleCloseAddSemesterDialog}
          onSave={handleSaveAddSemesterDialog}
        />
        <CourseDialog
          mode={courseDialogMode}
          course={
            courseDialogMode === 'edit'
              ? (curriculum?.courses.find((c) => c.id === editingCourseId) ?? null)
              : null
          }
          semesters={curriculum?.semesters || []}
          trackInfo={trackInfo}
          open={courseDialogOpen}
          onClose={handleCloseCourseDialog}
          onSave={handleSaveCourseDialog}
        />
      </div>
      <div className="graph-container">
        {curriculum && (
          <CurriculumView
            curriculum={curriculum}
            setStatus={setStatus}
            movedCourseIds={movedCourseIds}
            selectedCourseId={selectedCourseId}
            onCourseSelect={setSelectedCourseId}
            onCourseMoved={handleCourseMoved}
            onCourseEdit={handleEditCourse}
            onRegisterResetViewport={handleRegisterResetViewport}
            onRegisterPanBy={handleRegisterPanBy}
            onRegisterZoomBy={handleRegisterZoomBy}
          />
        )}
      </div>
    </div>
  )
}
