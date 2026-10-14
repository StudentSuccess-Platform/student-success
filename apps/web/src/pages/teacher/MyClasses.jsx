import MyClassesView from './MyClassesView'
import useTeacherClassesData from './useTeacherClassesData'

function MyClasses() {
  const { data, isLoading, error } = useTeacherClassesData()

  return <MyClassesView data={data} isLoading={isLoading} error={error} />
}

export default MyClasses
