'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { useUser } from '../../lib/useUser'
import { ArchivedClimbsView } from '../../components/ArchivedClimbsView'

type Competition = {
  id: number
  name: string
}

export default function ArchivedPage() {
  const router = useRouter()
  const { user, loading } = useUser()
  const [competitions, setCompetitions] = useState<Competition[]>([])
  const [loadingComps, setLoadingComps] = useState(true)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (!user) return
    supabase
      .from('competitions')
      .select('id, name')
      .eq('is_current', false)
      .order('name')
      .then(({ data }) => {
        setCompetitions(data ?? [])
        setLoadingComps(false)
      })
  }, [user])

  if (loading || loadingComps) {
    return (
      <main className="py-4 sm:py-8">
        <p className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>Loading…</p>
      </main>
    )
  }

  return (
    <main className="px-0 py-4 sm:py-8">
      <h2 className="text-xl sm:text-2xl font-semibold mb-4 sm:mb-6" style={{ color: 'var(--foreground)' }}>
        Archived
      </h2>

      {competitions.length === 0 ? (
        <div
          className="rounded-2xl p-8 text-center"
          style={{
            backgroundColor: 'var(--card-bg)',
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: 'var(--card-border)',
          }}
        >
          <p style={{ color: 'var(--foreground-secondary)' }}>No past competitions found</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {competitions.map(comp => (
            <CompetitionCard key={comp.id} competition={comp} />
          ))}
        </div>
      )}
    </main>
  )
}

function CompetitionCard({ competition }: { competition: Competition }) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div
      className="rounded-2xl shadow overflow-hidden"
      style={{
        backgroundColor: 'var(--card-bg)',
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: 'var(--card-border)',
      }}
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between cursor-pointer transition"
        style={{
          backgroundColor: 'var(--background-secondary)',
          borderBottomWidth: isExpanded ? '1px' : '0',
          borderBottomStyle: 'solid',
          borderBottomColor: 'var(--card-border)',
        }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--button-secondary-hover)'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--background-secondary)'}
      >
        <h3 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
          {competition.name}
        </h3>
        <svg
          className="transition-transform"
          style={{
            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
            width: '20px',
            height: '20px',
            fill: 'var(--foreground-secondary)',
          }}
          viewBox="0 0 20 20"
        >
          <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
        </svg>
      </button>

      {isExpanded && (
        <div className="p-4">
          <ArchivedClimbsView competitionId={competition.id} />
        </div>
      )}
    </div>
  )
}
