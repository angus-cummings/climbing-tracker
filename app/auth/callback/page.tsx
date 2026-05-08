'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../../lib/supabase'

function CallbackHandler() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const next = searchParams.get('next') || '/home'
    const code = searchParams.get('code')

    if (code) {
      // PKCE flow: exchange the code using the browser client (has the code_verifier in localStorage)
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        router.replace(error ? '/?error=auth_failed' : next)
      })
      return
    }

    // Implicit flow: Supabase client auto-detects and processes #access_token from the URL hash.
    // Listen for the SIGNED_IN event it emits after storing the session.
    let done = false
    const finish = (session: boolean) => {
      if (done) return
      done = true
      router.replace(session ? next : '/?error=auth_failed')
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) finish(true)
    })

    // Also check immediately — the client may have already processed the hash by now
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) finish(true)
    })

    // Fallback: give up after 5s if no session appears
    const timeout = setTimeout(() => finish(false), 5000)

    return () => {
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, [router, searchParams])

  return (
    <main className="flex min-h-[80vh] items-center justify-center">
      <p style={{ color: 'var(--foreground-secondary)' }}>Signing you in…</p>
    </main>
  )
}

export default function CallbackPage() {
  return (
    <Suspense fallback={
      <main className="flex min-h-[80vh] items-center justify-center">
        <p style={{ color: 'var(--foreground-secondary)' }}>Signing you in…</p>
      </main>
    }>
      <CallbackHandler />
    </Suspense>
  )
}
