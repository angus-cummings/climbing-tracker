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

  const signInWithGoogle = async () => {
    setError(null)
    setLoading(true)
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (oauthError) {
      setError(oauthError.message)
      setLoading(false)
    }
  }

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


          <div className="relative mb-4 flex items-center">
            <div className="flex-grow border-t" style={{ borderColor: 'var(--card-border)' }} />
            <span className="mx-3 text-xs" style={{ color: 'var(--foreground-secondary)' }}>or</span>
            <div className="flex-grow border-t" style={{ borderColor: 'var(--card-border)' }} />
          </div>

          <button
            type="button"
            onClick={signInWithGoogle}
            disabled={loading}
            className="mb-4 flex w-full items-center justify-center gap-3 rounded-lg px-4 py-2.5 font-medium transition disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              backgroundColor: 'var(--card-bg)',
              color: 'var(--foreground)',
              borderWidth: '1px',
              borderStyle: 'solid',
              borderColor: 'var(--card-border)',
            }}
            onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = 'var(--input-bg)')}
            onMouseLeave={(e) => !loading && (e.currentTarget.style.backgroundColor = 'var(--card-bg)')}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
            </svg>
            Sign in with Google
          </button>
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