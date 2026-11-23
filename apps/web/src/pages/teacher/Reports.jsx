import ReportsView from './ReportsView'
import useTeacherReportsData from './useTeacherReportsData'

function Reports() {
  const { data, isLoading, error, reload } = useTeacherReportsData()

  return <ReportsView data={data} isLoading={isLoading} error={error} onChanged={reload} />
}

export default Reports
