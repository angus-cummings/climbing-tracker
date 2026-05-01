'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { useUser } from '../../lib/useUser'
import Image from 'next/image'
import { ImageModal } from '../../components/ImageModal'

type Competition = {
  id: number
  name: string
}

type ArchivedClimb = {
  id: string
  sector_tag_id: number | null
  photo: string | null
  climb_type: 'boulder' | 'rope'
  rope_grade: number | null
  wall: { id: number; name: string }
  hold_colour: { id: number; name: string; hex_code: string | null }
  tag_colour: { id: number; name: string; hex_code: string | null } | null
}

export default function ArchivedPage() {
  const router = useRouter()
  const { user, loading } = useUser()
  const [competitions, setCompetitions] = useState<Competition[]>([])
  const [loadingComps, setLoadingComps] = useState(true)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (!user) return
    supabase
      .from('competitions')
      .select('id, name')
      .order('name')
      .then(({ data }) => {
        setCompetitions(data ?? [])
        setLoadingComps(false)
      })
  }, [user])

  if (loading || loadingComps) {
    return (
      <main className="py-4 sm:py-8">
        <p className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>Loading…</p>
      </main>
    )
  }

  return (
    <main className="px-0 py-4 sm:py-8">
      <h2 className="text-xl sm:text-2xl font-semibold mb-4 sm:mb-6" style={{ color: 'var(--foreground)' }}>
        Archived
      </h2>

      {competitions.length === 0 ? (
        <div
          className="rounded-2xl p-8 text-center"
          style={{
            backgroundColor: 'var(--card-bg)',
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: 'var(--card-border)',
          }}
        >
          <p style={{ color: 'var(--foreground-secondary)' }}>No competitions found</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {competitions.map(comp => (
            <CompetitionCard
              key={comp.id}
              competition={comp}
              onImageClick={setSelectedImage}
            />
          ))}
        </div>
      )}

      <ImageModal
        imageUrl={selectedImage}
        onClose={() => setSelectedImage(null)}
        alt="Climb photo"
      />
    </main>
  )
}

function CompetitionCard({ competition, onImageClick }: { competition: Competition; onImageClick: (url: string) => void }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [climbs, setClimbs] = useState<ArchivedClimb[] | null>(null)
  const [loadingClimbs, setLoadingClimbs] = useState(false)

  const handleExpand = async () => {
    const expanding = !isExpanded
    setIsExpanded(expanding)

    if (expanding && climbs === null) {
      setLoadingClimbs(true)
      const { data } = await supabase
        .from('climbs')
        .select(`
          id,
          sector_tag_id,
          photo,
          climb_type,
          rope_grade,
          wall:walls!wall(id, name),
          hold_colour:colours!hold_colour_id(id, name, hex_code),
          tag_colour:colours!tag_colour_id(id, name, hex_code)
        `)
        .eq('archived', true)
        .eq('competition_id', competition.id)
        .order('sector_tag_id', { ascending: true })
      setClimbs((data as unknown as ArchivedClimb[]) ?? [])
      setLoadingClimbs(false)
    }
  }

  const wallGroups = buildWallGroups(climbs ?? [])

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
      <button
        onClick={handleExpand}
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
            {competition.name}
          </h3>
          {isExpanded && climbs !== null && (
            <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>
              {climbs.length} {climbs.length === 1 ? 'climb' : 'climbs'}
            </p>
          )}
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

      {isExpanded && (
        <div className="p-4">
          {loadingClimbs ? (
            <p className="text-sm py-2" style={{ color: 'var(--foreground-secondary)' }}>Loading climbs…</p>
          ) : climbs?.length === 0 ? (
            <p className="text-sm py-2" style={{ color: 'var(--foreground-secondary)' }}>No archived climbs in this competition</p>
          ) : (
            <div className="grid gap-4">
              {wallGroups.map(group => (
                <ArchivedWallCard
                  key={group.wall.id}
                  wall={group.wall}
                  climbs={group.climbs}
                  onImageClick={onImageClick}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ArchivedWallCard({ wall, climbs, onImageClick }: { wall: any; climbs: ArchivedClimb[]; onImageClick: (url: string) => void }) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: 'var(--card-border)',
      }}
    >
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
          <h4 className="text-base font-semibold" style={{ color: 'var(--foreground)' }}>{wall.name}</h4>
          <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>
            {climbs.length} {climbs.length === 1 ? 'climb' : 'climbs'}
          </p>
        </div>
        <svg
          className="transition-transform"
          style={{
            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
            width: '18px',
            height: '18px',
            fill: 'var(--foreground-secondary)',
          }}
          viewBox="0 0 20 20"
        >
          <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
        </svg>
      </button>

      {isExpanded && (
        <div className="divide-y" style={{ borderColor: 'var(--card-border)' }}>
          {climbs.map(climb => (
            <ArchivedClimbRow key={climb.sector_tag_id ?? climb.id} climb={climb} onImageClick={onImageClick} />
          ))}
        </div>
      )}
    </div>
  )
}

function ArchivedClimbRow({ climb, onImageClick }: { climb: ArchivedClimb; onImageClick: (url: string) => void }) {
  const gradeLabel = climb.climb_type === 'rope'
    ? `Grade ${climb.rope_grade}`
    : `Grade: ${climb.tag_colour?.name}`

  return (
    <div className="p-3 sm:p-4 flex items-center gap-3 sm:gap-4">
      {climb.photo && (
        <div
          className="relative flex-shrink-0 rounded-lg overflow-hidden cursor-pointer transition-opacity"
          style={{ backgroundColor: 'var(--background-secondary)', width: '80px', height: '60px' }}
          onClick={() => onImageClick(climb.photo!)}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.8' }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
        >
          <Image
            src={climb.photo}
            alt={`${climb.hold_colour.name} - ${gradeLabel}`}
            width={80}
            height={60}
            sizes="80px"
            className="w-full h-full object-cover"
            draggable={false}
            loading="lazy"
          />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          {climb.sector_tag_id && (
            <span
              className="text-xs sm:text-sm font-semibold px-2 py-0.5 rounded"
              style={{ color: 'var(--accent-text)', backgroundColor: 'var(--accent)' }}
            >
              # {climb.sector_tag_id}
            </span>
          )}
          <div className="text-xs sm:text-sm font-medium" style={{ color: 'var(--foreground)' }}>
            {gradeLabel}
          </div>
        </div>
        <div className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>
          {climb.hold_colour.name} holds
        </div>
      </div>

      <span className="text-xs flex-shrink-0" style={{ color: 'var(--foreground-secondary)' }}>
        Archived
      </span>
    </div>
  )
}

function buildWallGroups(climbs: ArchivedClimb[]) {
  const grouped = climbs.reduce((acc, climb) => {
    const wallId = climb.wall.id
    if (!acc[wallId]) acc[wallId] = { wall: climb.wall, climbs: [] }
    acc[wallId].climbs.push(climb)
    return acc
  }, {} as Record<number, { wall: any; climbs: ArchivedClimb[] }>)

  return Object.values(grouped)
}
