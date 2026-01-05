'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import { useUser } from '../../../lib/useUser'
import { useRole } from '../../../lib/useRole'
import { Pagination } from '../../../components/Pagination'
import { SuccessModal } from '../../../components/SuccessModal'

type Climb = {
  id: string
  sector_tag_id: number
  wall: number
  hold_colour_id: number
  tag_colour_id: number
  photo: string | null
  created_at: string
  wall_name?: string
  hold_colour_name?: string
  tag_colour_name?: string
}

type Wall = {
  id: number
  name: string
}

type Colour = {
  id: number
  name: string
  hex_code: string | null
  usage?: 'hold' | 'tag' | 'both'
}

type EditingField = {
  climbId: string
  field: string
  value: string | number | null
}

export default function AdminClimbsPage() {
  const router = useRouter()
  const { user, loading: userLoading } = useUser()
  const { role, loading: roleLoading } = useRole()
  const [climbs, setClimbs] = useState<Climb[]>([])
  const [walls, setWalls] = useState<Wall[]>([])
  const [colours, setColours] = useState<Colour[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [editing, setEditing] = useState<EditingField | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortField, setSortField] = useState<'sector_tag_id' | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [showFilters, setShowFilters] = useState(false)
  const [wallFilter, setWallFilter] = useState<number | 'all'>('all')
  const [holdColourFilter, setHoldColourFilter] = useState<number | 'all'>('all')
  const [tagColourFilter, setTagColourFilter] = useState<number | 'all'>('all')
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

  // Fetch all climbs, walls, and colours
  useEffect(() => {
    if (role !== 'admin' || !user) return

    const fetchData = async () => {
      try {
        setLoading(true)
        
        // Fetch climbs with related data
        const { data: climbsData, error: climbsError } = await supabase
          .from('climbs')
          .select(`
            id,
            sector_tag_id,
            wall,
            hold_colour_id,
            tag_colour_id,
            photo,
            created_at,
            walls!wall(id, name),
            hold_colour:colours!hold_colour_id(id, name),
            tag_colour:colours!tag_colour_id(id, name)
          `)
          .order('created_at', { ascending: false })

        if (climbsError) throw climbsError

        // Transform the data
        const transformedClimbs = (climbsData || []).map((climb: any) => ({
          id: climb.id,
          sector_tag_id: climb.sector_tag_id,
          wall: climb.wall,
          hold_colour_id: climb.hold_colour_id,
          tag_colour_id: climb.tag_colour_id,
          photo: climb.photo,
          created_at: climb.created_at,
          wall_name: climb.walls?.name || '-',
          hold_colour_name: climb.hold_colour?.name || '-',
          tag_colour_name: climb.tag_colour?.name || '-',
        }))

        setClimbs(transformedClimbs)

        // Fetch walls and colours for dropdowns
        const [{ data: wallData }, { data: colourData }] = await Promise.all([
          supabase.from('walls').select('id, name').order('name'),
          supabase.from('colours').select('id, name, hex_code, usage').order('name'),
        ])

        setWalls(wallData || [])
        setColours(colourData || [])
      } catch (err: any) {
        console.error('Error fetching data:', err)
        setError(err.message || 'Failed to fetch climbs')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [role, user])

  const handleFieldUpdate = async (
    climbId: string,
    field: string,
    value: string | number | null
  ) => {
    if (!user || role !== 'admin') return

    try {
      setUpdating(climbId)
      setError(null)
      setSuccess(null)

      const updateData: any = { [field]: value }
      
      // Convert to numbers for ID fields
      if (field === 'wall' || field === 'hold_colour_id' || field === 'tag_colour_id' || field === 'sector_tag_id') {
        updateData[field] = value ? Number(value) : null
      }

      const { error } = await supabase
        .from('climbs')
        .update(updateData)
        .eq('id', climbId)

      if (error) throw error

      // Update local state
      const updatedClimbs = await supabase
        .from('climbs')
        .select(`
          id,
          sector_tag_id,
          wall,
          hold_colour_id,
          tag_colour_id,
          photo,
          created_at,
          walls!wall(id, name),
          hold_colour:colours!hold_colour_id(id, name),
          tag_colour:colours!tag_colour_id(id, name)
        `)
        .eq('id', climbId)
        .single()

      if (updatedClimbs.data) {
        const updated = updatedClimbs.data as any
        setClimbs(prev =>
          prev.map(c => 
            c.id === climbId 
              ? {
                  ...c,
                  [field]: field === 'wall' || field === 'hold_colour_id' || field === 'tag_colour_id' || field === 'sector_tag_id'
                    ? Number(value) 
                    : value,
                  wall_name: field === 'wall' ? (updated.walls?.name || '-') : c.wall_name,
                  hold_colour_name: field === 'hold_colour_id' ? (updated.hold_colour?.name || '-') : c.hold_colour_name,
                  tag_colour_name: field === 'tag_colour_id' ? (updated.tag_colour?.name || '-') : c.tag_colour_name,
                }
              : c
          )
        )
      }

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

  const startEditing = (climbId: string, field: string, currentValue: string | number | null) => {
    setEditing({ climbId, field, value: currentValue })
  }

  const cancelEditing = () => {
    setEditing(null)
  }

  const handleInputChange = (value: string | number | null) => {
    if (editing) {
      setEditing({ ...editing, value })
    }
  }

  const handleInputBlur = () => {
    if (editing) {
      handleFieldUpdate(editing.climbId, editing.field, editing.value)
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

  // Filter climbs based on search query and filters
  const filterClimbs = (climbs: Climb[], query: string): Climb[] => {
    let filtered = [...climbs]

    // Apply search query
    if (query.trim()) {
      const lowerQuery = query.toLowerCase()
      filtered = filtered.filter(climb => {
        return (
          climb.sector_tag_id.toString().includes(lowerQuery) ||
          (climb.wall_name?.toLowerCase().includes(lowerQuery) ?? false) ||
          (climb.hold_colour_name?.toLowerCase().includes(lowerQuery) ?? false) ||
          (climb.tag_colour_name?.toLowerCase().includes(lowerQuery) ?? false)
        )
      })
    }

    // Apply wall filter
    if (wallFilter !== 'all') {
      filtered = filtered.filter(climb => climb.wall === wallFilter)
    }

    // Apply hold colour filter
    if (holdColourFilter !== 'all') {
      filtered = filtered.filter(climb => climb.hold_colour_id === holdColourFilter)
    }

    // Apply tag colour filter
    if (tagColourFilter !== 'all') {
      filtered = filtered.filter(climb => climb.tag_colour_id === tagColourFilter)
    }

    return filtered
  }

  // Sort climbs
  const sortClimbs = (climbs: Climb[], field: 'sector_tag_id' | null, direction: 'asc' | 'desc'): Climb[] => {
    if (!field) return climbs

    return [...climbs].sort((a, b) => {
      let aValue: number
      let bValue: number

      if (field === 'sector_tag_id') {
        aValue = a.sector_tag_id
        bValue = b.sector_tag_id
      } else {
        return 0
      }

      if (aValue < bValue) return direction === 'asc' ? -1 : 1
      if (aValue > bValue) return direction === 'asc' ? 1 : -1
      return 0
    })
  }

  // Handle sort toggle
  const handleSort = (field: 'sector_tag_id') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
    setCurrentPage(1)
  }

  // Reset page when filters or search change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, wallFilter, holdColourFilter, tagColourFilter])

  // Get filtered and sorted climbs
  const filteredClimbs = filterClimbs(climbs, searchQuery)
  const sortedClimbs = sortClimbs(filteredClimbs, sortField, sortDirection)

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
  const totalPages = Math.ceil(sortedClimbs.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedClimbs = sortedClimbs.slice(startIndex, endIndex)
  const showingStart = sortedClimbs.length > 0 ? startIndex + 1 : 0
  const showingEnd = Math.min(endIndex, sortedClimbs.length)

  return (
    <main className="px-4 py-6 sm:px-6">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2" style={{ color: 'var(--foreground)' }}>
          Admin - Manage Climbs
        </h1>
        <p className="text-sm sm:text-base mb-4" style={{ color: 'var(--foreground-secondary)' }}>
          View and manage all climbs. Click on any field to edit it.
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
                wallFilter !== 'all',
                holdColourFilter !== 'all',
                tagColourFilter !== 'all',
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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Wall Filter */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground-secondary)' }}>
                  Wall
                </label>
                <select
                  value={wallFilter}
                  onChange={(e) => setWallFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
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
                  <option value="all">All Walls</option>
                  {walls.map(wall => (
                    <option key={wall.id} value={wall.id}>{wall.name}</option>
                  ))}
                </select>
              </div>

              {/* Hold Colour Filter */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground-secondary)' }}>
                  Hold Colour
                </label>
                <select
                  value={holdColourFilter}
                  onChange={(e) => setHoldColourFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
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
                  <option value="all">All Hold Colours</option>
                  {colours.filter(c => c.usage === 'hold' || c.usage === 'both').map(colour => (
                    <option key={colour.id} value={colour.id}>{colour.name}</option>
                  ))}
                </select>
              </div>

              {/* Tag Colour Filter */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground-secondary)' }}>
                  Tag Colour
                </label>
                <select
                  value={tagColourFilter}
                  onChange={(e) => setTagColourFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
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
                  <option value="all">All Tag Colours</option>
                  {colours.filter(c => c.usage === 'tag' || c.usage === 'both').map(colour => (
                    <option key={colour.id} value={colour.id}>{colour.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Clear Filters Button */}
            <div className="pt-4 mt-4 border-t" style={{ borderColor: 'var(--border)' }}>
              <button
                onClick={() => {
                  setSearchQuery('')
                  setWallFilter('all')
                  setHoldColourFilter('all')
                  setTagColourFilter('all')
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

      {climbs.length === 0 ? (
        <div 
          className="rounded-2xl p-8 text-center"
          style={{
            backgroundColor: 'var(--card-bg)',
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: 'var(--card-border)',
          }}
        >
          <p style={{ color: 'var(--foreground-secondary)' }}>No climbs found</p>
        </div>
      ) : sortedClimbs.length === 0 ? (
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
            No climbs match your search "{searchQuery}"
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
                    onClick={() => handleSort('sector_tag_id')}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = 'var(--accent)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'var(--foreground-secondary)'
                    }}
                  >
                    <div className="flex items-center gap-1">
                      #
                      {sortField === 'sector_tag_id' && (
                        <span style={{ color: 'var(--accent)' }}>
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th className="px-2 sm:px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--foreground-secondary)' }}>
                    Wall
                  </th>
                  <th className="px-2 sm:px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--foreground-secondary)' }}>
                    Hold Colour
                  </th>
                  <th className="px-2 sm:px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--foreground-secondary)' }}>
                    Tag Colour
                  </th>
                  <th className="px-2 sm:px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider hidden xl:table-cell" style={{ color: 'var(--foreground-secondary)' }}>
                    Created
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedClimbs.map((climb) => (
                  <tr 
                    key={climb.id}
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
                    <td 
                      className="px-2 sm:px-4 py-3 text-xs sm:text-sm"
                      style={{
                        ...(editing?.climbId === climb.id && editing?.field === 'sector_tag_id' ? { position: 'relative', zIndex: 1000, overflow: 'visible' } : {})
                      }}
                    >
                      <div className="h-[24px] flex items-center">
                        {editing?.climbId === climb.id && editing?.field === 'sector_tag_id' ? (
                          <input
                            type="number"
                            value={editing.value as number || ''}
                            onChange={(e) => handleInputChange(e.target.value ? Number(e.target.value) : null)}
                            onBlur={handleInputBlur}
                            onKeyDown={handleInputKeyDown}
                            autoFocus
                            className="rounded-lg px-2 py-1 text-sm outline-none w-full max-w-[100px] h-[24px] transition-all duration-150"
                            style={{
                              backgroundColor: 'var(--input-bg)',
                              color: 'var(--foreground)',
                              borderWidth: '1px',
                              borderStyle: 'solid',
                              borderColor: 'var(--accent)',
                            }}
                            min="1"
                            step="1"
                          />
                        ) : (
                          <span
                            onClick={() => startEditing(climb.id, 'sector_tag_id', climb.sector_tag_id)}
                            className="cursor-pointer hover:underline transition-opacity duration-150"
                            title="Click to edit"
                          >
                            {climb.sector_tag_id}
                          </span>
                        )}
                      </div>
                    </td>
                    <td 
                      className="px-2 sm:px-4 py-3 text-xs sm:text-sm"
                      style={{
                        ...(editing?.climbId === climb.id && editing?.field === 'wall' ? { position: 'relative', zIndex: 1000, overflow: 'visible' } : {})
                      }}
                    >
                      <div className="h-[24px] flex items-center">
                        {editing?.climbId === climb.id && editing?.field === 'wall' ? (
                          <select
                            value={editing.value as number || ''}
                            onChange={(e) => handleInputChange(e.target.value ? Number(e.target.value) : null)}
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
                            {walls.map(wall => (
                              <option key={wall.id} value={wall.id}>{wall.name}</option>
                            ))}
                          </select>
                        ) : (
                          <span
                            onClick={() => startEditing(climb.id, 'wall', climb.wall)}
                            className="cursor-pointer hover:underline transition-opacity duration-150"
                            title="Click to edit"
                          >
                            {climb.wall_name}
                          </span>
                        )}
                      </div>
                    </td>
                    <td 
                      className="px-2 sm:px-4 py-3 text-xs sm:text-sm"
                      style={{
                        ...(editing?.climbId === climb.id && editing?.field === 'hold_colour_id' ? { position: 'relative', zIndex: 1000, overflow: 'visible' } : {})
                      }}
                    >
                      <div className="h-[24px] flex items-center">
                        {editing?.climbId === climb.id && editing?.field === 'hold_colour_id' ? (
                          <select
                            value={editing.value as number || ''}
                            onChange={(e) => handleInputChange(e.target.value ? Number(e.target.value) : null)}
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
                            {colours.filter(c => c.usage === 'hold' || c.usage === 'both').map(colour => (
                              <option key={colour.id} value={colour.id}>{colour.name}</option>
                            ))}
                          </select>
                        ) : (
                          <span
                            onClick={() => startEditing(climb.id, 'hold_colour_id', climb.hold_colour_id)}
                            className="cursor-pointer hover:underline transition-opacity duration-150"
                            title="Click to edit"
                          >
                            {climb.hold_colour_name}
                          </span>
                        )}
                      </div>
                    </td>
                    <td 
                      className="px-2 sm:px-4 py-3 text-xs sm:text-sm"
                      style={{
                        ...(editing?.climbId === climb.id && editing?.field === 'tag_colour_id' ? { position: 'relative', zIndex: 1000, overflow: 'visible' } : {})
                      }}
                    >
                      <div className="h-[24px] flex items-center">
                        {editing?.climbId === climb.id && editing?.field === 'tag_colour_id' ? (
                          <select
                            value={editing.value as number || ''}
                            onChange={(e) => handleInputChange(e.target.value ? Number(e.target.value) : null)}
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
                            {colours.filter(c => c.usage === 'tag' || c.usage === 'both').map(colour => (
                              <option key={colour.id} value={colour.id}>{colour.name}</option>
                            ))}
                          </select>
                        ) : (
                          <span
                            onClick={() => startEditing(climb.id, 'tag_colour_id', climb.tag_colour_id)}
                            className="cursor-pointer hover:underline transition-opacity duration-150"
                            title="Click to edit"
                          >
                            {climb.tag_colour_name}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-2 sm:px-4 py-3 text-xs sm:text-sm hidden xl:table-cell" style={{ color: 'var(--foreground-secondary)' }}>
                      {formatDate(climb.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Results count and Pagination */}
          <div className="px-4 py-3 flex flex-col sm:flex-row justify-between items-center gap-2" style={{ borderTopWidth: '1px', borderTopColor: 'var(--card-border)' }}>
            <p className="text-xs sm:text-sm" style={{ color: 'var(--foreground-secondary)' }}>
              Showing {showingStart}-{showingEnd} of {sortedClimbs.length} climb{sortedClimbs.length !== 1 ? 's' : ''}
              {searchQuery && ` (filtered from ${climbs.length} total)`}
            </p>
            {totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                itemsPerPage={itemsPerPage}
                totalItems={sortedClimbs.length}
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

