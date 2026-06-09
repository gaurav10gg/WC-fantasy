import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import PredictionsPanel from '../components/PredictionsPanel'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'

export default function GroupPage() {
  const { groupId } = useParams()
  const { user } = useAuth()
  const [group, setGroup] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('groups').select('*').eq('id', groupId).single().then(({ data }) => {
      setGroup(data)
      setLoading(false)
    })
  }, [groupId])

  if (loading) {
    return <p className="py-20 text-center text-muted">Loading…</p>
  }

  if (!group || group.is_global) {
    return <p className="py-20 text-center text-muted">League not found.</p>
  }

  return (
    <div className="mx-auto max-w-5xl">
      <Link to="/dashboard" className="text-xs uppercase tracking-wider text-muted hover:text-pitch">
        ← Dashboard
      </Link>
      <div className="mt-4">
        <PredictionsPanel
          groupId={groupId}
          userId={user.id}
          title={group.name}
          inviteCode={group.invite_code}
          leaderboardSource="group"
        />
      </div>
    </div>
  )
}
