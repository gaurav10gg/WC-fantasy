import { supabase } from './supabase'

export function nameFromUserMetadata(user) {
  const meta = user?.user_metadata ?? {}
  return (
    meta.display_name?.trim() ||
    meta.full_name?.trim() ||
    meta.name?.trim() ||
    user?.email?.split('@')[0] ||
    ''
  )
}

/** Keep profiles in sync when users sign in with Google (full_name, not display_name). */
export async function syncProfileFromAuth(user) {
  if (!user?.id) return

  const oauthName = nameFromUserMetadata(user)
  if (!oauthName) return

  const emailPrefix = user.email?.split('@')[0] ?? ''
  const { data: prof } = await supabase
    .from('profiles')
    .select('display_name, team_name')
    .eq('id', user.id)
    .maybeSingle()

  const displayMissing =
    !prof?.display_name?.trim() ||
    prof.display_name === emailPrefix
  const teamMissing = !prof?.team_name?.trim()

  if (!displayMissing && !teamMissing) return

  const updates = {}
  if (displayMissing) updates.display_name = oauthName
  if (teamMissing) updates.team_name = oauthName

  await supabase.from('profiles').update(updates).eq('id', user.id)
}
