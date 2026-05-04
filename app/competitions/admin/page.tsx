'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import { useUser } from '../../../lib/useUser'
import { useRole } from '../../../lib/useRole'

type Category = {
  id: number
  name: string
  sort_order: number
}

type Competition = {
  id: number
  name: string
  is_current: boolean
  created_at: string
  categories: Category[]
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
      .select('id, name, is_current, created_at, competition_categories(id, name, sort_order)')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        const comps = (data ?? []).map((c: any) => ({
          ...c,
          categories: (c.competition_categories ?? []).sort(
            (a: Category, b: Category) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)
          ),
        }))
        setCompetitions(comps)
        setLoadingData(false)
      })
  }, [user, role])

  const handleSetCurrent = async (competitionId: number) => {
    setError(null)
    setSettingCurrent(competitionId)

    const { error: clearError } = await supabase
      .from('competitions')
      .update({ is_current: false })
      .neq('id', competitionId)

    if (clearError) { setError(clearError.message); setSettingCurrent(null); return }

    const { error: setErr } = await supabase
      .from('competitions')
      .update({ is_current: true })
      .eq('id', competitionId)

    if (setErr) { setError(setErr.message); setSettingCurrent(null); return }

    setCompetitions(prev => prev.map(c => ({ ...c, is_current: c.id === competitionId })))
    setSettingCurrent(null)
  }

  const addCategory = async (competitionId: number, name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return

    const { data, error: err } = await supabase
      .from('competition_categories')
      .insert({ competition_id: competitionId, name: trimmed })
      .select('id, name, sort_order')
      .single()

    if (err) { setError(err.message); return }

    setCompetitions(prev => prev.map(c =>
      c.id === competitionId
        ? { ...c, categories: [...c.categories, data].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)) }
        : c
    ))
  }

  const deleteCategory = async (competitionId: number, categoryId: number) => {
    const { error: err } = await supabase
      .from('competition_categories')
      .delete()
      .eq('id', categoryId)

    if (err) { setError(err.message); return }

    setCompetitions(prev => prev.map(c =>
      c.id === competitionId
        ? { ...c, categories: c.categories.filter(cat => cat.id !== categoryId) }
        : c
    ))
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
                <CompetitionItem
                  key={comp.id}
                  comp={comp}
                  settingCurrent={settingCurrent}
                  onSetCurrent={handleSetCurrent}
                  onAddCategory={addCategory}
                  onDeleteCategory={deleteCategory}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  )
}

function CompetitionItem({
  comp,
  settingCurrent,
  onSetCurrent,
  onAddCategory,
  onDeleteCategory,
}: {
  comp: Competition
  settingCurrent: number | null
  onSetCurrent: (id: number) => void
  onAddCategory: (competitionId: number, name: string) => void
  onDeleteCategory: (competitionId: number, categoryId: number) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [adding, setAdding] = useState(false)

  const handleAdd = async () => {
    if (!newCategoryName.trim()) return
    setAdding(true)
    await onAddCategory(comp.id, newCategoryName)
    setNewCategoryName('')
    setAdding(false)
  }

  return (
    <li>
      {/* Header row */}
      <div className="px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-2 min-w-0 text-left"
          >
            <svg
              className="transition-transform flex-shrink-0"
              style={{
                transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
                width: '14px',
                height: '14px',
                fill: 'var(--foreground-secondary)',
              }}
              viewBox="0 0 20 20"
            >
              <path d="M7.293 4.707a1 1 0 011.414-1.414l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L12.586 10 7.293 4.707z" />
            </svg>
            <span className="font-medium text-sm sm:text-base truncate" style={{ color: 'var(--foreground)' }}>
              {comp.name}
            </span>
          </button>
          {comp.is_current && (
            <span
              className="text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0"
              style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }}
            >
              Current
            </span>
          )}
          {comp.categories.length > 0 && (
            <span className="text-xs flex-shrink-0" style={{ color: 'var(--foreground-secondary)' }}>
              {comp.categories.length} {comp.categories.length === 1 ? 'category' : 'categories'}
            </span>
          )}
        </div>

        {!comp.is_current && (
          <button
            onClick={() => onSetCurrent(comp.id)}
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
      </div>

      {/* Expanded: category management */}
      {expanded && (
        <div
          className="px-4 sm:px-6 pb-4"
          style={{ borderTopWidth: '1px', borderTopStyle: 'solid', borderTopColor: 'var(--card-border)' }}
        >
          <p className="text-xs font-semibold mt-3 mb-2" style={{ color: 'var(--foreground-secondary)' }}>
            Registration Categories
          </p>

          {comp.categories.length === 0 ? (
            <p className="text-xs mb-3" style={{ color: 'var(--foreground-secondary)' }}>
              No categories — all registrations are open.
            </p>
          ) : (
            <ul className="mb-3 space-y-1">
              {comp.categories.map(cat => (
                <li key={cat.id} className="flex items-center justify-between gap-2">
                  <span className="text-sm" style={{ color: 'var(--foreground)' }}>{cat.name}</span>
                  <button
                    onClick={() => onDeleteCategory(comp.id, cat.id)}
                    className="text-xs px-2 py-0.5 rounded transition"
                    style={{ color: '#ef4444' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="flex gap-2">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAdd() }}
              placeholder="e.g. Open, Youth, Masters…"
              className="flex-1 rounded-lg px-3 py-1.5 text-sm outline-none transition"
              style={{
                backgroundColor: 'var(--input-bg)',
                color: 'var(--foreground)',
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: 'var(--input-border)',
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
              onBlur={(e) => e.currentTarget.style.borderColor = 'var(--input-border)'}
            />
            <button
              onClick={handleAdd}
              disabled={adding || !newCategoryName.trim()}
              className="rounded-lg px-3 py-1.5 text-sm font-medium transition disabled:opacity-50"
              style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }}
              onMouseEnter={(e) => { if (!adding) e.currentTarget.style.backgroundColor = 'var(--accent-hover)' }}
              onMouseLeave={(e) => { if (!adding) e.currentTarget.style.backgroundColor = 'var(--accent)' }}
            >
              {adding ? 'Adding…' : 'Add'}
            </button>
          </div>
        </div>
      )}
    </li>
  )
}
