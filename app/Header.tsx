'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useUser } from '../lib/useUser'
import { useRole } from '../lib/useRole'
import { useTheme } from '../lib/ThemeContext'
import { ProfileSelector } from '../components/ProfileSelector'

export function Header() {
  const { user, loading } = useUser()
  const { role: userRole } = useRole()
  const { theme, toggleTheme } = useTheme()
  const router = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)
  const [adminDropdownOpen, setAdminDropdownOpen] = useState(false)
  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false)
  const [currentCompetition, setCurrentCompetition] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('competitions')
      .select('name')
      .eq('is_current', true)
      .single()
      .then(({ data }) => setCurrentCompetition(data?.name ?? null))
  }, [])
  const adminDropdownRef = useRef<HTMLDivElement>(null)
  const accountDropdownRef = useRef<HTMLDivElement>(null)

  const handleLogout = async () => {
    try {
      setLoggingOut(true)
      await supabase.auth.signOut()
      router.push('/')
    } finally {
      setLoggingOut(false)
    }
  }

  const canAccessSetters = userRole === 'setter' || userRole === 'admin'

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (adminDropdownRef.current && !adminDropdownRef.current.contains(target)) {
        setAdminDropdownOpen(false)
      }
      if (accountDropdownRef.current && !accountDropdownRef.current.contains(target)) {
        setAccountDropdownOpen(false)
      }
    }

    if (adminDropdownOpen || accountDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [adminDropdownOpen, accountDropdownOpen])

  return (
    <header className="mb-4 sm:mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4" style={{ borderColor: 'var(--border)' }}>
      <div className="text-lg sm:text-xl font-bold tracking-tight" style={{ color: 'var(--foreground)' }}>
        Rock It Comps{currentCompetition ? ` - ${currentCompetition}!` : ''}!
      </div>
      <nav className="flex flex-wrap items-center gap-2 sm:gap-4 text-sm w-full sm:w-auto">
        {!loading && user && (
          <>
            <ProfileSelector />
            <Link
              href="/climbs"
              className="font-medium transition-colors whitespace-nowrap"
              style={{ color: 'var(--foreground-secondary)' }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--foreground-secondary)'}
            >
              Climbs
            </Link>
            <Link
              href="/archived"
              className="font-medium transition-colors whitespace-nowrap"
              style={{ color: 'var(--foreground-secondary)' }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--foreground-secondary)'}
            >
              Archived
            </Link>
            {canAccessSetters && (
              <Link 
                href="/setters" 
                className="font-medium transition-colors whitespace-nowrap"
                style={{ color: 'var(--foreground-secondary)' }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--foreground-secondary)'}
              >
                Setters
              </Link>
            )}
            {userRole === 'admin' && (
              <div className="relative" ref={adminDropdownRef}>
                <button
                  onClick={() => setAdminDropdownOpen(!adminDropdownOpen)}
                  className="font-medium transition-colors whitespace-nowrap flex items-center gap-1"
                  style={{ color: 'var(--foreground-secondary)' }}
                  onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent)'}
                  onMouseLeave={(e) => {
                    if (!adminDropdownOpen) {
                      e.currentTarget.style.color = 'var(--foreground-secondary)'
                    }
                  }}
                >
                  Admin
                  <span style={{ fontSize: '0.75rem' }}>{adminDropdownOpen ? '▲' : '▼'}</span>
                </button>
                {adminDropdownOpen && (
                  <div
                    className="absolute top-full left-0 mt-1 rounded-lg shadow-lg z-50 min-w-[180px]"
                    style={{
                      backgroundColor: 'var(--card-bg)',
                      borderWidth: '1px',
                      borderStyle: 'solid',
                      borderColor: 'var(--card-border)',
                      animation: 'fadeIn 0.2s ease-in-out'
                    }}
                  >
                    <Link
                      href="/profiles/admin"
                      className="block px-4 py-2 text-sm transition-colors rounded-t-lg"
                      style={{ color: 'var(--foreground-secondary)' }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--button-secondary-hover)'
                        e.currentTarget.style.color = 'var(--foreground)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent'
                        e.currentTarget.style.color = 'var(--foreground-secondary)'
                      }}
                      onClick={() => setAdminDropdownOpen(false)}
                    >
                      Manage Profiles
                    </Link>
                    <Link
                      href="/competitions/admin"
                      className="block px-4 py-2 text-sm transition-colors"
                      style={{ color: 'var(--foreground-secondary)' }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--button-secondary-hover)'
                        e.currentTarget.style.color = 'var(--foreground)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent'
                        e.currentTarget.style.color = 'var(--foreground-secondary)'
                      }}
                      onClick={() => setAdminDropdownOpen(false)}
                    >
                      Manage Competitions
                    </Link>
                    <Link
                      href="/climbs/admin"
                      className="block px-4 py-2 text-sm transition-colors"
                      style={{ color: 'var(--foreground-secondary)' }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--button-secondary-hover)'
                        e.currentTarget.style.color = 'var(--foreground)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent'
                        e.currentTarget.style.color = 'var(--foreground-secondary)'
                      }}
                      onClick={() => setAdminDropdownOpen(false)}
                    >
                      Manage Climbs
                    </Link>
                    <Link
                      href="/profiles/admin/send-count-lookup"
                      className="block px-4 py-2 text-sm transition-colors"
                      style={{ color: 'var(--foreground-secondary)' }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--button-secondary-hover)'
                        e.currentTarget.style.color = 'var(--foreground)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent'
                        e.currentTarget.style.color = 'var(--foreground-secondary)'
                      }}
                      onClick={() => setAdminDropdownOpen(false)}
                    >
                      Send Count Lookup
                    </Link>
                    <Link
                      href="/qr-codes"
                      className="block px-4 py-2 text-sm transition-colors rounded-b-lg"
                      style={{ color: 'var(--foreground-secondary)' }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--button-secondary-hover)'
                        e.currentTarget.style.color = 'var(--foreground)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent'
                        e.currentTarget.style.color = 'var(--foreground-secondary)'
                      }}
                      onClick={() => setAdminDropdownOpen(false)}
                    >
                      QR Codes
                    </Link>
                  </div>
                )}
              </div>
            )}
            <Link 
              href="/leaderboard" 
              className="font-medium transition-colors whitespace-nowrap"
              style={{ color: 'var(--foreground-secondary)' }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--foreground-secondary)'}
            >
              Leaderboard
            </Link>
          </>
        )}
        
        {!loading && !user && (
          <Link 
            href="/anonymous" 
            className="font-medium transition-colors"
            style={{ color: 'var(--foreground-secondary)' }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--foreground-secondary)'}
          >
            Record Send
          </Link>
        )}
        
        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="rounded-lg px-3 py-1.5 font-medium transition-all"
          style={{
            backgroundColor: 'var(--button-secondary-bg)',
            color: 'var(--button-secondary-text)',
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--button-secondary-hover)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--button-secondary-bg)'}
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? '🌙' : '☀️'}
        </button>

        {loading ? (
          <span className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>Checking session…</span>
        ) : user ? (
          <div className="relative" ref={accountDropdownRef}>
            <button
              type="button"
              onClick={() => setAccountDropdownOpen(!accountDropdownOpen)}
              className="rounded-lg p-2 font-medium transition-all"
              style={{
                backgroundColor: accountDropdownOpen ? 'var(--button-secondary-hover)' : 'var(--button-secondary-bg)',
                color: 'var(--button-secondary-text)',
              }}
              onMouseEnter={(e) => !accountDropdownOpen && (e.currentTarget.style.backgroundColor = 'var(--button-secondary-hover)')}
              onMouseLeave={(e) => !accountDropdownOpen && (e.currentTarget.style.backgroundColor = 'var(--button-secondary-bg)')}
              title="Account"
              aria-label="Account menu"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </button>
            {accountDropdownOpen && (
              <div
                className="absolute top-full right-0 mt-1 rounded-lg shadow-lg z-50 min-w-[160px]"
                style={{
                  backgroundColor: 'var(--card-bg)',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  borderColor: 'var(--card-border)',
                }}
              >
                <Link
                  href="/account"
                  className="block px-4 py-2 text-sm transition-colors rounded-t-lg"
                  style={{ color: 'var(--foreground-secondary)' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--button-secondary-hover)'
                    e.currentTarget.style.color = 'var(--foreground)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent'
                    e.currentTarget.style.color = 'var(--foreground-secondary)'
                  }}
                  onClick={() => setAccountDropdownOpen(false)}
                >
                  Account
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setAccountDropdownOpen(false)
                    handleLogout()
                  }}
                  disabled={loggingOut}
                  className="block w-full text-left px-4 py-2 text-sm transition-colors rounded-b-lg disabled:opacity-60"
                  style={{ color: 'var(--foreground-secondary)' }}
                  onMouseEnter={(e) => {
                    if (!loggingOut) {
                      e.currentTarget.style.backgroundColor = 'var(--button-secondary-hover)'
                      e.currentTarget.style.color = 'var(--foreground)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent'
                    e.currentTarget.style.color = 'var(--foreground-secondary)'
                  }}
                >
                  {loggingOut ? 'Logging out…' : 'Logout'}
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            <Link
              href="/"
              className="font-medium transition-colors"
              style={{ color: 'var(--foreground-secondary)' }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--foreground-secondary)'}
            >
              Login
            </Link>
            <Link
              href="/register"
              className="rounded-lg px-3 py-1.5 font-medium transition-all"
              style={{
                backgroundColor: 'var(--accent)',
                color: 'var(--accent-text)',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--accent-hover)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--accent)'}
            >
              Sign up
            </Link>
          </>
        )}
      </nav>
    </header>
  )
}



