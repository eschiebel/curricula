import { useCallback, useEffect, useRef, useState } from 'preact/hooks'
import type { Course, Curriculum, Semester } from './CurriculumGraph'
import { CurriculumView } from './CurriculumView'
import { HelpDialog } from './HelpDialog'

export function CurriculumApp() {
  const resetViewportRef = useRef<(() => void) | null>(null)
  const panByRef = useRef<((dx: number, dy: number) => void) | null>(null)
  const zoomByRef = useRef<((delta: number) => void) | null>(null)
  const [status, setStatusState] = useState<string>('No file loaded.')
  const [statusError, setStatusError] = useState<boolean>(false)
  const [curriculum, setCurriculum] = useState<Curriculum | null>(null)
  const [loadedFileName, setLoadedFileName] = useState<string | null>(null)
  const [movedCourseIds, setMovedCourseIds] = useState<string[]>([])
  const [helpDialogOpen, setHelpDialogOpen] = useState<boolean>(false)

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

    const requestedName = window.prompt('New semester name:')
    if (requestedName == null) {
      setStatus('Add semester canceled.')
      return
    }

    const name = requestedName.trim()
    if (name.length === 0) {
      setStatus('Semester name is required.', true)
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

      const semesters = [...(prev.semesters || [])]
      const maxOrder = semesters.reduce((max, s) => Math.max(max, s.order), 0)
      const nextOrder = maxOrder + 1

      const existingIds = new Set(semesters.map((s) => s.id))
      const baseId = slugBase.length > 0 ? slugBase : `semester-${nextOrder}`
      let id = baseId
      let suffix = 2
      while (existingIds.has(id)) {
        id = `${baseId}-${suffix}`
        suffix += 1
      }

      const newSemester: Semester = { id, name, order: nextOrder }
      const updated = { ...prev, semesters: [...semesters, newSemester] }
      return updated
    })

    setStatus(`Added semester: ${name}`)
  }, [curriculum, setStatus])

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
              disabled={movedCourseIds.length === 0}
              style={{
                cursor: movedCourseIds.length === 0 ? 'not-allowed' : 'pointer',
              }}
              title="Save curriculum"
            >
              Save
            </button>
          </div>

          <div className="data-controls">
            <button type="button" onClick={handleAddSemester} disabled={!curriculum}>
              Add Semester
            </button>
          </div>

          <div className="zoom-and-pan-controls">
            <fieldset className="pan-controls" aria-label="Pan view">
              <button
                type="button"
                className="secondary pan-button pan-up"
                onClick={() => panByRef.current?.(0, panStep)}
                title="Pan up"
                aria-label="Pan up"
              >
                ↑
              </button>
              <button
                type="button"
                className="secondary pan-button pan-left"
                onClick={() => panByRef.current?.(panStep, 0)}
                title="Pan left"
                aria-label="Pan left"
              >
                ←
              </button>
              <button
                type="button"
                className="secondary pan-button pan-right"
                onClick={() => panByRef.current?.(-panStep, 0)}
                title="Pan right"
                aria-label="Pan right"
              >
                →
              </button>
              <button
                type="button"
                className="secondary pan-button pan-down"
                onClick={() => panByRef.current?.(0, -panStep)}
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
        </div>
        <HelpDialog curriculum={curriculum} open={helpDialogOpen} onClose={handleCloseDialog} />
      </div>
      <div className="graph-container">
        {curriculum && (
          <CurriculumView
            curriculum={curriculum}
            setStatus={setStatus}
            movedCourseIds={movedCourseIds}
            onCourseMoved={handleCourseMoved}
            onRegisterResetViewport={handleRegisterResetViewport}
            onRegisterPanBy={handleRegisterPanBy}
            onRegisterZoomBy={handleRegisterZoomBy}
          />
        )}
      </div>
    </div>
  )
}
