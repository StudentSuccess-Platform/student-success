const SEVERITY_LABEL = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
}

function InterventionList({ students }) {
  if (students.length === 0) {
    return <p className="intervention-empty">No students currently need intervention.</p>
  }

  return (
    <ul className="intervention-list">
      {students.map(({ id, name, className, reason, severity }) => (
        <li key={id} className="intervention-item">
          <div className="intervention-item-main">
            <p className="intervention-item-name">{name}</p>
            <p className="intervention-item-reason">{reason}</p>
          </div>

          <div className="intervention-item-meta">
            <span className="intervention-item-class">{className}</span>
            <span className={`intervention-badge intervention-badge--${severity}`}>
              {SEVERITY_LABEL[severity]}
            </span>
          </div>
        </li>
      ))}
    </ul>
  )
}

export default InterventionList
