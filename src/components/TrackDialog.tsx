import { useMemo } from 'preact/hooks'
import type { Curriculum } from './CurriculumGraph'
import { getCurriculumTrackInfo, getTrackColor } from './CurriculumGraph'

export interface TrackDialogProps {
  curriculum: Curriculum | null
  open: boolean
  onClose: () => void
}

export function TrackDialog(props: TrackDialogProps) {
  const { curriculum, open, onClose } = props

  const trackInfo = useMemo(() => {
    if (!curriculum) return null
    return getCurriculumTrackInfo(curriculum)
  }, [curriculum])

  if (!open) return null

  const renderGeneralInfo = () => {
    return (
      <div className="track-dialog-info">
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
        <h3>Legend</h3>
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
            <span className="legend-node violation" />
            Course violates pre or corequisites
          </span>
        </div>
      </div>
    )
  }

  const renderTrackLegend = () => {
    if (!(curriculum && trackInfo)) {
      return <div className="track-dialog-empty">Load a curriculum to see tracks.</div>
    }

    return (
      <div className="track-dialog-grid">
        {trackInfo.trackOrder.map((trackId) => {
          const color = getTrackColor(trackInfo, trackId)
          return (
            <div key={trackId} className="track-dialog-row" style={{ backgroundColor: color }}>
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

  return (
    <div id="track-dialog" className="track-dialog" role="dialog" aria-label="Help">
      <div className="track-dialog-header">
        <h2 className="track-dialog-title">Help</h2>
        <button type="button" className="close-button" onClick={onClose} aria-label="Close">
          X
        </button>
      </div>

      <div className="track-dialog-tabs">
        <input type="radio" name="track-dialog-tabset" id="track-dialog-tab-info" defaultChecked />
        <label htmlFor="track-dialog-tab-info">General</label>

        <input type="radio" name="track-dialog-tabset" id="track-dialog-tab-curriculum-legend" />
        <label htmlFor="track-dialog-tab-curriculum-legend">Curriculum</label>

        <input type="radio" name="track-dialog-tabset" id="track-dialog-tab-track-legend" />
        <label htmlFor="track-dialog-tab-track-legend">Tracks</label>

        <div className="track-dialog-tab-panels">
          <section className="track-dialog-panel">{renderGeneralInfo()}</section>

          <section className="track-dialog-panel">{renderCurriculumLegend()}</section>

          <section className="track-dialog-panel">{renderTrackLegend()}</section>
        </div>
      </div>
    </div>
  )
}
