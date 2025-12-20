'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'

function ConfirmEmailContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState<string | null>(null)
  const [resending, setResending] = useState(false)
  const [resendMessage, setResendMessage] = useState<string | null>(null)
  const [resendError, setResendError] = useState<string | null>(null)

  useEffect(() => {
    // Get email from query params if available
    const emailParam = searchParams.get('email')
    if (emailParam) {
      setEmail(emailParam)
    }
  }, [searchParams])

  const handleResendEmail = async () => {
    if (!email) {
      setResendError('Email address is required')
      return
    }

    setResending(true)
    setResendError(null)
    setResendMessage(null)

    // Get the current origin for the redirect URL
    const redirectTo = `${window.location.origin}/auth/callback?next=/climbs`
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
      options: {
        emailRedirectTo: redirectTo,
      },
    })

    setResending(false)

    if (error) {
      setResendError(error.message)
    } else {
      setResendMessage('Confirmation email sent! Please check your inbox.')
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
          <div className="text-center mb-6">
            <div 
              className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4"
              style={{
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
              }}
            >
              <svg 
                className="w-8 h-8" 
                style={{ color: 'var(--accent)' }}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" 
                />
              </svg>
            </div>
            <h1 className="mb-2 text-2xl sm:text-3xl font-bold" style={{ color: 'var(--foreground)' }}>
              Check Your Email
            </h1>
            <p className="text-sm sm:text-base" style={{ color: 'var(--foreground-secondary)' }}>
              We've sent a confirmation link to{email ? ` ${email}` : ' your email address'}
            </p>
          </div>

          <div 
            className="rounded-lg p-4 mb-6"
            style={{
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              borderWidth: '1px',
              borderStyle: 'solid',
              borderColor: 'rgba(59, 130, 246, 0.2)'
            }}
          >
            <h2 className="font-semibold mb-2" style={{ color: 'var(--foreground)' }}>
              Next Steps:
            </h2>
            <ol className="list-decimal list-inside space-y-2 text-sm" style={{ color: 'var(--foreground-secondary)' }}>
              <li>Check your email inbox (and spam folder)</li>
              <li>Click the confirmation link in the email</li>
              <li>Return here and sign in to continue</li>
            </ol>
          </div>

          {email && (
            <div className="mb-6">
              <button
                onClick={handleResendEmail}
                disabled={resending}
                className="w-full rounded-lg px-4 py-2.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50"
                style={{
                  backgroundColor: 'transparent',
                  color: 'var(--accent)',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  borderColor: 'var(--accent)',
                }}
                onMouseEnter={(e) => !resending && (e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)')}
                onMouseLeave={(e) => !resending && (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                {resending ? 'Sending...' : 'Resend Confirmation Email'}
              </button>

              {resendMessage && (
                <div 
                  className="mt-3 rounded-lg px-4 py-3 text-sm"
                  style={{
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    color: '#10b981',
                    borderWidth: '1px',
                    borderStyle: 'solid',
                    borderColor: 'rgba(16, 185, 129, 0.2)'
                  }}
                >
                  {resendMessage}
                </div>
              )}

              {resendError && (
                <div 
                  className="mt-3 rounded-lg px-4 py-3 text-sm"
                  style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    color: '#ef4444',
                    borderWidth: '1px',
                    borderStyle: 'solid',
                    borderColor: 'rgba(239, 68, 68, 0.2)'
                  }}
                >
                  {resendError}
                </div>
              )}
            </div>
          )}

          <div className="text-center">
            <p className="text-sm mb-4" style={{ color: 'var(--foreground-secondary)' }}>
              Already confirmed your email?
            </p>
            <Link 
              href="/"
              className="inline-block rounded-lg px-6 py-2.5 text-sm font-semibold transition"
              style={{
                backgroundColor: 'var(--accent)',
                color: 'var(--accent-text)',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--accent-hover)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--accent)'}
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}

export default function ConfirmEmailPage() {
  return (
    <Suspense fallback={
      <main className="flex min-h-[80vh] items-center justify-center">
        <div className="text-center" style={{ color: 'var(--foreground-secondary)' }}>
          Loading...
        </div>
      </main>
    }>
      <ConfirmEmailContent />
    </Suspense>
  )
}
