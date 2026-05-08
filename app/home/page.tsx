'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'
import { useUser } from '../../lib/useUser'
import { useProfile } from '../../lib/ProfileContext'

type Category = {
  id: number
  name: string
  sort_order: number
}

type Competition = {
  id: number
  name: string
  is_current: boolean
  categories: Category[]
}

type Registration = {
  competition_id: number
  competitor_number: number
  category_name: string | null
}

export default function HomePage() {
  const router = useRouter()
  const { user, loading: userLoading } = useUser()
  const { selectedProfile, loading: profileLoading } = useProfile()
  const [competitions, setCompetitions] = useState<Competition[]>([])
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [registeringId, setRegisteringId] = useState<number | null>(null)
  const [registerError, setRegisterError] = useState<string | null>(null)

  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/')
    }
  }, [user, userLoading, router])

  useEffect(() => {
    if (!profileLoading && !selectedProfile && user) {
      router.push('/onboarding')
    }
  }, [profileLoading, selectedProfile, user, router])

  useEffect(() => {
    if (!user || !selectedProfile) return

    setDataLoading(true)
    setRegisterError(null)

    Promise.all([
      supabase
        .from('competitions')
        .select('id, name, is_current, competition_categories(id, name, sort_order)')
        .order('created_at', { ascending: false }),
      supabase
        .from('competition_registrations')
        .select('competition_id, competitor_number, competition_categories(name)')
        .eq('profile_id', selectedProfile.profile_id)
    ]).then(([{ data: compsData }, { data: regsData }]) => {
      const comps = (compsData ?? []).map((c: any) => ({
        ...c,
        categories: (c.competition_categories ?? []).sort(
          (a: Category, b: Category) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)
        ),
      }))
      setCompetitions(comps)

      const regs = (regsData ?? []).map((r: any) => ({
        competition_id: r.competition_id,
        competitor_number: r.competitor_number,
        category_name: r.competition_categories?.name ?? null,
      }))
      setRegistrations(regs)
      setDataLoading(false)
    })
  }, [user, selectedProfile])

  const handleRegister = async (competitionId: number, categoryId: number | null) => {
    if (!selectedProfile) return
    setRegisteringId(competitionId)
    setRegisterError(null)

    const { data, error } = await supabase.rpc('register_for_competition', {
      p_profile_id: selectedProfile.profile_id,
      p_competition_id: competitionId,
      p_category_id: categoryId,
    })

    if (error) {
      if (error.code === '23505' || error.message?.includes('already')) {
        const { data: regsData } = await supabase
          .from('competition_registrations')
          .select('competition_id, competitor_number, competition_categories(name)')
          .eq('profile_id', selectedProfile.profile_id)
        const regs = (regsData ?? []).map((r: any) => ({
          competition_id: r.competition_id,
          competitor_number: r.competitor_number,
          category_name: r.competition_categories?.name ?? null,
        }))
        setRegistrations(regs)
      } else {
        setRegisterError(error.message)
      }
    } else if (data && data.length > 0) {
      const result = data[0]
      const comp = competitions.find(c => c.id === competitionId)
      const catName = categoryId
        ? comp?.categories.find(c => c.id === categoryId)?.name ?? null
        : null
      setRegistrations(prev => {
        const without = prev.filter(r => r.competition_id !== competitionId)
        return [...without, {
          competition_id: competitionId,
          competitor_number: result.competitor_number,
          category_name: catName,
        }]
      })
    }

    setRegisteringId(null)
  }

  if (userLoading || profileLoading) {
    return (
      <main className="flex min-h-[80vh] items-center justify-center">
        <p style={{ color: 'var(--foreground-secondary)' }}>Loading…</p>
      </main>
    )
  }

  if (!user) return null

  if (!selectedProfile) return null

  const currentComp = competitions.find(c => c.is_current)
  const pastComps = competitions.filter(c => !c.is_current)
  const getRegistration = (compId: number) =>
    registrations.find(r => r.competition_id === compId) ?? null

  return (
    <main className="px-0 py-4 sm:py-8">
      <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6" style={{ color: 'var(--foreground)' }}>
        Competitions
      </h2>

      {dataLoading ? (
        <p className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>Loading…</p>
      ) : (
        <div className="grid gap-4">
          {currentComp ? (
            <ActiveCompCard
              competition={currentComp}
              registration={getRegistration(currentComp.id)}
              registering={registeringId === currentComp.id}
              onRegister={(categoryId) => handleRegister(currentComp.id, categoryId)}
            />
          ) : (
            <div
              className="rounded-2xl p-6 text-center"
              style={{
                backgroundColor: 'var(--card-bg)',
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: 'var(--card-border)',
              }}
            >
              <p style={{ color: 'var(--foreground-secondary)' }}>No active competition at the moment</p>
            </div>
          )}

          {registerError && (
            <div
              className="rounded-lg px-4 py-3 text-sm"
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                color: '#ef4444',
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: 'rgba(239, 68, 68, 0.2)'
              }}
            >
              {registerError}
            </div>
          )}

          {pastComps.length > 0 && (
            <>
              <h3 className="text-base font-semibold mt-2" style={{ color: 'var(--foreground-secondary)' }}>
                Past Competitions
              </h3>
              {pastComps.map(comp => (
                <PastCompCard
                  key={comp.id}
                  competition={comp}
                  registration={getRegistration(comp.id)}
                />
              ))}
            </>
          )}
        </div>
      )}
    </main>
  )
}

