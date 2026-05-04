'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { supabase } from '../lib/supabase'
import { ImageModal } from './ImageModal'

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

interface ArchivedClimbsViewProps {
  competitionId: number
}

export function ArchivedClimbsView({ competitionId }: ArchivedClimbsViewProps) {
  const [climbs, setClimbs] = useState<ArchivedClimb[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    supabase
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
      .eq('competition_id', competitionId)
      .order('sector_tag_id', { ascending: true })
      .then(({ data }) => {
        setClimbs((data as unknown as ArchivedClimb[]) ?? [])
        setLoading(false)
      })
  }, [competitionId])

  if (loading) {
    return <p className="text-sm py-4" style={{ color: 'var(--foreground-secondary)' }}>Loading climbs…</p>
  }

  if (!climbs || climbs.length === 0) {
    return (
      <div
        className="rounded-2xl p-8 text-center"
        style={{
          backgroundColor: 'var(--card-bg)',
          borderWidth: '1px',
          borderStyle: 'solid',
          borderColor: 'var(--card-border)',
        }}
      >
        <p style={{ color: 'var(--foreground-secondary)' }}>No archived climbs for this competition</p>
      </div>
    )
  }

  const wallGroups = buildWallGroups(climbs)

  return (
    <>
      <div className="grid gap-4">
        {wallGroups.map(group => (
          <ArchivedWallCard
            key={group.wall.id}
            wall={group.wall}
            climbs={group.climbs}
            onImageClick={setSelectedImage}
          />
        ))}
      </div>

      <ImageModal
        imageUrl={selectedImage}
        onClose={() => setSelectedImage(null)}
        alt="Climb photo"
      />
    </>
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
