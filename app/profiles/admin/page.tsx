'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import { useUser } from '../../../lib/useUser'
import { useRole } from '../../../lib/useRole'
import { Pagination } from '../../../components/Pagination'

type Profile = {
  profile_id: string
  user_id: string
  username: string | null
  role: string
  created_at: string
  comp_cohort: string | null
  competitor_number: number
  is_junior: boolean | null
  age_category: string | null
  phone_number: string | null
}

export default function AdminProfilesPage() {
  const router = useRouter()
  const { user, loading: userLoading } = useUser()
  const { role, loading: roleLoading } = useRole()
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 25

  // Redirect if not admin
  useEffect(() => {
    if (!userLoading && !roleLoading) {
      if (!user) {
        router.push('/')
        return
      }
      if (role !== 'admin') {
        router.push('/climbs')
        return
      }
    }
  }, [user, role, userLoading, roleLoading, router])

  // Fetch all profiles
  useEffect(() => {
    if (role !== 'admin' || !user) return

    const fetchProfiles = async () => {
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false })

        if (error) throw error
        setProfiles(data || [])
      } catch (err: any) {
        console.error('Error fetching profiles:', err)
        setError(err.message || 'Failed to fetch profiles')
      } finally {
        setLoading(false)
      }
    }

    fetchProfiles()
  }, [role, user])

  const handleRoleChange = async (profileId: string, newRole: string) => {
    if (!user || role !== 'admin') return

    try {
      setUpdating(profileId)
      setError(null)
      setSuccess(null)

      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('profile_id', profileId)

      if (error) throw error

      // Update local state
      setProfiles(prev =>
        prev.map(p => (p.profile_id === profileId ? { ...p, role: newRole } : p))
      )
      setSuccess(`Role updated successfully`)
      setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
      console.error('Error updating role:', err)
      setError(err.message || 'Failed to update role')
      setTimeout(() => setError(null), 5000)
    } finally {
      setUpdating(null)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (userLoading || roleLoading || loading) {
    return (
      <main className="flex min-h-[80vh] items-center justify-center">
        <p style={{ color: 'var(--foreground-secondary)' }}>Loading...</p>
      </main>
    )
  }

  if (role !== 'admin') {
    return (
      <main className="flex min-h-[80vh] items-center justify-center">
        <p style={{ color: 'var(--foreground-secondary)' }}>Access denied. Admin access required.</p>
      </main>
    )
  }

  // Calculate pagination
  const totalPages = Math.ceil(profiles.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedProfiles = profiles.slice(startIndex, endIndex)
  const showingStart = profiles.length > 0 ? startIndex + 1 : 0
  const showingEnd = Math.min(endIndex, profiles.length)

  return (
    <main className="px-4 py-6 sm:px-6">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2" style={{ color: 'var(--foreground)' }}>
          Admin - Manage Profiles
        </h1>
        <p className="text-sm sm:text-base" style={{ color: 'var(--foreground-secondary)' }}>
          View and manage all user profiles. Change user roles as needed.
        </p>
      </div>

      {error && (
        <div 
          className="mb-4 rounded-lg px-4 py-3 text-sm"
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

      {success && (
        <div 
          className="mb-4 rounded-lg px-4 py-3 text-sm"
          style={{
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            color: '#10b981',
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: 'rgba(16, 185, 129, 0.2)'
          }}
        >
          {success}
        </div>
      )}

      {profiles.length === 0 ? (
        <div 
          className="rounded-2xl p-8 text-center"
          style={{
            backgroundColor: 'var(--card-bg)',
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: 'var(--card-border)',
          }}
        >
          <p style={{ color: 'var(--foreground-secondary)' }}>No profiles found</p>
        </div>
      ) : (
        <div 
          className="rounded-2xl overflow-hidden"
          style={{
            backgroundColor: 'var(--card-bg)',
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: 'var(--card-border)',
          }}
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottomWidth: '1px', borderBottomColor: 'var(--card-border)' }}>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--foreground-secondary)' }}>
                    Competitor #
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--foreground-secondary)' }}>
                    Username
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--foreground-secondary)' }}>
                    Role
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--foreground-secondary)' }}>
                    Cohort
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--foreground-secondary)' }}>
                    Age Category
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--foreground-secondary)' }}>
                    Junior
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--foreground-secondary)' }}>
                    Phone
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--foreground-secondary)' }}>
                    Created At
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedProfiles.map((profile) => (
                  <tr 
                    key={profile.profile_id}
                    style={{ 
                      borderBottomWidth: '1px', 
                      borderBottomColor: 'var(--card-border)',
                    }}
                    className="hover:bg-opacity-50"
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--button-secondary-hover)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent'
                    }}
                  >
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--foreground)' }}>
                      {profile.competitor_number}
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--foreground)' }}>
                      {profile.username || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={profile.role}
                        onChange={(e) => handleRoleChange(profile.profile_id, e.target.value)}
                        disabled={updating === profile.profile_id}
                        className="rounded-lg px-3 py-1.5 text-sm outline-none transition"
                        style={{
                          backgroundColor: 'var(--input-bg)',
                          color: 'var(--foreground)',
                          borderWidth: '1px',
                          borderStyle: 'solid',
                          borderColor: 'var(--input-border)',
                          cursor: updating === profile.profile_id ? 'not-allowed' : 'pointer',
                          opacity: updating === profile.profile_id ? 0.6 : 1,
                        }}
                        onFocus={(e) => {
                          if (updating !== profile.profile_id) {
                            e.currentTarget.style.borderColor = 'var(--accent)'
                            e.currentTarget.style.boxShadow = `0 0 0 2px var(--accent)`
                          }
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = 'var(--input-border)'
                          e.currentTarget.style.boxShadow = 'none'
                        }}
                      >
                        <option value="climber">Climber</option>
                        <option value="setter">Setter</option>
                        <option value="admin">Admin</option>
                      </select>
                      {updating === profile.profile_id && (
                        <span className="ml-2 text-xs" style={{ color: 'var(--foreground-secondary)' }}>
                          Updating...
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--foreground)' }}>
                      {profile.comp_cohort || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--foreground)' }}>
                      {profile.age_category || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--foreground)' }}>
                      {profile.is_junior ? 'Yes' : 'No'}
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--foreground)' }}>
                      {profile.phone_number || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--foreground-secondary)' }}>
                      {formatDate(profile.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              itemsPerPage={itemsPerPage}
              totalItems={profiles.length}
              showingStart={showingStart}
              showingEnd={showingEnd}
            />
          )}
        </div>
      )}
    </main>
  )
}

