'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { useUser } from '../../lib/useUser'
import { useProfile } from '../../lib/ProfileContext'
import { validateProfileName, validatePhoneNumber } from '../../lib/validation'

export default function OnboardingPage() {
  const router = useRouter()
  const { user, loading: userLoading } = useUser()
  const { profiles, profileLoading, refreshProfiles } = useProfile()

  const [name, setName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [compCohort, setCompCohort] = useState<'male' | 'female' | 'inclusive'>('inclusive')
  const [ageCategory, setAgeCategory] = useState<'u18' | 'adult' | 'masters' | ''>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nameError, setNameError] = useState<string | null>(null)
  const [phoneError, setPhoneError] = useState<string | null>(null)

  // Pre-populate name from Google user metadata
  useEffect(() => {
    if (user?.user_metadata?.full_name) {
      setName(user.user_metadata.full_name)
    } else if (user?.user_metadata?.name) {
      setName(user.user_metadata.name)
    }
  }, [user])

  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/')
    }
  }, [user, userLoading, router])

  useEffect(() => {
    if (!profileLoading && profiles.length > 0) {
      router.push('/home')
    }
  }, [profiles, profileLoading, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setNameError(null)
    setPhoneError(null)

    const nameValidation = validateProfileName(name)
    if (!nameValidation.valid) {
      setNameError(nameValidation.error || 'Invalid name')
      setError(nameValidation.error || 'Invalid name')
      return
    }

    const phoneValidation = validatePhoneNumber(phoneNumber)
    if (!phoneValidation.valid) {
      setPhoneError(phoneValidation.error || 'Invalid phone number')
      setError(phoneValidation.error || 'Invalid phone number')
      return
    }

    if (!ageCategory) {
      setError('Age category is required')
      return
    }

    setLoading(true)
    const { error: profileError } = await supabase.rpc('create_user_profile', {
      p_user_id: user!.id,
      p_name: name,
      p_phone_number: phoneNumber,
      p_comp_cohort: compCohort,
      p_age_category: ageCategory,
    })

    if (profileError) {
      setError(profileError.message)
      setLoading(false)
      return
    }

    await refreshProfiles()
    router.push('/home')
  }

  if (userLoading || profileLoading) {
    return (
      <main className="flex min-h-[80vh] items-center justify-center">
        <p style={{ color: 'var(--foreground-secondary)' }}>Loading…</p>
      </main>
    )
  }

  if (!user) return null

  return (
    <main className="flex min-h-[80vh] items-center justify-center px-4 py-6 sm:px-6">
      <div className="w-full max-w-md">
        <div
          className="rounded-2xl p-4 sm:p-6 md:p-8 shadow-xl"
          style={{
            backgroundColor: 'var(--card-bg)',
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: 'var(--card-border)',
            boxShadow: `0 20px 25px -5px var(--shadow), 0 10px 10px -5px var(--shadow)`,
          }}
        >
          <h1 className="mb-2 text-2xl sm:text-3xl font-bold" style={{ color: 'var(--foreground)' }}>
            Set Up Your Profile
          </h1>
          <p className="mb-4 sm:mb-6 text-sm sm:text-base" style={{ color: 'var(--foreground-secondary)' }}>
            Just a few details to get you competition-ready
          </p>

          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            <div>
              <label
                className="mb-1.5 block text-sm font-medium"
                style={{ color: 'var(--foreground-secondary)' }}
              >
                Name <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  if (nameError) {
                    const v = validateProfileName(e.target.value)
                    setNameError(v.valid ? null : v.error || null)
                  }
                }}
                onBlur={(e) => {
                  const v = validateProfileName(e.target.value)
                  setNameError(v.valid ? null : v.error || null)
                  e.currentTarget.style.borderColor = v.valid ? 'var(--input-border)' : '#ef4444'
                  e.currentTarget.style.boxShadow = 'none'
                }}
                placeholder="Your full name"
                className="w-full rounded-lg px-4 py-3 sm:py-2.5 text-base sm:text-sm outline-none transition"
                style={{
                  backgroundColor: 'var(--input-bg)',
                  color: 'var(--foreground)',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  borderColor: nameError ? '#ef4444' : 'var(--input-border)',
                  minHeight: '44px',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = nameError ? '#ef4444' : 'var(--accent)'
                  e.currentTarget.style.boxShadow = nameError ? 'none' : `0 0 0 2px var(--accent)`
                }}
                disabled={loading}
                required
              />
              {nameError && (
                <p className="mt-1 text-xs" style={{ color: '#ef4444' }}>{nameError}</p>
              )}
            </div>

            <div>
              <label
                className="mb-1.5 block text-sm font-medium"
                style={{ color: 'var(--foreground-secondary)' }}
              >
                Phone Number <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => {
                  setPhoneNumber(e.target.value)
                  if (phoneError) {
                    const v = validatePhoneNumber(e.target.value)
                    setPhoneError(v.valid ? null : v.error || null)
                  }
                }}
                onBlur={(e) => {
                  const v = validatePhoneNumber(e.target.value)
                  setPhoneError(v.valid ? null : v.error || null)
                  e.currentTarget.style.borderColor = v.valid ? 'var(--input-border)' : '#ef4444'
                  e.currentTarget.style.boxShadow = 'none'
                }}
                placeholder="+1 (555) 123-4567"
                className="w-full rounded-lg px-4 py-3 sm:py-2.5 text-base sm:text-sm outline-none transition"
                style={{
                  backgroundColor: 'var(--input-bg)',
                  color: 'var(--foreground)',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  borderColor: phoneError ? '#ef4444' : 'var(--input-border)',
                  minHeight: '44px',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = phoneError ? '#ef4444' : 'var(--accent)'
                  e.currentTarget.style.boxShadow = phoneError ? 'none' : `0 0 0 2px var(--accent)`
                }}
                disabled={loading}
                required
              />
              {phoneError ? (
                <p className="mt-1 text-xs" style={{ color: '#ef4444' }}>{phoneError}</p>
              ) : (
                <p className="mt-1 text-xs" style={{ color: 'var(--foreground-secondary)', opacity: 0.7 }}>
                  Format: +1 (555) 123-4567 or 555-123-4567
                </p>
              )}
            </div>

            <div>
              <label
                className="mb-1.5 block text-sm font-medium"
                style={{ color: 'var(--foreground-secondary)' }}
              >
                Gender Cohort <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <select
                value={compCohort}
                onChange={e => setCompCohort(e.target.value as 'male' | 'female' | 'inclusive')}
                className="w-full rounded-lg px-4 py-3 sm:py-2.5 text-base sm:text-sm outline-none transition"
                style={{
                  backgroundColor: 'var(--input-bg)',
                  color: 'var(--foreground)',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  borderColor: 'var(--input-border)',
                  minHeight: '44px',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--accent)'
                  e.currentTarget.style.boxShadow = `0 0 0 2px var(--accent)`
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--input-border)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
                disabled={loading}
                required
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="inclusive">Inclusive</option>
              </select>
              <p className="mt-1 text-xs" style={{ color: 'var(--foreground-secondary)', opacity: 0.7 }}>
                Select your gender category for competition
              </p>
            </div>

            <div>
              <label
                className="mb-1.5 block text-sm font-medium"
                style={{ color: 'var(--foreground-secondary)' }}
              >
                Age Category <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <select
                value={ageCategory}
                onChange={e => setAgeCategory(e.target.value as 'u18' | 'adult' | 'masters')}
                className="w-full rounded-lg px-4 py-3 sm:py-2.5 text-base sm:text-sm outline-none transition"
                style={{
                  backgroundColor: 'var(--input-bg)',
                  color: 'var(--foreground)',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  borderColor: 'var(--input-border)',
                  minHeight: '44px',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--accent)'
                  e.currentTarget.style.boxShadow = `0 0 0 2px var(--accent)`
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--input-border)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
                disabled={loading}
                required
              >
                <option value="">Select age category</option>
                <option value="u18">Under 18 (U18)</option>
                <option value="adult">18+ (Adults)</option>
                <option value="masters">40+ (Masters)</option>
              </select>
              <p className="mt-1 text-xs" style={{ color: 'var(--foreground-secondary)', opacity: 0.7 }}>
                Select your age category for competition classification
              </p>
            </div>

            {error && (
              <div
                className="rounded-lg px-4 py-3 text-sm"
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  color: '#ef4444',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  borderColor: 'rgba(239, 68, 68, 0.2)',
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg px-4 py-3 sm:py-2.5 text-base sm:text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
              style={{
                backgroundColor: 'var(--accent)',
                color: 'var(--accent-text)',
                minHeight: '44px',
              }}
              onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = 'var(--accent-hover)')}
              onMouseLeave={(e) => !loading && (e.currentTarget.style.backgroundColor = 'var(--accent)')}
            >
              {loading ? 'Setting up…' : 'Get started'}
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
