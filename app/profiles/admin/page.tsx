'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import { useUser } from '../../../lib/useUser'
import { useRole } from '../../../lib/useRole'
import { Pagination } from '../../../components/Pagination'
import { validatePhoneNumber, validateProfileName } from '../../../lib/validation'
import { SuccessModal } from '../../../components/SuccessModal'

type Profile = {
  profile_id: string
  user_id: string
  username: string | null
  role: string
  created_at: string
  comp_cohort: string | null
  competitor_number: number
  age_category: string | null
  phone_number: string | null
}

type EditingField = {
  profileId: string
  field: string
  value: string | boolean | null
}

export default function AdminProfilesPage() {
  const router = useRouter()
  const { user, loading: userLoading } = useUser()
  const { role, loading: roleLoading } = useRole()
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [editing, setEditing] = useState<EditingField | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortField, setSortField] = useState<'competitor_number' | 'username' | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [showFilters, setShowFilters] = useState(false)
  const [roleFilter, setRoleFilter] = useState<'all' | 'climber' | 'setter' | 'admin'>('all')
  const [cohortFilter, setCohortFilter] = useState<'all' | 'male' | 'female' | 'inclusive'>('all')
  const [ageCategoryFilter, setAgeCategoryFilter] = useState<'all' | 'u18' | 'adult' | 'masters'>('all')
  const itemsPerPage = 25

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

  // Fetch all profiles
  useEffect(() => {
    if (role !== 'admin' || !user) return

    const fetchProfiles = async () => {
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false })

        if (error) throw error
        setProfiles(data || [])
      } catch (err: any) {
        console.error('Error fetching profiles:', err)
        setError(err.message || 'Failed to fetch profiles')
      } finally {
        setLoading(false)
      }
    }

    fetchProfiles()
  }, [role, user])

  const handleFieldUpdate = async (
    profileId: string,
    field: string,
    value: string | boolean | null
  ) => {
    if (!user || role !== 'admin') return

    // Validation
    if (field === 'username' && value !== null && value !== '') {
      const validation = validateProfileName(value as string)
      if (!validation.valid) {
        setError(validation.error || 'Invalid username')
        setTimeout(() => setError(null), 5000)
        setEditing(null)
        return
      }
    }

    if (field === 'phone_number' && value !== null && value !== '') {
      const validation = validatePhoneNumber(value as string)
      if (!validation.valid) {
        setError(validation.error || 'Invalid phone number')
        setTimeout(() => setError(null), 5000)
        setEditing(null)
        return
      }
    }

    try {
      setUpdating(profileId)
      setError(null)
      setSuccess(null)

      const updateData: any = { [field]: value }
      
      // Handle empty strings as null (for text fields)
      if (value === '') {
        updateData[field] = null
      }

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('profile_id', profileId)

      if (error) throw error

      // Update local state
      setProfiles(prev =>
        prev.map(p => 
          p.profile_id === profileId 
            ? { ...p, [field]: updateData[field] } 
            : p
        )
      )
      setSuccess(`${field.replace('_', ' ')} updated successfully`)
      setEditing(null)
    } catch (err: any) {
      console.error(`Error updating ${field}:`, err)
      setError(err.message || `Failed to update ${field}`)
      setTimeout(() => setError(null), 5000)
    } finally {
      setUpdating(null)
    }
  }


  const startEditing = (profileId: string, field: string, currentValue: string | boolean | null) => {
    setEditing({ profileId, field, value: currentValue })
  }

  const cancelEditing = () => {
    setEditing(null)
  }

  const handleInputChange = (value: string | boolean | null) => {
    if (editing) {
      setEditing({ ...editing, value })
    }
  }

  const handleInputBlur = () => {
    if (editing) {
      handleFieldUpdate(editing.profileId, editing.field, editing.value)
    }
  }

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      (e.currentTarget as HTMLElement).blur()
    } else if (e.key === 'Escape') {
      cancelEditing()
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Filter profiles based on search query and filters
  const filterProfiles = (profiles: Profile[], query: string): Profile[] => {
    let filtered = [...profiles]

    // Apply search query
    if (query.trim()) {
      const lowerQuery = query.toLowerCase()
      filtered = filtered.filter(profile => {
        return (
          (profile.username?.toLowerCase().includes(lowerQuery) ?? false) ||
          (profile.role?.toLowerCase().includes(lowerQuery) ?? false) ||
          (profile.comp_cohort?.toLowerCase().includes(lowerQuery) ?? false) ||
          (profile.age_category?.toLowerCase().includes(lowerQuery) ?? false) ||
          (profile.phone_number?.toLowerCase().includes(lowerQuery) ?? false) ||
          profile.competitor_number.toString().includes(lowerQuery)
        )
      })
    }

    // Apply role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter(profile => profile.role === roleFilter)
    }

    // Apply cohort filter
    if (cohortFilter !== 'all') {
      filtered = filtered.filter(profile => profile.comp_cohort?.toLowerCase() === cohortFilter.toLowerCase())
    }

    // Apply age category filter
    if (ageCategoryFilter !== 'all') {
      filtered = filtered.filter(profile => profile.age_category?.toLowerCase() === ageCategoryFilter.toLowerCase())
    }

    return filtered
  }

  // Sort profiles
  const sortProfiles = (profiles: Profile[], field: 'competitor_number' | 'username' | null, direction: 'asc' | 'desc'): Profile[] => {
    if (!field) return profiles

    return [...profiles].sort((a, b) => {
      let aValue: string | number
      let bValue: string | number

      if (field === 'competitor_number') {
        aValue = a.competitor_number
        bValue = b.competitor_number
      } else if (field === 'username') {
        aValue = (a.username || '').toLowerCase()
        bValue = (b.username || '').toLowerCase()
      } else {
        return 0
      }

      if (aValue < bValue) return direction === 'asc' ? -1 : 1
      if (aValue > bValue) return direction === 'asc' ? 1 : -1
      return 0
    })
  }

  // Handle sort toggle
  const handleSort = (field: 'competitor_number' | 'username') => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      // New field, default to ascending
      setSortField(field)
      setSortDirection('asc')
    }
    setCurrentPage(1) // Reset to first page when sorting
  }

  // Reset page when filters or search change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, roleFilter, cohortFilter, ageCategoryFilter])

  // Get filtered and sorted profiles
  const filteredProfiles = filterProfiles(profiles, searchQuery)
  const sortedProfiles = sortProfiles(filteredProfiles, sortField, sortDirection)

  if (userLoading || roleLoading || loading) {
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

  // Calculate pagination
  const totalPages = Math.ceil(sortedProfiles.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedProfiles = sortedProfiles.slice(startIndex, endIndex)
  const showingStart = sortedProfiles.length > 0 ? startIndex + 1 : 0
  const showingEnd = Math.min(endIndex, sortedProfiles.length)

  return (
    <main className="px-4 py-6 sm:px-6">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2" style={{ color: 'var(--foreground)' }}>
          Admin - Manage Profiles
        </h1>
        <p className="text-sm sm:text-base mb-4" style={{ color: 'var(--foreground-secondary)' }}>
          View and manage all user profiles. Click on any field to edit it.
        </p>
      </div>

      {/* Filters Section */}
      <div 
        className="mb-4 rounded-2xl overflow-hidden"
        style={{
          backgroundColor: 'var(--card-bg)',
          borderWidth: '1px',
          borderStyle: 'solid',
          borderColor: 'var(--card-border)',
        }}
      >
        {/* Filters Header */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="w-full px-4 py-3 flex items-center justify-between cursor-pointer transition"
          style={{
            backgroundColor: 'var(--background-secondary)',
            borderBottomWidth: showFilters ? '1px' : '0',
            borderBottomStyle: 'solid',
            borderBottomColor: 'var(--card-border)',
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--button-secondary-hover)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--background-secondary)'}
        >
          <div className="flex items-center gap-3">
            <svg
              className="transition-transform"
              style={{
                transform: showFilters ? 'rotate(90deg)' : 'rotate(0deg)',
                width: '20px',
                height: '20px',
                fill: 'var(--foreground-secondary)',
              }}
              viewBox="0 0 20 20"
            >
              <path d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" />
            </svg>
            <span className="font-medium" style={{ color: 'var(--foreground)' }}>
              Filters
            </span>
            {(() => {
              const activeFilters = [
                searchQuery.trim() !== '',
                roleFilter !== 'all',
                cohortFilter !== 'all',
                ageCategoryFilter !== 'all',
              ].filter(Boolean).length
              return activeFilters > 0 ? (
                <span 
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: 'var(--accent)',
                    color: 'var(--accent-text)',
                  }}
                >
                  {activeFilters}
                </span>
              ) : null
            })()}
          </div>
          <svg
            className="transition-transform"
            style={{
              transform: showFilters ? 'rotate(180deg)' : 'rotate(0deg)',
              width: '20px',
              height: '20px',
              fill: 'var(--foreground-secondary)',
            }}
            viewBox="0 0 20 20"
          >
            <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
          </svg>
        </button>

        {/* Filters Content */}
        {showFilters && (
          <div className="p-4">
            {/* Search Input */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground-secondary)' }}>
                Search
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search all fields..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="rounded-lg px-4 py-2.5 pr-10 text-sm outline-none w-full transition-all duration-150"
                  style={{
                    backgroundColor: 'var(--input-bg)',
                    color: 'var(--foreground)',
                    borderWidth: '1px',
                    borderStyle: 'solid',
                    borderColor: 'var(--input-border)',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'var(--accent)'
                    e.currentTarget.style.boxShadow = `0 0 0 2px var(--accent)`
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'var(--input-border)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-sm px-2 py-1 rounded transition-colors"
                    style={{
                      color: 'var(--foreground-secondary)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = 'var(--foreground)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'var(--foreground-secondary)'
                    }}
                    title="Clear search"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Role Filter */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground-secondary)' }}>
                  Role
                </label>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value as 'all' | 'climber' | 'setter' | 'admin')}
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none transition-all duration-150"
                  style={{
                    backgroundColor: 'var(--input-bg)',
                    color: 'var(--foreground)',
                    borderWidth: '1px',
                    borderStyle: 'solid',
                    borderColor: 'var(--input-border)',
                    cursor: 'pointer',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'var(--accent)'
                    e.currentTarget.style.boxShadow = `0 0 0 2px var(--accent)`
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'var(--input-border)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  <option value="all">All Roles</option>
                  <option value="climber">Climber</option>
                  <option value="setter">Setter</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {/* Cohort Filter */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground-secondary)' }}>
                  Cohort
                </label>
                <select
                  value={cohortFilter}
                  onChange={(e) => setCohortFilter(e.target.value as 'all' | 'male' | 'female' | 'inclusive')}
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none transition-all duration-150"
                  style={{
                    backgroundColor: 'var(--input-bg)',
                    color: 'var(--foreground)',
                    borderWidth: '1px',
                    borderStyle: 'solid',
                    borderColor: 'var(--input-border)',
                    cursor: 'pointer',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'var(--accent)'
                    e.currentTarget.style.boxShadow = `0 0 0 2px var(--accent)`
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'var(--input-border)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  <option value="all">All Cohorts</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="inclusive">Inclusive</option>
                </select>
              </div>

              {/* Age Category Filter */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground-secondary)' }}>
                  Age Category
                </label>
                <select
                  value={ageCategoryFilter}
                  onChange={(e) => setAgeCategoryFilter(e.target.value as 'all' | 'u18' | 'adult' | 'masters')}
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none transition-all duration-150"
                  style={{
                    backgroundColor: 'var(--input-bg)',
                    color: 'var(--foreground)',
                    borderWidth: '1px',
                    borderStyle: 'solid',
                    borderColor: 'var(--input-border)',
                    cursor: 'pointer',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'var(--accent)'
                    e.currentTarget.style.boxShadow = `0 0 0 2px var(--accent)`
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'var(--input-border)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  <option value="all">All Ages</option>
                  <option value="u18">U18</option>
                  <option value="adult">Adult</option>
                  <option value="masters">Masters</option>
                </select>
              </div>

            </div>

            {/* Clear Filters Button */}
            <div className="pt-4 mt-4 border-t" style={{ borderColor: 'var(--border)' }}>
              <button
                onClick={() => {
                  setSearchQuery('')
                  setRoleFilter('all')
                  setCohortFilter('all')
                  setAgeCategoryFilter('all')
                }}
                className="rounded-lg px-4 py-2 text-sm font-medium transition"
                style={{
                  backgroundColor: 'var(--button-secondary-bg)',
                  color: 'var(--button-secondary-text)',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  borderColor: 'var(--border)',
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--button-secondary-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--button-secondary-bg)'}
              >
                Clear filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-4">
          <div 
            className="rounded-lg px-4 py-3 text-sm"
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              color: '#ef4444',
              borderWidth: '1px',
              borderStyle: 'solid',
              borderColor: 'rgba(239, 68, 68, 0.2)',
              animation: 'fadeIn 0.2s ease-in-out'
            }}
          >
            {error}
          </div>
        </div>
      )}

      {/* Success Modal */}
      <SuccessModal
        isOpen={!!success}
        onClose={() => setSuccess(null)}
        message={success || ''}
        duration={2000}
      />

      {profiles.length === 0 ? (
        <div 
          className="rounded-2xl p-8 text-center"
          style={{
            backgroundColor: 'var(--card-bg)',
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: 'var(--card-border)',
          }}
        >
          <p style={{ color: 'var(--foreground-secondary)' }}>No profiles found</p>
        </div>
      ) : sortedProfiles.length === 0 ? (
        <div 
          className="rounded-2xl p-8 text-center"
          style={{
            backgroundColor: 'var(--card-bg)',
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: 'var(--card-border)',
          }}
        >
          <p style={{ color: 'var(--foreground-secondary)' }}>
            No profiles match your search "{searchQuery}"
          </p>
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
                <tr style={{ borderBottomWidth: '1px', borderBottomColor: 'var(--card-border)' }}>
                  <th 
                    className="px-2 sm:px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider cursor-pointer select-none transition-colors" 
                    style={{ color: 'var(--foreground-secondary)' }}
                    onClick={() => handleSort('competitor_number')}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = 'var(--accent)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'var(--foreground-secondary)'
                    }}
                  >
                    <div className="flex items-center gap-1">
                      #
                      {sortField === 'competitor_number' && (
                        <span style={{ color: 'var(--accent)' }}>
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-2 sm:px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider hidden sm:table-cell cursor-pointer select-none transition-colors" 
                    style={{ color: 'var(--foreground-secondary)' }}
                    onClick={() => handleSort('username')}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = 'var(--accent)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'var(--foreground-secondary)'
                    }}
                  >
                    <div className="flex items-center gap-1">
                      Username
                      {sortField === 'username' && (
                        <span style={{ color: 'var(--accent)' }}>
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th className="px-2 sm:px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--foreground-secondary)' }}>
                    Role
                  </th>
                  <th className="px-2 sm:px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider hidden md:table-cell" style={{ color: 'var(--foreground-secondary)' }}>
                    Cohort
                  </th>
                  <th className="px-2 sm:px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider hidden lg:table-cell" style={{ color: 'var(--foreground-secondary)' }}>
                    Age
                  </th>
                  <th className="px-2 sm:px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider hidden xl:table-cell" style={{ color: 'var(--foreground-secondary)' }}>
                    Phone
                  </th>
                  <th className="px-2 sm:px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider hidden xl:table-cell" style={{ color: 'var(--foreground-secondary)' }}>
                    Created
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedProfiles.map((profile) => (
                  <tr 
                    key={profile.profile_id}
                    style={{ 
                      borderBottomWidth: '1px', 
                      borderBottomColor: 'var(--card-border)',
                    }}
                    className="hover:bg-opacity-50"
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--button-secondary-hover)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent'
                    }}
                  >
                    <td className="px-2 sm:px-4 py-3 text-xs sm:text-sm" style={{ color: 'var(--foreground)' }}>
                      {profile.competitor_number}
                    </td>
                    <td className="px-2 sm:px-4 py-3 text-xs sm:text-sm hidden sm:table-cell" style={{ color: 'var(--foreground)' }}>
                      <div className="h-[24px] flex items-center">
                        {editing?.profileId === profile.profile_id && editing?.field === 'username' ? (
                          <input
                            type="text"
                            value={editing.value as string || ''}
                            onChange={(e) => handleInputChange(e.target.value)}
                            onBlur={handleInputBlur}
                            onKeyDown={handleInputKeyDown}
                            autoFocus
                            className="rounded-lg px-2 py-1 text-sm outline-none w-full max-w-[200px] h-[24px] transition-all duration-150"
                            style={{
                              backgroundColor: 'var(--input-bg)',
                              color: 'var(--foreground)',
                              borderWidth: '1px',
                              borderStyle: 'solid',
                              borderColor: 'var(--accent)',
                            }}
                          />
                        ) : (
                          <span
                            onClick={() => startEditing(profile.profile_id, 'username', profile.username)}
                            className="cursor-pointer hover:underline transition-opacity duration-150"
                            title="Click to edit"
                          >
                            {profile.username || '-'}
                          </span>
                        )}
                      </div>
                    </td>
                    <td 
                      className="px-2 sm:px-4 py-3 text-xs sm:text-sm"
                      style={editing?.profileId === profile.profile_id && editing?.field === 'role' ? { position: 'relative', zIndex: 1000, overflow: 'visible' } : {}}
                    >
                      <div className="h-[24px] flex items-center">
                        {editing?.profileId === profile.profile_id && editing?.field === 'role' ? (
                          <select
                            value={editing.value as string || ''}
                            onChange={(e) => handleInputChange(e.target.value)}
                            onBlur={handleInputBlur}
                            onKeyDown={handleInputKeyDown}
                            autoFocus
                            className="rounded-lg px-2 py-1 text-sm outline-none h-[24px] transition-all duration-150"
                            style={{
                              backgroundColor: 'var(--input-bg)',
                              color: 'var(--foreground)',
                              borderWidth: '1px',
                              borderStyle: 'solid',
                              borderColor: 'var(--accent)',
                              cursor: 'pointer',
                              position: 'relative',
                              zIndex: 1001,
                            }}
                          >
                            <option value="climber">Climber</option>
                            <option value="setter">Setter</option>
                            <option value="admin">Admin</option>
                          </select>
                        ) : (
                          <span
                            onClick={() => startEditing(profile.profile_id, 'role', profile.role)}
                            className="cursor-pointer hover:underline transition-opacity duration-150 capitalize"
                            title="Click to edit"
                          >
                            {profile.role}
                          </span>
                        )}
                      </div>
                    </td>
                    <td 
                      className="px-2 sm:px-4 py-3 text-xs sm:text-sm hidden md:table-cell" 
                      style={{
                        color: 'var(--foreground)',
                        ...(editing?.profileId === profile.profile_id && editing?.field === 'comp_cohort' ? { position: 'relative', zIndex: 1000, overflow: 'visible' } : {})
                      }}
                    >
                      <div className="h-[24px] flex items-center">
                        {editing?.profileId === profile.profile_id && editing?.field === 'comp_cohort' ? (
                          <select
                            value={editing.value as string || ''}
                            onChange={(e) => handleInputChange(e.target.value)}
                            onBlur={handleInputBlur}
                            onKeyDown={handleInputKeyDown}
                            autoFocus
                            className="rounded-lg px-2 py-1 text-sm outline-none h-[24px] transition-all duration-150"
                            style={{
                              backgroundColor: 'var(--input-bg)',
                              color: 'var(--foreground)',
                              borderWidth: '1px',
                              borderStyle: 'solid',
                              borderColor: 'var(--accent)',
                              cursor: 'pointer',
                              position: 'relative',
                              zIndex: 1001,
                            }}
                          >
                            <option value="">-</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="inclusive">Inclusive</option>
                          </select>
                        ) : (
                          <span
                            onClick={() => startEditing(profile.profile_id, 'comp_cohort', profile.comp_cohort)}
                            className="cursor-pointer hover:underline transition-opacity duration-150"
                            title="Click to edit"
                          >
                            {profile.comp_cohort || '-'}
                          </span>
                        )}
                      </div>
                    </td>
                    <td 
                      className="px-2 sm:px-4 py-3 text-xs sm:text-sm hidden lg:table-cell" 
                      style={{
                        color: 'var(--foreground)',
                        ...(editing?.profileId === profile.profile_id && editing?.field === 'age_category' ? { position: 'relative', zIndex: 1000, overflow: 'visible' } : {})
                      }}
                    >
                      <div className="h-[24px] flex items-center">
                        {editing?.profileId === profile.profile_id && editing?.field === 'age_category' ? (
                          <select
                            value={editing.value as string || ''}
                            onChange={(e) => handleInputChange(e.target.value)}
                            onBlur={handleInputBlur}
                            onKeyDown={handleInputKeyDown}
                            autoFocus
                            className="rounded-lg px-2 py-1 text-sm outline-none h-[24px] transition-all duration-150"
                            style={{
                              backgroundColor: 'var(--input-bg)',
                              color: 'var(--foreground)',
                              borderWidth: '1px',
                              borderStyle: 'solid',
                              borderColor: 'var(--accent)',
                              cursor: 'pointer',
                              position: 'relative',
                              zIndex: 1001,
                            }}
                          >
                            <option value="">-</option>
                            <option value="u18">U18</option>
                            <option value="adult">Adult</option>
                            <option value="masters">Masters</option>
                          </select>
                        ) : (
                          <span
                            onClick={() => startEditing(profile.profile_id, 'age_category', profile.age_category)}
                            className="cursor-pointer hover:underline transition-opacity duration-150"
                            title="Click to edit"
                          >
                            {profile.age_category || '-'}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-2 sm:px-4 py-3 text-xs sm:text-sm hidden xl:table-cell" style={{ color: 'var(--foreground)' }}>
                      <div className="h-[24px] flex items-center">
                        {editing?.profileId === profile.profile_id && editing?.field === 'phone_number' ? (
                          <input
                            type="tel"
                            value={editing.value as string || ''}
                            onChange={(e) => handleInputChange(e.target.value)}
                            onBlur={handleInputBlur}
                            onKeyDown={handleInputKeyDown}
                            autoFocus
                            className="rounded-lg px-2 py-1 text-sm outline-none w-full max-w-[150px] h-[24px] transition-all duration-150"
                            style={{
                              backgroundColor: 'var(--input-bg)',
                              color: 'var(--foreground)',
                              borderWidth: '1px',
                              borderStyle: 'solid',
                              borderColor: 'var(--accent)',
                            }}
                          />
                        ) : (
                          <span
                            onClick={() => startEditing(profile.profile_id, 'phone_number', profile.phone_number)}
                            className="cursor-pointer hover:underline transition-opacity duration-150"
                            title="Click to edit"
                          >
                            {profile.phone_number || '-'}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-2 sm:px-4 py-3 text-xs sm:text-sm hidden xl:table-cell" style={{ color: 'var(--foreground-secondary)' }}>
                      {formatDate(profile.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Results count and Pagination */}
          <div className="px-4 py-3 flex flex-col sm:flex-row justify-between items-center gap-2" style={{ borderTopWidth: '1px', borderTopColor: 'var(--card-border)' }}>
            <p className="text-xs sm:text-sm" style={{ color: 'var(--foreground-secondary)' }}>
              Showing {showingStart}-{showingEnd} of {sortedProfiles.length} profile{sortedProfiles.length !== 1 ? 's' : ''}
              {searchQuery && ` (filtered from ${profiles.length} total)`}
            </p>
            {totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                itemsPerPage={itemsPerPage}
                totalItems={sortedProfiles.length}
                showingStart={showingStart}
                showingEnd={showingEnd}
              />
            )}
          </div>
        </div>
      )}
    </main>
  )
}

