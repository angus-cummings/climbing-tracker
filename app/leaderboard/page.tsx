'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useUser } from '../../lib/useUser'
import { useProfile } from '../../lib/ProfileContext'
import { useRole } from '../../lib/useRole'
import { Pagination } from '../../components/Pagination'

type CompetitorStats = {
  competitor_number: number | null
  user_id: string
  profile_id: string
  total_sends: number
  comp_cohort: string
  age_category: string | null
  rank: number
  username: string | null
}

export default function LeaderboardPage() {
  const { user, loading } = useUser()
  const { selectedProfile } = useProfile()
  const { role, loading: roleLoading } = useRole()
  const [competitors, setCompetitors] = useState<CompetitorStats[]>([])
  const [filteredCompetitors, setFilteredCompetitors] = useState<CompetitorStats[]>([])
  const [cohortFilter, setCohortFilter] = useState<'all' | 'male' | 'female' | 'inclusive'>('all')
  const [ageCategoryFilter, setAgeCategoryFilter] = useState<'all' | 'u18' | 'adult' | 'masters'>('all')
  const [loadingData, setLoadingData] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 25
  const isAdmin = role === 'admin'

  useEffect(() => {
    if (!user || roleLoading) return

    const fetchLeaderboardData = async () => {
      setLoadingData(true)
      
      // Use the leaderboard_stats view for efficient aggregation
      // This view pre-aggregates sends by profile in the database
      // Much more efficient than fetching all ascents and aggregating client-side
      let query = supabase
        .from('leaderboard_stats')
        .select('*')
        .order('total_sends', { ascending: false })
        .order('competitor_number', { ascending: true, nullsFirst: false })

      const { data: leaderboardData, error } = await query

      if (error) {
        console.error('Error fetching leaderboard data:', error)
        setLoadingData(false)
        return
      }

      // If admin, fetch usernames for all profiles
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
      
      // Convert the view data to CompetitorStats format
      // The view already has everything aggregated, so we just need to format it
      const competitorsList: CompetitorStats[] = (leaderboardData || []).map((row: any) => ({
        competitor_number: row.competitor_number,
        user_id: row.user_id,
        profile_id: row.profile_id,
        total_sends: row.total_sends || 0,
        comp_cohort: (row.comp_cohort || 'inclusive').toLowerCase(),
        age_category: row.age_category || null,
        rank: 0, // Will be calculated after filtering
        username: isAdmin ? (usernameMap[row.profile_id] || null) : null
      }))
      
      // Debug: Show selected profile's stats
      if (selectedProfile) {
        const userProfileStats = competitorsList.find(c => c.profile_id === selectedProfile.profile_id)
        console.log(`[DEBUG] Selected profile (${selectedProfile.profile_id}, #${selectedProfile.competitor_number}) stats:`, userProfileStats)
      }

      setCompetitors(competitorsList)
      setLoadingData(false)
    }

    fetchLeaderboardData()
  }, [user, role, roleLoading, selectedProfile])

  // Apply cohort and age category filters (case-insensitive) and recalculate ranks
  useEffect(() => {
    let filtered: CompetitorStats[] = [...competitors] // Create a copy to avoid mutating original
    
    // Apply cohort filter
    if (cohortFilter !== 'all') {
      filtered = filtered.filter(c => c.comp_cohort?.toLowerCase() === cohortFilter.toLowerCase())
    }
    
    // Apply age category filter
    if (ageCategoryFilter !== 'all') {
      filtered = filtered.filter(c => c.age_category?.toLowerCase() === ageCategoryFilter.toLowerCase())
    }
    
    // Re-sort the filtered list (in case filters changed the order)
    filtered.sort((a, b) => {
      // First sort by total_sends descending
      if (b.total_sends !== a.total_sends) {
        return b.total_sends - a.total_sends
      }
      // If tied, sort by competitor_number ascending (lower numbers first)
      const aNum = a.competitor_number ?? Infinity
      const bNum = b.competitor_number ?? Infinity
      if (aNum !== bNum) {
        return aNum - bNum
      }
      return a.profile_id.localeCompare(b.profile_id)
    })
    
    // Recalculate ranks based on filtered results
    // If multiple competitors have the same score, they get the same rank
    // The next competitor gets a rank that skips the tied positions
    filtered.forEach((competitor, index) => {
      if (index === 0) {
        // First place always gets rank 1
        competitor.rank = 1
      } else {
        const prevCompetitor = filtered[index - 1]
        if (competitor.total_sends === prevCompetitor.total_sends) {
          // Tied with previous competitor - same rank
          competitor.rank = prevCompetitor.rank
        } else {
          // Different score - rank is current position (1-indexed)
          competitor.rank = index + 1
        }
      }
    })
    
    setFilteredCompetitors(filtered)
    setCurrentPage(1) // Reset to first page when filters change
    console.log('Filtered competitors:', filtered.length, 'for cohort:', cohortFilter, 'age category:', ageCategoryFilter, 'out of', competitors.length, 'total')
  }, [competitors, cohortFilter, ageCategoryFilter])

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

  // Calculate pagination
  const totalPages = Math.ceil(filteredCompetitors.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedCompetitors = filteredCompetitors.slice(startIndex, endIndex)
  const showingStart = filteredCompetitors.length > 0 ? startIndex + 1 : 0
  const showingEnd = Math.min(endIndex, filteredCompetitors.length)

  return (
    <main className="px-0 py-4 sm:py-8">
      <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-4 sm:mb-6" style={{ color: 'var(--foreground)' }}>
        Competitor Leaderboard
      </h2>
      {/* Additional Stats */}
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
              <div className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>
                Your Rank
              </div>
              <div className="text-2xl font-bold mt-1" style={{ color: 'var(--accent)' }}>
                {filteredCompetitors.find(c => c.profile_id === selectedProfile?.profile_id)?.rank ?? '-'}
              </div>
            </div>
            <div>
              <div className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>
                Your Total Sends
              </div>
              <div className="text-2xl font-bold mt-1" style={{ color: 'var(--accent)' }}>
                {filteredCompetitors.find(c => c.profile_id === selectedProfile?.profile_id)?.total_sends ?? 0}
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
          {/* Cohort Filter */}
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
          </div>

          {/* Age Category Filter */}
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
                  onMouseEnter={(e) => {
                    if (ageCategoryFilter !== value) {
                      e.currentTarget.style.backgroundColor = 'var(--button-secondary-hover)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (ageCategoryFilter !== value) {
                      e.currentTarget.style.backgroundColor = 'var(--button-secondary-bg)'
                    }
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Results Count */}
          <div className="text-sm pt-2 border-t" style={{ borderColor: 'var(--border)', color: 'var(--foreground-secondary)' }}>
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
                    className="text-left px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-semibold"
                    style={{ color: 'var(--foreground)' }}
                  >
                    Rank
                  </th>
                  <th 
                    className="text-left px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-semibold"
                    style={{ color: 'var(--foreground)' }}
                  >
                    Competitor #
                  </th>
                  {isAdmin && (
                    <th 
                      className="text-left px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-semibold"
                      style={{ color: 'var(--foreground)' }}
                    >
                      Name
                    </th>
                  )}
                  <th 
                    className="text-left px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-semibold hidden sm:table-cell"
                    style={{ color: 'var(--foreground)' }}
                  >
                    Cohort
                  </th>
                  <th 
                    className="text-right px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-semibold"
                    style={{ color: 'var(--foreground)' }}
                  >
                    Sends
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedCompetitors.map((competitor, index) => {
                  const isCurrentUser = competitor.profile_id === selectedProfile?.profile_id
                  return (
                    <tr
                      key={competitor.profile_id}
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
                        className="px-3 sm:px-6 py-3 sm:py-4"
                        style={{ color: 'var(--foreground-secondary)' }}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-base sm:text-lg font-bold">
                            {competitor.rank}
                          </span>
                          {(() => {
                            const rank1Count = filteredCompetitors.filter(c => c.rank === 1).length
                            const rank2Count = filteredCompetitors.filter(c => c.rank === 2).length
                            
                            // Rank 1: Always gold (all people at rank 1 get gold)
                            if (competitor.rank === 1) {
                              return <span className="text-xl">🥇</span>
                            }
                            
                            // Calculate total medals shown so far
                            let medalsShown = rank1Count // All rank 1 get gold
                            
                            // Rank 2: Silver if rank 1 has 1 person, bronze if rank 1 has 2+ people
                            if (competitor.rank === 2) {
                              if (medalsShown < 3) {
                                if (rank1Count === 1) {
                                  return <span className="text-xl">🥈</span>
                                } else {
                                  return <span className="text-xl">🥉</span>
                                }
                              }
                            }
                            
                            // Rank 3: Bronze only if we haven't shown 3+ medals yet
                            if (competitor.rank === 3) {
                              medalsShown += (rank2Count > 0 ? 1 : 0) // Add rank 2 medals
                              if (medalsShown < 3) {
                                return <span className="text-xl">🥉</span>
                              }
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
                          {competitor.competitor_number !== null ? (
                            <span className="font-semibold">#{competitor.competitor_number}</span>
                          ) : (
                            <span className="text-xs opacity-60 italic">No number</span>
                          )}
                          {isCurrentUser && (
                            <span 
                              className="text-xs px-1.5 sm:px-2 py-0.5 rounded-full font-sans font-semibold"
                              style={{
                                backgroundColor: 'var(--accent)',
                                color: 'var(--accent-text)',
                              }}
                            >
                              YOU
                            </span>
                          )}
                          <span className="text-xs sm:hidden capitalize opacity-75">
                            {competitor.comp_cohort}
                          </span>
                        </div>
                      </td>
                      {isAdmin && (
                        <td 
                          className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm"
                          style={{ color: 'var(--foreground)' }}
                        >
                          {competitor.username || '-'}
                        </td>
                      )}
                      <td 
                        className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm capitalize hidden sm:table-cell"
                        style={{ color: 'var(--foreground-secondary)' }}
                      >
                        {competitor.comp_cohort}
                      </td>
                      <td 
                        className="px-3 sm:px-6 py-3 sm:py-4 text-right text-sm sm:text-base"
                        style={{ 
                          color: isCurrentUser ? 'var(--accent)' : 'var(--foreground)',
                          fontWeight: isCurrentUser ? 700 : 600,
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
          
          {/* Pagination */}
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
