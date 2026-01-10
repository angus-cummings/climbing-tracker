'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from '../../../../lib/supabase'
import { useUser } from '../../../../lib/useUser'
import { useRole } from '../../../../lib/useRole'

type ClimbData = {
  sector_tag_id: number
  wall_name: string
  hold_colour_name: string
  tag_colour_name: string
}

export default function QRCodePage() {
  const params = useParams()
  const router = useRouter()
  const climbId = params.id as string
  const { user, loading: authLoading } = useUser()
  const { role, loading: roleLoading } = useRole()
  const [climbData, setClimbData] = useState<ClimbData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (authLoading || roleLoading) return

    // Check if user is admin
    if (!user || role !== 'admin') {
      router.push('/climbs')
      return
    }

    // Fetch climb data
    const fetchClimb = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('climbs')
          .select(`
            sector_tag_id,
            walls!wall(name),
            hold_colour:colours!hold_colour_id(name),
            tag_colour:colours!tag_colour_id(name)
          `)
          .eq('id', climbId)
          .single()

        if (fetchError) throw fetchError

        // Type assertion needed because Supabase joins can be arrays or objects
        const climbData = data as any

        // Handle incomplete climbs (null values)
        setClimbData({
          sector_tag_id: climbData.sector_tag_id || 0,
          wall_name: (Array.isArray(climbData.walls) ? climbData.walls[0]?.name : climbData.walls?.name) || 'Not set',
          hold_colour_name: (Array.isArray(climbData.hold_colour) ? climbData.hold_colour[0]?.name : climbData.hold_colour?.name) || 'Not set',
          tag_colour_name: (Array.isArray(climbData.tag_colour) ? climbData.tag_colour[0]?.name : climbData.tag_colour?.name) || 'Not set',
        })
      } catch (err: any) {
        setError(err.message || 'Failed to load climb data')
      } finally {
        setLoading(false)
      }
    }

    fetchClimb()
  }, [user, role, authLoading, roleLoading, climbId, router])

  const handlePrint = () => {
    window.print()
  }

  const qrCodeUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/climbs/${climbId}/action`
    : ''

  if (loading || authLoading || roleLoading) {
    return (
      <main className="py-4 sm:py-8 px-4">
        <div className="text-center">Loading...</div>
      </main>
    )
  }

  if (error || !climbData) {
    return (
      <main className="py-4 sm:py-8 px-4">
        <div className="text-center text-red-500">{error || 'Climb not found'}</div>
      </main>
    )
  }

  return (
    <main className="py-4 sm:py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Screen view - with controls */}
        <div className="mb-6 print:hidden">
          <button
            onClick={() => router.back()}
            className="mb-4 text-sm font-medium"
            style={{ color: 'var(--foreground-secondary)' }}
          >
            ← Back
          </button>
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">QR Code Tag</h1>
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-lg font-medium transition"
              style={{
                backgroundColor: 'var(--accent)',
                color: 'var(--accent-text)',
              }}
            >
              Print Tag
            </button>
          </div>
          <p className="text-sm mb-4" style={{ color: 'var(--foreground-secondary)' }}>
            Print this page to create a tag for the climb. The QR code can be scanned by setters to edit the climb or by climbers to mark it as sent.
          </p>
        </div>

        {/* Print view - optimized for printing */}
        <div className="bg-white p-8 print:p-6 border-2 border-gray-300 print:border-0">
          <div className="flex flex-col items-center gap-6">
            {/* QR Code */}
            <div className="p-4 bg-white border-2 border-gray-400">
              {qrCodeUrl && (
                <QRCodeSVG
                  value={qrCodeUrl}
                  size={200}
                  level="H"
                  includeMargin={true}
                />
              )}
            </div>

            {/* Climb Information */}
            <div className="text-center">
              {climbData.sector_tag_id ? (
                <>
                  <div className="text-2xl font-bold mb-2 text-gray-900">
                    Sector Tag #{climbData.sector_tag_id}
                  </div>
                  <div className="text-lg text-gray-700 mb-1">
                    {climbData.wall_name}
                  </div>
                  <div className="text-base text-gray-600">
                    {climbData.hold_colour_name} / {climbData.tag_colour_name}
                  </div>
                </>
              ) : (
                <>
                  <div className="text-xl font-bold mb-2 text-gray-900">
                    QR Code: {climbId.substring(0, 8)}...
                  </div>
                  <div className="text-sm text-gray-600">
                    Climb details to be filled in
                  </div>
                </>
              )}
            </div>

            {/* Instructions */}
            <div className="text-xs text-gray-500 text-center max-w-xs">
              <div className="mb-1">Setters: Scan to edit climb details</div>
              <div>Climbers: Scan to mark as sent</div>
            </div>
          </div>
        </div>

        {/* Print styles */}
        <style jsx global>{`
          @media print {
            body {
              background: white;
            }
            @page {
              margin: 0.5in;
              size: letter;
            }
            .print\\:hidden {
              display: none !important;
            }
            .print\\:border-0 {
              border: none !important;
            }
            .print\\:p-6 {
              padding: 1.5rem !important;
            }
          }
        `}</style>
      </div>
    </main>
  )
}
