'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../lib/supabase'

function LoginForm() {
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    
    if (!email || !password) {
      setError('Email and password are required')
      return
    }

    setLoading(true)
    const { error: signInError } = await supabase.auth.signInWithPassword({ 
      email, 
      password 
    })
    setLoading(false)

    if (signInError) {
      setError(signInError.message)
    } else {
      const nextUrl = searchParams?.get('next') || '/home'
      window.location.href = nextUrl
    }
  }

  return (
    <main className="flex min-h-[80vh] items-center justify-center px-4 py-6">
      <div className="w-full max-w-md">
        <div 
          className="rounded-2xl p-6 sm:p-8 shadow-xl"
          style={{
            backgroundColor: 'var(--card-bg)',
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: 'var(--card-border)',
            boxShadow: `0 20px 25px -5px var(--shadow), 0 10px 10px -5px var(--shadow)`
          }}
        >
          <h1 className="mb-2 text-2xl sm:text-3xl font-bold" style={{ color: 'var(--foreground)' }}>
            Welcome Back
          </h1>
          <p className="mb-6 text-sm sm:text-base" style={{ color: 'var(--foreground-secondary)' }}>
            Sign in to track your climbs
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="mb-6 text-xs italic font-medium text-red-500 hover:text-red-400 transition-colors rounded-lg px-3 py-1.5 border border-red-500 hover:bg-red-500/10"
          >
            ! Note to returning Summer Sector users !
          </button>

          {showModal && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center px-4"
              style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
              onClick={() => setShowModal(false)}
            >
              <div
                className="relative w-full max-w-md rounded-2xl p-6 shadow-xl"
                style={{
                  backgroundColor: 'var(--card-bg)',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  borderColor: 'var(--card-border)',
                }}
                onClick={e => e.stopPropagation()}
              >
                <h2 className="mb-3 text-base font-semibold text-red-500">Note to Summer Sector users</h2>
                <p className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>
                  The website domain has changed since the app was released but your account still exists. If you use a password manager, you'll need to check it and manually enter your password for this domain.
                </p>
                <button
                  onClick={() => setShowModal(false)}
                  className="mt-4 text-xs font-medium transition-colors"
                  style={{ color: 'var(--accent)' }}
                >
                  Got it
                </button>
              </div>
            </div>
          )}

          <form onSubmit={signIn} className="space-y-4">
            <div>
              <label 
                className="mb-1.5 block text-sm font-medium"
                style={{ color: 'var(--foreground-secondary)' }}
              >
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-lg px-4 py-2.5 outline-none transition"
                style={{
                  backgroundColor: 'var(--input-bg)',
                  color: 'var(--foreground)',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  borderColor: 'var(--input-border)',
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
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full rounded-lg px-4 py-2.5 outline-none transition"
                style={{
                  backgroundColor: 'var(--input-bg)',
                  color: 'var(--foreground)',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  borderColor: 'var(--input-border)',
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

            {error && (
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
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg px-4 py-2.5 font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
              style={{
                backgroundColor: 'var(--accent)',
                color: 'var(--accent-text)',
              }}
              onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = 'var(--accent-hover)')}
              onMouseLeave={(e) => !loading && (e.currentTarget.style.backgroundColor = 'var(--accent)')}
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm" style={{ color: 'var(--foreground-secondary)' }}>
            Don't have an account?{' '}
            <Link 
              href="/register" 
              className="font-medium transition-colors"
              style={{ color: 'var(--accent)' }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
            >
              Sign up
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <main className="flex min-h-[80vh] items-center justify-center px-4 py-6">
        <div className="text-center">Loading...</div>
      </main>
    }>
      <LoginForm />
    </Suspense>
  )
}