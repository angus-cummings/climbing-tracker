'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useUser } from '../../lib/useUser'
import { ImageUpload } from '../../components/ImageUpload'

type NewClimb = {
  wall: string
  hold_colour_id: string
  tag_colour_id: string
  photo: string
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

export default function SettersPage() {
  const { user, loading: authLoading } = useUser()
  const [form, setForm] = useState<NewClimb>({
    wall: '',
    hold_colour_id: '',
    tag_colour_id: '',
    photo: '',
  })
  const [walls, setWalls] = useState<Wall[]>([])
  const [colours, setColours] = useState<Colour[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingOptions, setLoadingOptions] = useState(true)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadOptions = async () => {
      setLoadingOptions(true)
      const [{ data: wallData }, { data: colourData }] = await Promise.all([
        supabase.from('walls').select('id, name'),
        supabase.from('colours').select('id, name, hex_code, usage'),
      ])

      setWalls(wallData ?? [])
      setColours(colourData ?? [])
      setLoadingOptions(false)
    }

    loadOptions()
  }, [])

  if (authLoading) {
    return (
      <main className="py-10">
        <p className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>
          Checking your access…
        </p>
      </main>
    )
  }

  if (!user) {
    return (
      <main className="py-10">
        <div 
          className="rounded-2xl p-6"
          style={{
            backgroundColor: 'var(--card-bg)',
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: 'var(--card-border)',
          }}
        >
          <h1 className="text-xl font-semibold mb-2" style={{ color: 'var(--foreground)' }}>
            Setter area
          </h1>
          <p className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>
            You need to be signed in as a setter or admin to add climbs.
          </p>
        </div>
      </main>
    )
  }

  const handleChange = (field: keyof NewClimb, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)
    setError(null)

    if (!form.wall || !form.hold_colour_id || !form.tag_colour_id) {
      setError('Wall, hold colour, and tag colour (grade) are required')
      return
    }

    setLoading(true)
    const { error: insertError } = await supabase.from('climbs').insert({
      wall: Number(form.wall),
      hold_colour_id: Number(form.hold_colour_id),
      tag_colour_id: Number(form.tag_colour_id),
      photo: form.photo || null,
    })
    setLoading(false)

    if (insertError) {
      setError(insertError.message)
    } else {
      setMessage('Climb created')
      setForm({
        wall: '',
        hold_colour_id: '',
        tag_colour_id: '',
        photo: '',
      })
    }
  }

  const selectedHold = colours.find(c => String(c.id) === form.hold_colour_id)
  const selectedTag = colours.find(c => String(c.id) === form.tag_colour_id)

  return (
    <main className="py-8">
      <div className="max-w-xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" style={{ color: 'var(--foreground)' }}>
            Setter panel
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--foreground-secondary)' }}>
            Add a new climb to the database. In this gym, the <span className="font-medium">tag colour</span>{' '}
            represents the grade.
          </p>
        </div>

        <div 
          className="rounded-2xl p-6 shadow"
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

          <form
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            <div className="space-y-1">
              <label className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                Wall
              </label>
              <select
                value={form.wall}
                onChange={e => handleChange('wall', e.target.value)}
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
                <option value="">Select a wall</option>
                {walls.map(wall => (
                  <option key={wall.id} value={wall.id}>
                    {wall.name} (#{wall.id})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
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
              </div>
            </div>

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

