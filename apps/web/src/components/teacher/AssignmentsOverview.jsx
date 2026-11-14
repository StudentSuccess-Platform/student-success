const STATUS_LABEL = {
  upcoming: 'Upcoming',
  'in-progress': 'In Progress',
  graded: 'Graded',
}

function AssignmentsOverview({ assignments }) {
  if (assignments.length === 0) {
    return <p className="assignments-empty">No assignments yet.</p>
  }

  return (
    <ul className="assignments-list">
      {assignments.map(({ id, title, dueDate, status }) => (
        <li key={id} className="assignment-item">
          <div className="assignment-item-main">
            <p className="assignment-item-title">{title}</p>
            <p className="assignment-item-due">Due {dueDate}</p>
          </div>

          <span className={`assignment-badge assignment-badge--${status}`}>
            {STATUS_LABEL[status]}
          </span>
        </li>
      ))}
    </ul>
  )
}

export default AssignmentsOverview
