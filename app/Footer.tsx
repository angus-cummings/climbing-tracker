'use client'

import Link from 'next/link'

export function Footer() {
  return (
    <footer className="mt-12 border-t pt-6 text-center text-sm" style={{ borderColor: 'var(--border)' }}>
      <p style={{ color: 'var(--foreground-secondary)' }}>
        This site is under development, please provide{' '}
        <Link 
          href="/feedback"
          className="font-medium transition-colors underline"
          style={{ color: 'var(--accent)' }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
        >
          feedback
        </Link>
      </p>
    </footer>
  )
}


