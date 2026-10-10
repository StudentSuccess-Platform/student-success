import DashboardView from './DashboardView'
import useTeacherDashboardData from './useTeacherDashboardData'

function TeacherDashboard() {
  const { data, isLoading, error } = useTeacherDashboardData()

  const handleActivityAction = (id) => {
    console.log('Activity action triggered:', id)
  }

  return (
    <DashboardView
      data={data}
      isLoading={isLoading}
      error={error}
      onActivityAction={handleActivityAction}
    />
  )
}

export default TeacherDashboard
