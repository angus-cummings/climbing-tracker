// lib/useUser.ts
'use client'

import { useEffect, useState } from 'react'
import { supabase } from './supabase'

export function useUser() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      setLoading(false)
    })

    const { data: listener } =
      supabase.auth.onAuthStateChange((_e, session) => {
        setUser(session?.user ?? null)
      })

    return () => listener.subscription.unsubscribe()
  }, [])

  return { user, loading }
}
