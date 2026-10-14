import { useState } from 'react'
import PageHeader from '../../components/common/PageHeader'
import ClassCard from '../../components/teacher/ClassCard'
import plusIcon from '../../assets/icons/dashboard/plus.svg'

function MyClassesView({ data, isLoading, error }) {
  const [showAddClassMessage, setShowAddClassMessage] = useState(false)

  return (
    <div className="my-classes">
      <PageHeader
        title="My Classes"
        subtitle="Select a class below to manage roster, grades, and attendance."
        action={
          <button
            type="button"
            className="add-class-button"
            onClick={() => setShowAddClassMessage(true)}
          >
            <img src={plusIcon} alt="" />
            Add Class
          </button>
        }
      />

      {showAddClassMessage && (
        <p className="add-class-message">Add Class — Coming Soon</p>
      )}

      {isLoading && <p className="dashboard-status">Loading classes…</p>}

      {!isLoading && error && (
        <p className="dashboard-status dashboard-status--error">
          Couldn&apos;t load classes. Please try again.
        </p>
      )}

      {!isLoading && !error && data && data.classes.length === 0 && (
        <p className="chart-empty">No classes yet.</p>
      )}

      {!isLoading && !error && data && data.classes.length > 0 && (
        <div className="class-card-grid">
          {data.classes.map((classItem) => (
            <ClassCard key={classItem.id} {...classItem} />
          ))}
        </div>
      )}
    </div>
  )
}

export default MyClassesView
