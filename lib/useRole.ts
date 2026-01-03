// lib/useRole.ts
'use client'

import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { useProfile } from './ProfileContext'

export function useRole() {
  // Get selectedProfile from ProfileContext
  // This will throw an error if used outside ProfileProvider, which is expected
  const profileContext = useProfile()
  const selectedProfile = profileContext.selectedProfile ?? null
  const profileLoading = profileContext.loading ?? false

  const [role, setRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Wait for profile context to load
    if (profileLoading) {
      return
    }

    // If we have a selected profile, use it
    if (selectedProfile && selectedProfile.profile_id) {
      supabase
        .from('profiles')
        .select('role')
        .eq('profile_id', selectedProfile.profile_id)
        .single()
        .then(({ data, error }) => {
          if (error) {
            console.error('Error fetching role:', error)
            setRole(null)
          } else {
            setRole(data?.role ?? null)
          }
          setLoading(false)
        })
      return
    }

    // Fallback: Get highest privilege role from all user profiles
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        setRole(null)
        setLoading(false)
        return
      }

      // Get all profiles for the user
      const { data: profiles } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', data.user.id)

      if (!profiles || profiles.length === 0) {
        setRole(null)
        setLoading(false)
        return
      }

      // Get highest privilege role (admin > setter > climber)
      const roles = ['admin', 'setter', 'climber']
      const userRoles = profiles.map(p => p.role).filter(Boolean) as string[]
      const highestRole = roles.find(r => userRoles.includes(r)) || userRoles[0] || null

      setRole(highestRole)
      setLoading(false)
    })
  }, [selectedProfile, profileLoading])

  return { role, loading: loading || profileLoading }
}
