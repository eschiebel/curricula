import { useMemo } from 'preact/hooks'
import type { Curriculum } from './CurriculumGraph'
import { getCurriculumTrackInfo, getTrackColor } from './CurriculumGraph'

export interface HelpDialogProps {
  curriculum: Curriculum | null
  open: boolean
  onClose: () => void
}

export function HelpDialog(props: HelpDialogProps) {
  const { curriculum, open, onClose } = props

  const trackInfo = useMemo(() => {
    if (!curriculum) return null
    return getCurriculumTrackInfo(curriculum)
  }, [curriculum])

  if (!open) return null

  const renderGeneralInfo = () => {
    return (
      <div className="help-dialog-info">
        <div>
          Load a curriculum JSON to view and edit a curriculum. (The{' '}
          <span style={{ fontWeight: 'bold' }}>Load BSME</span> button loads a sample curriculum
          that is the '25-'26 Montana State University B.S. in Mechanical Engineering curriculum)
        </div>
        <ul style={{ paddingLeft: '1em' }}>
          <li>
            Drag courses to move them between semesters, then use Save JSON to download changes.
          </li>
          <li>Use + and - buttons to zoom.</li>
          <li>Use the arrow buttons to pan.</li>
          <li>The Reset button resets zoom abnd pan.</li>
        </ul>
      </div>
    )
  }

  const renderCurriculumLegend = () => {
    return (
      <div className="legend">
        <div className="nodes">
          <span className="legend-item">
            <span className="legend-node" />
            Course
          </span>
          <span className="legend-item">
            <span className="legend-node moved" />
            Course has been moved
          </span>
          <span className="legend-item">
            <span className="legend-node selected" />
            Course is selected
          </span>
          <span className="legend-item">
            <span className="legend-node violation" />
            Course violates pre or corequisites
          </span>
        </div>

        <div className="edges">
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
    )
  }

  const renderTrackLegend = () => {
    if (!(curriculum && trackInfo)) {
      return <div className="help-dialog-empty">Load a curriculum to see tracks.</div>
    }

    return (
      <div className="help-dialog-grid">
        {trackInfo.trackOrder.map((trackId) => {
          const color = getTrackColor(trackInfo, trackId)
          return (
            <div key={trackId} className="help-dialog-row" style={{ backgroundColor: color }}>
              <span
                className="track-swatch"
                style={{ backgroundColor: color }}
                aria-hidden="true"
              />
              <span className="track-id">{trackInfo.trackNameById[trackId] ?? trackId}</span>
            </div>
          )
        })}
      </div>
    )
  }

  const renderA11yHelp = () => {
    return (
      <div className="help-dialog-a11y">
        <p>Use the tab key to navigate between semesters.</p>
        <p>Use the up and down arrow keys to navigate between courses within a semester.</p>
        <p>Use shift-right or left arrow keys to move a course to the next or previous semester.</p>
      </div>
    )
  }

  return (
    <div id="help-dialog" className="help-dialog" role="dialog" aria-label="Help">
      <div className="help-dialog-header">
        <h2 className="help-dialog-title">Help</h2>
        <button type="button" className="close-button" onClick={onClose} aria-label="Close">
          X
        </button>
      </div>

      <div className="help-dialog-tabs">
        <input type="radio" name="help-dialog-tabset" id="help-dialog-tab-info" defaultChecked />
        <label htmlFor="help-dialog-tab-info">General</label>

        <input type="radio" name="help-dialog-tabset" id="help-dialog-tab-curriculum-legend" />
        <label htmlFor="help-dialog-tab-curriculum-legend">Legend</label>

        <input type="radio" name="help-dialog-tabset" id="help-dialog-tab-track-legend" />
        <label htmlFor="help-dialog-tab-track-legend">Tracks</label>

        <input type="radio" name="help-dialog-tabset" id="help-dialog-tab-a11y" />
        <label htmlFor="help-dialog-tab-a11y">Accessibility</label>

        <div className="help-dialog-tab-panels">
          <section className="help-dialog-panel">{renderGeneralInfo()}</section>

          <section className="help-dialog-panel">{renderCurriculumLegend()}</section>

          <section className="help-dialog-panel">{renderTrackLegend()}</section>

          <section className="help-dialog-panel">{renderA11yHelp()}</section>
        </div>
      </div>
    </div>
  )
}
