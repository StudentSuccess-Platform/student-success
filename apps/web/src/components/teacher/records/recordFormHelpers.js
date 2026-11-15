// Plain helpers shared by the record entry forms (no components here, see react-refresh rule).

export function isBlank(value) {
  return value === undefined || value === null || String(value).trim() === ''
}

// `labels` maps a field key to its visible label; blank values get "<Label> is required".
export function requiredErrors(values, labels) {
  const errors = {}
  for (const [key, label] of Object.entries(labels)) {
    if (isBlank(values[key])) errors[key] = `${label} is required`
  }
  return errors
}

// Connects an input to its error message (aria-invalid + aria-describedby).
export function fieldProps(id, error) {
  return {
    id,
    'aria-invalid': error ? 'true' : undefined,
    'aria-describedby': error ? errorId(id) : undefined,
  }
}

export function errorId(id) {
  return `${id}-error`
}
