import useApiResource from '../../hooks/useApiResource'
import { getChildren } from '../../services/parentApi'

/**
 * Supplies the signed-in parent's linked children from `GET /api/v1/parent/children`.
 *
 * @returns {{ data: ({ children: { id: string, name: string, gradeLevel: number }[] }|null), isLoading: boolean, error: Error|null }}
 */
function useParentChildrenData() {
  return useApiResource(getChildren)
}

export default useParentChildrenData
