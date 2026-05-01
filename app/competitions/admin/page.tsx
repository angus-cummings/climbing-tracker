'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import { useUser } from '../../../lib/useUser'
import { useRole } from '../../../lib/useRole'

type Competition = {
  id: number
  name: string
  is_current: boolean
  created_at: string
}

export default function ManageCompetitionsPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useUser()
  const { role, loading: roleLoading } = useRole()
  const [competitions, setCompetitions] = useState<Competition[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [settingCurrent, setSettingCurrent] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && !roleLoading) {
      if (!user) { router.push('/'); return }
      if (role !== 'admin') { router.push('/climbs'); return }
    }
  }, [user, role, authLoading, roleLoading, router])

  useEffect(() => {
    if (!user || role !== 'admin') return
    supabase
      .from('competitions')
      .select('id, name, is_current, created_at')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setCompetitions(data ?? [])
        setLoadingData(false)
      })
  }, [user, role])

  const handleSetCurrent = async (competitionId: number) => {
    setError(null)
    setSettingCurrent(competitionId)

    // Clear current flag from all, then set on the chosen one
    const { error: clearError } = await supabase
      .from('competitions')
      .update({ is_current: false })
      .neq('id', competitionId)

    if (clearError) {
      setError(clearError.message)
      setSettingCurrent(null)
      return
    }

    const { error: setError_ } = await supabase
      .from('competitions')
      .update({ is_current: true })
      .eq('id', competitionId)

    if (setError_) {
      setError(setError_.message)
      setSettingCurrent(null)
      return
    }

    setCompetitions(prev =>
      prev.map(c => ({ ...c, is_current: c.id === competitionId }))
    )
    setSettingCurrent(null)
  }

  if (authLoading || roleLoading || loadingData) {
    return (
      <main className="py-10">
        <p className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>Loading…</p>
      </main>
    )
  }

  if (role !== 'admin') return null

  return (
    <main className="py-4 sm:py-8 px-4 sm:px-0">
      <div className="max-w-xl space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight" style={{ color: 'var(--foreground)' }}>
            Manage Competitions
          </h1>
          <p className="mt-1 text-xs sm:text-sm" style={{ color: 'var(--foreground-secondary)' }}>
            The current competition is the default shown on the leaderboard and used for new climb entries.
          </p>
        </div>

        {error && (
          <div
            className="rounded-lg px-3 py-2 text-sm"
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

        <div
          className="rounded-2xl overflow-hidden shadow"
          style={{
            backgroundColor: 'var(--card-bg)',
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: 'var(--card-border)',
          }}
        >
          {competitions.length === 0 ? (
            <p className="p-6 text-sm" style={{ color: 'var(--foreground-secondary)' }}>No competitions found.</p>
          ) : (
            <ul className="divide-y" style={{ borderColor: 'var(--card-border)' }}>
              {competitions.map(comp => (
                <li
                  key={comp.id}
                  className="px-4 sm:px-6 py-4 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-medium text-sm sm:text-base truncate" style={{ color: 'var(--foreground)' }}>
                      {comp.name}
                    </span>
                    {comp.is_current && (
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0"
                        style={{
                          backgroundColor: 'var(--accent)',
                          color: 'var(--accent-text)',
                        }}
                      >
                        Current
                      </span>
                    )}
                  </div>

                  {!comp.is_current && (
                    <button
                      onClick={() => handleSetCurrent(comp.id)}
                      disabled={settingCurrent !== null}
                      className="flex-shrink-0 rounded-lg px-3 py-1.5 text-xs sm:text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{
                        backgroundColor: 'var(--button-secondary-bg)',
                        color: 'var(--button-secondary-text)',
                        borderWidth: '1px',
                        borderStyle: 'solid',
                        borderColor: 'var(--border)',
                      }}
                      onMouseEnter={(e) => { if (!settingCurrent) e.currentTarget.style.backgroundColor = 'var(--button-secondary-hover)' }}
                      onMouseLeave={(e) => { if (!settingCurrent) e.currentTarget.style.backgroundColor = 'var(--button-secondary-bg)' }}
                    >
                      {settingCurrent === comp.id ? 'Setting…' : 'Set as current'}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  )
}
