import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks'
import type { Course, Curriculum, Semester } from './CurriculumGraph'
import { getCurriculumTrackInfo } from './CurriculumGraph'
import { CurriculumView } from './CurriculumView'
import { AddSemesterDialog } from './AddSemesterDialog'
import { AddTrackDialog } from './AddTrackDialog'
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
  const [addTrackDialogOpen, setAddTrackDialogOpen] = useState<boolean>(false)
  const [courseDialogOpen, setCourseDialogOpen] = useState<boolean>(false)
  const [courseDialogMode, setCourseDialogMode] = useState<'add' | 'edit'>('add')
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null)
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null)
  const [isEditMode, setIsEditMode] = useState<boolean>(false)
  const [isValidatorLoading, setIsValidatorLoading] = useState<boolean>(false)

  const validatorModuleRef = useRef<null | typeof import('../validation/validateCurriculum')>(null)
  const validatorPromiseRef = useRef<null | Promise<
    typeof import('../validation/validateCurriculum')
  >>(null)

  const startValidatorLoad = useCallback(() => {
    if (validatorModuleRef.current) {
      return Promise.resolve(validatorModuleRef.current)
    }
    if (!validatorPromiseRef.current) {
      validatorPromiseRef.current = import('../validation/validateCurriculum').then((mod) => {
        validatorModuleRef.current = mod
        return mod
      })
    }
    return validatorPromiseRef.current
  }, [])

  useEffect(() => {
    void startValidatorLoad().catch((err) => {
      console.error('Failed to preload validation module', err)
    })
  }, [startValidatorLoad])

  const trackInfo = useMemo(() => {
    return curriculum ? getCurriculumTrackInfo(curriculum) : null
  }, [curriculum])

  const setStatus = useCallback((text: string, isError = false) => {
    setStatusState(text)
    setStatusError(!!isError)
  }, [])

  const createEmptyCurriculum = useCallback((): Curriculum => {
    return {
      curriculumId: 'new-curriculum',
      name: 'New Curriculum',
      totalCredits: 0,
      tracks: [],
      semesters: [],
      courses: [],
    }
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

  const loadCurriculumFromJsonText = async (
    jsonText: string,
    sourceDescription: string,
    options: { waitForValidator: boolean },
  ) => {
    try {
      const json = JSON.parse(jsonText)

      let curriculum: Curriculum
      const validator = validatorModuleRef.current

      if (options.waitForValidator) {
        if (!validator) {
          setIsValidatorLoading(true)
        }
        try {
          const mod = await startValidatorLoad()
          const validated = mod.validateCurriculumJson(json)
          if (!validated.ok) {
            console.error('Curriculum JSON schema validation failed:', validated.error)
            setStatus(`Invalid curriculum JSON: ${validated.error}`, true)
            return
          }
          curriculum = validated.curriculum
        } catch (err) {
          console.error('Failed to load validation module', err)
          setStatus('Failed to load JSON validator.', true)
          return
        } finally {
          setIsValidatorLoading(false)
        }
      } else if (validator) {
        const validated = validator.validateCurriculumJson(json)
        if (!validated.ok) {
          console.error('Curriculum JSON schema validation failed:', validated.error)
          setStatus(`Invalid curriculum JSON: ${validated.error}`, true)
          return
        }
        curriculum = validated.curriculum
      } else {
        curriculum = json as Curriculum
      }

      setCurriculum(curriculum)
      const movedIds = Array.isArray(curriculum?.courses)
        ? (curriculum.courses as Array<{ id?: unknown; new_semester?: unknown }>)
            .filter((c) => typeof c?.id === 'string' && c?.new_semester != null)
            .map((c) => String(c.id))
        : []
      setMovedCourseIds(movedIds)
      setHasUnsavedChanges(false)
      setLoadedFileName(sourceDescription)
      setIsEditMode(false) // Exit edit mode when loading a new curriculum
      setStatus(`Loaded ${sourceDescription}.`)
    } catch (err) {
      console.error(err)
      setStatus(`Failed to parse ${sourceDescription} as JSON`, true)
    }
  }

  const handleFileChange = (event: InputChangeEvent) => {
    const input = event.target
    if (!input.files || input.files.length === 0) return

    // Warn about unsaved changes
    if (hasUnsavedChanges) {
      const confirmed = window.confirm(
        'You have unsaved changes. Loading a new curriculum will discard these changes. Continue?',
      )
      if (!confirmed) {
        // Clear the file input so the same file can be selected again
        input.value = ''
        return
      }
    }

    const file = input.files[0]
    const reader = new FileReader()
    reader.onload = () => {
      void loadCurriculumFromJsonText(String(reader.result), file.name, { waitForValidator: true })
    }
    reader.readAsText(file)
  }

  const loadCurriculumFromPath = (relativePath: string) => {
    // Warn about unsaved changes
    if (hasUnsavedChanges) {
      const confirmed = window.confirm(
        'You have unsaved changes. Loading a new curriculum will discard these changes. Continue?',
      )
      if (!confirmed) {
        return
      }
    }

    const samplePath = `${import.meta.env.BASE_URL}data/${relativePath}`
    fetch(samplePath)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load ${relativePath}: ${response.status}`)
        }
        return response.text()
      })
      .then((text) => loadCurriculumFromJsonText(text, relativePath, { waitForValidator: false }))
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
    setHelpDialogOpen(false)
    setCourseDialogOpen(false)
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

  const handleEditSemester = useCallback(
    (args: { semesterId: string; newName: string }) => {
      const { semesterId, newName } = args

      if (!curriculum) {
        setStatus('No curriculum loaded.', true)
        return
      }

      setCurriculum((prev) => {
        if (!prev) return prev

        const updatedSemesters = prev.semesters.map((s) =>
          s.id === semesterId ? { ...s, name: newName } : s,
        )

        return { ...prev, semesters: updatedSemesters }
      })

      setHasUnsavedChanges(true)
      setStatus(`Updated semester: ${newName}`)
    },
    [curriculum, setStatus],
  )

  const handleDeleteSemester = useCallback(
    (semesterId: string) => {
      if (!curriculum) {
        setStatus('No curriculum loaded.', true)
        return
      }

      setCurriculum((prev) => {
        if (!prev) return prev

        const filteredSemesters = prev.semesters.filter((s) => s.id !== semesterId)
        const normalized = filteredSemesters.map((s, i) => ({ ...s, order: i + 1 }))

        return { ...prev, semesters: normalized }
      })

      setHasUnsavedChanges(true)
      setStatus(`Deleted semester`)
    },
    [curriculum, setStatus],
  )

  const handleReorderSemester = useCallback(
    (args: { semesterId: string; newIndex: number }) => {
      const { semesterId, newIndex } = args

      if (!curriculum) {
        setStatus('No curriculum loaded.', true)
        return
      }

      setCurriculum((prev) => {
        if (!prev) return prev

        const sorted = [...prev.semesters].sort((a, b) => a.order - b.order)
        const currentIndex = sorted.findIndex((s) => s.id === semesterId)
        if (currentIndex === -1) return prev

        const [movedSemester] = sorted.splice(currentIndex, 1)
        sorted.splice(newIndex, 0, movedSemester)

        const normalized = sorted.map((s, i) => ({ ...s, order: i + 1 }))
        return { ...prev, semesters: normalized }
      })

      setHasUnsavedChanges(true)
      setStatus(`Reordered semesters`)
    },
    [curriculum, setStatus],
  )

  const handleAddTrack = useCallback(() => {
    if (!curriculum) {
      setStatus('No curriculum loaded.', true)
      return
    }
    setHelpDialogOpen(false)
    setAddSemesterDialogOpen(false)
    setCourseDialogOpen(false)
    setAddTrackDialogOpen(true)
  }, [curriculum, setStatus])

  const handleCloseAddTrackDialog = useCallback(() => {
    setAddTrackDialogOpen(false)
  }, [])

  const handleSaveAddTrackDialog = useCallback(
    (args: { trackId: string; trackName: string }) => {
      const { trackId, trackName } = args

      if (!curriculum) {
        setStatus('No curriculum loaded.', true)
        return
      }

      setCurriculum((prev) => {
        if (!prev) return prev

        const existingTracks = prev.tracks || []
        const trackExists = existingTracks.some((t) => {
          if ('id' in t && typeof t.id === 'string') {
            return t.id === trackId
          }
          return trackId in t
        })

        if (trackExists) {
          setStatus(`Track ${trackId} already exists.`, true)
          return prev
        }

        const newTrack = { id: trackId, name: trackName }
        return { ...prev, tracks: [...existingTracks, newTrack] }
      })

      setHasUnsavedChanges(true)
      setStatus(`Added track: ${trackName}`)
    },
    [curriculum, setStatus],
  )

  const handleDeleteTrack = useCallback(
    (trackId: string) => {
      if (!curriculum) {
        setStatus('No curriculum loaded.', true)
        return
      }

      const coursesUsingTrack = curriculum.courses.filter((c) => c.trackId === trackId)
      if (coursesUsingTrack.length > 0) {
        setStatus(
          `Cannot delete track ${trackId}: ${coursesUsingTrack.length} course(s) are using it.`,
          true,
        )
        return
      }

      setCurriculum((prev) => {
        if (!prev) return prev
        const filteredTracks = (prev.tracks || []).filter((t) => {
          if ('id' in t && typeof t.id === 'string') {
            return t.id !== trackId
          }
          return !(trackId in t)
        })
        return { ...prev, tracks: filteredTracks }
      })

      setHasUnsavedChanges(true)
      setStatus(`Deleted track: ${trackId}`)
    },
    [curriculum, setStatus],
  )

  const handleAddCourse = useCallback(() => {
    if (!curriculum) {
      setStatus('No curriculum loaded.', true)
      return
    }
    setHelpDialogOpen(false)
    setAddSemesterDialogOpen(false)
    setCourseDialogMode('add')
    setEditingCourseId(null)
    setCourseDialogOpen(true)
  }, [curriculum, setStatus])

  const handleEditCourse = useCallback(
    (courseId: string) => {
      if (!curriculum) return

      const course = curriculum.courses.find((c) => c.id === courseId)
      if (!course) {
        setStatus('Course not found.', true)
        return
      }
      if (!isEditMode && !course.userAdded) {
        setStatus('Only user-added courses can be edited.', true)
        return
      }

      setHelpDialogOpen(false)
      setAddSemesterDialogOpen(false)
      setCourseDialogMode('edit')
      setEditingCourseId(courseId)
      setCourseDialogOpen(true)
    },
    [curriculum, isEditMode, setStatus],
  )

  const handleCloseCourseDialog = useCallback(() => {
    setCourseDialogOpen(false)
    setEditingCourseId(null)
    addCourseButtonRef.current?.focus()
  }, [])

  const handleDeleteCourse = useCallback(
    (courseId: string) => {
      if (!curriculum) {
        setStatus('No curriculum loaded.', true)
        return
      }

      const course = curriculum.courses.find((c) => c.id === courseId)
      if (!course) {
        setStatus(`Course ${courseId} not found.`, true)
        return
      }

      if (!isEditMode && !course.userAdded) {
        setStatus('Only user-added courses can be deleted.', true)
        return
      }

      setCurriculum((prev) => {
        if (!prev) return prev
        return { ...prev, courses: prev.courses.filter((c) => c.id !== courseId) }
      })

      setHasUnsavedChanges(true)
      setStatus(`Deleted course: ${courseId}`)
      setCourseDialogOpen(false)
      setEditingCourseId(null)
      setSelectedCourseId(null)
    },
    [curriculum, setStatus],
  )

  const handleSaveCourseDialog = useCallback(
    (args: {
      oldCourseId?: string
      courseId: string
      name?: string
      credits: number
      trackId: string
      semesterId: string
      prerequisiteIds: string[]
      corequisiteIds: string[]
    }) => {
      const {
        oldCourseId,
        courseId,
        name,
        credits,
        trackId,
        semesterId,
        prerequisiteIds,
        corequisiteIds,
      } = args

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
                name: name || courseId,
                credits,
                trackId,
                semesterId,
                prerequisiteIds,
                corequisiteIds,
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
            name: name || courseId,
            credits,
            trackId,
            prerequisiteIds,
            corequisiteIds,
            semesterId,
            ...(isEditMode ? {} : { userAdded: true }),
          }

          return { ...prev, courses: [...prev.courses, newCourse] }
        })

        setHasUnsavedChanges(true)
        setStatus(`Added course: ${courseId}`)
        setCourseDialogOpen(false)
        setSelectedCourseId(courseId)
      }
    },
    [curriculum, isEditMode, setStatus],
  )

  const handleToggleEditMode = useCallback(() => {
    if (!curriculum && !isEditMode) {
      const empty = createEmptyCurriculum()
      setCurriculum(empty)
      setLoadedFileName(null)
      setIsEditMode(true)
      setHasUnsavedChanges(true)
      setStatus('Edit mode: New curriculum created.')
    } else if (!isEditMode && curriculum) {
      // Warn user before entering edit mode with a loaded curriculum
      const confirmed = window.confirm(
        'You are about to enter edit mode. This will allow you to make changes to the curriculum that are generally set by the institution.\n\nAre you sure you want to continue?',
      )
      if (confirmed) {
        setIsEditMode(true)
        setStatus('Edit mode enabled.')
      }
    } else {
      setIsEditMode((prev) => !prev)
      setStatus(isEditMode ? 'Edit mode disabled.' : 'Edit mode enabled.')
    }
  }, [curriculum, isEditMode, createEmptyCurriculum, setStatus])

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

  const editButtonLabel = () => {
    if (!curriculum) {
      return 'New Curriculum'
    }
    return isEditMode ? 'Exit Edit Mode' : 'Edit Curriculum'
  }

  return (
    <div className="app-shell">
      <div className={`top-bar${isEditMode ? ' edit-mode' : ''}`}>
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
            onClick={() => {
              setAddSemesterDialogOpen(false)
              setCourseDialogOpen(false)
              setHelpDialogOpen((prev) => !prev)
            }}
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
            {isValidatorLoading && (
              <output
                className="validator-loading"
                aria-live="polite"
                aria-label="Loading JSON validator"
                title="Loading JSON validator"
              >
                <span className="spinner" aria-hidden="true" />
              </output>
            )}

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
              className={`edit-mode-button${isEditMode ? ' active' : ''}`}
              type="button"
              onClick={handleToggleEditMode}
              aria-label={isEditMode ? 'Exit edit mode' : 'Enter edit mode'}
              title={isEditMode ? 'Exit edit mode' : 'Enter edit mode'}
            >
              {editButtonLabel()}
            </button>
            <button type="button" onClick={handleAddTrack} disabled={!curriculum}>
              {!curriculum?.tracks?.length || !isEditMode ? 'Add Track' : 'Edit Tracks'}
            </button>
            <button
              ref={addSemesterButtonRef}
              type="button"
              onClick={handleAddSemester}
              disabled={!curriculum}
            >
              {isEditMode ? 'Edit Semesters' : 'Add Semester'}
            </button>
            <button
              ref={addCourseButtonRef}
              type="button"
              onClick={handleAddCourse}
              disabled={
                !curriculum ||
                !curriculum.tracks ||
                curriculum.tracks.length === 0 ||
                !curriculum.semesters ||
                curriculum.semesters.length === 0
              }
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
          courses={curriculum?.courses || []}
          open={addSemesterDialogOpen}
          onClose={handleCloseAddSemesterDialog}
          onSave={handleSaveAddSemesterDialog}
          onEdit={handleEditSemester}
          onDelete={handleDeleteSemester}
          onReorder={handleReorderSemester}
          isEditMode={isEditMode}
        />
        <AddTrackDialog
          tracks={curriculum?.tracks || []}
          open={addTrackDialogOpen}
          onClose={handleCloseAddTrackDialog}
          onSave={handleSaveAddTrackDialog}
          onDelete={handleDeleteTrack}
          isEditMode={isEditMode}
        />
        <CourseDialog
          mode={courseDialogMode}
          course={
            courseDialogMode === 'edit'
              ? (curriculum?.courses.find((c) => c.id === editingCourseId) ?? null)
              : null
          }
          courses={curriculum?.courses || []}
          semesters={curriculum?.semesters || []}
          trackInfo={trackInfo}
          open={courseDialogOpen}
          onClose={handleCloseCourseDialog}
          onSave={handleSaveCourseDialog}
          onDelete={handleDeleteCourse}
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
