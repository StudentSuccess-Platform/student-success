function DashboardCard({ title, action, children }) {
  return (
    <section className="dashboard-card">
      {(title || action) && (
        <div className="dashboard-card-header">
          {title && <h2 className="dashboard-card-title">{title}</h2>}
          {action}
        </div>
      )}

      <div className="dashboard-card-body">{children}</div>
    </section>
  )
}

export default DashboardCard
