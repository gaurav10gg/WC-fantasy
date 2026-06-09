import { supabase } from './supabase'

export function getAuthRedirectUrl() {
  return `${window.location.origin}/auth/callback`
}

export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: getAuthRedirectUrl(),
      queryParams: { prompt: 'select_account' },
    },
  })
  return { error }
}

export function friendlyAuthError(message) {
  const msg = message?.toLowerCase() ?? ''
  if (msg.includes('email not confirmed') || msg.includes('not confirmed')) {
    return {
      type: 'verify',
      text: 'Your email isn’t verified yet. Open the link we sent you, then come back and log in.',
    }
  }
  if (msg.includes('invalid login credentials')) {
    return { type: 'error', text: 'Wrong email or password. Double-check and try again.' }
  }
  if (msg.includes('user already registered')) {
    return { type: 'error', text: 'That email’s already on the team sheet. Try logging in.' }
  }
  return { type: 'error', text: message }
}
