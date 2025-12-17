'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useUser } from '../../lib/useUser'

type CompetitorStats = {
  competitor_id: string
  total_sends: number
  comp_cohort: string
}

export default function LeaderboardPage() {
  const { user, loading } = useUser()
  const [competitors, setCompetitors] = useState<CompetitorStats[]>([])
  const [filteredCompetitors, setFilteredCompetitors] = useState<CompetitorStats[]>([])
  const [cohortFilter, setCohortFilter] = useState<'all' | 'male' | 'female' | 'inclusive'>('all')
  const [loadingData, setLoadingData] = useState(true)

  useEffect(() => {
    if (!user) return

    const fetchLeaderboardData = async () => {
      setLoadingData(true)
      
      // Fetch all ascents with profile data
      const { data: ascents, error } = await supabase
        .from('ascents')
        .select(`
          user_id,
          sent,
          profiles!inner (
            user_id,
            comp_cohort
          )
        `)
        .eq('sent', true)

      if (error) {
        console.error('Error fetching leaderboard data:', error)
        setLoadingData(false)
        return
      }

      // Aggregate sends by user
      const statsMap = new Map<string, CompetitorStats>()
      
      ascents?.forEach((ascent: any) => {
        const userId = ascent.user_id
        const cohort = ascent.profiles?.comp_cohort || 'inclusive'
        
        if (statsMap.has(userId)) {
          const stats = statsMap.get(userId)!
          stats.total_sends += 1
        } else {
          statsMap.set(userId, {
            competitor_id: userId,
            total_sends: 1,
            comp_cohort: cohort
          })
        }
      })

      // Convert to array and sort by total sends (descending)
      const competitorsList = Array.from(statsMap.values()).sort(
        (a, b) => b.total_sends - a.total_sends
      )

      setCompetitors(competitorsList)
      setLoadingData(false)
    }

    fetchLeaderboardData()
  }, [user])

  // Apply cohort filter
  useEffect(() => {
    if (cohortFilter === 'all') {
      setFilteredCompetitors(competitors)
    } else {
      setFilteredCompetitors(
        competitors.filter(c => c.comp_cohort === cohortFilter)
      )
    }
  }, [competitors, cohortFilter])

  if (loading) {
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

  return (
    <main style={{ padding: 32 }}>
      <h2 className="text-3xl font-bold mb-6" style={{ color: 'var(--foreground)' }}>
        Competitor Leaderboard
      </h2>

      {/* Cohort Filter */}
      <div 
        className="mb-6 rounded-2xl p-4"
        style={{
          backgroundColor: 'var(--card-bg)',
          borderWidth: '1px',
          borderStyle: 'solid',
          borderColor: 'var(--card-border)',
        }}
      >
        <div className="flex items-center gap-4 flex-wrap">
          <label className="text-sm font-medium" style={{ color: 'var(--foreground-secondary)' }}>
            Competition Cohort:
          </label>
          <div className="flex gap-2">
            {(['all', 'male', 'female', 'inclusive'] as const).map((cohort) => (
              <button
                key={cohort}
                onClick={() => setCohortFilter(cohort)}
                className="rounded-lg px-4 py-2 text-sm font-medium transition capitalize"
                style={{
                  backgroundColor: cohortFilter === cohort ? 'var(--accent)' : 'var(--button-secondary-bg)',
                  color: cohortFilter === cohort ? 'var(--accent-text)' : 'var(--button-secondary-text)',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  borderColor: cohortFilter === cohort ? 'var(--accent)' : 'var(--border)',
                }}
                onMouseEnter={(e) => {
                  if (cohortFilter !== cohort) {
                    e.currentTarget.style.backgroundColor = 'var(--button-secondary-hover)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (cohortFilter !== cohort) {
                    e.currentTarget.style.backgroundColor = 'var(--button-secondary-bg)'
                  }
                }}
              >
                {cohort}
              </button>
            ))}
          </div>
          <div className="text-sm ml-auto" style={{ color: 'var(--foreground-secondary)' }}>
            Showing {filteredCompetitors.length} competitor{filteredCompetitors.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Leaderboard Table */}
      {loadingData ? (
        <div 
          className="rounded-2xl p-8 text-center"
          style={{
            backgroundColor: 'var(--card-bg)',
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: 'var(--card-border)',
          }}
        >
          <p style={{ color: 'var(--foreground-secondary)' }}>Loading leaderboard...</p>
        </div>
      ) : filteredCompetitors.length === 0 ? (
        <div 
          className="rounded-2xl p-8 text-center"
          style={{
            backgroundColor: 'var(--card-bg)',
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: 'var(--card-border)',
          }}
        >
          <p style={{ color: 'var(--foreground-secondary)' }}>No competitors in this cohort yet</p>
        </div>
      ) : (
        <div 
          className="rounded-2xl overflow-hidden"
          style={{
            backgroundColor: 'var(--card-bg)',
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: 'var(--card-border)',
          }}
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ backgroundColor: 'var(--background-secondary)' }}>
                  <th 
                    className="text-left px-6 py-4 text-sm font-semibold"
                    style={{ color: 'var(--foreground)' }}
                  >
                    Rank
                  </th>
                  <th 
                    className="text-left px-6 py-4 text-sm font-semibold"
                    style={{ color: 'var(--foreground)' }}
                  >
                    Competitor ID
                  </th>
                  <th 
                    className="text-left px-6 py-4 text-sm font-semibold"
                    style={{ color: 'var(--foreground)' }}
                  >
                    Cohort
                  </th>
                  <th 
                    className="text-right px-6 py-4 text-sm font-semibold"
                    style={{ color: 'var(--foreground)' }}
                  >
                    Total Sends
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredCompetitors.map((competitor, index) => {
                  const isCurrentUser = competitor.competitor_id === user.id
                  return (
                    <tr
                      key={competitor.competitor_id}
                      className="transition"
                      style={{
                        backgroundColor: isCurrentUser 
                          ? 'rgba(var(--accent-rgb, 59, 130, 246), 0.1)' 
                          : 'transparent',
                        borderTopWidth: '1px',
                        borderTopStyle: 'solid',
                        borderTopColor: 'var(--border)',
                      }}
                      onMouseEnter={(e) => {
                        if (!isCurrentUser) {
                          e.currentTarget.style.backgroundColor = 'var(--background-secondary)'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isCurrentUser) {
                          e.currentTarget.style.backgroundColor = 'transparent'
                        }
                      }}
                    >
                      <td 
                        className="px-6 py-4"
                        style={{ color: 'var(--foreground-secondary)' }}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold">
                            {index + 1}
                          </span>
                          {index === 0 && <span className="text-xl">🥇</span>}
                          {index === 1 && <span className="text-xl">🥈</span>}
                          {index === 2 && <span className="text-xl">🥉</span>}
                        </div>
                      </td>
                      <td 
                        className="px-6 py-4 font-mono text-sm"
                        style={{ 
                          color: isCurrentUser ? 'var(--accent)' : 'var(--foreground)',
                          fontWeight: isCurrentUser ? 600 : 400
                        }}
                      >
                        <div className="flex items-center gap-2">
                          {competitor.competitor_id.substring(0, 8)}...
                          {isCurrentUser && (
                            <span 
                              className="text-xs px-2 py-0.5 rounded-full font-sans font-semibold"
                              style={{
                                backgroundColor: 'var(--accent)',
                                color: 'var(--accent-text)',
                              }}
                            >
                              YOU
                            </span>
                          )}
                        </div>
                      </td>
                      <td 
                        className="px-6 py-4 text-sm capitalize"
                        style={{ color: 'var(--foreground-secondary)' }}
                      >
                        {competitor.comp_cohort}
                      </td>
                      <td 
                        className="px-6 py-4 text-right"
                        style={{ 
                          color: isCurrentUser ? 'var(--accent)' : 'var(--foreground)',
                          fontWeight: isCurrentUser ? 700 : 600,
                          fontSize: '1.125rem'
                        }}
                      >
                        {competitor.total_sends}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Additional Stats */}
      {!loadingData && filteredCompetitors.length > 0 && (
        <div 
          className="mt-6 rounded-2xl p-6"
          style={{
            backgroundColor: 'var(--card-bg)',
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: 'var(--card-border)',
          }}
        >
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <div className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>
                Your Rank
              </div>
              <div className="text-2xl font-bold mt-1" style={{ color: 'var(--accent)' }}>
                {filteredCompetitors.findIndex(c => c.competitor_id === user.id) + 1 || '-'}
              </div>
            </div>
            <div>
              <div className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>
                Your Total Sends
              </div>
              <div className="text-2xl font-bold mt-1" style={{ color: 'var(--accent)' }}>
                {filteredCompetitors.find(c => c.competitor_id === user.id)?.total_sends || 0}
              </div>
            </div>
            <div>
              <div className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>
                Top Score
              </div>
              <div className="text-2xl font-bold mt-1" style={{ color: 'var(--foreground)' }}>
                {filteredCompetitors[0]?.total_sends || 0}
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
