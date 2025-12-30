
// -----------------------------
// 6. Climbs page
// -----------------------------
// app/climbs/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { useUser } from '../../lib/useUser'
import { ImageModal } from '../../components/ImageModal'

type Wall = {
  id: number
  name: string
}

type Colour = {
  id: number
  name: string
  hex_code: string | null
  usage?: 'hold' | 'tag' | 'both'
  sort_order?: number | null
}

export default function ClimbsPage() {
  const { user, loading } = useUser()
  const [climbs, setClimbs] = useState<any[]>([])
  const [filteredClimbs, setFilteredClimbs] = useState<any[]>([])
  const [walls, setWalls] = useState<Wall[]>([])
  const [colours, setColours] = useState<Colour[]>([])
  const [userRole, setUserRole] = useState<string | null>(null)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  
  // Filter states
  const [showFilters, setShowFilters] = useState(false) // Closed by default
  const [showPhotos, setShowPhotos] = useState(true)
  const [selectedWall, setSelectedWall] = useState<string>('all')
  const [selectedHoldColour, setSelectedHoldColour] = useState<string>('all')
  const [selectedTagColour, setSelectedTagColour] = useState<string>('all')
  const [sentFilter, setSentFilter] = useState<'all' | 'sent' | 'unsent'>('all')

  useEffect(() => {
    if (!user) return
    
    // Fetch all climbs
    Promise.all([
      supabase
        .from('climbs')
        .select(`
          id,
          sector_tag_id,
          photo,
          hold_colour:colours!hold_colour_id (
            id,
            name,
            hex_code
          ),
          wall:walls!wall (
            id,
            name
          ),
          tag_colour:colours!tag_colour_id (
            id,
            name,
            hex_code
          )
        `)
        .order('sector_tag_id', { ascending: true }),
      // Fetch current user's ascents separately
      supabase
        .from('ascents')
        .select('id, climb_id, sent, user_id')
        .eq('user_id', user.id)
    ]).then(([{ data: climbsData }, { data: userAscents }]) => {
      // Merge ascents into climbs, filtering to only show current user's ascents
      const climbsWithUserAscents = (climbsData || []).map(climb => ({
        ...climb,
        ascents: (userAscents || []).filter(ascent => ascent.climb_id === climb.id)
      }))
      setClimbs(climbsWithUserAscents)
    })
    
    // Fetch user role
    supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => setUserRole(data?.role ?? null))
    
    // Fetch walls and colours for filters
    Promise.all([
      supabase.from('walls').select('id, name').order('name'),
      supabase.from('colours').select('id, name, hex_code, usage, sort_order').order('name')
    ]).then(([{ data: wallData }, { data: colourData }]) => {
      setWalls(wallData ?? [])
      setColours(colourData ?? [])
    })

  }, [user])

  // Apply filters whenever climbs or filter settings change
  useEffect(() => {
    let filtered = [...climbs]

    // Filter by wall
    if (selectedWall !== 'all') {
      filtered = filtered.filter(climb => String(climb.wall.id) === selectedWall)
    }

    // Filter by hold colour
    if (selectedHoldColour !== 'all') {
      filtered = filtered.filter(climb => String(climb.hold_colour.id) === selectedHoldColour)
    }

    // Filter by tag colour
    if (selectedTagColour !== 'all') {
      filtered = filtered.filter(climb => String(climb.tag_colour.id) === selectedTagColour)
    }

    // Filter by sent status
    if (sentFilter === 'sent') {
      filtered = filtered.filter(climb => climb.ascents?.[0]?.sent)
    } else if (sentFilter === 'unsent') {
      filtered = filtered.filter(climb => !climb.ascents?.[0]?.sent)
    }

    setFilteredClimbs(filtered)
  }, [climbs, selectedWall, selectedHoldColour, selectedTagColour, sentFilter])

  // Group climbs by wall and sort by sector_tag_id
  const groupedClimbs = filteredClimbs.reduce((acc, climb) => {
    const wallId = climb.wall.id
    if (!acc[wallId]) {
      acc[wallId] = {
        wall: climb.wall,
        climbs: []
      }
    }
    acc[wallId].climbs.push(climb)
    return acc
  }, {} as Record<number, { wall: any, climbs: any[] }>)

  // Sort climbs within each wall group by sector_tag_id
  const wallGroups: Array<{ wall: any, climbs: any[] }> = (Object.values(groupedClimbs) as Array<{ wall: any, climbs: any[] }>).map((group) => {
    const sortedClimbs = [...group.climbs].sort((a, b) => {
      // Sort by sector_tag_id if available, otherwise by id
      const aTag = a.sector_tag_id ?? a.id
      const bTag = b.sector_tag_id ?? b.id
      
      // Handle string comparison
      if (typeof aTag === 'string' && typeof bTag === 'string') {
        return aTag.localeCompare(bTag, undefined, { numeric: true, sensitivity: 'base' })
      }
      
      // Handle numeric comparison
      if (typeof aTag === 'number' && typeof bTag === 'number') {
        return aTag - bTag
      }
      
      // Handle mixed types: convert both to strings for consistent comparison
      // This prevents NaN issues when mixing strings and numbers
      const aStr = String(aTag)
      const bStr = String(bTag)
      return aStr.localeCompare(bStr, undefined, { numeric: true, sensitivity: 'base' })
    })
    return {
      wall: group.wall,
      climbs: sortedClimbs
    }
  })

  if (!user) return <p>Loading…</p>

  return (
    <main style={{ padding: 32 }}>
      <h2 className="text-2xl font-semibold mb-6" style={{ color: 'var(--foreground)' }}>
        Climbs
      </h2>
      
      {/* Filters Section */}
      <div 
        className="mb-6 rounded-2xl overflow-hidden"
        style={{
          backgroundColor: 'var(--card-bg)',
          borderWidth: '1px',
          borderStyle: 'solid',
          borderColor: 'var(--card-border)',
        }}
      >
        {/* Filters Header - Hamburger Button */}
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
                selectedWall !== 'all',
                selectedHoldColour !== 'all',
                selectedTagColour !== 'all',
                sentFilter !== 'all',
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

        {/* Filters Content - Collapsible */}
        {showFilters && (
          <div className="p-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Wall Filter */}
          <div className="space-y-1">
            <label className="text-xs font-medium" style={{ color: 'var(--foreground-secondary)' }}>
              Wall
            </label>
            <select
              value={selectedWall}
              onChange={(e) => setSelectedWall(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm outline-none transition"
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
              <option value="all">All walls</option>
              {walls.map(wall => (
                <option key={wall.id} value={String(wall.id)}>
                  {wall.name}
                </option>
              ))}
            </select>
          </div>

          {/* Hold Colour Filter */}
          <div className="space-y-1">
            <label className="text-xs font-medium" style={{ color: 'var(--foreground-secondary)' }}>
              Hold colour
            </label>
            <select
              value={selectedHoldColour}
              onChange={(e) => setSelectedHoldColour(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm outline-none transition"
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
              <option value="all">All colours</option>
              {colours.map(colour => (
                <option key={colour.id} value={String(colour.id)}>
                  {colour.name}
                </option>
              ))}
            </select>
          </div>

          {/* Tag Colour Filter */}
          <div className="space-y-1">
            <label className="text-xs font-medium" style={{ color: 'var(--foreground-secondary)' }}>
              Grade (tag colour)
            </label>
            <select
              value={selectedTagColour}
              onChange={(e) => setSelectedTagColour(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm outline-none transition"
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
              <option value="all">All grades</option>
              {colours
                .filter(c => c.usage === 'tag' || c.usage === 'both' || !c.usage)
                .sort((a, b) => {
                  // Sort by sort_order if available, otherwise by name
                  const aOrder = a.sort_order ?? Infinity
                  const bOrder = b.sort_order ?? Infinity
                  if (aOrder !== Infinity || bOrder !== Infinity) {
                    return (aOrder ?? Infinity) - (bOrder ?? Infinity)
                  }
                  return a.name.localeCompare(b.name)
                })
                .map(colour => (
                  <option key={colour.id} value={String(colour.id)}>
                    {colour.name}
                  </option>
                ))}
            </select>
          </div>

          {/* Sent Filter */}
          <div className="space-y-1">
            <label className="text-xs font-medium" style={{ color: 'var(--foreground-secondary)' }}>
              Status
            </label>
            <select
              value={sentFilter}
              onChange={(e) => setSentFilter(e.target.value as 'all' | 'sent' | 'unsent')}
              className="w-full rounded-lg px-3 py-2 text-sm outline-none transition"
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
              <option value="all">All climbs</option>
              <option value="unsent">Not sent yet</option>
              <option value="sent">Sent</option>
            </select>
          </div>

          {/* Show Photos Toggle */}
          <div className="space-y-1">
            <label className="text-xs font-medium" style={{ color: 'var(--foreground-secondary)' }}>
              Display
            </label>
            <label 
              className="flex items-center gap-2 rounded-lg px-3 py-2 cursor-pointer transition"
              style={{
                backgroundColor: 'var(--input-bg)',
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: 'var(--input-border)',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--button-secondary-hover)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--input-bg)'}
            >
              <input
                type="checkbox"
                checked={showPhotos}
                onChange={(e) => setShowPhotos(e.target.checked)}
                className="h-4 w-4 rounded"
                style={{ accentColor: 'var(--accent)' }}
              />
              <span className="text-sm" style={{ color: 'var(--foreground)' }}>Show photos</span>
            </label>
          </div>

          {/* Clear Filters Button */}
          <div className="space-y-1 flex items-end">
            <button
              onClick={() => {
                setSelectedWall('all')
                setSelectedHoldColour('all')
                setSelectedTagColour('all')
                setSentFilter('all')
              }}
              className="w-full rounded-lg px-3 py-2 text-sm font-medium transition"
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

            {/* Results count */}
            <div className="mt-3 text-sm" style={{ color: 'var(--foreground-secondary)' }}>
              Showing {filteredClimbs.length} of {climbs.length} climbs
            </div>
          </div>
        )}
      </div>

      {/* Climbs Grid */}
      {filteredClimbs.length === 0 ? (
        <div 
          className="rounded-2xl p-8 text-center"
          style={{
            backgroundColor: 'var(--card-bg)',
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: 'var(--card-border)',
          }}
        >
          <p style={{ color: 'var(--foreground-secondary)' }}>No climbs match your filters</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {wallGroups.map(group => (
            <WallCard 
              key={group.wall.id} 
              wall={group.wall}
              climbs={group.climbs}
              user={user} 
              userRole={userRole} 
              showPhoto={showPhotos}
              onImageClick={setSelectedImage}
            />
          ))}
        </div>
      )}

      {/* Image Modal */}
      <ImageModal
        imageUrl={selectedImage}
        onClose={() => setSelectedImage(null)}
        alt="Climb photo"
      />
    </main>
  )
}

function WallCard({ wall, climbs, user, userRole, showPhoto, onImageClick }: any) {
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
      {/* Wall Header */}
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
        <div className="text-left">
          <h3 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
            {wall.name}
          </h3>
          <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>
            {climbs.length} {climbs.length === 1 ? 'climb' : 'climbs'}
            {!isExpanded && (() => {
              const sentCount = climbs.filter((c: any) => c.ascents?.[0]?.sent).length
              return sentCount > 0 ? ` • ${sentCount} sent` : ''
            })()}
          </p>
        </div>
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

      {/* Climbs List */}
      {isExpanded && (
        <div className="divide-y" style={{ borderColor: 'var(--card-border)' }}>
          {climbs.map((climb: any) => (
            <ClimbRow 
              key={climb.sector_tag_id ?? climb.id} 
              climb={climb} 
              user={user} 
              userRole={userRole} 
              showPhoto={showPhoto}
              onImageClick={onImageClick}
            />
          ))}
        </div>
      )}
    </div>
  )
}
function ClimbRow({ climb, user, userRole, showPhoto, onImageClick }: any) {
  const router = useRouter()
  const ascent = climb.ascents?.[0]
  const canEdit = userRole === 'setter' || userRole === 'admin'

  const logSend = async () => {
    console.log('user id', user.id)
    await supabase.from('ascents').upsert({
      climb_id: climb.id,
      user_id: user.id,
      sent: true
    })
    window.location.reload()
  }

  const handleEdit = () => {
    router.push(`/climbs/${climb.id}/edit`)
  }

  return (
    <div className="p-4 flex items-center gap-4">
      {/* Photo */}
      {showPhoto && climb.photo && (
        <div 
          className="relative flex-shrink-0 rounded-lg overflow-hidden cursor-pointer transition-opacity"
          style={{ 
            backgroundColor: 'var(--background-secondary)',
            width: '120px',
            height: '90px'
          }}
          onClick={() => onImageClick(climb.photo)}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '0.8'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '1'
          }}
        >
          <img
            src={climb.photo}
            alt={`${climb.hold_colour.name} - ${climb.tag_colour.name}`}
            className="w-full h-full object-cover"
            draggable={false}
          />
        </div>
      )}

      {/* Climb Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          {climb.sector_tag_id && (
            <span 
              className="text-sm font-semibold px-2 py-0.5 rounded"
              style={{ 
                color: 'var(--accent-text)',
                backgroundColor: 'var(--accent)',
              }}
            >
              # {climb.sector_tag_id}
            </span>
          )}
          <div className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
            Grade: {climb.tag_colour.name}
          </div>
        </div>
        <div className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>
            {climb.hold_colour.name} holds          
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {ascent?.sent ? (
          <span className="text-sm" style={{ color: 'var(--accent)', fontWeight: 500 }}>✓ Sent</span>
        ) : (
          <button
            onClick={logSend}
            className="rounded-lg px-3 py-1.5 text-xs font-medium transition whitespace-nowrap"
            style={{
              backgroundColor: 'var(--accent)',
              color: 'var(--accent-text)',
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--accent-hover)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--accent)'}
          >
            Sent!
          </button>
        )}
        {canEdit && (
          <button
            onClick={handleEdit}
            className="rounded-lg px-3 py-1.5 text-xs font-medium transition whitespace-nowrap"
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
            Edit
          </button>
        )}
      </div>
    </div>
  )
}