import { createClient } from '@supabase/supabase-js'

// These come from your Supabase project settings (see README for where to find them).
// They live in a .env file that is NOT committed to git.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase env vars are missing. Copy .env.example to .env and fill in your project keys.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Keep the session alive in localStorage so it survives page refreshes,
    // new tabs, and new browser windows on the same device.
    persistSession: true,
    storageKey: 'beyondwords-auth',
    storage: window.localStorage,
    // Automatically exchange the token Supabase puts in the URL hash after
    // email confirmation — this is what makes the confirmation link work.
    detectSessionInUrl: true,
    // Use PKCE so the email confirmation flow works correctly even when the
    // confirmation link is opened in a different browser tab or window.
    flowType: 'pkce',
  },
})
