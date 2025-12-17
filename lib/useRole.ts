// lib/useRole.ts
'use client'

import { useEffect, useState } from 'react'
import { supabase } from './supabase'

export function useRole() {
  const [role, setRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        setRole(null)
        setLoading(false)
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', data.user.id)
        .single()

      setRole(profile?.role ?? null)
      setLoading(false)
    })
  }, [])

  return { role, loading }
}
