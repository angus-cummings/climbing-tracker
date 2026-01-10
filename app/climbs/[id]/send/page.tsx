'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '../../../../lib/supabase'
import { useUser } from '../../../../lib/useUser'
import { useProfile } from '../../../../lib/ProfileContext'

type ClimbData = {
  sector_tag_id: number
  wall_name: string
  hold_colour_name: string
  tag_colour_name: string
  photo: string | null
}

export default function SendClimbPage() {
  const params = useParams()
  const router = useRouter()
  const climbId = params.id as string
  const { user, loading: userLoading } = useUser()
  const { selectedProfile, loading: profileLoading } = useProfile()
  const [climbData, setClimbData] = useState<ClimbData | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (userLoading || profileLoading) return

    if (!user) {
      router.push(`/?next=/climbs/${climbId}/send`)
      return
    }

    if (!selectedProfile) {
      setError('Please select a profile first')
      return
    }

    // Fetch climb data
    const fetchClimb = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('climbs')
          .select(`
            sector_tag_id,
            photo,
            walls!wall(name),
            hold_colour:colours!hold_colour_id(name),
            tag_colour:colours!tag_colour_id(name)
          `)
          .eq('id', climbId)
          .single()

        if (fetchError) throw fetchError

        // Type assertion needed because Supabase joins can be arrays or objects
        const climbData = data as any

        setClimbData({
          sector_tag_id: climbData.sector_tag_id,
          wall_name: (Array.isArray(climbData.walls) ? climbData.walls[0]?.name : climbData.walls?.name) || 'Unknown',
          hold_colour_name: (Array.isArray(climbData.hold_colour) ? climbData.hold_colour[0]?.name : climbData.hold_colour?.name) || 'Unknown',
          tag_colour_name: (Array.isArray(climbData.tag_colour) ? climbData.tag_colour[0]?.name : climbData.tag_colour?.name) || 'Unknown',
          photo: climbData.photo,
        })
      } catch (err: any) {
        setError(err.message || 'Failed to load climb data')
      } finally {
        setLoading(false)
      }
    }

    fetchClimb()
  }, [user, selectedProfile, userLoading, profileLoading, climbId, router])

  const handleSend = async () => {
    if (!selectedProfile || !user) return

    setSending(true)
    setError(null)

    try {
      const { error: ascentError } = await supabase.from('ascents').upsert({
        climb_id: climbId,
        profile_id: selectedProfile.profile_id,
        user_id: user.id,
        sent: true
      })

      if (ascentError) throw ascentError

      setSuccess(true)
      // Redirect to climbs page after 2 seconds
      setTimeout(() => {
        router.push('/climbs')
      }, 2000)
    } catch (err: any) {
      setError(err.message || 'Failed to mark climb as sent')
    } finally {
      setSending(false)
    }
  }

  if (loading || userLoading || profileLoading) {
    return (
      <main className="py-4 sm:py-8 px-4">
        <div className="text-center">Loading...</div>
      </main>
    )
  }

  if (error && !climbData) {
    return (
      <main className="py-4 sm:py-8 px-4">
        <div className="max-w-md mx-auto text-center">
          <div className="text-red-500 mb-4">{error}</div>
          <button
            onClick={() => router.push('/climbs')}
            className="px-4 py-2 rounded-lg font-medium transition"
            style={{
              backgroundColor: 'var(--accent)',
              color: 'var(--accent-text)',
            }}
          >
            Back to Climbs
          </button>
        </div>
      </main>
    )
  }

  if (success) {
    return (
      <main className="py-4 sm:py-8 px-4">
        <div className="max-w-md mx-auto text-center">
          <div className="text-4xl mb-4">✓</div>
          <h1 className="text-2xl font-bold mb-2">Climb Marked as Sent!</h1>
          <p className="mb-4" style={{ color: 'var(--foreground-secondary)' }}>
            Redirecting to climbs page...
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="py-4 sm:py-8 px-4">
      <div className="max-w-md mx-auto">
        <button
          onClick={() => router.push('/climbs')}
          className="mb-4 text-sm font-medium"
          style={{ color: 'var(--foreground-secondary)' }}
        >
          ← Back to Climbs
        </button>

        <div className="bg-white rounded-lg p-6 border" style={{ borderColor: 'var(--border)' }}>
          {climbData && (
            <>
              {/* Climb Photo */}
              {climbData.photo && (
                <div className="mb-4 rounded-lg overflow-hidden">
                  <img
                    src={climbData.photo}
                    alt="Climb"
                    className="w-full h-48 object-cover"
                  />
                </div>
              )}

              {/* Climb Info */}
              <div className="mb-6">
                <div className="text-2xl font-bold mb-2">
                  Sector Tag #{climbData.sector_tag_id}
                </div>
                <div className="text-lg mb-1" style={{ color: 'var(--foreground-secondary)' }}>
                  {climbData.wall_name}
                </div>
                <div className="text-base" style={{ color: 'var(--foreground-secondary)' }}>
                  {climbData.hold_colour_name} / {climbData.tag_colour_name}
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
                  {error}
                </div>
              )}

              {/* Send Button */}
              <button
                onClick={handleSend}
                disabled={sending}
                className="w-full py-3 rounded-lg font-medium transition disabled:opacity-50"
                style={{
                  backgroundColor: 'var(--accent)',
                  color: 'var(--accent-text)',
                }}
              >
                {sending ? 'Marking as sent...' : 'Mark as Sent ✓'}
              </button>
            </>
          )}
        </div>
      </div>
    </main>
  )
}
