function SchoolIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none">
      <path
        d="M9.33344 14V12C9.33344 11.6464 9.19295 11.3073 8.94288 11.0572C8.69282 10.8072 8.35365 10.6667 8 10.6667C7.64635 10.6667 7.30718 10.8072 7.05712 11.0572C6.80705 11.3073 6.66656 11.6464 6.66656 12V14M12.0003 3.33343V14M2.66624 4.00006L7.40395 1.47342C7.58903 1.38094 7.7931 1.3328 8 1.3328C8.2069 1.3328 8.41097 1.38094 8.59605 1.47342L13.3338 4.00006M3.99968 7.33339L1.65283 8.76472C1.55512 8.82419 1.47436 8.9078 1.41831 9.00751C1.36227 9.10722 1.33282 9.21967 1.3328 9.33404V12.6667C1.3328 13.0203 1.47329 13.3594 1.72336 13.6095C1.97342 13.8595 2.31259 14 2.66624 14H13.3338C13.6874 14 14.0266 13.8595 14.2766 13.6095C14.5267 13.3594 14.6672 13.0203 14.6672 12.6667V9.33338C14.6671 9.21911 14.6376 9.1068 14.5815 9.00722C14.5255 8.90764 14.4448 8.82413 14.3472 8.76472L12.0003 7.33339M3.99968 3.33343V14"
        stroke="currentColor"
        strokeLinecap="round"
      />
    </svg>
  )
}

function GraduationCapIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none">
      <path
        d="M14.666 6.66651V10.667M4.0002 8.33337V10.667C4.0002 11.1975 4.4216 11.7062 5.17168 12.0813C5.92177 12.4565 6.9391 12.6672 7.99988 12.6672C9.06066 12.6672 10.078 12.4565 10.8281 12.0813C11.5782 11.7062 11.9996 11.1975 11.9996 10.667V8.33337M14.2792 7.28149L8.55304 3.45305C8.37934 3.37381 8.19066 3.3328 7.99975 3.3328C7.80884 3.3328 7.62015 3.37381 7.44646 3.45305L1.73358 6.05335L7.44646 9.88045C7.62015 9.9597 7.80884 10.0007 7.99975 10.0007C8.19066 10.0007 8.37934 9.9597 8.55304 9.88045L14.2792 7.28149Z"
        stroke="currentColor"
        strokeLinecap="round"
      />
    </svg>
  )
}

function UsersIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none">
      <path
        d="M10.6669 14V12.6667C10.6669 11.9594 10.3859 11.2811 9.88577 10.781C9.38563 10.281 8.7073 10 8 10H3.99968C3.29238 10 2.61405 10.281 2.11391 10.781C1.61377 11.2811 1.3328 11.9594 1.3328 12.6667V14M10.6669 2.08529C11.2388 2.23353 11.7452 2.56746 12.1068 3.03466C12.4683 3.50186 12.6645 4.07588 12.6645 4.66662C12.6645 5.25736 12.4683 5.83138 12.1068 6.29858C11.7452 6.76578 11.2388 7.09971 10.6669 7.24795M8.66672 4.66667C8.66672 6.13943 7.47272 7.33333 5.99984 7.33333C4.52696 7.33333 3.33296 6.13943 3.33296 4.66667C3.33296 3.19391 4.52696 2 5.99984 2C7.47272 2 8.66672 3.19391 8.66672 4.66667Z"
        stroke="currentColor"
        strokeLinecap="round"
      />
    </svg>
  )
}

const ROLES = [
  { id: 'teacher', label: 'Teacher', Icon: SchoolIcon },
  { id: 'student', label: 'Student', Icon: GraduationCapIcon },
  { id: 'parent', label: 'Parent/Guardian', Icon: UsersIcon },
]

function RoleSelector({ role, onChange }) {
  return (
    <div className="auth-role-selection">
      <span className="auth-field-label">I am a</span>

      <div
        className="auth-role-options"
        role="radiogroup"
        aria-label="Select account role"
      >
        {ROLES.map(({ id, label, Icon }) => {
          const selected = role === id

          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={selected}
              className={`auth-role-option${selected ? ' is-selected' : ''}`}
              onClick={() => onChange(id)}
            >
              <span className="auth-role-icon">
                <Icon />
              </span>

              <span className="auth-role-label">
                {label}
              </span>

             
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default RoleSelector