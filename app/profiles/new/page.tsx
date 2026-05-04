'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useProfile } from '../../../lib/ProfileContext'
import { useUser } from '../../../lib/useUser'
import { validateProfileName } from '../../../lib/validation'

export default function NewProfilePage() {
  const router = useRouter()
  const { user } = useUser()
  const { createProfile, refreshProfiles, profiles } = useProfile()
  const [name, setName] = useState('')
  const [compCohort, setCompCohort] = useState<'male' | 'female' | 'inclusive'>('inclusive')
  const [ageCategory, setAgeCategory] = useState<'u18' | 'adult' | 'masters' | ''>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [nameError, setNameError] = useState<string | null>(null)

  if (!user) {
    return (
      <main className="flex min-h-[80vh] items-center justify-center">
        <p style={{ color: 'var(--foreground-secondary)' }}>Please sign in to add a competitor profile.</p>
      </main>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setNameError(null)

    // Validate profile name
    const nameValidation = validateProfileName(name)
    if (!nameValidation.valid) {
      setNameError(nameValidation.error || 'Invalid name')
      setError(nameValidation.error || 'Invalid name')
      return
    }

    if (!ageCategory) {
      setError('Age category is required')
      return
    }

    setLoading(true)
    try {
      await createProfile({
        comp_cohort: compCohort,
        age_category: ageCategory,
        profile_name: name
        // phone_number not provided - will be inherited from account's first profile
      })

      setMessage('Competitor profile created successfully!')
      await refreshProfiles()
      setTimeout(() => router.push('/home'), 1500)
    } catch (err: any) {
      setError(err.message || 'Failed to create competitor profile')
    } finally {
      setLoading(false)
    }
  }

  // Get phone number from first profile to show user
  const accountPhoneNumber = profiles.length > 0 ? profiles[0].phone_number : null

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
            boxShadow: `0 20px 25px -5px var(--shadow), 0 10px 10px -5px var(--shadow)`
          }}
        >
          <h1 className="mb-2 text-2xl sm:text-3xl font-bold" style={{ color: 'var(--foreground)' }}>
            Add Competitor Profile
          </h1>
          <p className="mb-4 sm:mb-6 text-sm sm:text-base" style={{ color: 'var(--foreground-secondary)' }}>
            Add a junior competitor or another profile to your account
          </p>

          {accountPhoneNumber && (
            <div 
              className="mb-4 rounded-lg px-4 py-2 text-sm"
              style={{
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                color: '#3b82f6',
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: 'rgba(59, 130, 246, 0.2)'
              }}
            >
              Phone number will be inherited from your account: {accountPhoneNumber}
            </div>
          )}

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
                    const validation = validateProfileName(e.target.value)
                    setNameError(validation.valid ? null : validation.error || null)
                  }
                }}
                onBlur={(e) => {
                  const validation = validateProfileName(e.target.value)
                  setNameError(validation.valid ? null : validation.error || null)
                  e.currentTarget.style.borderColor = validation.valid ? 'var(--input-border)' : '#ef4444'
                  e.currentTarget.style.boxShadow = 'none'
                }}
                placeholder="Competitor's full name"
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
                <p className="mt-1 text-xs" style={{ color: '#ef4444' }}>
                  {nameError}
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
            </div>

            {error && (
              <div 
                className="rounded-lg px-4 py-3 text-sm sm:text-sm"
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  color: '#ef4444',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  borderColor: 'rgba(239, 68, 68, 0.2)'
                }}
              >
                {error}
              </div>
            )}

            {message && (
              <div 
                className="rounded-lg px-4 py-3 text-sm sm:text-sm"
                style={{
                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                  color: '#10b981',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  borderColor: 'rgba(16, 185, 129, 0.2)'
                }}
              >
                {message}
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
              {loading ? 'Creating profile...' : 'Create Competitor Profile'}
            </button>
          </form>

          <div className="mt-4 sm:mt-6 text-center text-sm" style={{ color: 'var(--foreground-secondary)' }}>
            <Link 
              href="/climbs" 
              className="font-medium transition-colors"
              style={{ color: 'var(--accent)' }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
            >
              Cancel
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
