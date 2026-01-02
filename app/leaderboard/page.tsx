'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useUser } from '../../lib/useUser'
import { Pagination } from '../../components/Pagination'

type CompetitorStats = {
  competitor_number: number | null
  user_id: string
  profile_id: string
  total_sends: number
  comp_cohort: string
  age_category: string | null
  rank: number
}

export default function LeaderboardPage() {
  const { user, loading } = useUser()
  const [competitors, setCompetitors] = useState<CompetitorStats[]>([])
  const [filteredCompetitors, setFilteredCompetitors] = useState<CompetitorStats[]>([])
  const [cohortFilter, setCohortFilter] = useState<'all' | 'male' | 'female' | 'inclusive'>('all')
  const [ageCategoryFilter, setAgeCategoryFilter] = useState<'all' | 'u18' | 'adult' | 'masters'>('all')
  const [loadingData, setLoadingData] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 25

  useEffect(() => {
    if (!user) return

    const fetchLeaderboardData = async () => {
      setLoadingData(true)
      
      // Fetch all ascents with profile data
      // Join profiles using profile_id (the new relationship after refactor)
      // Must specify the foreign key explicitly since there are multiple relationships
      const { data: ascents, error } = await supabase
        .from('ascents')
        .select(`
          profile_id,
          sent,
          profiles!ascents_profile_id_fkey (
            profile_id,
            user_id,
            competitor_number,
            comp_cohort,
            age_category
          )
        `)
        .eq('sent', true)
        .not('profile_id', 'is', null)

      if (error) {
        console.error('Error fetching leaderboard data:', error)
        setLoadingData(false)
        return
      }

      // Debug: log what we got
      console.log('Ascents fetched:', ascents?.length || 0)
      if (ascents && ascents.length > 0) {
        console.log('Sample ascent:', ascents[0])
        console.log('Sample profile:', ascents[0]?.profiles)
      }

      // Aggregate sends by profile (since multiple profiles can belong to one user)
      const statsMap = new Map<string, CompetitorStats>()
      
      ascents?.forEach((ascent: any) => {
        const profileId = ascent.profile_id
        // Handle both array and object responses from Supabase
        const profile = Array.isArray(ascent.profiles) ? ascent.profiles[0] : ascent.profiles
        if (!profile || !profileId) {
          console.warn('Missing profile data for ascent:', ascent)
          return // Skip if profile data is missing
        }
        
        const userId = profile.user_id
        // Normalize cohort to lowercase for consistent comparison
        const cohort = (profile.comp_cohort || 'inclusive').toLowerCase()
        const ageCategory = profile.age_category || null
        const competitorNumber = profile.competitor_number || null
        
        if (statsMap.has(profileId)) {
          const stats = statsMap.get(profileId)!
          stats.total_sends += 1
        } else {
          statsMap.set(profileId, {
            competitor_number: competitorNumber,
            user_id: userId,
            profile_id: profileId,
            total_sends: 1,
            comp_cohort: cohort,
            age_category: ageCategory,
            rank: 0 // Will be calculated after sorting
          })
        }
      })

      console.log('Competitors aggregated:', statsMap.size)

      // Convert to array and sort by total sends (descending)
      // Note: Ranks will be calculated after filtering
      const competitorsList = Array.from(statsMap.values()).sort(
        (a, b) => {
          // First sort by total_sends descending
          if (b.total_sends !== a.total_sends) {
            return b.total_sends - a.total_sends
          }
          // If tied, sort by competitor_number ascending (lower numbers first)
          // If no competitor_number, sort by profile_id for consistency
          const aNum = a.competitor_number ?? Infinity
          const bNum = b.competitor_number ?? Infinity
          if (aNum !== bNum) {
            return aNum - bNum
          }
          return a.profile_id.localeCompare(b.profile_id)
        }
      )

      setCompetitors(competitorsList)
      setLoadingData(false)
    }

    fetchLeaderboardData()
  }, [user])

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

  // Calculate pagination
  const totalPages = Math.ceil(filteredCompetitors.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedCompetitors = filteredCompetitors.slice(startIndex, endIndex)
  const showingStart = filteredCompetitors.length > 0 ? startIndex + 1 : 0
  const showingEnd = Math.min(endIndex, filteredCompetitors.length)

  return (
    <main style={{ padding: 32 }}>
      <h2 className="text-3xl font-bold mb-6" style={{ color: 'var(--foreground)' }}>
        Competitor Leaderboard
      </h2>

      {/* Filters */}
      <div 
        className="mb-6 rounded-2xl p-4"
        style={{
          backgroundColor: 'var(--card-bg)',
          borderWidth: '1px',
          borderStyle: 'solid',
          borderColor: 'var(--card-border)',
        }}
      >
        <div className="space-y-4">
          {/* Cohort Filter */}
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
          </div>

          {/* Age Category Filter */}
          <div className="flex items-center gap-4 flex-wrap">
            <label className="text-sm font-medium" style={{ color: 'var(--foreground-secondary)' }}>
              Age Category:
            </label>
            <div className="flex gap-2">
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
                    className="text-left px-6 py-4 text-sm font-semibold"
                    style={{ color: 'var(--foreground)' }}
                  >
                    Rank
                  </th>
                  <th 
                    className="text-left px-6 py-4 text-sm font-semibold"
                    style={{ color: 'var(--foreground)' }}
                  >
                    Competitor Number
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
                {paginatedCompetitors.map((competitor, index) => {
                  const isCurrentUser = competitor.user_id === user.id
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
                        className="px-6 py-4"
                        style={{ color: 'var(--foreground-secondary)' }}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold">
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
                        className="px-6 py-4 text-sm"
                        style={{ 
                          color: isCurrentUser ? 'var(--accent)' : 'var(--foreground)',
                          fontWeight: isCurrentUser ? 600 : 400
                        }}
                      >
                        <div className="flex items-center gap-2">
                          {competitor.competitor_number !== null ? (
                            <span className="font-semibold">#{competitor.competitor_number}</span>
                          ) : (
                            <span className="text-xs opacity-60 italic">No number assigned</span>
                          )}
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
                {filteredCompetitors.find(c => c.user_id === user.id)?.rank ?? '-'}
              </div>
            </div>
            <div>
              <div className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>
                Your Total Sends
              </div>
              <div className="text-2xl font-bold mt-1" style={{ color: 'var(--accent)' }}>
                {filteredCompetitors.find(c => c.user_id === user.id)?.total_sends ?? 0}
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
