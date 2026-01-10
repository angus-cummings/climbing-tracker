'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from './supabase'
import { useUser } from './useUser'

type Profile = {
  profile_id: string
  competitor_number: number
  comp_cohort: string
  is_junior: boolean
  age_category: string | null
  username: string | null
  phone_number: string | null
  created_at: string
}

type ProfileContextType = {
  profiles: Profile[]
  selectedProfile: Profile | null
  setSelectedProfile: (profile: Profile | null) => void
  loading: boolean
  refreshProfiles: () => Promise<void>
  createProfile: (profileData: {
    comp_cohort: string
    is_junior?: boolean
    age_category?: string
    phone_number?: string
    profile_name: string
  }) => Promise<Profile | null>
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined)

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user } = useUser()
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfiles = async (): Promise<Profile[]> => {
    if (!user) {
      setProfiles([])
      setSelectedProfile(null)
      setLoading(false)
      return []
    }

    try {
      const { data, error } = await supabase.rpc('get_user_profiles', {
        p_user_id: user.id
      })

      if (error) throw error

      const profileList = (data || []) as Profile[]
      setProfiles(profileList)

      // If no profile selected and profiles exist, select the first one
      if (!selectedProfile && profileList.length > 0) {
        // Try to get from localStorage first
        const savedProfileId = localStorage.getItem('selectedProfileId')
        const savedProfile = profileList.find(p => p.profile_id === savedProfileId)
        setSelectedProfile(savedProfile || profileList[0])
      } else if (profileList.length === 0) {
        setSelectedProfile(null)
      }

      return profileList
    } catch (error) {
      console.error('Error fetching profiles:', error)
      setProfiles([])
      setSelectedProfile(null)
      return []
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProfiles()
  }, [user])

  // Save selected profile to localStorage
  useEffect(() => {
    if (selectedProfile) {
      localStorage.setItem('selectedProfileId', selectedProfile.profile_id)
    }
  }, [selectedProfile])

  const refreshProfiles = async () => {
    await fetchProfiles()
  }

  const createProfile = async (profileData: {
    comp_cohort: string
    is_junior?: boolean
    age_category?: string
    phone_number?: string
    profile_name: string
  }): Promise<Profile | null> => {
    if (!user) return null

    try {
      const { data: profileId, error } = await supabase.rpc('create_user_profile', {
        p_user_id: user.id,
        p_profile_name: profileData.profile_name,
        p_comp_cohort: profileData.comp_cohort,
        p_age_category: profileData.age_category || null,
        p_is_junior: profileData.is_junior || false,
        p_phone_number: profileData.phone_number || null
      })

      if (error) throw error

      // Refresh profiles to get the new one with all fields
      const updatedProfiles = await fetchProfiles()
      
      // Select the newly created profile
      const newProfile = updatedProfiles.find(p => p.profile_id === profileId)
      if (newProfile) {
        setSelectedProfile(newProfile)
      }

      return newProfile || null
    } catch (error) {
      console.error('Error creating profile:', error)
      throw error
    }
  }

  return (
    <ProfileContext.Provider
      value={{
        profiles,
        selectedProfile,
        setSelectedProfile,
        loading,
        refreshProfiles,
        createProfile
      }}
    >
      {children}
    </ProfileContext.Provider>
  )
}

export function useProfile() {
  const context = useContext(ProfileContext)
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider')
  }
  return context
}

