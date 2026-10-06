import bookOpenIcon from '../assets/icons/book-open.svg'
import shieldCheckIcon from '../assets/icons/shield-check.svg'

function AuthLayout({ children }) {
  return (
    <main className="auth-page">
      <section className="auth-welcome">
        <div className="auth-brand">
          <span className="auth-brand-mark">
            <img src={bookOpenIcon} alt="" />
          </span>

          <p className="auth-brand-name">
            Student<span>Success</span>
          </p>
        </div>

        <div className="auth-welcome-copy">
          <div className="auth-eyebrow">
            <span className="auth-eyebrow-line" />
            <span>Academic intelligence</span>
          </div>

          <h1>Every student deserves a clear path forward.</h1>

          <p>
            Turn academic progress into timely insight, meaningful support, and
            stronger outcomes for every learner.
          </p>

          <div className="auth-highlights">
            <div className="auth-highlight">
              <strong>Real-time</strong>
              <span>Performance insights</span>
            </div>

            <div className="auth-highlight-divider" />

            <div className="auth-highlight">
              <strong>One place</strong>
              <span>Connected community</span>
            </div>
          </div>
        </div>

        <div className="auth-institution-note">
          <img src={shieldCheckIcon} alt="" />
          <span>Secure access for your academic community</span>
        </div>
      </section>

      <section className="auth-login-area">
        {children}
      </section>
    </main>
  )
}

export default AuthLayout