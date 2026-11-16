import { useRef } from 'react'
import { PROFILE_TABS, panelId, tabId } from './tabDefinitions'

// WAI-ARIA tabs: one tab stop, arrow keys / Home / End move between tabs and select them.
function ProfileTabs({ tabs = PROFILE_TABS, active, onChange }) {
  const refs = useRef({})

  function handleKeyDown(event) {
    const index = tabs.findIndex((tab) => tab.id === active)
    let next = null
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length
    else if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = tabs.length - 1
    if (next === null) return
    event.preventDefault()
    onChange(tabs[next].id)
    refs.current[tabs[next].id]?.focus()
  }

  return (
    <div className="profile-tabs" role="tablist" aria-label="Student profile sections" onKeyDown={handleKeyDown}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          ref={(node) => {
            refs.current[tab.id] = node
          }}
          id={tabId(tab.id)}
          type="button"
          role="tab"
          className="profile-tab"
          aria-selected={tab.id === active}
          aria-controls={panelId(tab.id)}
          tabIndex={tab.id === active ? 0 : -1}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

export default ProfileTabs
