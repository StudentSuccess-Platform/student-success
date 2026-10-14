import { formatRelativeTime } from '../../utils/formatRelativeTime'

function ActivityFeed({ items }) {
  if (items.length === 0) {
    return <p className="activity-empty">No recent activity.</p>
  }

  return (
    <ul className="activity-feed">
      {items.map(({ id, description, timestamp, actionLabel, onAction }) => (
        <li key={id} className="activity-item">
          <div className="activity-item-main">
            <p className="activity-item-description">{description}</p>
            <p className="activity-item-timestamp">{formatRelativeTime(timestamp)}</p>
          </div>

          {actionLabel && (
            <button type="button" className="activity-item-action" onClick={onAction}>
              {actionLabel}
            </button>
          )}
        </li>
      ))}
    </ul>
  )
}

export default ActivityFeed
