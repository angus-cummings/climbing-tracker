'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from '../../lib/supabase'
import { useUser } from '../../lib/useUser'
import { useRole } from '../../lib/useRole'

type Climb = {
  id: string
  sector_tag_id: number | null
  wall: number | null
  hold_colour_id: number | null
  tag_colour_id: number | null
  created_at: string
}

export default function QRCodesPage() {
  const router = useRouter()
  const { user, loading: userLoading } = useUser()
  const { role, loading: roleLoading } = useRole()
  const [incompleteClimbs, setIncompleteClimbs] = useState<Climb[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [count, setCount] = useState(20)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [selectedClimbs, setSelectedClimbs] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (userLoading || roleLoading) return

    if (!user || role !== 'admin') {
      router.push('/climbs')
      return
    }

    fetchIncompleteClimbs()
  }, [user, role, userLoading, roleLoading, router])

  const isIncomplete = (climb: any): boolean => {
    return !climb.wall || !climb.hold_colour_id || !climb.tag_colour_id || !climb.sector_tag_id
  }

  const fetchIncompleteClimbs = async () => {
    try {
      setLoading(true)
      const { data, error: fetchError } = await supabase
        .from('climbs')
        .select('id, sector_tag_id, wall, hold_colour_id, tag_colour_id, created_at')
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError
      
      // Filter to only incomplete climbs
      const incomplete = (data || []).filter(isIncomplete)
      setIncompleteClimbs(incomplete)
    } catch (err: any) {
      setError(err.message || 'Failed to load climbs')
    } finally {
      setLoading(false)
    }
  }

  const generateQRCodes = async () => {
    if (count < 1 || count > 100) {
      setError('Please enter a number between 1 and 100')
      return
    }

    setGenerating(true)
    setError(null)
    setSuccess(null)

    try {
      // Create incomplete climbs (all required fields null)
      const climbs = []
      for (let i = 0; i < count; i++) {
        climbs.push({
          climb_type: 'boulder',
          wall: null,
          hold_colour_id: null,
          tag_colour_id: null,
          sector_tag_id: null,
        })
      }

      const { error: insertError } = await supabase
        .from('climbs')
        .insert(climbs)

      if (insertError) throw insertError

      setSuccess(`Successfully generated ${count} QR code(s)`)
      await fetchIncompleteClimbs()
      setCount(20) // Reset to default
    } catch (err: any) {
      setError(err.message || 'Failed to generate QR codes')
    } finally {
      setGenerating(false)
    }
  }

  const deleteClimbs = async (ids: string[]) => {
    if (!confirm(`Are you sure you want to delete ${ids.length} climb(s)?`)) {
      return
    }

    try {
      const { error: deleteError } = await supabase
        .from('climbs')
        .delete()
        .in('id', ids)

      if (deleteError) throw deleteError

      setSuccess(`Successfully deleted ${ids.length} climb(s)`)
      setSelectedClimbs(new Set())
      await fetchIncompleteClimbs()
    } catch (err: any) {
      setError(err.message || 'Failed to delete climbs')
    }
  }

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedClimbs)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedClimbs(newSelected)
  }

  const getQRCodeUrl = (climbId: string) => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/climbs/${climbId}/action`
    }
    return ''
  }

  if (loading || userLoading || roleLoading) {
    return (
      <main className="py-4 sm:py-8 px-4">
        <div className="text-center">Loading...</div>
      </main>
    )
  }

  return (
    <main className="py-4 sm:py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <button
          onClick={() => router.push('/climbs/admin')}
          className="mb-4 text-sm font-medium"
          style={{ color: 'var(--foreground-secondary)' }}
        >
          ← Back to Admin
        </button>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h1 className="text-2xl font-bold">QR Code Management</h1>
        </div>

        {/* Generate Section */}
        <div className="mb-6 p-4 rounded-lg" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)', borderWidth: '1px', borderStyle: 'solid' }}>
          <h2 className="text-lg font-semibold mb-4">Generate New QR Codes</h2>
          <p className="text-sm mb-4" style={{ color: 'var(--foreground-secondary)' }}>
            This will create incomplete climbs that can be filled in later. Each climb gets a unique QR code based on its ID.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground-secondary)' }}>
                Number of QR codes to generate
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={count}
                onChange={(e) => setCount(parseInt(e.target.value) || 20)}
                className="w-full rounded-lg px-4 py-2 outline-none"
                style={{
                  backgroundColor: 'var(--input-bg)',
                  color: 'var(--foreground)',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  borderColor: 'var(--input-border)',
                }}
              />
            </div>
            <button
              onClick={generateQRCodes}
              disabled={generating}
              className="px-6 py-2 rounded-lg font-medium transition disabled:opacity-50"
              style={{
                backgroundColor: 'var(--accent)',
                color: 'var(--accent-text)',
              }}
            >
              {generating ? 'Generating...' : 'Generate QR Codes'}
            </button>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 rounded-lg bg-green-50 text-green-700 text-sm">
            {success}
          </div>
        )}

        {/* Stats */}
        <div className="mb-6 grid grid-cols-1 sm:grid-cols-1 gap-4">
          <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)', borderWidth: '1px', borderStyle: 'solid' }}>
            <div className="text-2xl font-bold">{incompleteClimbs.length}</div>
            <div className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>Incomplete Climbs (Available for QR Codes)</div>
          </div>
        </div>

        {/* QR Codes List */}
        {incompleteClimbs.length === 0 ? (
          <div className="text-center p-8 rounded-lg" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)', borderWidth: '1px', borderStyle: 'solid' }}>
            <p style={{ color: 'var(--foreground-secondary)' }}>No incomplete climbs yet. Generate some above to get started.</p>
          </div>
        ) : (
          <>
            {/* Bulk Actions */}
            {selectedClimbs.size > 0 && (
              <div className="mb-4 p-3 rounded-lg flex items-center justify-between" style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }}>
                <span>{selectedClimbs.size} climb(s) selected</span>
                <button
                  onClick={() => deleteClimbs(Array.from(selectedClimbs))}
                  className="px-4 py-1 rounded text-sm font-medium"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
                >
                  Delete Selected
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {incompleteClimbs.map((climb) => {
                const url = getQRCodeUrl(climb.id)
                return (
                  <div
                    key={climb.id}
                    className="p-4 rounded-lg border-2 border-gray-300 bg-white"
                    style={{ borderColor: 'var(--card-border)' }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedClimbs.has(climb.id)}
                          onChange={() => toggleSelect(climb.id)}
                          className="cursor-pointer"
                        />
                        <span className="text-xs font-mono text-gray-600">{climb.id.substring(0, 8)}...</span>
                      </div>
                      <span className="text-xs px-2 py-1 rounded bg-yellow-100 text-yellow-700">Incomplete</span>
                    </div>
                    {url && (
                      <div className="mb-2 p-2 bg-white border border-gray-200">
                        <QRCodeSVG
                          value={url}
                          size={120}
                          level="H"
                          includeMargin={true}
                        />
                      </div>
                    )}
                    <div className="text-xs text-gray-500 mb-2">
                      Created: {new Date(climb.created_at).toLocaleDateString()}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => router.push(`/climbs/${climb.id}/qr`)}
                        className="flex-1 text-xs py-1 rounded transition"
                        style={{
                          backgroundColor: 'var(--accent)',
                          color: 'var(--accent-text)',
                        }}
                      >
                        Print
                      </button>
                      <button
                        onClick={() => router.push(`/climbs/${climb.id}/edit`)}
                        className="flex-1 text-xs py-1 rounded transition"
                        style={{
                          backgroundColor: 'var(--button-secondary-bg)',
                          color: 'var(--button-secondary-text)',
                        }}
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </main>
  )
}
