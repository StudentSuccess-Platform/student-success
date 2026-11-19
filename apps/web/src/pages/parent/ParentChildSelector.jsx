/**
 * Child switcher for a guardian linked to more than one student. Renders nothing for zero or one
 * linked child (AC #1) — `ParentDashboard` only ever passes children sourced from the real
 * `GET /api/v1/parent/children` response, never a constructed or guessed list.
 */
function ParentChildSelector({ children, selectedId, onSelect }) {
  if (children.length <= 1) {
    return null
  }

  return (
    <div className="parent-child-selector">
      <label htmlFor="parent-child-select">Viewing</label>

      <select
        id="parent-child-select"
        value={selectedId ?? ''}
        onChange={(event) => onSelect(event.target.value)}
      >
        {children.map((child) => (
          <option key={child.id} value={child.id}>
            {child.name}
          </option>
        ))}
      </select>
    </div>
  )
}

export default ParentChildSelector
