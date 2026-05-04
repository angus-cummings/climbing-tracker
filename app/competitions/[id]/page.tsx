'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../../lib/supabase'
import { useUser } from '../../../lib/useUser'
import { LeaderboardTable } from '../../../components/LeaderboardTable'
import { ArchivedClimbsView } from '../../../components/ArchivedClimbsView'

type Competition = {
  id: number
  name: string
  is_current: boolean
}

type Tab = 'leaderboard' | 'climbs'

export default function CompetitionPage() {
  const params = useParams()
  const router = useRouter()
  const { user, loading: userLoading } = useUser()
  const [competition, setCompetition] = useState<Competition | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [tab, setTab] = useState<Tab>('leaderboard')

  const id = Number(params.id)

  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/')
    }
  }, [user, userLoading, router])

  useEffect(() => {
    if (!user || !id) return

    supabase
      .from('competitions')
      .select('id, name, is_current')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          setNotFound(true)
          return
        }
        if (data.is_current) {
          router.push('/climbs')
          return
        }
        setCompetition(data)
      })
  }, [user, id, router])

  if (userLoading) {
    return (
      <main className="flex min-h-[80vh] items-center justify-center">
        <p style={{ color: 'var(--foreground-secondary)' }}>Loading…</p>
      </main>
    )
  }

  if (!user) return null

  if (notFound) {
    return (
      <main className="py-4 sm:py-8">
        <p style={{ color: 'var(--foreground-secondary)' }}>Competition not found.</p>
        <Link href="/home" className="text-sm mt-2 inline-block" style={{ color: 'var(--accent)' }}>
          Back to competitions
        </Link>
      </main>
    )
  }

  if (!competition) {
    return (
      <main className="flex min-h-[80vh] items-center justify-center">
        <p style={{ color: 'var(--foreground-secondary)' }}>Loading…</p>
      </main>
    )
  }

  return (
    <main className="px-0 py-4 sm:py-8">
      <div className="mb-4 sm:mb-6">
        <Link
          href="/home"
          className="text-sm inline-flex items-center gap-1 mb-3"
          style={{ color: 'var(--foreground-secondary)' }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--foreground-secondary)'}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M9 3L5 7l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Competitions
        </Link>
        <h2 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
          {competition.name}
        </h2>
      </div>

      {/* Tab bar */}
      <div
        className="flex gap-1 mb-4 sm:mb-6 rounded-xl p-1"
        style={{ backgroundColor: 'var(--background-secondary)' }}
      >
        {(['leaderboard', 'climbs'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 rounded-lg px-4 py-2 text-sm font-medium transition capitalize"
            style={{
              backgroundColor: tab === t ? 'var(--card-bg)' : 'transparent',
              color: tab === t ? 'var(--foreground)' : 'var(--foreground-secondary)',
              boxShadow: tab === t ? '0 1px 3px var(--shadow)' : 'none',
            }}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'leaderboard' ? (
        <LeaderboardTable competitionId={competition.id} competitionName={competition.name} />
      ) : (
        <ArchivedClimbsView competitionId={competition.id} />
      )}
    </main>
  )
}
