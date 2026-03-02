import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks'
import type { JSX } from 'preact'
import type { Semester } from './CurriculumGraph'

export interface AddSemesterDialogProps {
  semesters: Semester[]
  open: boolean
  onClose: () => void
  onSave: (args: { name: string; insertionIndex: number }) => void
}

type DragItemId = 'new-semester'

export function AddSemesterDialog(props: AddSemesterDialogProps) {
  const { semesters, open, onClose, onSave } = props

  const nameInputRef = useRef<HTMLInputElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const dragHandleRef = useRef<HTMLButtonElement>(null)
  const dragImageRef = useRef<HTMLDivElement | null>(null)
  const [name, setName] = useState<string>('')
  const [dragActive, setDragActive] = useState<boolean>(false)

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

  const handleDragStart = useCallback((event: JSX.TargetedDragEvent<HTMLElement>) => {
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

  const allowDrop = useCallback((event: JSX.TargetedDragEvent<HTMLElement>) => {
    event.preventDefault()
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move'
    }
  }, [])

  const handleDragOverIndex = useCallback(
    (index: number) => (event: JSX.TargetedDragEvent<HTMLElement>) => {
      allowDrop(event)
      if (!dragActive) return
      setInsertionIndex(Math.min(Math.max(0, index), semestersSorted.length))
    },
    [allowDrop, dragActive, semestersSorted.length],
  )

  const handleDropAtIndex = useCallback(
    (index: number) => (event: JSX.TargetedDragEvent<HTMLElement>) => {
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
  }, [])

  const handleSave = useCallback(() => {
    const trimmed = name.trim()
    if (trimmed.length === 0) return
    onSave({ name: trimmed, insertionIndex })
  }, [insertionIndex, name, onSave])

  const handleNameKeyDown = useCallback(
    (event: JSX.TargetedKeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') {
        event.preventDefault()
        handleSave()
      }
    },
    [handleSave],
  )

  const handleDragHandleKeyDown = useCallback(
    (event: JSX.TargetedKeyboardEvent<HTMLButtonElement>) => {
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
    return (
      <li
        key={sem.id}
        className="add-semester-dialog-row"
        onDragEnter={handleDragOverIndex(i)}
        onDragOver={handleDragOverIndex(i)}
        onDrop={handleDropAtIndex(i)}
      >
        <div className="add-semester-dialog-row-content">
          <div className="add-semester-dialog-row-name">{sem.name}</div>
        </div>
      </li>
    )
  })

  const orderedRows = [...semesterRows]
  orderedRows.splice(insertionIndex, 0, newSemesterRow)

  return (
    <div className="add-semester-dialog" role="dialog" aria-label="Add Semester">
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
          <button type="button" onClick={handleSave} disabled={name.trim().length === 0}>
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
