// Creates an Error the global handler in app.js turns into { error: message, ...extra } with the
// given HTTP status. `extra` is for machine-readable details, for example
//   httpError(400, "Please fix the highlighted fields", { fields: { pointsEarned: "Required" } })
//   httpError(503, "AI is unavailable", { code: "AI_UNAVAILABLE", fallback: "manual" })
export function httpError(status, message, extra = {}) {
  return Object.assign(new Error(message), { status, extra });
}
