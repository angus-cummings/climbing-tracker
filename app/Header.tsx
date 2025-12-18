'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useUser } from '../lib/useUser'
import { useTheme } from '../lib/ThemeContext'

export function Header() {
  const { user, loading } = useUser()
  const { theme, toggleTheme } = useTheme()
  const router = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)

  const handleLogout = async () => {
    try {
      setLoggingOut(true)
      await supabase.auth.signOut()
      router.push('/')
    } finally {
      setLoggingOut(false)
    }
  }

  return (
    <header className="mb-6 flex items-center justify-between border-b pb-4" style={{ borderColor: 'var(--border)' }}>
      <div className="text-xl font-bold tracking-tight" style={{ color: 'var(--foreground)' }}>
        Rock It Summer Sector
      </div>
      <nav className="flex items-center gap-4 text-sm">
        {!loading && user && (
          <>
            <Link 
              href="/climbs" 
              className="font-medium transition-colors"
              style={{ color: 'var(--foreground-secondary)' }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--foreground-secondary)'}
            >
              Climbs
            </Link>
            <Link 
              href="/setters" 
              className="font-medium transition-colors"
              style={{ color: 'var(--foreground-secondary)' }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--foreground-secondary)'}
            >
              Setters
            </Link>
            <Link 
              href="/leaderboard" 
              className="font-medium transition-colors"
              style={{ color: 'var(--foreground-secondary)' }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--foreground-secondary)'}
            >
              Leaderboard
            </Link>
          </>
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
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="rounded-lg px-3 py-1.5 font-medium transition-all disabled:opacity-60"
            style={{
              backgroundColor: 'var(--button-secondary-bg)',
              color: 'var(--button-secondary-text)',
            }}
            onMouseEnter={(e) => !loggingOut && (e.currentTarget.style.backgroundColor = 'var(--button-secondary-hover)')}
            onMouseLeave={(e) => !loggingOut && (e.currentTarget.style.backgroundColor = 'var(--button-secondary-bg)')}
          >
            {loggingOut ? 'Logging out…' : 'Logout'}
          </button>
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



