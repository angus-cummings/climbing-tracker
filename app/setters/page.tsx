'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { useUser } from '../../lib/useUser'
import { useRole } from '../../lib/useRole'
import { ImageUpload } from '../../components/ImageUpload'

type NewClimb = {
  wall: string
  hold_colour_id: string
  tag_colour_id: string
  rope_grade: string
  photo: string
  sector_tag_id: string
}

type QRCode = {
  id: string
  code: string
}

type Gym = {
  id: number
  name: string
}

type Wall = {
  id: number
  name: string
  gym: number | null
  wall_type: 'boulder' | 'rope'
}

type Colour = {
  id: number
  name: string
  hex_code: string | null
  usage?: 'hold' | 'tag' | 'both'
}

type RopeGrade = {
  id: number
  sort_order: number
}

export default function SettersPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useUser()
  const { role, loading: roleLoading } = useRole()
  const [climbType, setClimbType] = useState<'route' | 'boulder'>('route')
  const [form, setForm] = useState<NewClimb>({
    wall: '',
    hold_colour_id: '',
    tag_colour_id: '',
    rope_grade: '',
    photo: '',
    sector_tag_id: '',
  })
  const [selectedGymId, setSelectedGymId] = useState<number | null>(null)
  const [selectedQRCode, setSelectedQRCode] = useState<string>('')
  const [gyms, setGyms] = useState<Gym[]>([])
  const [walls, setWalls] = useState<Wall[]>([])
  const [colours, setColours] = useState<Colour[]>([])
  const [ropeGrades, setRopeGrades] = useState<RopeGrade[]>([])
  const [qrCodes, setQRCodes] = useState<QRCode[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingOptions, setLoadingOptions] = useState(true)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadOptions = async () => {
      setLoadingOptions(true)
      const [
        { data: gymData },
        { data: wallData },
        { data: colourData },
        { data: ropeGradeData },
        { data: qrCodeData }
      ] = await Promise.all([
        supabase.from('gyms').select('id, name').order('name'),
        supabase.from('walls').select('id, name, gym, wall_type').order('name'),
        supabase.from('colours').select('id, name, hex_code, usage'),
        supabase.from('rope_grades').select('id, sort_order').order('sort_order'),
        supabase.from('qr_codes').select('id, code').is('climb_id', null).order('created_at', { ascending: false }),
      ])

      const gymsLoaded = gymData ?? []
      setGyms(gymsLoaded)
      setWalls(wallData ?? [])
      setColours(colourData ?? [])
      setRopeGrades(ropeGradeData ?? [])
      setQRCodes(qrCodeData ?? [])

      // Default to Hobart for the initial route selection
      const hobart = gymsLoaded.find(g => g.name === 'Hobart')
      if (hobart) setSelectedGymId(hobart.id)

      setLoadingOptions(false)
    }

    loadOptions()
  }, [])

  const handleClimbTypeSelect = (type: 'route' | 'boulder') => {
    setClimbType(type)
    setForm(prev => ({ ...prev, wall: '', tag_colour_id: '', rope_grade: '' }))

    if (type === 'route') {
      const hobart = gyms.find(g => g.name === 'Hobart')
      setSelectedGymId(hobart?.id ?? null)
    } else {
      setSelectedGymId(null)
    }
  }

  const filteredWalls = selectedGymId
    ? walls.filter(w =>
        w.gym === selectedGymId &&
        w.wall_type === (climbType === 'route' ? 'rope' : 'boulder')
      )
    : []

  const handleGymSelect = (gymId: number) => {
    setSelectedGymId(gymId)
    setForm(prev => ({ ...prev, wall: '' }))
  }

  // Redirect if not setter or admin
  useEffect(() => {
    if (!authLoading && !roleLoading) {
      if (!user) {
        router.push('/')
        return
      }
      if (role !== 'setter' && role !== 'admin') {
        router.push('/climbs')
        return
      }
    }
  }, [user, role, authLoading, roleLoading, router])

  if (authLoading || roleLoading) {
    return (
      <main className="py-10">
        <p className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>
          Checking your access…
        </p>
      </main>
    )
  }

  if (role !== 'setter' && role !== 'admin') {
    return (
      <main className="flex min-h-[80vh] items-center justify-center">
        <p style={{ color: 'var(--foreground-secondary)' }}>Access denied. Setter or admin access required.</p>
      </main>
    )
  }

  const handleChange = (field: keyof NewClimb, value: string | boolean) => {
    setForm(prev => ({ ...prev, [field]: value } as NewClimb))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)
    setError(null)

    if (!selectedGymId) {
      setError('Please select a gym first')
      return
    }

    if (climbType === 'boulder') {
      if (!form.wall || !form.hold_colour_id || !form.tag_colour_id || !form.sector_tag_id) {
        setError('Wall, hold colour, tag colour (grade), and sector tag ID are required')
        return
      }
    } else {
      if (!form.wall || !form.hold_colour_id || !form.rope_grade || !form.sector_tag_id) {
        setError('Wall, hold colour, grade, and sector tag ID are required')
        return
      }
    }

    const sectorTagId = Number(form.sector_tag_id)
    if (isNaN(sectorTagId) || sectorTagId <= 0 || !Number.isInteger(sectorTagId)) {
      setError('Sector tag ID must be a positive integer')
      return
    }

    setLoading(true)

    const insertPayload = climbType === 'boulder'
      ? {
          climb_type: 'boulder' as const,
          wall: Number(form.wall),
          hold_colour_id: Number(form.hold_colour_id),
          tag_colour_id: Number(form.tag_colour_id),
          photo: form.photo || null,
          sector_tag_id: sectorTagId,
        }
      : {
          climb_type: 'rope' as const,
          wall: Number(form.wall),
          hold_colour_id: Number(form.hold_colour_id),
          rope_grade: Number(form.rope_grade),
          photo: form.photo || null,
          sector_tag_id: sectorTagId,
        }

    const { data: newClimb, error: insertError } = await supabase
      .from('climbs')
      .insert(insertPayload)
      .select('id')
      .single()

    if (insertError) {
      setLoading(false)
      setError(insertError.message)
      return
    }

    if (selectedQRCode && newClimb?.id) {
      const { error: qrError } = await supabase
        .from('qr_codes')
        .update({
          climb_id: newClimb.id,
          assigned_at: new Date().toISOString()
        })
        .eq('id', selectedQRCode)

      if (qrError) {
        console.error('Failed to assign QR code:', qrError)
      }
    }

    setLoading(false)
    setMessage('Climb created' + (selectedQRCode ? ' and QR code assigned' : ''))
    setForm({
      wall: '',
      hold_colour_id: '',
      tag_colour_id: '',
      rope_grade: '',
      photo: '',
      sector_tag_id: '',
    })
    setSelectedQRCode('')

    const { data: qrCodeData } = await supabase
      .from('qr_codes')
      .select('id, code')
      .is('climb_id', null)
      .order('created_at', { ascending: false })
    setQRCodes(qrCodeData ?? [])
  }

  const selectedHold = colours.find(c => String(c.id) === form.hold_colour_id)
  const selectedTag = colours.find(c => String(c.id) === form.tag_colour_id)

  const buttonBase = 'flex-1 min-w-[120px] rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium transition'
  const buttonStyle = (active: boolean) => ({
    backgroundColor: active ? 'var(--accent)' : 'var(--button-secondary-bg)',
    color: active ? 'var(--accent-text)' : 'var(--button-secondary-text)',
    borderWidth: '1px',
    borderStyle: 'solid' as const,
    borderColor: active ? 'var(--accent)' : 'var(--border)',
  })

  return (
    <main className="py-4 sm:py-8 px-4 sm:px-0">
      <div className="max-w-xl space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight" style={{ color: 'var(--foreground)' }}>
            Setter panel
          </h1>
          <p className="mt-1 text-xs sm:text-sm" style={{ color: 'var(--foreground-secondary)' }}>
            Add a new climb to the database.
          </p>
        </div>

        <div
          className="rounded-2xl p-4 sm:p-6 shadow"
          style={{
            backgroundColor: 'var(--card-bg)',
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: 'var(--card-border)',
          }}
        >
          {loadingOptions && (
            <p className="mb-4 text-sm" style={{ color: 'var(--foreground-secondary)' }}>
              Loading walls and colours…
            </p>
          )}

          {error && (
            <div
              className="mb-4 rounded-lg px-3 py-2 text-sm"
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                color: '#ef4444',
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: 'rgba(239, 68, 68, 0.4)'
              }}
            >
              {error}
            </div>
          )}

          {message && (
            <div
              className="mb-4 rounded-lg px-3 py-2 text-sm"
              style={{
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                color: '#10b981',
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: 'rgba(16, 185, 129, 0.4)'
              }}
            >
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Climb type toggle */}
            <div className="space-y-2">
              <label className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                Type
              </label>
              <div className="flex flex-wrap gap-2">
                {(['route', 'boulder'] as const).map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleClimbTypeSelect(type)}
                    className={buttonBase}
                    style={buttonStyle(climbType === type)}
                    onMouseEnter={(e) => {
                      if (climbType !== type) e.currentTarget.style.backgroundColor = 'var(--button-secondary-hover)'
                    }}
                    onMouseLeave={(e) => {
                      if (climbType !== type) e.currentTarget.style.backgroundColor = 'var(--button-secondary-bg)'
                    }}
                  >
                    {type === 'route' ? 'Route' : 'Boulder'}
                  </button>
                ))}
              </div>
            </div>

            {/* Gym selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                Gym
              </label>
              <div className="flex flex-wrap gap-2">
                {gyms.map(gym => (
                  <button
                    key={gym.id}
                    type="button"
                    onClick={() => climbType === 'boulder' && handleGymSelect(gym.id)}
                    disabled={climbType === 'route'}
                    className={`${buttonBase} disabled:opacity-50 disabled:cursor-not-allowed`}
                    style={buttonStyle(selectedGymId === gym.id)}
                    onMouseEnter={(e) => {
                      if (climbType === 'boulder' && selectedGymId !== gym.id)
                        e.currentTarget.style.backgroundColor = 'var(--button-secondary-hover)'
                    }}
                    onMouseLeave={(e) => {
                      if (climbType === 'boulder' && selectedGymId !== gym.id)
                        e.currentTarget.style.backgroundColor = 'var(--button-secondary-bg)'
                    }}
                  >
                    {gym.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Sector tag ID */}
            <div className="space-y-1">
              <label className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                Sector tag ID
              </label>
              <input
                type="number"
                value={form.sector_tag_id}
                onChange={e => handleChange('sector_tag_id', e.target.value)}
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
                placeholder="Enter sector tag number (e.g., 42)"
                min="1"
                step="1"
              />
              <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>
                The sector tag number displayed on climbs (e.g., #42)
              </p>
            </div>

            {/* Wall */}
            <div className="space-y-1">
              <label className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                Wall
              </label>
              <select
                value={form.wall}
                onChange={e => handleChange('wall', e.target.value)}
                disabled={!selectedGymId || loadingOptions}
                className="w-full rounded-lg px-3 py-2 text-sm outline-none transition disabled:opacity-50 disabled:cursor-not-allowed"
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
                <option value="">
                  {!selectedGymId ? 'Select a gym first' : 'Select a wall'}
                </option>
                {filteredWalls.map(wall => (
                  <option key={wall.id} value={wall.id}>
                    {wall.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Hold colour + grade */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                  Hold colour
                </label>
                <select
                  value={form.hold_colour_id}
                  onChange={e => handleChange('hold_colour_id', e.target.value)}
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
                  <option value="">Select a hold colour</option>
                  {colours
                    .filter(c => c.usage === 'hold' || c.usage === 'both' || !c.usage)
                    .map(colour => (
                      <option key={colour.id} value={colour.id}>
                        {colour.name}
                      </option>
                    ))}
                </select>
                {selectedHold && (
                  <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>
                    Selected: {selectedHold.name}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                {climbType === 'boulder' ? (
                  <>
                    <label className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                      Tag colour (grade)
                    </label>
                    <select
                      value={form.tag_colour_id}
                      onChange={e => handleChange('tag_colour_id', e.target.value)}
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
                      <option value="">Select a tag colour / grade</option>
                      {colours
                        .filter(c => c.usage === 'tag' || c.usage === 'both' || !c.usage)
                        .map(colour => (
                          <option key={colour.id} value={colour.id}>
                            {colour.name}
                          </option>
                        ))}
                    </select>
                    {selectedTag && (
                      <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>
                        Selected: {selectedTag.name}
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <label className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                      Grade
                    </label>
                    <select
                      value={form.rope_grade}
                      onChange={e => handleChange('rope_grade', e.target.value)}
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
                      <option value="">Select a grade</option>
                      {ropeGrades.map(grade => (
                        <option key={grade.id} value={grade.id}>
                          {grade.id}
                        </option>
                      ))}
                    </select>
                  </>
                )}
              </div>
            </div>

            {/* Climb photo */}
            <div className="space-y-1">
              <label className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                Climb photo
              </label>
              <ImageUpload
                onUploadComplete={(url) => handleChange('photo', url)}
                currentImageUrl={form.photo}
                disabled={loading || loadingOptions}
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading || loadingOptions}
                className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium shadow transition disabled:cursor-not-allowed disabled:opacity-60"
                style={{
                  backgroundColor: 'var(--accent)',
                  color: 'var(--accent-text)',
                }}
                onMouseEnter={(e) => !loading && !loadingOptions && (e.currentTarget.style.backgroundColor = 'var(--accent-hover)')}
                onMouseLeave={(e) => !loading && !loadingOptions && (e.currentTarget.style.backgroundColor = 'var(--accent)')}
              >
                {loading ? 'Saving…' : 'Create climb'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  )
}
