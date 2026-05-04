'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useUser } from '../../lib/useUser'
import { useRole } from '../../lib/useRole'
import { LeaderboardTable } from '../../components/LeaderboardTable'

type Competition = {
  id: number
  name: string
  is_current: boolean
}

export default function LeaderboardPage() {
  const { user, loading } = useUser()
  const { loading: roleLoading } = useRole()
  const [competitions, setCompetitions] = useState<Competition[]>([])
  const [selectedCompetitionId, setSelectedCompetitionId] = useState<number | undefined>(undefined)

  useEffect(() => {
    if (!user) return
    supabase
      .from('competitions')
      .select('id, name, is_current')
      .order('name')
      .then(({ data }) => {
        const comps = data ?? []
        setCompetitions(comps)
        const current = comps.find(c => c.is_current)
        setSelectedCompetitionId(current?.id ?? comps[0]?.id)
      })
  }, [user])

  if (loading || roleLoading) {
    return (
      <main className="flex min-h-[80vh] items-center justify-center">
        <p style={{ color: 'var(--foreground-secondary)' }}>Loading...</p>
      </main>
    )
  }

  if (!user) {
    return (
      <main className="flex min-h-[80vh] items-center justify-center">
        <p style={{ color: 'var(--foreground-secondary)' }}>Please log in to view the leaderboard</p>
      </main>
    )
  }

  const selectedCompetition = competitions.find(c => c.id === selectedCompetitionId)

  return (
    <main className="px-0 py-4 sm:py-8">
      <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-4 sm:mb-6" style={{ color: 'var(--foreground)' }}>
        Competitor Leaderboard
      </h2>

      {/* Competition selector */}
      {competitions.length > 1 && (
        <div
          className="mb-4 sm:mb-6 rounded-2xl p-4"
          style={{
            backgroundColor: 'var(--card-bg)',
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: 'var(--card-border)',
          }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <label className="text-sm font-medium whitespace-nowrap" style={{ color: 'var(--foreground-secondary)' }}>
              Competition:
            </label>
            <select
              value={selectedCompetitionId !== undefined ? String(selectedCompetitionId) : ''}
              onChange={(e) => setSelectedCompetitionId(Number(e.target.value))}
              className="rounded-lg px-3 py-2 text-sm outline-none transition"
              style={{
                backgroundColor: 'var(--input-bg)',
                color: 'var(--foreground)',
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: 'var(--input-border)',
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
              onBlur={(e) => e.currentTarget.style.borderColor = 'var(--input-border)'}
            >
              {competitions.map(comp => (
                <option key={comp.id} value={String(comp.id)}>
                  {comp.name}{comp.is_current ? ' (current)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {selectedCompetitionId !== undefined && selectedCompetition && (
        <LeaderboardTable
          competitionId={selectedCompetitionId}
          competitionName={selectedCompetition.name}
        />
      )}
    </main>
  )
}