function ActiveCompCard({
  competition,
  registration,
  registering,
  onRegister,
}: {
  competition: Competition
  registration: Registration | null
  registering: boolean
  onRegister: (categoryId: number | null) => void
}) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
    competition.categories.length === 1 ? competition.categories[0].id : null
  )
  const hasCategories = competition.categories.length > 0
  const categoryRequired = hasCategories && selectedCategoryId === null

  return (
    <div
      className="rounded-2xl p-5 sm:p-6"
      style={{
        backgroundColor: 'var(--card-bg)',
        borderWidth: '2px',
        borderStyle: 'solid',
        borderColor: 'var(--accent)',
      }}
    >
      <div className="flex items-center gap-2 mb-1">
        <span
          className="text-xs font-semibold px-2 py-0.5 rounded-full"
          style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }}
        >
          ACTIVE
        </span>
      </div>
      <h3 className="text-lg sm:text-xl font-bold mb-3" style={{ color: 'var(--foreground)' }}>
        {competition.name}
      </h3>

      {registration ? (
        /* Already registered */
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>
              Your competitor number:{' '}
              <span className="font-semibold" style={{ color: 'var(--accent)' }}>
                #{registration.competitor_number}
              </span>
            </p>
            {registration.category_name && (
              <p className="text-sm mt-0.5" style={{ color: 'var(--foreground-secondary)' }}>
                Category:{' '}
                <span className="font-semibold" style={{ color: 'var(--foreground)' }}>
                  {registration.category_name}
                </span>
              </p>
            )}
          </div>
          <Link
            href="/climbs"
            className="rounded-lg px-5 py-2.5 font-medium text-sm text-center transition-all"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--accent-hover)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--accent)'}
          >
            Go to Climbs
          </Link>
        </div>
      ) : (
        /* Not yet registered */
        <div className="space-y-3">
          {hasCategories && (
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--foreground-secondary)' }}>
                Select your category
              </label>
              <select
                value={selectedCategoryId ?? ''}
                onChange={e => setSelectedCategoryId(e.target.value ? Number(e.target.value) : null)}
                className="w-full rounded-lg px-4 py-2.5 text-sm outline-none transition"
                style={{
                  backgroundColor: 'var(--input-bg)',
                  color: 'var(--foreground)',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  borderColor: 'var(--input-border)',
                }}
                onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 0 0 2px var(--accent)' }}
                onBlur={e => { e.currentTarget.style.borderColor = 'var(--input-border)'; e.currentTarget.style.boxShadow = 'none' }}
              >
                <option value="">Select a category</option>
                {competition.categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <button
              onClick={() => onRegister(selectedCategoryId)}
              disabled={registering || categoryRequired}
              className="rounded-lg px-5 py-2.5 font-medium text-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }}
              onMouseEnter={(e) => { if (!registering && !categoryRequired) e.currentTarget.style.backgroundColor = 'var(--accent-hover)' }}
              onMouseLeave={(e) => { if (!registering && !categoryRequired) e.currentTarget.style.backgroundColor = 'var(--accent)' }}
            >
              {registering ? 'Registering…' : 'Register for this comp'}
            </button>
            {categoryRequired && (
              <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>
                Select a category first
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function PastCompCard({
  competition,
  registration,
}: {
  competition: Competition
  registration: Registration | null
}) {
  return (
    <Link
      href={`/competitions/${competition.id}`}
      className="block rounded-2xl p-4 sm:p-5 transition-all"
      style={{
        backgroundColor: 'var(--card-bg)',
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: 'var(--card-border)',
      }}
      onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
      onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--card-border)'}
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold" style={{ color: 'var(--foreground)' }}>{competition.name}</h3>
          {registration && (
            <p className="text-xs mt-0.5" style={{ color: 'var(--foreground-secondary)' }}>
              You competed as #{registration.competitor_number}
              {registration.category_name ? ` · ${registration.category_name}` : ''}
            </p>
          )}
        </div>
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          style={{ color: 'var(--foreground-secondary)', flexShrink: 0 }}
        >
          <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </Link>
  )
}
