import { useCallback, useEffect, useRef, useState } from 'preact/hooks'
import type { Curriculum } from './CurriculumGraph'
import { CurriculumView } from './CurriculumView'
import { TrackDialog } from './TrackDialog'

export function CurriculumApp() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [status, setStatusState] = useState<string>('No file loaded.')
  const [statusError, setStatusError] = useState<boolean>(false)
  const [curriculum, setCurriculum] = useState<Curriculum | null>(null)
  const [zoom, setZoom] = useState<number>(1)
  const [movedCourseIds, setMovedCourseIds] = useState<string[]>([])
  const [trackDialogOpen, setTrackDialogOpen] = useState<boolean>(false)

  const setStatus = useCallback((text: string, isError = false) => {
    setStatusState(text)
    setStatusError(!!isError)
  }, [])

  const handleCourseMoved = useCallback(
    (courseId: string, newSemesterId: string) => {
      setCurriculum((prev) => {
        if (!prev) return prev
        const existing = prev.courses.find((c) => c.id === courseId)
        if (!existing || existing.semesterId === newSemesterId) return prev
        const updatedCourses = prev.courses.map((c) =>
          c.id === courseId ? { ...c, semesterId: newSemesterId } : c,
        )
        return { ...prev, courses: updatedCourses }
      })

      setMovedCourseIds((prev) => (prev.includes(courseId) ? prev : [...prev, courseId]))
      setStatus(`Moved ${courseId} to semester ${newSemesterId}`)
    },
    [setStatus],
  )

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const zoomFactor = zoom
    container.style.transformOrigin = '0 0'
    container.style.transform = `scale(${zoomFactor})`
  }, [zoom])

  type InputChangeEvent = Event & {
    currentTarget: HTMLInputElement
    target: HTMLInputElement
  }

  const loadCurriculumFromJsonText = (jsonText: string, sourceDescription: string) => {
    try {
      const json = JSON.parse(jsonText)
      setCurriculum(json)
      setMovedCourseIds([])
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
    const samplePath = `${import.meta.env.BASE_URL}/data/${relativePath}`
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
    setZoom((z) => Math.min(3, z + 0.1))
  }, [])

  const zoomOut = useCallback(() => {
    setZoom((z) => Math.max(0.2, z - 0.1))
  }, [])

  const handleSave = useCallback(() => {
    if (!curriculum) {
      setStatus('No curriculum loaded to save.', true)
      return
    }

    try {
      const jsonString = JSON.stringify(curriculum, null, 2)
      const blob = new Blob([jsonString], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      const fileNameBase = curriculum.curriculumId || curriculum.name || 'curriculum'
      link.href = url
      link.download = `${fileNameBase}-updated.json`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      setStatus('Saved updated curriculum JSON.')
    } catch (err) {
      console.error('Failed to save curriculum', err)
      setStatus('Failed to save curriculum JSON.', true)
    }
  }, [curriculum, setStatus])

  const handleCloseDialog = useCallback(() => {
    setTrackDialogOpen(false)
    ;(document.querySelector('button.help-button') as HTMLButtonElement)?.focus()
  }, [])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' || event.key === 'Esc') {
        setTrackDialogOpen(false)
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
          <img src="/curricula.svg" alt="Curricula logo" className="top-bar-logo" />
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
            >
              Load BSME
            </button>
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

          <div className="zoom-controls">
            <button type="button" className="secondary" onClick={zoomOut} title="Zoom out">
              -
            </button>
            <button type="button" className="secondary" onClick={zoomIn} title="Zoom in">
              +
            </button>
            <button
              className="help-button"
              type="button"
              onClick={() => setTrackDialogOpen((prev) => !prev)}
              aria-expanded={trackDialogOpen}
              aria-controls="track-dialog"
              aria-label="Help"
              title="Help"
            >
              ?
            </button>
          </div>
        </div>
        <TrackDialog curriculum={curriculum} open={trackDialogOpen} onClose={handleCloseDialog} />
      </div>
      <div className="graph-container" ref={containerRef}>
        {curriculum && (
          <CurriculumView
            curriculum={curriculum}
            setStatus={setStatus}
            movedCourseIds={movedCourseIds}
            onCourseMoved={handleCourseMoved}
          />
        )}
      </div>
    </div>
  )
}
