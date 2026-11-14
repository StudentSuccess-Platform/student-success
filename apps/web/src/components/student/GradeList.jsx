function GradeList({ grades = [] }) {
  if (grades.length === 0) {
    return <p>No grades available yet.</p>
  }

  return (
    <div className="grade-list">
      {grades.map((course) => (
        <div className="grade-item" key={course.id}>
          <div className="grade-item-header">
            <span>{course.subject}</span>
            <strong>{course.grade}%</strong>
          </div>

          <div className="grade-progress-track">
            <div
              className="grade-progress-fill"
              style={{
                width: `${Math.min(100, Math.max(0, course.grade))}%`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

export default GradeList