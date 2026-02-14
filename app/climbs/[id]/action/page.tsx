'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '../../../../lib/supabase'
import { useUser } from '../../../../lib/useUser'
import { useRole } from '../../../../lib/useRole'

export default function ClimbActionPage() {
  const params = useParams()
  const router = useRouter()
  const climbId = params.id as string
  const { user, loading: userLoading } = useUser()
  const { role, loading: roleLoading } = useRole()
  const [loading, setLoading] = useState(true)
  const [isArchived, setIsArchived] = useState(false)

  useEffect(() => {
    if (userLoading || roleLoading) return

    // If not logged in, redirect to login with return URL
    if (!user) {
      router.push(`/?next=/climbs/${climbId}/action`)
      return
    }

    // Check if climb is incomplete or archived
    const checkClimb = async () => {
      try {
        const { data, error } = await supabase
          .from('climbs')
          .select('wall, hold_colour_id, tag_colour_id, sector_tag_id, archived')
          .eq('id', climbId)
          .single()

        if (error) throw error

        const isIncomplete = !data.wall || !data.hold_colour_id || !data.tag_colour_id || !data.sector_tag_id
        const isArchived = !!(data as { archived?: boolean }).archived

        if (isIncomplete) {
          // Incomplete climb - redirect to edit page (only setters/admins can edit)
          if (role === 'admin' || role === 'setter') {
            router.push(`/climbs/${climbId}/edit`)
          } else {
            // Climbers see a message that the climb isn't ready
            setLoading(false)
          }
        } else if (isArchived && role !== 'admin' && role !== 'setter') {
          // Archived climb – climbers can view but not send; show view-only state
          setIsArchived(true)
          setLoading(false)
        } else {
          // Complete, not archived (or setter/admin) – redirect based on role
          if (role === 'admin' || role === 'setter') {
            router.push(`/climbs/${climbId}/edit`)
          } else {
            router.push(`/climbs/${climbId}/send`)
          }
        }
      } catch (err) {
        console.error('Error checking climb:', err)
        setLoading(false)
      }
    }

    checkClimb()
  }, [user, role, userLoading, roleLoading, climbId, router])

  if (loading || userLoading || roleLoading) {
    return (
      <main className="py-4 sm:py-8 px-4">
        <div className="text-center">Loading...</div>
      </main>
    )
  }

  // Climber: incomplete climb or archived (view-only)
  if (isArchived) {
    return <ArchivedClimbView climbId={climbId} />
  }
  return (
    <main className="py-4 sm:py-8 px-4">
      <div className="max-w-md mx-auto text-center">
        <div className="mb-4">
          <div className="text-4xl mb-2">📋</div>
          <h1 className="text-2xl font-bold mb-2">Climb Not Ready</h1>
          <p className="mb-4" style={{ color: 'var(--foreground-secondary)' }}>
            This climb hasn't been set up yet. Please check back later.
          </p>
        </div>
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

function ArchivedClimbView({ climbId }: { climbId: string }) {
  const router = useRouter()
  return (
    <main className="py-4 sm:py-8 px-4">
      <div className="max-w-md mx-auto text-center">
        <div className="mb-4">
          <div className="text-4xl mb-2">📦</div>
          <h1 className="text-2xl font-bold mb-2">Archived Climb</h1>
          <p className="mb-4" style={{ color: 'var(--foreground-secondary)' }}>
            This climb is archived and can no longer be marked as sent. You can still view it.
          </p>
        </div>
        <div className="flex gap-3 justify-center flex-wrap">
          <button
            onClick={() => router.push(`/climbs/${climbId}/qr`)}
            className="px-4 py-2 rounded-lg font-medium transition"
            style={{
              backgroundColor: 'var(--accent)',
              color: 'var(--accent-text)',
            }}
          >
            View climb
          </button>
          <button
            onClick={() => router.push('/climbs')}
            className="px-4 py-2 rounded-lg font-medium transition"
            style={{
              backgroundColor: 'var(--button-secondary-bg)',
              color: 'var(--button-secondary-text)',
              border: '1px solid var(--border)',
            }}
          >
            Back to Climbs
          </button>
        </div>
      </div>
    </main>
  )
}
