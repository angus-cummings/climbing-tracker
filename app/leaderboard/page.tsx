'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useUser } from '../../lib/useUser'
import { useProfile } from '../../lib/ProfileContext'
import { useRole } from '../../lib/useRole'
import { Pagination } from '../../components/Pagination'

type Competition = {
  id: number
  name: string
  is_current: boolean
}

type CompetitorStats = {
  competitor_number: number | null
  user_id: string
  profile_id: string
  total_sends: number
  total_points: number
  pumpfest_sends: number
  pumpfest_points: number
  comp_cohort: string
  age_category: string | null
  rank: number
  username: string | null
}

export default function LeaderboardPage() {
  const { user, loading } = useUser()
  const { selectedProfile } = useProfile()
  const { role, loading: roleLoading } = useRole()
  const [competitions, setCompetitions] = useState<Competition[]>([])
  const [selectedCompetitionId, setSelectedCompetitionId] = useState<number | null | undefined>(undefined) // undefined = not yet initialised
  const [competitors, setCompetitors] = useState<CompetitorStats[]>([])
  const [filteredCompetitors, setFilteredCompetitors] = useState<CompetitorStats[]>([])
  const [cohortFilter, setCohortFilter] = useState<'all' | 'male' | 'female' | 'inclusive'>('all')
  const [ageCategoryFilter, setAgeCategoryFilter] = useState<'all' | 'u18' | 'adult' | 'masters'>('all')
  const [leaderboardMode, setLeaderboardMode] = useState<'overall' | 'pumpfest'>('overall')
  const [loadingData, setLoadingData] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 25
  const isAdmin = role === 'admin'

  // Fetch competitions once and initialise the selected competition to the current one
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
        setSelectedCompetitionId(current?.id ?? null)
      })
  }, [user])

  // Fetch leaderboard data whenever the selected competition changes
  useEffect(() => {
    if (!user || roleLoading || selectedCompetitionId === undefined) return

    const fetchLeaderboardData = async () => {
      setLoadingData(true)

      const { data: leaderboardData, error } = await supabase
        .rpc('leaderboard_stats', { p_competition_id: selectedCompetitionId })
        .order('total_points', { ascending: false })
        .order('competitor_number', { ascending: true, nullsFirst: false })

      if (error) {
        console.error('Error fetching leaderboard data:', error)
        setLoadingData(false)
        return
      }

      let usernameMap: Record<string, string | null> = {}
      if (isAdmin && leaderboardData && leaderboardData.length > 0) {
        const profileIds = leaderboardData.map((row: any) => row.profile_id)
        if (profileIds.length > 0) {
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('profile_id, username')
            .in('profile_id', profileIds)
          if (profilesData) {
            profilesData.forEach((profile: any) => {
              usernameMap[profile.profile_id] = profile.username
            })
          }
        }
      }

      const competitorsList: CompetitorStats[] = (leaderboardData || []).map((row: any) => ({
        competitor_number: row.competitor_number,
        user_id: row.user_id,
        profile_id: row.profile_id,
        total_sends: row.total_sends || 0,
        total_points: row.total_points || 0,
        pumpfest_sends: row.pumpfest_sends || 0,
        pumpfest_points: row.pumpfest_points || 0,
        comp_cohort: (row.comp_cohort || 'inclusive').toLowerCase(),
        age_category: row.age_category || null,
        rank: 0,
        username: isAdmin ? (usernameMap[row.profile_id] || null) : null
      }))

      setCompetitors(competitorsList)
      setLoadingData(false)
    }

    fetchLeaderboardData()
  }, [user, role, roleLoading, selectedCompetitionId])

  // Apply cohort / age / mode filters and recalculate ranks
  useEffect(() => {
    let filtered: CompetitorStats[] = [...competitors]

    if (cohortFilter !== 'all') {
      filtered = filtered.filter(c => c.comp_cohort?.toLowerCase() === cohortFilter.toLowerCase())
    }
    if (ageCategoryFilter !== 'all') {
      filtered = filtered.filter(c => c.age_category?.toLowerCase() === ageCategoryFilter.toLowerCase())
    }
    if (leaderboardMode === 'pumpfest') {
      filtered = filtered.filter(c => c.pumpfest_points > 0)
    }

    filtered.sort((a, b) => {
      const aScore = leaderboardMode === 'pumpfest' ? a.pumpfest_points : a.total_points
      const bScore = leaderboardMode === 'pumpfest' ? b.pumpfest_points : b.total_points
      if (bScore !== aScore) return bScore - aScore
      const aNum = a.competitor_number ?? Infinity
      const bNum = b.competitor_number ?? Infinity
      if (aNum !== bNum) return aNum - bNum
      return a.profile_id.localeCompare(b.profile_id)
    })

    filtered.forEach((competitor, index) => {
      if (index === 0) {
        competitor.rank = 1
      } else {
        const prev = filtered[index - 1]
        const score = leaderboardMode === 'pumpfest' ? competitor.pumpfest_points : competitor.total_points
        const prevScore = leaderboardMode === 'pumpfest' ? prev.pumpfest_points : prev.total_points
        competitor.rank = score === prevScore ? prev.rank : index + 1
      }
    })

    setFilteredCompetitors(filtered)
    setCurrentPage(1)
  }, [competitors, cohortFilter, ageCategoryFilter, leaderboardMode])

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

  const totalPages = Math.ceil(filteredCompetitors.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedCompetitors = filteredCompetitors.slice(startIndex, endIndex)
  const showingStart = filteredCompetitors.length > 0 ? startIndex + 1 : 0
  const showingEnd = Math.min(endIndex, filteredCompetitors.length)

  const selectedCompetitionName = selectedCompetitionId == null
    ? 'All time'
    : competitions.find(c => c.id === selectedCompetitionId)?.name ?? ''

  return (
    <main className="px-0 py-4 sm:py-8">
      <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-4 sm:mb-6" style={{ color: 'var(--foreground)' }}>
        Competitor Leaderboard
      </h2>

      {/* Stats summary */}
      {!loadingData && filteredCompetitors.length > 0 && (
        <div
          className="mb-4 sm:mb-6 rounded-2xl p-4"
          style={{
            backgroundColor: 'var(--card-bg)',
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: 'var(--card-border)',
          }}
        >
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
            <div>
              <div className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>Your Rank</div>
              <div className="text-2xl font-bold mt-1" style={{ color: 'var(--accent)' }}>
                {filteredCompetitors.find(c => c.profile_id === selectedProfile?.profile_id)?.rank ?? '-'}
              </div>
            </div>
            <div>
              <div className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>
                {leaderboardMode === 'pumpfest' ? 'Your Pumpfest Points' : 'Your Total Points'}
              </div>
              <div className="text-2xl font-bold mt-1" style={{ color: 'var(--accent)' }}>
                {leaderboardMode === 'pumpfest'
                  ? filteredCompetitors.find(c => c.profile_id === selectedProfile?.profile_id)?.pumpfest_points ?? 0
                  : filteredCompetitors.find(c => c.profile_id === selectedProfile?.profile_id)?.total_points ?? 0}
              </div>
            </div>
            <div>
              <div className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>Top Score</div>
              <div className="text-2xl font-bold mt-1" style={{ color: 'var(--foreground)' }}>
                {leaderboardMode === 'pumpfest'
                  ? filteredCompetitors[0]?.pumpfest_points || 0
                  : filteredCompetitors[0]?.total_points || 0}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div
        className="mb-4 sm:mb-6 rounded-2xl p-4"
        style={{
          backgroundColor: 'var(--card-bg)',
          borderWidth: '1px',
          borderStyle: 'solid',
          borderColor: 'var(--card-border)',
        }}
      >
        <div className="space-y-4">

          {/* Competition selector */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <label className="text-sm font-medium whitespace-nowrap" style={{ color: 'var(--foreground-secondary)' }}>
              Competition:
            </label>
            <select
              value={selectedCompetitionId == null ? '' : String(selectedCompetitionId)}
              onChange={(e) => setSelectedCompetitionId(e.target.value === '' ? null : Number(e.target.value))}
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
              <option value="">All time</option>
            </select>
          </div>

          {/* View mode */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <label className="text-sm font-medium whitespace-nowrap" style={{ color: 'var(--foreground-secondary)' }}>
              View:
            </label>
            <div className="flex flex-wrap gap-2">
              {([
                { value: 'overall', label: 'Overall (All Climbs)' },
                { value: 'pumpfest', label: 'Pumpfest Only' },
              ] as const).map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setLeaderboardMode(value)}
                  className="rounded-lg px-4 py-2 text-sm font-medium transition"
                  style={{
                    backgroundColor: leaderboardMode === value ? 'var(--accent)' : 'var(--button-secondary-bg)',
                    color: leaderboardMode === value ? 'var(--accent-text)' : 'var(--button-secondary-text)',
                    borderWidth: '1px',
                    borderStyle: 'solid',
                    borderColor: leaderboardMode === value ? 'var(--accent)' : 'var(--border)',
                  }}
                  onMouseEnter={(e) => { if (leaderboardMode !== value) e.currentTarget.style.backgroundColor = 'var(--button-secondary-hover)' }}
                  onMouseLeave={(e) => { if (leaderboardMode !== value) e.currentTarget.style.backgroundColor = 'var(--button-secondary-bg)' }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Cohort filter */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <label className="text-sm font-medium whitespace-nowrap" style={{ color: 'var(--foreground-secondary)' }}>
              Competition Cohort:
            </label>
            <div className="flex flex-wrap gap-2">
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
                  onMouseEnter={(e) => { if (cohortFilter !== cohort) e.currentTarget.style.backgroundColor = 'var(--button-secondary-hover)' }}
                  onMouseLeave={(e) => { if (cohortFilter !== cohort) e.currentTarget.style.backgroundColor = 'var(--button-secondary-bg)' }}
                >
                  {cohort}
                </button>
              ))}
            </div>
          </div>

          {/* Age category filter */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <label className="text-sm font-medium whitespace-nowrap" style={{ color: 'var(--foreground-secondary)' }}>
              Age Category:
            </label>
            <div className="flex flex-wrap gap-2">
              {([
                { value: 'all', label: 'All' },
                { value: 'u18', label: 'U18' },
                { value: 'adult', label: 'Adult' },
                { value: 'masters', label: 'Masters' }
              ] as const).map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setAgeCategoryFilter(value)}
                  className="rounded-lg px-4 py-2 text-sm font-medium transition"
                  style={{
                    backgroundColor: ageCategoryFilter === value ? 'var(--accent)' : 'var(--button-secondary-bg)',
                    color: ageCategoryFilter === value ? 'var(--accent-text)' : 'var(--button-secondary-text)',
                    borderWidth: '1px',
                    borderStyle: 'solid',
                    borderColor: ageCategoryFilter === value ? 'var(--accent)' : 'var(--border)',
                  }}
                  onMouseEnter={(e) => { if (ageCategoryFilter !== value) e.currentTarget.style.backgroundColor = 'var(--button-secondary-hover)' }}
                  onMouseLeave={(e) => { if (ageCategoryFilter !== value) e.currentTarget.style.backgroundColor = 'var(--button-secondary-bg)' }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="text-sm pt-2 border-t" style={{ borderColor: 'var(--border)', color: 'var(--foreground-secondary)' }}>
            {selectedCompetitionName} — {filteredCompetitors.length} competitor{filteredCompetitors.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Table */}
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
                  <th className="text-left px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Rank</th>
                  <th className="text-left px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Competitor #</th>
                  {isAdmin && (
                    <th className="text-left px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Name</th>
                  )}
                  <th className="text-left px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-semibold hidden sm:table-cell" style={{ color: 'var(--foreground)' }}>Cohort</th>
                  <th className="text-right px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                    {leaderboardMode === 'pumpfest' ? 'Pumpfest Points' : 'Points'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedCompetitors.map((competitor) => {
                  const isCurrentUser = competitor.profile_id === selectedProfile?.profile_id
                  return (
                    <tr
                      key={competitor.profile_id}
                      className="transition"
                      style={{
                        backgroundColor: isCurrentUser ? 'rgba(var(--accent-rgb, 59, 130, 246), 0.1)' : 'transparent',
                        borderTopWidth: '1px',
                        borderTopStyle: 'solid',
                        borderTopColor: 'var(--border)',
                      }}
                      onMouseEnter={(e) => { if (!isCurrentUser) e.currentTarget.style.backgroundColor = 'var(--background-secondary)' }}
                      onMouseLeave={(e) => { if (!isCurrentUser) e.currentTarget.style.backgroundColor = 'transparent' }}
                    >
                      <td className="px-3 sm:px-6 py-3 sm:py-4" style={{ color: 'var(--foreground-secondary)' }}>
                        <div className="flex items-center gap-2">
                          <span className="text-base sm:text-lg font-bold">{competitor.rank}</span>
                          {(() => {
                            const rank1Count = filteredCompetitors.filter(c => c.rank === 1).length
                            const rank2Count = filteredCompetitors.filter(c => c.rank === 2).length
                            if (competitor.rank === 1) return <span className="text-xl">🥇</span>
                            const medalsShown = rank1Count
                            if (competitor.rank === 2 && medalsShown < 3) {
                              return <span className="text-xl">{rank1Count === 1 ? '🥈' : '🥉'}</span>
                            }
                            if (competitor.rank === 3 && medalsShown + (rank2Count > 0 ? 1 : 0) < 3) {
                              return <span className="text-xl">🥉</span>
                            }
                            return null
                          })()}
                        </div>
                      </td>
                      <td
                        className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm"
                        style={{
                          color: isCurrentUser ? 'var(--accent)' : 'var(--foreground)',
                          fontWeight: isCurrentUser ? 600 : 400
                        }}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                          {competitor.competitor_number !== null
                            ? <span className="font-semibold">#{competitor.competitor_number}</span>
                            : <span className="text-xs opacity-60 italic">No number</span>}
                          {isCurrentUser && (
                            <span
                              className="text-xs px-1.5 sm:px-2 py-0.5 rounded-full font-sans font-semibold"
                              style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }}
                            >
                              YOU
                            </span>
                          )}
                          <span className="text-xs sm:hidden capitalize opacity-75">{competitor.comp_cohort}</span>
                        </div>
                      </td>
                      {isAdmin && (
                        <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm" style={{ color: 'var(--foreground)' }}>
                          {competitor.username || '-'}
                        </td>
                      )}
                      <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm capitalize hidden sm:table-cell" style={{ color: 'var(--foreground-secondary)' }}>
                        {competitor.comp_cohort}
                      </td>
                      <td
                        className="px-3 sm:px-6 py-3 sm:py-4 text-right text-sm sm:text-base"
                        style={{
                          color: isCurrentUser ? 'var(--accent)' : 'var(--foreground)',
                          fontWeight: isCurrentUser ? 700 : 600,
                        }}
                      >
                        {leaderboardMode === 'pumpfest' ? competitor.pumpfest_points : competitor.total_points}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              itemsPerPage={itemsPerPage}
              totalItems={filteredCompetitors.length}
              showingStart={showingStart}
              showingEnd={showingEnd}
            />
          )}
        </div>
      )}
    </main>
  )
}
