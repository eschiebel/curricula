import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks'
import type { Semester } from './CurriculumGraph'

export interface AddSemesterDialogProps {
  semesters: Semester[]
  courses?: Array<{ semesterId: string }>
  open: boolean
  onClose: () => void
  onSave: (args: { name: string; insertionIndex: number }) => void
  onEdit?: (args: { semesterId: string; newName: string }) => void
  onDelete?: (semesterId: string) => void
  onReorder?: (args: { semesterId: string; newIndex: number }) => void
  isEditMode?: boolean
}

type DragItemId = 'new-semester'

export function AddSemesterDialog(props: AddSemesterDialogProps) {
  const { semesters, courses, open, onClose, onSave, onEdit, onDelete, onReorder, isEditMode } =
    props

  const dialogRef = useRef<HTMLDivElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const dragHandleRef = useRef<HTMLButtonElement>(null)
  const dragImageRef = useRef<HTMLDivElement | null>(null)
  const saveButtonRef = useRef<HTMLButtonElement>(null)
  const focusRestoreSemesterIdRef = useRef<string | null>(null)
  const draggingSemesterIdRef = useRef<string | null>(null)
  const [name, setName] = useState<string>('')
  const [dragActive, setDragActive] = useState<boolean>(false)
  const [editingSemesterId, setEditingSemesterId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState<string>('')
  const [draggingSemesterId, setDraggingSemesterId] = useState<string | null>(null)

  const semestersSorted = useMemo(() => {
    return [...(semesters || [])].sort((a, b) => a.order - b.order)
  }, [semesters])

  const [insertionIndex, setInsertionIndex] = useState<number>(semestersSorted.length)

  useEffect(() => {
    if (!open) return
    setName('')
    setInsertionIndex(semestersSorted.length)
  }, [open, semestersSorted.length])

  useEffect(() => {
    if (!focusRestoreSemesterIdRef.current) return

    const semesterId = focusRestoreSemesterIdRef.current
    focusRestoreSemesterIdRef.current = null

    const button = dialogRef.current?.querySelector(
      `button[data-semester-id="${semesterId}"]`,
    ) as HTMLButtonElement
    button?.focus()
  }, [semestersSorted])

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

  const handleDragStart = useCallback((event: DragEvent) => {
    event.stopPropagation()
    try {
      event.dataTransfer?.setData('text/plain', 'new-semester')
      event.dataTransfer?.setData('application/x-curricula-drag-item', 'new-semester')
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move'

        const setDragImage = (event.dataTransfer as DataTransfer).setDragImage
        if (typeof setDragImage === 'function' && typeof document !== 'undefined') {
          const img = new Image()
          img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=='
          event.dataTransfer.setDragImage(img, 0, 0)
        }
      }
    } catch {
      // ignore
    }
    setDragActive(true)
  }, [])

  const allowDrop = useCallback((event: DragEvent) => {
    event.preventDefault()
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move'
    }
  }, [])

  const handleDragOverIndex = useCallback(
    (index: number) => (event: DragEvent) => {
      allowDrop(event)
      if (!dragActive) return
      setInsertionIndex(Math.min(Math.max(0, index), semestersSorted.length))
    },
    [allowDrop, dragActive, semestersSorted.length],
  )

  const handleDropAtIndex = useCallback(
    (index: number) => (event: DragEvent) => {
      event.preventDefault()
      const id = (event.dataTransfer?.getData('application/x-curricula-drag-item') ||
        event.dataTransfer?.getData('text/plain')) as DragItemId | ''
      if (id !== 'new-semester') return
      setInsertionIndex(Math.min(Math.max(0, index), semestersSorted.length))
      setDragActive(false)

      if (dragImageRef.current) {
        dragImageRef.current.remove()
        dragImageRef.current = null
      }
    },
    [semestersSorted.length],
  )

  const handleDragEnd = useCallback(() => {
    setDragActive(false)

    if (dragImageRef.current) {
      dragImageRef.current.remove()
      dragImageRef.current = null
    }

    // Restore focus to the new semester drag handle after dragging
    // Use setTimeout to ensure DOM has updated after position change
    setTimeout(() => {
      dragHandleRef.current?.focus()
    }, 0)
  }, [])

  const handleSave = useCallback(() => {
    const trimmedName = name.trim()
    if (trimmedName.length === 0) return

    onSave({ name: trimmedName, insertionIndex })
    setName('')
    setInsertionIndex(semestersSorted.length)
  }, [name, insertionIndex, semestersSorted.length, onSave])

  const handleEditSemester = useCallback((semesterId: string, currentName: string) => {
    setEditingSemesterId(semesterId)
    setEditingName(currentName)
  }, [])

  const handleSaveEdit = useCallback(
    (semesterId: string) => {
      if (!onEdit) return
      const trimmedName = editingName.trim()
      if (trimmedName.length === 0) return

      onEdit({ semesterId, newName: trimmedName })
      setEditingSemesterId(null)
      setEditingName('')
    },
    [editingName, onEdit],
  )

  const handleCancelEdit = useCallback(() => {
    setEditingSemesterId(null)
    setEditingName('')
  }, [])

  const handleDeleteSemester = useCallback(
    (semesterId: string, semesterName: string) => {
      if (!onDelete || !courses) return

      const coursesInSemester = courses.filter((c) => c.semesterId === semesterId)
      if (coursesInSemester.length > 0) {
        alert(
          `Cannot delete semester "${semesterName}": it contains ${coursesInSemester.length} course(s).`,
        )
        return
      }

      const confirmed = window.confirm(
        `Are you sure you want to delete semester "${semesterName}"?`,
      )
      if (confirmed) {
        onDelete(semesterId)
      }
    },
    [courses, onDelete],
  )

  const handleSemesterDragStart = useCallback(
    (semesterId: string) => (event: DragEvent) => {
      event.stopPropagation()
      try {
        event.dataTransfer?.setData('text/plain', semesterId)
        event.dataTransfer?.setData('application/x-curricula-semester-reorder', semesterId)
        if (event.dataTransfer) {
          event.dataTransfer.effectAllowed = 'move'
        }
      } catch {
        // ignore
      }
      draggingSemesterIdRef.current = semesterId
      setDraggingSemesterId(semesterId)
    },
    [],
  )

  const handleSemesterDragEnd = useCallback(() => {
    // Use ref to get the current dragging semester ID (avoids stale closure)
    const semesterId = draggingSemesterIdRef.current

    // Store semesterId in ref so useEffect can restore focus after React re-renders
    if (semesterId) {
      focusRestoreSemesterIdRef.current = semesterId
    }

    draggingSemesterIdRef.current = null
    setDraggingSemesterId(null)
  }, [])

  const handleSemesterDragOver = useCallback(
    (_index: number) => (event: DragEvent) => {
      event.preventDefault()
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'move'
      }
    },
    [],
  )

  const handleSemesterDrop = useCallback(
    (targetIndex: number) => (event: DragEvent) => {
      event.preventDefault()
      event.stopPropagation()

      if (!onReorder) return

      const semesterId = event.dataTransfer?.getData('application/x-curricula-semester-reorder')
      if (!semesterId) return

      const currentIndex = semestersSorted.findIndex((s) => s.id === semesterId)
      if (currentIndex === -1 || currentIndex === targetIndex) return

      onReorder({ semesterId, newIndex: targetIndex })
      setDraggingSemesterId(null)
    },
    [onReorder, semestersSorted],
  )

  const handleSemesterDragHandleKeyDown = useCallback(
    (semesterId: string, currentIndex: number) => (event: KeyboardEvent) => {
      if (!onReorder) return
      if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return

      event.preventDefault()
      event.stopPropagation()

      const delta = event.key === 'ArrowUp' ? -1 : 1
      const newIndex = currentIndex + delta

      if (newIndex < 0 || newIndex >= semestersSorted.length) return

      onReorder({ semesterId, newIndex })

      // Store semesterId in ref so useEffect can restore focus after React re-renders
      focusRestoreSemesterIdRef.current = semesterId
    },
    [onReorder, semestersSorted.length],
  )

  const handleNameKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        event.preventDefault()
        handleSave()
      }
    },
    [handleSave],
  )

  const handleDragHandleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return
      event.preventDefault()
      event.stopPropagation()

      const delta = event.key === 'ArrowUp' ? -1 : 1
      setInsertionIndex((prev) => {
        const next = prev + delta
        return Math.min(Math.max(0, next), semestersSorted.length)
      })

      // Moving the row reorders DOM nodes; explicitly keep focus on the handle.
      requestAnimationFrame(() => {
        dragHandleRef.current?.focus()
      })
    },
    [semestersSorted.length],
  )

  if (!open) return null

  const newSemesterRow = (
    <li
      key="new-semester"
      className={`add-semester-dialog-row add-semester-dialog-new-row${dragActive ? ' dragging' : ''}`}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="add-semester-dialog-row-content">
        <button
          ref={dragHandleRef}
          type="button"
          className="add-semester-dialog-drag-handle"
          draggable={false}
          onKeyDown={handleDragHandleKeyDown}
          aria-label="Drag or use up/down arrow keys to set semester position"
          title="Drag or use up/down arrow keys to set semesterposition"
        >
          ≡
        </button>
        <label className="add-semester-dialog-name-label" htmlFor="new-semester-name">
          Name
        </label>
        <input
          ref={nameInputRef}
          id="new-semester-name"
          type="text"
          draggable={false}
          value={name}
          onInput={(e) => setName((e.currentTarget as HTMLInputElement).value)}
          onKeyDown={handleNameKeyDown}
        />
      </div>
    </li>
  )

  const semesterRows = semestersSorted.map((sem, i) => {
    const isEditing = editingSemesterId === sem.id
    const isDragging = draggingSemesterId === sem.id

    return (
      <li
        key={sem.id}
        className={`add-semester-dialog-row${isDragging ? ' dragging' : ''}`}
        draggable={isEditMode && !isEditing}
        onDragStart={handleSemesterDragStart(sem.id)}
        onDragEnd={handleSemesterDragEnd}
        onDragEnter={isEditMode ? handleSemesterDragOver(i) : handleDragOverIndex(i)}
        onDragOver={isEditMode ? handleSemesterDragOver(i) : handleDragOverIndex(i)}
        onDrop={isEditMode ? handleSemesterDrop(i) : handleDropAtIndex(i)}
      >
        <div className="add-semester-dialog-row-content">
          {isEditing ? (
            <>
              <input
                type="text"
                value={editingName}
                onInput={(e) => setEditingName((e.currentTarget as HTMLInputElement).value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleSaveEdit(sem.id)
                  } else if (e.key === 'Escape') {
                    e.preventDefault()
                    handleCancelEdit()
                  }
                }}
                style={{ flex: 1, marginRight: '8px' }}
              />
              <button
                type="button"
                onClick={() => handleSaveEdit(sem.id)}
                style={{ marginRight: '4px' }}
              >
                Save
              </button>
              <button type="button" onClick={handleCancelEdit} className="secondary">
                Cancel
              </button>
            </>
          ) : (
            <>
              {isEditMode && (
                <button
                  type="button"
                  className="add-semester-dialog-drag-handle"
                  draggable={false}
                  data-semester-id={sem.id}
                  style={{ marginRight: '8px', cursor: 'grab' }}
                  title="Drag to reorder, or use arrow keys"
                  aria-label="Drag to reorder semester, or use up/down arrow keys"
                  onKeyDown={handleSemesterDragHandleKeyDown(sem.id, i)}
                >
                  ≡
                </button>
              )}
              <div className="add-semester-dialog-row-name" style={{ flex: 1 }}>
                {sem.name}
              </div>
              {isEditMode && (
                <>
                  <button
                    type="button"
                    onClick={() => handleEditSemester(sem.id, sem.name)}
                    style={{ marginRight: '4px', fontSize: '12px', padding: '4px 8px' }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="danger"
                    onClick={() => handleDeleteSemester(sem.id, sem.name)}
                    style={{ fontSize: '12px', padding: '4px 8px' }}
                  >
                    Delete
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </li>
    )
  })

  const orderedRows = [...semesterRows]
  orderedRows.splice(insertionIndex, 0, newSemesterRow)

  return (
    <div ref={dialogRef} className="add-semester-dialog" role="dialog" aria-label="Add Semester">
      <div className="add-semester-dialog-header">
        <h2 className="add-semester-dialog-title">Add Semester</h2>
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
        <div className="add-semester-dialog-instructions">
          Drag the handle to position the new semester, then enter a name and click Save.
        </div>

        <ul className="add-semester-dialog-list" aria-label="Semester order">
          {orderedRows}

          <li
            className="add-semester-dialog-row add-semester-dialog-drop-end"
            onDragEnter={handleDragOverIndex(semestersSorted.length)}
            onDragOver={handleDragOverIndex(semestersSorted.length)}
            onDrop={handleDropAtIndex(semestersSorted.length)}
          />
        </ul>

        <div className="add-semester-dialog-actions">
          <button type="button" className="secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            ref={saveButtonRef}
            type="button"
            onClick={handleSave}
            disabled={name.trim().length === 0}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
