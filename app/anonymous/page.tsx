'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { ImageModal } from '../../components/ImageModal'
import { validateCompetitorNumber } from '../../lib/validation'

type Wall = {
  id: number
  name: string
}

type Colour = {
  id: number
  name: string
  hex_code: string | null
}

export default function AnonymousPage() {
  const [competitorNumber, setCompetitorNumber] = useState('')
  const [climbs, setClimbs] = useState<any[]>([])
  const [walls, setWalls] = useState<Wall[]>([])
  const [colours, setColours] = useState<Colour[]>([])
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [competitorNumberError, setCompetitorNumberError] = useState<string | null>(null)

  useEffect(() => {
    // Fetch climbs, walls, and colours
    Promise.all([
      supabase
        .from('climbs')
        .select(`
          id,
          sector_tag_id,
          photo,
          wall,
          hold_colour_id,
          tag_colour_id,
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
        .not('wall', 'is', null)
        .not('hold_colour_id', 'is', null)
        .not('tag_colour_id', 'is', null)
        .not('sector_tag_id', 'is', null)
        .order('sector_tag_id', { ascending: true }),
      supabase.from('walls').select('id, name').order('name'),
      supabase.from('colours').select('id, name, hex_code').order('name')
    ]).then(([{ data: climbsData }, { data: wallData }, { data: colourData }]) => {
      setClimbs(climbsData ?? [])
      setWalls(wallData ?? [])
      setColours(colourData ?? [])
    })
  }, [])

  const handleRecordSend = async (climbId: string) => {
    setError(null)
    setCompetitorNumberError(null)

    // Validate competitor number
    const validation = validateCompetitorNumber(competitorNumber)
    if (!validation.valid) {
      setCompetitorNumberError(validation.error || 'Invalid competitor number')
      setError(validation.error || 'Invalid competitor number')
      return
    }

    const compNum = parseInt(competitorNumber, 10)

    setLoading(true)
    setError(null)
    setMessage(null)

    try {
      const { error: ascentError } = await supabase.rpc('create_anonymous_ascent', {
        p_competitor_number: compNum,
        p_climb_id: climbId,
        p_sent: true
      })

      if (ascentError) {
        setError(ascentError.message)
      } else {
        setMessage('Send recorded! (Note: You cannot view your recorded sends as an anonymous user)')
        setTimeout(() => setMessage(null), 3000)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to record send')
    } finally {
      setLoading(false)
    }
  }

  // Group climbs by wall
  const groupedClimbs = climbs.reduce((acc, climb) => {
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
  const groupedClimbsArray: Array<{ wall: any, climbs: any[] }> = Object.values(groupedClimbs) as Array<{ wall: any, climbs: any[] }>
  const wallGroups: Array<{ wall: any, climbs: any[] }> = groupedClimbsArray.map((group) => {
    const sortedClimbs = [...group.climbs].sort((a, b) => {
      const aTag = a.sector_tag_id ?? a.id
      const bTag = b.sector_tag_id ?? b.id
      
      if (typeof aTag === 'string' && typeof bTag === 'string') {
        return aTag.localeCompare(bTag, undefined, { numeric: true, sensitivity: 'base' })
      }
      
      if (typeof aTag === 'number' && typeof bTag === 'number') {
        return aTag - bTag
      }
      
      const aStr = String(aTag)
      const bStr = String(bTag)
      return aStr.localeCompare(bStr, undefined, { numeric: true, sensitivity: 'base' })
    })
    return {
      wall: group.wall,
      climbs: sortedClimbs
    }
  })

  return (
    <main className="px-0 py-4 sm:py-8">
      <h2 className="text-xl sm:text-2xl font-semibold mb-4 sm:mb-6" style={{ color: 'var(--foreground)' }}>
        Record Sends (Anonymous)
      </h2>

      <div 
        className="mb-6 rounded-2xl p-4"
        style={{
          backgroundColor: 'var(--card-bg)',
          borderWidth: '1px',
          borderStyle: 'solid',
          borderColor: 'var(--card-border)',
        }}
      >
        <label 
          className="mb-2 block text-sm font-medium"
          style={{ color: 'var(--foreground-secondary)' }}
        >
          Your Competitor Number
        </label>
        <input
          type="number"
          value={competitorNumber}
          onChange={(e) => {
            setCompetitorNumber(e.target.value)
            if (competitorNumberError) {
              const validation = validateCompetitorNumber(e.target.value)
              setCompetitorNumberError(validation.valid ? null : validation.error || null)
            }
          }}
          onBlur={(e) => {
            const validation = validateCompetitorNumber(e.target.value)
            setCompetitorNumberError(validation.valid ? null : validation.error || null)
            e.currentTarget.style.borderColor = validation.valid ? 'var(--input-border)' : '#ef4444'
            e.currentTarget.style.boxShadow = 'none'
          }}
          placeholder="Enter your competitor number"
          className="w-full rounded-lg px-4 py-2.5 text-base sm:text-sm outline-none transition"
          style={{
            backgroundColor: 'var(--input-bg)',
            color: 'var(--foreground)',
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: competitorNumberError ? '#ef4444' : 'var(--input-border)',
            minHeight: '44px',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = competitorNumberError ? '#ef4444' : 'var(--accent)'
            e.currentTarget.style.boxShadow = competitorNumberError ? 'none' : `0 0 0 2px var(--accent)`
          }}
        />
        {competitorNumberError && (
          <p className="mt-1 text-xs" style={{ color: '#ef4444' }}>
            {competitorNumberError}
          </p>
        )}
        <p className="mt-2 text-xs" style={{ color: 'var(--foreground-secondary)', opacity: 0.7 }}>
          Enter your competitor number to record sends. You won't be able to see your recorded sends here.
        </p>
      </div>

      {error && (
        <div 
          className="mb-4 rounded-lg px-4 py-3 text-sm"
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            color: '#ef4444',
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: 'rgba(239, 68, 68, 0.2)'
          }}
        >
          {error}
        </div>
      )}

      {message && (
        <div 
          className="mb-4 rounded-lg px-4 py-3 text-sm"
          style={{
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            color: '#10b981',
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: 'rgba(16, 185, 129, 0.2)'
          }}
        >
          {message}
        </div>
      )}

      <div className="grid gap-4">
        {wallGroups.map(group => (
          <div 
            key={group.wall.id}
            className="rounded-2xl shadow overflow-hidden"
            style={{
              backgroundColor: 'var(--card-bg)',
              borderWidth: '1px',
              borderStyle: 'solid',
              borderColor: 'var(--card-border)',
            }}
          >
            <div className="px-4 py-3" style={{ backgroundColor: 'var(--background-secondary)' }}>
              <h3 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
                {group.wall.name}
              </h3>
            </div>
            <div className="divide-y" style={{ borderColor: 'var(--card-border)' }}>
              {group.climbs.map((climb: any) => (
                <div key={climb.id} className="p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                  <div className="flex items-center gap-3 sm:gap-4 flex-1 w-full sm:w-auto">
                    {climb.photo && (
                      <div 
                        className="relative flex-shrink-0 rounded-lg overflow-hidden cursor-pointer"
                        style={{ 
                          backgroundColor: 'var(--background-secondary)',
                          width: '80px',
                          height: '60px'
                        }}
                        onClick={() => setSelectedImage(climb.photo)}
                      >
                        <img
                          src={climb.photo}
                          alt={`${climb.hold_colour.name} - ${climb.tag_colour.name}`}
                          className="w-full h-full object-cover"
                          draggable={false}
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        {climb.sector_tag_id && (
                          <span 
                            className="text-xs sm:text-sm font-semibold px-2 py-0.5 rounded"
                            style={{ 
                              color: 'var(--accent-text)',
                              backgroundColor: 'var(--accent)',
                            }}
                          >
                            # {climb.sector_tag_id}
                          </span>
                        )}
                        <div className="text-xs sm:text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                          Grade: {climb.tag_colour.name}
                        </div>
                      </div>
                      <div className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>
                        {climb.hold_colour.name} holds
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRecordSend(climb.id)}
                    disabled={loading || !competitorNumber}
                    className="rounded-lg px-3 py-1.5 text-xs sm:text-sm font-medium transition whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
                    style={{
                      backgroundColor: 'var(--accent)',
                      color: 'var(--accent-text)',
                    }}
                    onMouseEnter={(e) => !loading && !competitorNumber && (e.currentTarget.style.backgroundColor = 'var(--accent-hover)')}
                    onMouseLeave={(e) => !loading && !competitorNumber && (e.currentTarget.style.backgroundColor = 'var(--accent)')}
                  >
                    Record Send
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <ImageModal
        imageUrl={selectedImage}
        onClose={() => setSelectedImage(null)}
        alt="Climb photo"
      />
    </main>
  )
}

