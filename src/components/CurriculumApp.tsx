import { useCallback, useEffect, useRef, useState } from 'preact/hooks'
import type { Curriculum } from './CurriculumGraph'
import { CurriculumView } from './CurriculumView'

export function CurriculumApp() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [status, setStatusState] = useState<string>('No file loaded.')
  const [statusError, setStatusError] = useState<boolean>(false)
  const [curriculum, setCurriculum] = useState<Curriculum | null>(null)
  const [zoom, setZoom] = useState<number>(1)
  const [movedCourseIds, setMovedCourseIds] = useState<string[]>([])

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

  const handleFileChange = (event: InputChangeEvent) => {
    const input = event.target
    if (!input.files || input.files.length === 0) return
    const file = input.files[0]
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const json = JSON.parse(String(reader.result))
        setCurriculum(json)
        setMovedCourseIds([])
      } catch (err) {
        console.error(err)
        setStatus('Failed to parse selected file as JSON', true)
      }
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
        return response.json()
      })
      .then((json: Curriculum) => {
        setCurriculum(json)
        setMovedCourseIds([])
      })
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

  return (
    <div className="app-shell">
      <div className="top-bar">
        <div className="top-bar-title">
          <img src="/curricula.svg" alt="Curricula logo" className="top-bar-logo" />
          <h1>Curriculum Visualizer</h1>
        </div>
        <div className="controls">
          <label htmlFor="file-input">Load curriculum JSON:</label>
          <input
            id="file-input"
            type="file"
            accept="application/json,.json"
            onChange={handleFileChange}
          />
          <button
            className="secondary"
            type="button"
            onClick={() => loadCurriculumFromPath('sample.json')}
          >
            Load sample.json
          </button>
          <button
            className="secondary"
            type="button"
            onClick={() => loadCurriculumFromPath('bs-me.json')}
          >
            Load bs-me.json
          </button>
          <button
            className="secondary"
            type="button"
            onClick={handleSave}
            disabled={movedCourseIds.length === 0}
            style={{
              cursor: movedCourseIds.length === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            Save JSON
          </button>

          <button type="button" onClick={zoomOut}>
            -
          </button>
          <button type="button" onClick={zoomIn}>
            +
          </button>
          <span className={`status-text${statusError ? ' error' : ''}`}>{status}</span>
        </div>
        <div className="legend">
          <span className="legend-item">
            <span className="legend-line" />
            Prerequisite
          </span>
          <span className="legend-item">
            <span className="legend-line coreq" />
            Corequisite
          </span>
        </div>
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
