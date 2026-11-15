import { useState } from 'react'

const FALLBACK_MESSAGE = 'Could not save. Please try again.'

// Runs one save for a record form. Client-side `errors` block the API call entirely.
// On success: `onSuccess()` (e.g. clear the form), show `saved`, then call `onSaved()` once.
// On failure: keep the server's general message and its `fields` for the matching inputs.
export default function useRecordSubmit(onSaved) {
  const [state, setState] = useState({
    saving: false,
    saved: false,
    formError: '',
    fieldErrors: {},
  })

  async function submit({ errors = {}, send, onSuccess }) {
    if (Object.keys(errors).length > 0) {
      setState({ saving: false, saved: false, formError: '', fieldErrors: errors })
      return
    }

    setState({ saving: true, saved: false, formError: '', fieldErrors: {} })

    try {
      await send()
    } catch (error) {
      setState({
        saving: false,
        saved: false,
        formError: error?.message || FALLBACK_MESSAGE,
        fieldErrors: error?.fields ?? {},
      })
      return
    }

    setState({ saving: false, saved: true, formError: '', fieldErrors: {} })
    onSuccess?.()
    onSaved?.()
  }

  return { ...state, submit }
}
