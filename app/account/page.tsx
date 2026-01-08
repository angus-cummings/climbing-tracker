'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'
import { useUser } from '../../lib/useUser'

export default function AccountPage() {
  const router = useRouter()
  const { user, loading: userLoading } = useUser()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Redirect if not logged in
  if (!userLoading && !user) {
    router.push('/')
    return null
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    // Validation
    if (!currentPassword) {
      setError('Current password is required')
      return
    }

    if (!newPassword) {
      setError('New password is required')
      return
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match')
      return
    }

    if (currentPassword === newPassword) {
      setError('New password must be different from current password')
      return
    }

    setLoading(true)

    try {
      // Verify current password by attempting to sign in
      if (!user?.email) {
        throw new Error('User email not found')
      }

      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      })

      if (verifyError) {
        setError('Current password is incorrect')
        setLoading(false)
        return
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (updateError) {
        throw updateError
      }

      // Success - clear form and show message
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setSuccess('Password changed successfully!')
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(null), 5000)
    } catch (err: any) {
      setError(err.message || 'Failed to change password')
    } finally {
      setLoading(false)
    }
  }

  if (userLoading) {
    return (
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="text-center" style={{ color: 'var(--foreground-secondary)' }}>
          Loading...
        </div>
      </main>
    )
  }

  return (
    <main className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--foreground)' }}>
          Account Settings
        </h1>
        <p className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>
          Manage your account settings and change your password
        </p>
      </div>

      <div
        className="rounded-lg p-6 mb-6"
        style={{
          backgroundColor: 'var(--card-bg)',
          borderWidth: '1px',
          borderStyle: 'solid',
          borderColor: 'var(--card-border)',
        }}
      >
        <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--foreground)' }}>
          Change Password
        </h2>

        <form onSubmit={handlePasswordChange}>
          <div className="space-y-4">
            <div>
              <label
                className="mb-1.5 block text-sm font-medium"
                style={{ color: 'var(--foreground-secondary)' }}
              >
                Current Password
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter your current password"
                className="w-full rounded-lg px-4 py-2.5 outline-none transition"
                style={{
                  backgroundColor: 'var(--input-bg)',
                  color: 'var(--foreground)',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  borderColor: 'var(--input-border)',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--accent)'
                  e.currentTarget.style.boxShadow = `0 0 0 2px var(--accent)`
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--input-border)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
                disabled={loading}
                autoComplete="current-password"
              />
            </div>

            <div>
              <label
                className="mb-1.5 block text-sm font-medium"
                style={{ color: 'var(--foreground-secondary)' }}
              >
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter your new password (min. 6 characters)"
                className="w-full rounded-lg px-4 py-2.5 outline-none transition"
                style={{
                  backgroundColor: 'var(--input-bg)',
                  color: 'var(--foreground)',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  borderColor: 'var(--input-border)',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--accent)'
                  e.currentTarget.style.boxShadow = `0 0 0 2px var(--accent)`
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--input-border)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
                disabled={loading}
                autoComplete="new-password"
              />
            </div>

            <div>
              <label
                className="mb-1.5 block text-sm font-medium"
                style={{ color: 'var(--foreground-secondary)' }}
              >
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your new password"
                className="w-full rounded-lg px-4 py-2.5 outline-none transition"
                style={{
                  backgroundColor: 'var(--input-bg)',
                  color: 'var(--foreground)',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  borderColor: 'var(--input-border)',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--accent)'
                  e.currentTarget.style.boxShadow = `0 0 0 2px var(--accent)`
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--input-border)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
                disabled={loading}
                autoComplete="new-password"
              />
            </div>

            {error && (
              <div
                className="rounded-lg px-4 py-3 text-sm"
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  color: '#ef4444',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  borderColor: 'rgba(239, 68, 68, 0.2)',
                }}
              >
                {error}
              </div>
            )}

            {success && (
              <div
                className="rounded-lg px-4 py-3 text-sm"
                style={{
                  backgroundColor: 'rgba(34, 197, 94, 0.1)',
                  color: '#22c55e',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  borderColor: 'rgba(34, 197, 94, 0.2)',
                }}
              >
                {success}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg px-4 py-2.5 font-medium transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: 'var(--accent)',
                  color: 'var(--accent-text)',
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.currentTarget.style.backgroundColor = 'var(--accent-hover)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading) {
                    e.currentTarget.style.backgroundColor = 'var(--accent)'
                  }
                }}
              >
                {loading ? 'Changing Password...' : 'Change Password'}
              </button>
              <Link
                href="/climbs"
                className="rounded-lg px-4 py-2.5 font-medium transition-all"
                style={{
                  backgroundColor: 'var(--button-secondary-bg)',
                  color: 'var(--button-secondary-text)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--button-secondary-hover)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--button-secondary-bg)'
                }}
              >
                Cancel
              </Link>
            </div>
          </div>
        </form>
      </div>

      <div
        className="rounded-lg p-6"
        style={{
          backgroundColor: 'var(--card-bg)',
          borderWidth: '1px',
          borderStyle: 'solid',
          borderColor: 'var(--card-border)',
        }}
      >
        <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--foreground)' }}>
          Account Information
        </h2>
        <div className="space-y-2 text-sm">
          <div>
            <span style={{ color: 'var(--foreground-secondary)' }}>Email: </span>
            <span style={{ color: 'var(--foreground)' }}>{user?.email}</span>
          </div>
        </div>
      </div>
    </main>
  )
}

