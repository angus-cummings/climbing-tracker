'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '../../../../lib/supabase'
import { useUser } from '../../../../lib/useUser'
import { ImageUpload } from '../../../../components/ImageUpload'

type ClimbData = {
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

export default function EditClimbPage() {
  const params = useParams()
  const router = useRouter()
  const climbId = params.id as string
  const { user, loading: authLoading } = useUser()
  
  const [form, setForm] = useState<ClimbData>({
    wall: '',
    hold_colour_id: '',
    tag_colour_id: '',
    photo: '',
  })
  const [walls, setWalls] = useState<Wall[]>([])
  const [colours, setColours] = useState<Colour[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Check user role
  useEffect(() => {
    const checkRole = async () => {
      if (!user) return
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle()
      
      setUserRole(profile?.role ?? null)
    }
    
    checkRole()
  }, [user])

  // Load climb data and options
  useEffect(() => {
    const loadData = async () => {
      setLoadingData(true)
      
      // Load climb data
      const { data: climbData, error: climbError } = await supabase
        .from('climbs')
        .select('wall, hold_colour_id, tag_colour_id, photo')
        .eq('id', climbId)
        .single()
      
      if (climbError) {
        setError('Failed to load climb data')
        setLoadingData(false)
        return
      }
      
      // Load walls and colours
      const [{ data: wallData }, { data: colourData }] = await Promise.all([
        supabase.from('walls').select('id, name'),
        supabase.from('colours').select('id, name, hex_code, usage'),
      ])

      setWalls(wallData ?? [])
      setColours(colourData ?? [])
      
      // Set form data
      if (climbData) {
        setForm({
          wall: String(climbData.wall),
          hold_colour_id: String(climbData.hold_colour_id),
          tag_colour_id: String(climbData.tag_colour_id),
          photo: climbData.photo || '',
        })
      }
      
      setLoadingData(false)
    }

    loadData()
  }, [climbId])

  const handleChange = (field: keyof ClimbData, value: string) => {
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
    const { error: updateError } = await supabase
      .from('climbs')
      .update({
        wall: Number(form.wall),
        hold_colour_id: Number(form.hold_colour_id),
        tag_colour_id: Number(form.tag_colour_id),
        photo: form.photo || null,
      })
      .eq('id', climbId)
    
    setLoading(false)

    if (updateError) {
      setError(updateError.message)
    } else {
      setMessage('Climb updated successfully')
      setTimeout(() => {
        router.push('/climbs')
      }, 1500)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this climb? This action cannot be undone.')) {
      return
    }

    setLoading(true)
    const { error: deleteError } = await supabase
      .from('climbs')
      .delete()
      .eq('id', climbId)
    
    setLoading(false)

    if (deleteError) {
      setError(deleteError.message)
    } else {
      router.push('/climbs')
    }
  }

  if (authLoading || loadingData) {
    return (
      <main className="py-10">
        <p className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>Loading…</p>
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
            Access denied
          </h1>
          <p className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>
            You need to be signed in to edit climbs.
          </p>
        </div>
      </main>
    )
  }

  if (userRole !== 'setter' && userRole !== 'admin') {
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
            Access denied
          </h1>
          <p className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>
            You need to be a setter or admin to edit climbs.
          </p>
        </div>
      </main>
    )
  }

  const selectedHold = colours.find(c => String(c.id) === form.hold_colour_id)
  const selectedTag = colours.find(c => String(c.id) === form.tag_colour_id)

  return (
    <main className="py-8">
      <div className="max-w-xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" style={{ color: 'var(--foreground)' }}>
            Edit climb
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--foreground-secondary)' }}>
            Update the climb details or photo.
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
            <div className="space-y-1">
              <label className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>Wall</label>
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
                <label className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>Hold colour</label>
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
                <label className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>Tag colour (grade)</label>
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
              <label className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>Climb photo</label>
              <ImageUpload
                onUploadComplete={(url) => handleChange('photo', url)}
                currentImageUrl={form.photo}
                disabled={loading}
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium shadow transition disabled:cursor-not-allowed disabled:opacity-60"
                style={{
                  backgroundColor: 'var(--accent)',
                  color: 'var(--accent-text)',
                }}
                onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = 'var(--accent-hover)')}
                onMouseLeave={(e) => !loading && (e.currentTarget.style.backgroundColor = 'var(--accent)')}
              >
                {loading ? 'Saving…' : 'Update climb'}
              </button>

              <button
                type="button"
                onClick={() => router.push('/climbs')}
                disabled={loading}
                className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60"
                style={{
                  backgroundColor: 'var(--button-secondary-bg)',
                  color: 'var(--button-secondary-text)',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  borderColor: 'var(--border)',
                }}
                onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = 'var(--button-secondary-hover)')}
                onMouseLeave={(e) => !loading && (e.currentTarget.style.backgroundColor = 'var(--button-secondary-bg)')}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="ml-auto inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60"
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  color: '#ef4444',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  borderColor: 'rgba(239, 68, 68, 0.4)'
                }}
                onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.2)')}
                onMouseLeave={(e) => !loading && (e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)')}
              >
                Delete climb
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  )
}
