'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useProfile } from '../lib/ProfileContext'

export function ProfileSelector() {
  const { profiles, selectedProfile, setSelectedProfile, loading } = useProfile()
  const [isOpen, setIsOpen] = useState(false)

  if (loading || profiles.length === 0) {
    return null
  }

  // If only one profile, show the competitor number with an option to add more
  if (profiles.length === 1) {
    return (
      <div className="flex items-center gap-2">
        <span 
          className="rounded-lg px-3 py-1.5 text-sm font-medium"
          style={{
            backgroundColor: 'var(--button-secondary-bg)',
            color: 'var(--button-secondary-text)',
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: 'var(--border)',
          }}
        >
          Competitor #{selectedProfile?.competitor_number}
        </span>
        <Link
          href="/profiles/new"
          className="rounded-lg px-3 py-1.5 text-sm font-medium transition-all"
          style={{
            backgroundColor: 'var(--button-secondary-bg)',
            color: 'var(--button-secondary-text)',
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: 'var(--border)',
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--button-secondary-hover)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--button-secondary-bg)'}
        >
          + Add Competitor
        </Link>
      </div>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="rounded-lg px-3 py-1.5 text-sm font-medium transition-all flex items-center gap-2"
        style={{
          backgroundColor: 'var(--button-secondary-bg)',
          color: 'var(--button-secondary-text)',
          borderWidth: '1px',
          borderStyle: 'solid',
          borderColor: 'var(--border)',
        }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--button-secondary-hover)'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--button-secondary-bg)'}
      >
        <span>Competitor #{selectedProfile?.competitor_number}</span>
        <svg
          className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          style={{ color: 'var(--foreground-secondary)' }}
        >
          <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div
            className="absolute right-0 mt-2 z-20 rounded-lg shadow-lg min-w-[200px]"
            style={{
              backgroundColor: 'var(--card-bg)',
              borderWidth: '1px',
              borderStyle: 'solid',
              borderColor: 'var(--card-border)',
            }}
          >
            <div className="p-2">
              <div className="text-xs font-semibold mb-2 px-2 py-1" style={{ color: 'var(--foreground-secondary)' }}>
                Select Profile
              </div>
              {profiles.map((profile) => (
                <button
                  key={profile.profile_id}
                  onClick={() => {
                    setSelectedProfile(profile)
                    setIsOpen(false)
                  }}
                  className="w-full text-left px-3 py-2 rounded text-sm transition-all"
                  style={{
                    backgroundColor: selectedProfile?.profile_id === profile.profile_id 
                      ? 'var(--accent)' 
                      : 'transparent',
                    color: selectedProfile?.profile_id === profile.profile_id
                      ? 'var(--accent-text)'
                      : 'var(--foreground)',
                  }}
                  onMouseEnter={(e) => {
                    if (selectedProfile?.profile_id !== profile.profile_id) {
                      e.currentTarget.style.backgroundColor = 'var(--button-secondary-hover)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedProfile?.profile_id !== profile.profile_id) {
                      e.currentTarget.style.backgroundColor = 'transparent'
                    }
                  }}
                >
                  <div className="font-medium">#{profile.competitor_number}</div>
                  {profile.username && (
                    <div className="text-xs opacity-75">{profile.username}</div>
                  )}
                </button>
              ))}
              <div className="border-t my-1" style={{ borderColor: 'var(--card-border)' }} />
              <Link
                href="/profiles/new"
                className="block w-full text-left px-3 py-2 rounded text-sm transition-all"
                style={{
                  color: 'var(--accent)',
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--button-secondary-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                onClick={() => setIsOpen(false)}
              >
                + Add New Profile
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

