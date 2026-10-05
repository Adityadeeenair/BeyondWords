import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

// Supabase redirects here after the user clicks the confirmation link in their
// email. The URL will contain either:
//   - A `code` query param  (PKCE flow — what we use now)
//   - Hash fragments like #access_token=...&refresh_token=... (implicit flow)
//
// The Supabase SDK's detectSessionInUrl option handles both automatically when
// supabase.auth.getSession() is called. We just need to wait for it to finish,
// show a friendly loading state, then redirect.

export default function AuthCallback() {
  const navigate = useNavigate()
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function handleCallback() {
      // exchangeCodeForSession handles the PKCE `code` param in the URL.
      // For implicit flow (hash), detectSessionInUrl on the client does it
      // automatically. Calling getSession() after gives us whichever worked.
      const urlParams = new URLSearchParams(window.location.search)
      const code = urlParams.get('code')

      if (code) {
        // PKCE: exchange the one-time code for a real session
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
        if (exchangeError && !cancelled) {
          setError(exchangeError.message)
          return
        }
      }

      // At this point the SDK should have a valid session (either from PKCE
      // exchange above, or from hash tokens via detectSessionInUrl).
      const { data, error: sessionError } = await supabase.auth.getSession()

      if (cancelled) return

      if (sessionError || !data.session) {
        // Something went wrong — send them to login with a message.
        navigate('/login?confirmed=false', { replace: true })
        return
      }

      // Session established — go to the app.
      navigate('/sections', { replace: true })
    }

    handleCallback()
    return () => { cancelled = true }
  }, [navigate])

  if (error) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1>BeyondWords</h1>
          <p className="error-text" style={{ marginTop: 16 }}>
            Confirmation failed: {error}
          </p>
          <p style={{ marginTop: 12, fontSize: 14, color: '#5c6b63' }}>
            The link may have expired.{' '}
            <a href="/login" style={{ color: 'var(--moss-dark)' }}>Go back to login</a>
            {' '}and try signing in, or request a new confirmation email.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>BeyondWords</h1>
        <p className="subtitle">Confirming your account…</p>
        <p className="muted" style={{ marginTop: 8 }}>You'll be redirected in a moment.</p>
      </div>
    </div>
  )
}
