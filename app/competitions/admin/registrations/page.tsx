'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../../lib/supabase'
import { useUser } from '../../../../lib/useUser'
import { useRole } from '../../../../lib/useRole'

type Competition = {
  id: number
  name: string
}

type CompetitionRegistrationRow = {
  profile_id: string
  user_id: string | null
  username: string | null
  email: string | null
  phone_number: string | null
  comp_cohort: string | null
  age_category: string | null
  role: string | null
  competitor_number: number
  category_name: string | null
  registered_at: string | null
}

type RegistrationRecord = {
  id: string
  profile_id: string
  competitor_number: number
  registered_at: string | null
  category_id: number | null
  username: string | null
  email: string | null
  phone_number: string | null
  comp_cohort: string | null
  age_category: string | null
  role: string | null
  category_name: string | null
}

const escapeCsvValue = (value: string | number | null | undefined) => {
  const stringValue = String(value ?? '')

  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`
  }

  return stringValue
}

export default function CompetitionRegistrationsExportPage() {
  const router = useRouter()
  const { user, loading: userLoading } = useUser()
  const { role, loading: roleLoading } = useRole()

  const [competitions, setCompetitions] = useState<Competition[]>([])
  const [selectedCompetitionId, setSelectedCompetitionId] = useState<number | ''>('')
  const [registrations, setRegistrations] = useState<RegistrationRecord[]>([])
  const [loadingCompetitions, setLoadingCompetitions] = useState(true)
  const [loadingRegistrations, setLoadingRegistrations] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!userLoading && !roleLoading) {
      if (!user) {
        router.push('/')
        return
      }

      if (role !== 'admin') {
        router.push('/climbs')
        return
      }
    }
  }, [user, role, userLoading, roleLoading, router])

  useEffect(() => {
    if (!user || role !== 'admin') return

    const fetchCompetitions = async () => {
      setLoadingCompetitions(true)
      setError(null)

      const { data, error: competitionsError } = await supabase
        .from('competitions')
        .select('id, name')
        .order('created_at', { ascending: false })

      if (competitionsError) {
        setError(competitionsError.message || 'Failed to load competitions')
        setCompetitions([])
        setLoadingCompetitions(false)
        return
      }

      const nextCompetitions = data ?? []
      setCompetitions(nextCompetitions)

      if (nextCompetitions.length > 0 && !selectedCompetitionId) {
        setSelectedCompetitionId(nextCompetitions[0].id)
      }

      setLoadingCompetitions(false)
    }

    fetchCompetitions()
  }, [user, role, selectedCompetitionId])

  useEffect(() => {
    if (!user || role !== 'admin' || selectedCompetitionId === '') return

    const fetchRegistrations = async () => {
      setLoadingRegistrations(true)
      setError(null)

      try {
        const { data: registrationData, error: registrationsError } = await supabase
          .rpc('get_competition_registrations_for_export', {
            p_competition_id: selectedCompetitionId,
          })

        if (registrationsError) {
          throw registrationsError
        }

        const mapped: RegistrationRecord[] = (registrationData ?? []).map((registration: CompetitionRegistrationRow) => ({
          id: registration.profile_id,
          profile_id: registration.profile_id,
          competitor_number: registration.competitor_number,
          registered_at: registration.registered_at,
          category_id: null,
          username: registration.username,
          email: registration.email,
          phone_number: registration.phone_number,
          comp_cohort: registration.comp_cohort,
          age_category: registration.age_category,
          role: registration.role,
          category_name: registration.category_name,
        }))

        setRegistrations(mapped)
      } catch (err: any) {
        console.error('Error fetching competition registrations:', err)
        setError(err.message || 'Failed to load registrations')
        setRegistrations([])
      } finally {
        setLoadingRegistrations(false)
      }
    }

    fetchRegistrations()
  }, [user, role, selectedCompetitionId])

  const selectedCompetition = useMemo(
    () => competitions.find((competition) => competition.id === selectedCompetitionId) ?? null,
    [competitions, selectedCompetitionId]
  )

  const handleDownloadCsv = () => {
    if (registrations.length === 0) return

    const headers = [
      'Competitor Number',
      'Username',
      'Email',
      'Phone Number',
      'Role',
      'Cohort',
      'Age Category',
      'Category',
      'Registered At',
    ]

    const rows = registrations.map((registration) => [
      registration.competitor_number,
      registration.username,
      registration.email,
      registration.phone_number,
      registration.role,
      registration.comp_cohort,
      registration.age_category,
      registration.category_name,
      registration.registered_at ? new Date(registration.registered_at).toISOString() : '',
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => escapeCsvValue(cell)).join(',')),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    const safeCompetitionName = (selectedCompetition?.name ?? 'competition').replace(/[^a-z0-9-_]+/gi, '_').toLowerCase()

    link.setAttribute('href', url)
    link.setAttribute('download', `${safeCompetitionName}-registered-users-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  if (userLoading || roleLoading || loadingCompetitions) {
    return (
      <main className="py-10">
        <p className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>Loading…</p>
      </main>
    )
  }

  if (role !== 'admin') return null

  return (
    <main className="py-4 sm:py-8 px-4 sm:px-0">
      <div className="max-w-3xl space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight" style={{ color: 'var(--foreground)' }}>
            Download Competition Registrations
          </h1>
          <p className="mt-1 text-xs sm:text-sm" style={{ color: 'var(--foreground-secondary)' }}>
            Choose a competition to export every registered user as a CSV file.
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
              borderColor: 'rgba(239, 68, 68, 0.4)',
            }}
          >
            {error}
          </div>
        )}

        <div
          className="rounded-2xl p-4 sm:p-6 shadow"
          style={{
            backgroundColor: 'var(--card-bg)',
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: 'var(--card-border)',
          }}
        >
          <div className="flex flex-col sm:flex-row sm:items-end gap-4">
            <label className="flex-1 min-w-0">
              <span className="mb-2 block text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                Competition
              </span>
              <select
                value={selectedCompetitionId}
                onChange={(event) => setSelectedCompetitionId(Number(event.target.value))}
                className="w-full rounded-lg px-3 py-2 text-sm"
                style={{
                  backgroundColor: 'var(--input-bg)',
                  color: 'var(--foreground)',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  borderColor: 'var(--input-border)',
                }}
              >
                <option value="">Select a competition</option>
                {competitions.map((competition) => (
                  <option key={competition.id} value={competition.id}>
                    {competition.name}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              onClick={handleDownloadCsv}
              disabled={selectedCompetitionId === '' || registrations.length === 0 || loadingRegistrations}
              className="rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: 'var(--accent)',
                color: 'var(--accent-text)',
              }}
            >
              {loadingRegistrations ? 'Loading…' : 'Download CSV'}
            </button>
          </div>
        </div>

        {selectedCompetitionId !== '' && (
          <div
            className="rounded-2xl overflow-hidden shadow"
            style={{
              backgroundColor: 'var(--card-bg)',
              borderWidth: '1px',
              borderStyle: 'solid',
              borderColor: 'var(--card-border)',
            }}
          >
            {loadingRegistrations ? (
              <p className="p-6 text-sm" style={{ color: 'var(--foreground-secondary)' }}>
                Loading registrations…
              </p>
            ) : registrations.length === 0 ? (
              <p className="p-6 text-sm" style={{ color: 'var(--foreground-secondary)' }}>
                No registered users found for {selectedCompetition?.name ?? 'this competition'}.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead style={{ backgroundColor: 'var(--card-header-bg)' }}>
                    <tr>
                      <th className="px-4 py-3 font-medium">#</th>
                      <th className="px-4 py-3 font-medium">Name</th>
                      <th className="px-4 py-3 font-medium">Email</th>
                      <th className="px-4 py-3 font-medium">Phone</th>
                      <th className="px-4 py-3 font-medium">Cohort</th>
                      <th className="px-4 py-3 font-medium">Age</th>
                      <th className="px-4 py-3 font-medium">Category</th>
                    </tr>
                  </thead>
                  <tbody>
                    {registrations.map((registration) => (
                      <tr key={registration.id} style={{ borderTopWidth: '1px', borderTopColor: 'var(--card-border)' }}>
                        <td className="px-4 py-3" style={{ color: 'var(--foreground)' }}>{registration.competitor_number}</td>
                        <td className="px-4 py-3" style={{ color: 'var(--foreground)' }}>{registration.username ?? '—'}</td>
                        <td className="px-4 py-3" style={{ color: 'var(--foreground-secondary)' }}>{registration.email ?? '—'}</td>
                        <td className="px-4 py-3" style={{ color: 'var(--foreground-secondary)' }}>{registration.phone_number ?? '—'}</td>
                        <td className="px-4 py-3" style={{ color: 'var(--foreground-secondary)' }}>{registration.comp_cohort ?? '—'}</td>
                        <td className="px-4 py-3" style={{ color: 'var(--foreground-secondary)' }}>{registration.age_category ?? '—'}</td>
                        <td className="px-4 py-3" style={{ color: 'var(--foreground-secondary)' }}>{registration.category_name ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
