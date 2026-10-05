import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'

export default function Login() {
  const { signIn, signUp, user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState('signin') // 'signin' | 'signup'
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  // Tracks whether we're in the "waiting for email confirmation" state, so we
  // can show the resend button without making the user re-enter their email.
  const [pendingConfirmEmail, setPendingConfirmEmail] = useState(null)
  const [resendBusy, setResendBusy] = useState(false)

  // If Supabase redirected back here with ?confirmed=false, the callback page
  // already tried to exchange the token and failed (link expired or already used).
  useEffect(() => {
    if (searchParams.get('confirmed') === 'false') {
      setError(
        'That confirmation link has expired or has already been used. Enter your email below to resend a fresh one.'
      )
    }
  }, [searchParams])

  // Redirect once the auth state actually confirms a logged-in user,
  // rather than right after the API call resolves (avoids a race where
  // the session hasn't propagated yet and RequireAuth bounces us back).
  useEffect(() => {
    if (user) navigate('/sections', { replace: true })
  }, [user, navigate])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setNotice('')
    setBusy(true)

    if (mode === 'signup') {
      // redirectTo tells Supabase where to send the user AFTER they click
      // the confirmation link in their email. /auth/callback handles the token.
      const { data, error } = await signUp(email, password, {
        redirectTo: `${window.location.origin}/auth/callback`,
      })
      setBusy(false)
      if (error) {
        setError(error.message)
        return
      }
      // Supabase requires email confirmation by default, which means no
      // session comes back yet. Tell the person instead of silently failing.
      if (!data.session) {
        setNotice('Account created! Check your email and click the confirmation link to log in.')
        setPendingConfirmEmail(email)
        setMode('signin')
        return
      }
      // If email confirmation is off, data.session exists and the useEffect
      // above will redirect once AuthContext's listener picks up the change.
      return
    }

    const { error } = await signIn(email, password)
    setBusy(false)
    if (error) {
      // "Email not confirmed" is a common error — make it actionable.
      if (error.message?.toLowerCase().includes('email not confirmed')) {
        setError("Your email isn't confirmed yet. Check your inbox, or resend the confirmation below.")
        setPendingConfirmEmail(email)
      } else {
        setError(error.message)
      }
      return
    }
    // Redirect happens via the useEffect watching `user`, once the auth
    // listener confirms the session — not immediately here.
  }

  async function handleResendConfirmation() {
    const targetEmail = pendingConfirmEmail || email
    if (!targetEmail) {
      setError('Enter your email address above first.')
      return
    }
    setResendBusy(true)
    setError('')
    setNotice('')
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: targetEmail,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    setResendBusy(false)
    if (error) {
      setError(error.message)
    } else {
      setNotice(`Confirmation email resent to ${targetEmail}. Check your inbox (and spam folder).`)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>BeyondWords</h1>
        <p className="subtitle">Learn Indian Sign Language, one story at a time.</p>

        <form onSubmit={handleSubmit}>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </label>

          {error && <p className="error-text">{error}</p>}
          {notice && <p className="notice-text">{notice}</p>}

          <button type="submit" disabled={busy}>
            {busy ? 'Please wait...' : mode === 'signin' ? 'Log in' : 'Create account'}
          </button>
        </form>

        {/* Shown when a user signed up but hasn't confirmed yet, or if the
            link expired. Lets them get a fresh email without re-signing-up. */}
        {(pendingConfirmEmail || searchParams.get('confirmed') === 'false') && (
          <button
            type="button"
            className="link-button"
            style={{ marginTop: 12, display: 'block' }}
            onClick={handleResendConfirmation}
            disabled={resendBusy}
          >
            {resendBusy ? 'Sending...' : 'Resend confirmation email'}
          </button>
        )}

        <button
          type="button"
          className="link-button"
          onClick={() => {
            setMode(mode === 'signin' ? 'signup' : 'signin')
            setError('')
            setNotice('')
            setPendingConfirmEmail(null)
          }}
        >
          {mode === 'signin'
            ? 'New here? Create an account'
            : 'Already have an account? Log in'}
        </button>
      </div>
    </div>
  )
}
