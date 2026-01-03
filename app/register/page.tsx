'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'
import { validateEmail, validatePhoneNumber, validateProfileName } from '../../lib/validation'

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [name, setName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [compCohort, setCompCohort] = useState<'male' | 'female' | 'inclusive'>('inclusive')
  const [ageCategory, setAgeCategory] = useState<'u18' | 'adult' | 'masters' | ''>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  
  // Field-specific validation errors
  const [emailError, setEmailError] = useState<string | null>(null)
  const [phoneError, setPhoneError] = useState<string | null>(null)
  const [nameError, setNameError] = useState<string | null>(null)

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setEmailError(null)
    setPhoneError(null)
    setNameError(null)

    // Validate email
    const emailValidation = validateEmail(email)
    if (!emailValidation.valid) {
      setEmailError(emailValidation.error || 'Invalid email')
      setError(emailValidation.error || 'Invalid email')
      return
    }

    // Validate profile name
    const nameValidation = validateProfileName(name)
    if (!nameValidation.valid) {
      setNameError(nameValidation.error || 'Invalid name')
      setError(nameValidation.error || 'Invalid name')
      return
    }

    // Validate phone number
    const phoneValidation = validatePhoneNumber(phoneNumber)
    if (!phoneValidation.valid) {
      setPhoneError(phoneValidation.error || 'Invalid phone number')
      setError(phoneValidation.error || 'Invalid phone number')
      return
    }

    // Password validation
    if (!password) {
      setError('Password is required')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    if (!ageCategory) {
      setError('Age category is required')
      return
    }

    setLoading(true)
    const redirectTo = `${window.location.origin}/auth/callback?next=/climbs`
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectTo,
      },
    })

    if (signUpError) {
      setLoading(false)
      setError(signUpError.message)
      return
    }

    if (data.user) {
      // Check if email confirmation is required
      if (data.user.identities?.length === 0) {
        setLoading(false)
        setError('This email is already registered. Please sign in instead.')
        return
      }

      // Create profile with all required fields
      const { error: profileError } = await supabase.rpc('create_user_profile', {
        p_user_id: data.user.id,
        p_profile_name: name,
        p_phone_number: phoneNumber,
        p_comp_cohort: compCohort,
        p_age_category: ageCategory,
      })

      setLoading(false)

      if (profileError) {
        setError(`Account created but profile setup failed: ${profileError.message}`)
        return
      }

      // Check if email confirmation is required
      if (!data.session) {
        router.push(`/confirm-email?email=${encodeURIComponent(email)}`)
      } else {
        setMessage('Registration successful! Redirecting to climbs...')
        setTimeout(() => router.push('/climbs'), 1500)
      }
    } else {
      setLoading(false)
    }
  }

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
            Create Account
          </h1>
          <p className="mb-4 sm:mb-6 text-sm sm:text-base" style={{ color: 'var(--foreground-secondary)' }}>
            Join the Summer Sector Series
          </p>

          <form onSubmit={handleSignUp} className="space-y-3 sm:space-y-4">
            <div>
              <label 
                className="mb-1.5 block text-sm font-medium"
                style={{ color: 'var(--foreground-secondary)' }}
              >
                Email <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (emailError) {
                    const validation = validateEmail(e.target.value)
                    setEmailError(validation.valid ? null : validation.error || null)
                  }
                }}
                onBlur={(e) => {
                  const validation = validateEmail(e.target.value)
                  setEmailError(validation.valid ? null : validation.error || null)
                  e.currentTarget.style.borderColor = validation.valid ? 'var(--input-border)' : '#ef4444'
                  e.currentTarget.style.boxShadow = 'none'
                }}
                placeholder="you@example.com"
                className="w-full rounded-lg px-4 py-3 sm:py-2.5 text-base sm:text-sm outline-none transition"
                style={{
                  backgroundColor: 'var(--input-bg)',
                  color: 'var(--foreground)',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  borderColor: emailError ? '#ef4444' : 'var(--input-border)',
                  minHeight: '44px',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = emailError ? '#ef4444' : 'var(--accent)'
                  e.currentTarget.style.boxShadow = emailError ? 'none' : `0 0 0 2px var(--accent)`
                }}
                disabled={loading}
                required
              />
              {emailError && (
                <p className="mt-1 text-xs" style={{ color: '#ef4444' }}>
                  {emailError}
                </p>
              )}
            </div>

            <div>
              <label 
                className="mb-1.5 block text-sm font-medium"
                style={{ color: 'var(--foreground-secondary)' }}
              >
                Password <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="At least 6 characters"
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
              />
            </div>

            <div>
              <label 
                className="mb-1.5 block text-sm font-medium"
                style={{ color: 'var(--foreground-secondary)' }}
              >
                Confirm Password <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
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
              />
            </div>

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
                Phone Number <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => {
                  setPhoneNumber(e.target.value)
                  if (phoneError) {
                    const validation = validatePhoneNumber(e.target.value)
                    setPhoneError(validation.valid ? null : validation.error || null)
                  }
                }}
                onBlur={(e) => {
                  const validation = validatePhoneNumber(e.target.value)
                  setPhoneError(validation.valid ? null : validation.error || null)
                  e.currentTarget.style.borderColor = validation.valid ? 'var(--input-border)' : '#ef4444'
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
              {phoneError && (
                <p className="mt-1 text-xs" style={{ color: '#ef4444' }}>
                  {phoneError}
                </p>
              )}
              {!phoneError && (
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
              {loading ? 'Creating account...' : 'Sign up'}
            </button>
          </form>

          <div className="mt-4 sm:mt-6 text-center text-sm" style={{ color: 'var(--foreground-secondary)' }}>
            Already have an account?{' '}
            <Link 
              href="/" 
              className="font-medium transition-colors"
              style={{ color: 'var(--accent)' }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
