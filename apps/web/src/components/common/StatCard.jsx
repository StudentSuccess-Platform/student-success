function StatCard({ icon, label, value, trend, accent = 'default' }) {
  return (
    <div className={`stat-card${accent === 'warning' ? ' stat-card--warning' : ''}`}>
      <span className="stat-card-icon">
        <img src={icon} alt="" />
      </span>

      <div className="stat-card-body">
        <p className="stat-card-value">{value}</p>
        <p className="stat-card-label">{label}</p>
        {trend && <p className="stat-card-trend">{trend}</p>}
      </div>
    </div>
  )
}

export default StatCard
