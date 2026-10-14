import { Link } from 'react-router-dom'
import usersIcon from '../../assets/icons/dashboard/users-small.svg'
import arrowRightIcon from '../../assets/icons/dashboard/arrow-right.svg'

function ClassCard({ id, name, period, room, studentCount }) {
  return (
    <div className="class-card">
      <div className="class-card-upper">
        <div className="class-card-badge-row">
          <span className="class-card-period-badge">{period}</span>
          <span className="class-card-room">{room}</span>
        </div>

        <p className="class-card-name">{name}</p>
      </div>

      <div className="class-card-middle">
        <img src={usersIcon} alt="" />
        <span>{studentCount} Students Enrolled</span>
      </div>

      <Link to={`/teacher/classes/${id}`} className="class-card-view-button">
        View Class
        <img src={arrowRightIcon} alt="" />
      </Link>
    </div>
  )
}

export default ClassCard
