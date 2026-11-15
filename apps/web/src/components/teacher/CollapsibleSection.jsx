import { useId, useState } from 'react'

// A teacher-section card whose body can be folded away. The heading text is the button's only
// text, so the section keeps the same accessible name ("Grades") whether open or closed.
function CollapsibleSection({ title, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen)
  const bodyId = useId()

  return (
    <section className="teacher-section">
      <h2 className="teacher-section-title">
        <button
          type="button"
          className="teacher-collapse-toggle"
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={() => setOpen((value) => !value)}
        >
          <span>{title}</span>
          <span className="teacher-collapse-chevron" aria-hidden="true" data-open={open} />
        </button>
      </h2>
      <div id={bodyId} hidden={!open} className="teacher-collapse-body">
        {children}
      </div>
    </section>
  )
}

export default CollapsibleSection
