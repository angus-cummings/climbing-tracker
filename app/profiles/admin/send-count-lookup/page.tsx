'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../../lib/supabase'
import { useUser } from '../../../../lib/useUser'
import { useRole } from '../../../../lib/useRole'

type ClimberResult = {
  profile_id: string
  user_id: string
  username: string | null
  phone_number: string | null
  comp_cohort: string | null
  age_category: string | null
  competitor_number: number | null
  send_count: number
  email: string
}

export default function SendCountLookupPage() {
  const router = useRouter()
  const { user, loading: userLoading } = useUser()
  const { role, loading: roleLoading } = useRole()
  const [sendCount, setSendCount] = useState<string>('')
  const [results, setResults] = useState<ClimberResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)
  const [sortField, setSortField] = useState<'username' | 'send_count' | 'competitor_number' | 'age_category' | 'comp_cohort' | 'email' | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [cohortFilter, setCohortFilter] = useState<'all' | 'male' | 'female' | 'inclusive'>('all')
  const [ageCategoryFilter, setAgeCategoryFilter] = useState<'all' | 'u18' | 'adult' | 'masters'>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')

  // Redirect if not admin
  useEffect(() => {
    if (!userLoading && !roleLoading) {
      if (!user) {
        router.push('/')
        return
      }
      if (role !== 'admin') {
        router.push('/climbs')
        return
      }
    }
  }, [user, role, userLoading, roleLoading, router])

  const handleSearch = async () => {
    if (!sendCount || isNaN(parseInt(sendCount)) || parseInt(sendCount) < 0) {
      setError('Please enter a valid number')
      return
    }

    setLoading(true)
    setError(null)
    setHasSearched(true)

    try {
      const { data, error: rpcError } = await supabase.rpc('get_climbers_by_send_count', {
        p_send_count: parseInt(sendCount)
      })

      if (rpcError) {
        throw rpcError
      }

      setResults(data || [])
    } catch (err: any) {
      console.error('Error fetching climbers:', err)
      setError(err.message || 'Failed to fetch climbers')
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadCSV = () => {
    if (results.length === 0) return

    // Create CSV headers
    const headers = [
      'User Name',
      'Phone Number',
      'Number of Sends',
      'Age Group',
      'Cohort',
      'Email Address',
      'Climber Number'
    ]

    // Create CSV rows (use filtered and sorted results for CSV)
    const rows = sortedResults.map(climber => [
      climber.username || '',
      climber.phone_number || '',
      climber.send_count.toString(),
      climber.age_category || '',
      climber.comp_cohort || '',
      climber.email || '',
      climber.competitor_number?.toString() || ''
    ])

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => {
        // Escape commas and quotes in CSV cells
        const cellStr = String(cell)
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`
        }
        return cellStr
      }).join(','))
    ].join('\n')

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `climbers_with_at_least_${sendCount}_sends_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  // Filter results
  const filterResults = (results: ClimberResult[]): ClimberResult[] => {
    let filtered = [...results]

    // Apply search query
    if (searchQuery.trim()) {
      const lowerQuery = searchQuery.toLowerCase()
      filtered = filtered.filter(climber => {
        return (
          (climber.username?.toLowerCase().includes(lowerQuery) ?? false) ||
          (climber.email?.toLowerCase().includes(lowerQuery) ?? false) ||
          (climber.phone_number?.toLowerCase().includes(lowerQuery) ?? false) ||
          (climber.comp_cohort?.toLowerCase().includes(lowerQuery) ?? false) ||
          (climber.age_category?.toLowerCase().includes(lowerQuery) ?? false) ||
          (climber.competitor_number?.toString().includes(lowerQuery) ?? false) ||
          climber.send_count.toString().includes(lowerQuery)
        )
      })
    }

    // Apply cohort filter
    if (cohortFilter !== 'all') {
      filtered = filtered.filter(climber => 
        climber.comp_cohort?.toLowerCase() === cohortFilter.toLowerCase()
      )
    }

    // Apply age category filter
    if (ageCategoryFilter !== 'all') {
      filtered = filtered.filter(climber => 
        climber.age_category?.toLowerCase() === ageCategoryFilter.toLowerCase()
      )
    }

    return filtered
  }

  // Sort results
  const sortResults = (results: ClimberResult[]): ClimberResult[] => {
    if (!sortField) return results

    return [...results].sort((a, b) => {
      let aValue: string | number | null
      let bValue: string | number | null

      switch (sortField) {
        case 'username':
          aValue = (a.username || '').toLowerCase()
          bValue = (b.username || '').toLowerCase()
          break
        case 'send_count':
          aValue = a.send_count
          bValue = b.send_count
          break
        case 'competitor_number':
          aValue = a.competitor_number ?? Infinity
          bValue = b.competitor_number ?? Infinity
          break
        case 'age_category':
          aValue = (a.age_category || '').toLowerCase()
          bValue = (b.age_category || '').toLowerCase()
          break
        case 'comp_cohort':
          aValue = (a.comp_cohort || '').toLowerCase()
          bValue = (b.comp_cohort || '').toLowerCase()
          break
        case 'email':
          aValue = (a.email || '').toLowerCase()
          bValue = (b.email || '').toLowerCase()
          break
        default:
          return 0
      }

      if (aValue === null || aValue === undefined) return 1
      if (bValue === null || bValue === undefined) return -1
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
  }

  // Handle sort toggle
  const handleSort = (field: 'username' | 'send_count' | 'competitor_number' | 'age_category' | 'comp_cohort' | 'email') => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      // New field, default to ascending
      setSortField(field)
      setSortDirection('asc')
    }
  }

  // Get filtered and sorted results
  const filteredResults = filterResults(results)
  const sortedResults = sortResults(filteredResults)

  if (userLoading || roleLoading) {
    return (
      <main className="flex min-h-[80vh] items-center justify-center">
        <p style={{ color: 'var(--foreground-secondary)' }}>Loading...</p>
      </main>
    )
  }

  if (role !== 'admin') {
    return (
      <main className="flex min-h-[80vh] items-center justify-center">
        <p style={{ color: 'var(--foreground-secondary)' }}>Access denied. Admin access required.</p>
      </main>
    )
  }

  return (
    <main className="px-4 py-6 sm:px-6">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2" style={{ color: 'var(--foreground)' }}>
          Climber Send Count Lookup
        </h1>
        <p className="text-sm sm:text-base mb-4" style={{ color: 'var(--foreground-secondary)' }}>
          Find all climbers who have logged at least a certain number of sends.
        </p>
      </div>

      {/* Search Form */}
      <div 
        className="mb-6 rounded-2xl p-4 sm:p-6"
        style={{
          backgroundColor: 'var(--card-bg)',
          borderWidth: '1px',
          borderStyle: 'solid',
          borderColor: 'var(--card-border)',
        }}
      >
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
          <div className="flex-1">
            <label 
              htmlFor="sendCount" 
              className="block text-sm font-medium mb-2"
              style={{ color: 'var(--foreground-secondary)' }}
            >
              Number of Sends
            </label>
            <input
              id="sendCount"
              type="number"
              min="0"
              value={sendCount}
              onChange={(e) => setSendCount(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter number of sends"
              className="w-full rounded-lg px-4 py-2 text-base"
              style={{
                backgroundColor: 'var(--background)',
                color: 'var(--foreground)',
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: error ? 'var(--error)' : 'var(--border)',
              }}
            />
            {error && (
              <p className="mt-2 text-sm" style={{ color: 'var(--error)' }}>
                {error}
              </p>
            )}
          </div>
          <button
            onClick={handleSearch}
            disabled={loading || !sendCount}
            className="rounded-lg px-6 py-2 font-medium transition-all disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
            style={{
              backgroundColor: loading || !sendCount ? 'var(--button-secondary-bg)' : 'var(--accent)',
              color: loading || !sendCount ? 'var(--button-secondary-text)' : 'var(--accent-text)',
            }}
            onMouseEnter={(e) => {
              if (!loading && sendCount) {
                e.currentTarget.style.backgroundColor = 'var(--accent-hover)'
              }
            }}
            onMouseLeave={(e) => {
              if (!loading && sendCount) {
                e.currentTarget.style.backgroundColor = 'var(--accent)'
              }
            }}
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </div>

      {/* Results */}
      {hasSearched && (
        <div 
          className="rounded-2xl overflow-hidden"
          style={{
            backgroundColor: 'var(--card-bg)',
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: 'var(--card-border)',
          }}
        >
          <div className="p-4 sm:p-6 border-b" style={{ borderColor: 'var(--card-border)' }}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
              <div>
                <h2 className="text-lg sm:text-xl font-semibold mb-1" style={{ color: 'var(--foreground)' }}>
                  Results
                </h2>
                <p className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>
                  Found {sortedResults.length} climber{sortedResults.length !== 1 ? 's' : ''} with at least {sendCount} send{sendCount !== '1' ? 's' : ''}
                  {sortedResults.length !== results.length && ` (${results.length} total)`}
                </p>
              </div>
              {results.length > 0 && (
                <button
                  onClick={handleDownloadCSV}
                  className="rounded-lg px-4 py-2 text-sm font-medium transition-all whitespace-nowrap"
                  style={{
                    backgroundColor: 'var(--button-secondary-bg)',
                    color: 'var(--button-secondary-text)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--button-secondary-hover)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--button-secondary-bg)'
                  }}
                >
                  Download CSV
                </button>
              )}
            </div>

            {/* Filters */}
            <div className="space-y-4">
              {/* Search */}
              <div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, email, phone, number..."
                  className="w-full rounded-lg px-4 py-2 text-sm"
                  style={{
                    backgroundColor: 'var(--background)',
                    color: 'var(--foreground)',
                    borderWidth: '1px',
                    borderStyle: 'solid',
                    borderColor: 'var(--border)',
                  }}
                />
              </div>

              {/* Cohort and Age Category Filters */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-medium mb-2" style={{ color: 'var(--foreground-secondary)' }}>
                    Cohort:
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {(['all', 'male', 'female', 'inclusive'] as const).map((cohort) => (
                      <button
                        key={cohort}
                        onClick={() => setCohortFilter(cohort)}
                        className="rounded-lg px-3 py-1.5 text-xs font-medium transition capitalize"
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

                <div className="flex-1">
                  <label className="block text-xs font-medium mb-2" style={{ color: 'var(--foreground-secondary)' }}>
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
                        className="rounded-lg px-3 py-1.5 text-xs font-medium transition"
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
              </div>
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <p style={{ color: 'var(--foreground-secondary)' }}>Loading results...</p>
            </div>
          ) : sortedResults.length === 0 ? (
            <div className="p-8 text-center">
              <p style={{ color: 'var(--foreground-secondary)' }}>
                {results.length === 0 
                  ? `No climbers found with at least ${sendCount} send${sendCount !== '1' ? 's' : ''}.`
                  : 'No climbers match the current filters.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ backgroundColor: 'var(--background-secondary)' }}>
                    <th 
                      className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold cursor-pointer select-none transition-colors"
                      style={{ color: 'var(--foreground)' }}
                      onClick={() => handleSort('username')}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = 'var(--accent)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = 'var(--foreground)'
                      }}
                    >
                      <div className="flex items-center gap-1">
                        User Name
                        {sortField === 'username' && (
                          <span style={{ color: 'var(--accent)' }}>
                            {sortDirection === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold hidden sm:table-cell"
                      style={{ color: 'var(--foreground)' }}
                    >
                      Phone Number
                    </th>
                    <th 
                      className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold cursor-pointer select-none transition-colors"
                      style={{ color: 'var(--foreground)' }}
                      onClick={() => handleSort('send_count')}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = 'var(--accent)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = 'var(--foreground)'
                      }}
                    >
                      <div className="flex items-center gap-1">
                        Number of Sends
                        {sortField === 'send_count' && (
                          <span style={{ color: 'var(--accent)' }}>
                            {sortDirection === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold hidden md:table-cell cursor-pointer select-none transition-colors"
                      style={{ color: 'var(--foreground)' }}
                      onClick={() => handleSort('age_category')}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = 'var(--accent)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = 'var(--foreground)'
                      }}
                    >
                      <div className="flex items-center gap-1">
                        Age Group
                        {sortField === 'age_category' && (
                          <span style={{ color: 'var(--accent)' }}>
                            {sortDirection === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold hidden sm:table-cell cursor-pointer select-none transition-colors"
                      style={{ color: 'var(--foreground)' }}
                      onClick={() => handleSort('comp_cohort')}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = 'var(--accent)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = 'var(--foreground)'
                      }}
                    >
                      <div className="flex items-center gap-1">
                        Cohort
                        {sortField === 'comp_cohort' && (
                          <span style={{ color: 'var(--accent)' }}>
                            {sortDirection === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold hidden lg:table-cell cursor-pointer select-none transition-colors"
                      style={{ color: 'var(--foreground)' }}
                      onClick={() => handleSort('email')}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = 'var(--accent)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = 'var(--foreground)'
                      }}
                    >
                      <div className="flex items-center gap-1">
                        Email Address
                        {sortField === 'email' && (
                          <span style={{ color: 'var(--accent)' }}>
                            {sortDirection === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold cursor-pointer select-none transition-colors"
                      style={{ color: 'var(--foreground)' }}
                      onClick={() => handleSort('competitor_number')}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = 'var(--accent)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = 'var(--foreground)'
                      }}
                    >
                      <div className="flex items-center gap-1">
                        Climber #
                        {sortField === 'competitor_number' && (
                          <span style={{ color: 'var(--accent)' }}>
                            {sortDirection === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedResults.map((climber, index) => (
                    <tr
                      key={climber.profile_id}
                      style={{
                        borderBottomWidth: index < sortedResults.length - 1 ? '1px' : '0',
                        borderBottomColor: 'var(--card-border)',
                      }}
                    >
                      <td 
                        className="px-3 sm:px-6 py-3 sm:py-4"
                        style={{ color: 'var(--foreground-secondary)' }}
                      >
                        {climber.username || '-'}
                      </td>
                      <td 
                        className="px-3 sm:px-6 py-3 sm:py-4 hidden sm:table-cell"
                        style={{ color: 'var(--foreground-secondary)' }}
                      >
                        {climber.phone_number || '-'}
                      </td>
                      <td 
                        className="px-3 sm:px-6 py-3 sm:py-4"
                        style={{ color: 'var(--foreground)' }}
                      >
                        <span className="font-semibold">{climber.send_count}</span>
                      </td>
                      <td 
                        className="px-3 sm:px-6 py-3 sm:py-4 hidden md:table-cell"
                        style={{ color: 'var(--foreground-secondary)' }}
                      >
                        {climber.age_category || '-'}
                      </td>
                      <td 
                        className="px-3 sm:px-6 py-3 sm:py-4 hidden sm:table-cell"
                        style={{ color: 'var(--foreground-secondary)' }}
                      >
                        {climber.comp_cohort || '-'}
                      </td>
                      <td 
                        className="px-3 sm:px-6 py-3 sm:py-4 hidden lg:table-cell"
                        style={{ color: 'var(--foreground-secondary)' }}
                      >
                        {climber.email || '-'}
                      </td>
                      <td 
                        className="px-3 sm:px-6 py-3 sm:py-4"
                        style={{ color: 'var(--foreground-secondary)' }}
                      >
                        {climber.competitor_number || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </main>
  )
}
