'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [compCohort, setCompCohort] = useState<'male' | 'female' | 'inclusive'>('inclusive')
  const [ageCategory, setAgeCategory] = useState<'u18' | 'adult' | 'masters' | ''>('')
  const [isJunior, setIsJunior] = useState(false)
  const [parentEmail, setParentEmail] = useState('')
  const [parentName, setParentName] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [generatedAccountId, setGeneratedAccountId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const generatePlaceholderEmail = (): string => {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 9)
    return `junior-${timestamp}-${random}@boulder.example.com`
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)

    // Validation: email is required unless it's a junior account
    if (!isJunior && !email) {
      setError('Email is required for regular accounts')
      return
    }

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
      setError('Please select an age category')
      return
    }

    // For junior accounts, if no email provided, generate placeholder
    let emailToUse = email
    if (!emailToUse && isJunior) {
      emailToUse = generatePlaceholderEmail()
      setGeneratedAccountId(emailToUse)
    }
    
    if (!emailToUse) {
      setError('Email is required')
      return
    }

    setLoading(true)
    // Get the current origin for the redirect URL
    const redirectTo = `${window.location.origin}/auth/callback?next=/climbs`
    
    // For placeholder emails, Supabase should be configured to auto-confirm
    // See migrations/add_junior_support.sql for configuration instructions
    const isPlaceholderEmail = emailToUse.endsWith('@boulder.example.com')
    
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: emailToUse,
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

      // Prepare profile data
      const profileData: any = {
        p_user_id: data.user.id,
        p_comp_cohort: compCohort,
        p_is_junior: isJunior,
        p_age_category: ageCategory
      }

      // Add optional phone number if provided
      if (phoneNumber) {
        profileData.p_phone_number = phoneNumber
      }

      // Add optional parent/guardian info if provided
      if (isJunior && parentEmail) {
        profileData.p_parent_email = parentEmail
      }
      if (isJunior && parentName) {
        profileData.p_parent_name = parentName
      }
      if (isJunior && dateOfBirth) {
        profileData.p_date_of_birth = dateOfBirth
      }

      // Create profile with comp_cohort and junior info using database function (bypasses RLS)
      const { error: profileError } = await supabase.rpc('create_user_profile', profileData)

      setLoading(false)

      if (profileError) {
        setError(`Account created but profile setup failed: ${profileError.message}`)
        return
      }

      // For placeholder emails, Supabase should auto-confirm (if configured)
      // If session exists or it's a placeholder email, go directly to climbs
      if (isPlaceholderEmail || data.session) {
        // Email confirmation not required (auto-confirmed or disabled)
        if (isPlaceholderEmail) {
          // Show the generated account ID to the user so they can save it
          setMessage(`Registration successful! Your account ID is: ${emailToUse}. Please save this - you'll need it to log in. Redirecting in 5 seconds...`)
        } else {
          setMessage('Registration successful! Redirecting to climbs...')
        }
        setTimeout(() => router.push('/climbs'), isPlaceholderEmail ? 5000 : 1500)
      } else {
        // Email confirmation required for real emails
        router.push(`/confirm-email?email=${encodeURIComponent(emailToUse)}`)
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
            {/* Junior Account Toggle */}
            <div>
              <label 
                className="flex items-center gap-2 rounded-lg px-3 py-2 cursor-pointer transition"
                style={{
                  backgroundColor: 'var(--input-bg)',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  borderColor: 'var(--input-border)',
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--button-secondary-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--input-bg)'}
              >
                <input
                  type="checkbox"
                  checked={isJunior}
                  onChange={e => setIsJunior(e.target.checked)}
                  className="h-4 w-4 rounded"
                  style={{ accentColor: 'var(--accent)' }}
                  disabled={loading}
                />
                <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                  Junior account (no email required)
                </span>
              </label>
              <p className="mt-1 text-xs" style={{ color: 'var(--foreground-secondary)', opacity: 0.7 }}>
                {isJunior ? 'For climbers under 18 who may not have an email address' : 'Check this if you are registering for a junior climber'}
              </p>
            </div>

            <div>
              <label 
                className="mb-1.5 block text-sm font-medium"
                style={{ color: 'var(--foreground-secondary)' }}
              >
                Email {!isJunior && <span style={{ color: '#ef4444' }}>*</span>}
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder={isJunior ? "Optional - leave blank if no email" : "you@example.com"}
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
              />
              {isJunior && (
                <p className="mt-1 text-xs" style={{ color: 'var(--foreground-secondary)', opacity: 0.7 }}>
                  If no email is provided, a unique account identifier will be generated for login
                </p>
              )}
            </div>

            <div>
              <label 
                className="mb-1.5 block text-sm font-medium"
                style={{ color: 'var(--foreground-secondary)' }}
              >
                Password
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
              />
            </div>

            <div>
              <label 
                className="mb-1.5 block text-sm font-medium"
                style={{ color: 'var(--foreground-secondary)' }}
              >
                Confirm Password
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
              />
            </div>

            <div>
              <label 
                className="mb-1.5 block text-sm font-medium"
                style={{ color: 'var(--foreground-secondary)' }}
              >
                Phone Number (Optional)
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={e => setPhoneNumber(e.target.value)}
                placeholder="+1 (555) 123-4567"
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
              />
            </div>

            {/* Parent/Guardian Fields - Only show for junior accounts */}
            {isJunior && (
              <>
                <div>
                  <label 
                    className="mb-1.5 block text-sm font-medium"
                    style={{ color: 'var(--foreground-secondary)' }}
                  >
                    Parent/Guardian Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={parentName}
                    onChange={e => setParentName(e.target.value)}
                    placeholder="Parent or guardian name"
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
                  />
                </div>

                <div>
                  <label 
                    className="mb-1.5 block text-sm font-medium"
                    style={{ color: 'var(--foreground-secondary)' }}
                  >
                    Parent/Guardian Email (Optional)
                  </label>
                  <input
                    type="email"
                    value={parentEmail}
                    onChange={e => setParentEmail(e.target.value)}
                    placeholder="parent@example.com"
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
                  />
                  <p className="mt-1 text-xs" style={{ color: 'var(--foreground-secondary)', opacity: 0.7 }}>
                    For account recovery and important communications
                  </p>
                </div>

                <div>
                  <label 
                    className="mb-1.5 block text-sm font-medium"
                    style={{ color: 'var(--foreground-secondary)' }}
                  >
                    Date of Birth (Optional)
                  </label>
                  <input
                    type="date"
                    value={dateOfBirth}
                    onChange={e => setDateOfBirth(e.target.value)}
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
                  />
                </div>
              </>
            )}

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
              <p className="mt-1 text-xs sm:text-xs" style={{ color: 'var(--foreground-secondary)', opacity: 0.7 }}>
                Select your age category for competition classification
              </p>
            </div>

            <div>
              <label 
                className="mb-1.5 block text-sm font-medium"
                style={{ color: 'var(--foreground-secondary)' }}
              >
                Competition Cohort
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
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="inclusive">Inclusive</option>
              </select>
              <p className="mt-1 text-xs sm:text-xs" style={{ color: 'var(--foreground-secondary)', opacity: 0.7 }}>
                Select your competition category for leaderboards and events
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
                  borderColor: 'rgba(16, 185, 129, 0.2)',
                  whiteSpace: 'pre-wrap'
                }}
              >
                {message}
                {generatedAccountId && message.includes('account ID') && (
                  <div className="mt-2 p-2 rounded" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                    <p className="text-xs font-semibold mb-1" style={{ color: '#3b82f6' }}>Your Account ID:</p>
                    <p className="text-xs font-mono" style={{ color: '#3b82f6', wordBreak: 'break-all' }}>
                      {generatedAccountId}
                    </p>
                  </div>
                )}
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

