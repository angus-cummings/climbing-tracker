'use client'

import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import Link from 'next/link'
import { validateEmail, validatePhoneNumber } from '../../lib/validation'

export default function FeedbackPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [feedback, setFeedback] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [phoneError, setPhoneError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setEmailError(null)
    setPhoneError(null)

    // Validate name
    if (!name.trim()) {
      setError('Name is required')
      return
    }

    // Validate email
    const emailValidation = validateEmail(email)
    if (!emailValidation.valid) {
      setEmailError(emailValidation.error || 'Invalid email')
      setError(emailValidation.error || 'Invalid email')
      return
    }

    // Validate phone (optional, but if provided, must be valid)
    if (phone.trim()) {
      const phoneValidation = validatePhoneNumber(phone)
      if (!phoneValidation.valid) {
        setPhoneError(phoneValidation.error || 'Invalid phone number')
        setError(phoneValidation.error || 'Invalid phone number')
        return
      }
    }

    // Validate feedback
    if (!feedback.trim()) {
      setError('Feedback is required')
      return
    }

    setLoading(true)
    const { error: insertError } = await supabase
      .from('feedback')
      .insert({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
        feedback: feedback.trim(),
      })

    setLoading(false)

    if (insertError) {
      setError(insertError.message)
    } else {
      setMessage('Thank you for your feedback!')
      setName('')
      setEmail('')
      setPhone('')
      setFeedback('')
    }
  }

  return (
    <main className="flex min-h-[80vh] items-center justify-center px-4 py-6">
      <div className="w-full max-w-md">
        <div 
          className="rounded-2xl p-6 sm:p-8 shadow-xl"
          style={{
            backgroundColor: 'var(--card-bg)',
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: 'var(--card-border)',
            boxShadow: `0 20px 25px -5px var(--shadow), 0 10px 10px -5px var(--shadow)`
          }}
        >
          <h1 className="mb-2 text-2xl sm:text-3xl font-bold" style={{ color: 'var(--foreground)' }}>
            Feedback
          </h1>
          <p className="mb-6 text-sm sm:text-base" style={{ color: 'var(--foreground-secondary)' }}>
            We'd love to hear your thoughts and suggestions
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label 
                className="mb-1.5 block text-sm font-medium"
                style={{ color: 'var(--foreground-secondary)' }}
              >
                Name <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Your name"
                className="w-full rounded-lg px-4 py-2.5 outline-none transition"
                style={{
                  backgroundColor: 'var(--input-bg)',
                  color: 'var(--foreground)',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  borderColor: emailError ? 'rgba(239, 68, 68, 0.5)' : 'var(--input-border)',
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
              />
            </div>

            <div>
              <label 
                className="mb-1.5 block text-sm font-medium"
                style={{ color: 'var(--foreground-secondary)' }}
              >
                Email <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={e => {
                  setEmail(e.target.value)
                  setEmailError(null)
                }}
                placeholder="your.email@example.com"
                className="w-full rounded-lg px-4 py-2.5 outline-none transition"
                style={{
                  backgroundColor: 'var(--input-bg)',
                  color: 'var(--foreground)',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  borderColor: emailError ? 'rgba(239, 68, 68, 0.5)' : 'var(--input-border)',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--accent)'
                  e.currentTarget.style.boxShadow = `0 0 0 2px var(--accent)`
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = emailError ? 'rgba(239, 68, 68, 0.5)' : 'var(--input-border)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
                disabled={loading}
                autoComplete="email"
              />
              {emailError && (
                <p className="mt-1 text-xs" style={{ color: '#ef4444' }}>
                  {emailError}
                </p>
              )}
            </div>

            <div>
              <label 
                className="mb-1.5 block text-sm font-medium"
                style={{ color: 'var(--foreground-secondary)' }}
              >
                Phone Number <span className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>(optional)</span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={e => {
                  setPhone(e.target.value)
                  setPhoneError(null)
                }}
                placeholder="(555) 123-4567"
                className="w-full rounded-lg px-4 py-2.5 outline-none transition"
                style={{
                  backgroundColor: 'var(--input-bg)',
                  color: 'var(--foreground)',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  borderColor: phoneError ? 'rgba(239, 68, 68, 0.5)' : 'var(--input-border)',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--accent)'
                  e.currentTarget.style.boxShadow = `0 0 0 2px var(--accent)`
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = phoneError ? 'rgba(239, 68, 68, 0.5)' : 'var(--input-border)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
                disabled={loading}
                autoComplete="tel"
              />
              {phoneError && (
                <p className="mt-1 text-xs" style={{ color: '#ef4444' }}>
                  {phoneError}
                </p>
              )}
            </div>

            <div>
              <label 
                className="mb-1.5 block text-sm font-medium"
                style={{ color: 'var(--foreground-secondary)' }}
              >
                Feedback <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <textarea
                value={feedback}
                onChange={e => setFeedback(e.target.value)}
                placeholder="Share your thoughts, suggestions, or report any issues..."
                rows={6}
                className="w-full rounded-lg px-4 py-2.5 outline-none transition resize-none"
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
                  borderColor: 'rgba(239, 68, 68, 0.2)'
                }}
              >
                {error}
              </div>
            )}

            {message && (
              <div 
                className="rounded-lg px-4 py-3 text-sm"
                style={{
                  backgroundColor: 'rgba(34, 197, 94, 0.1)',
                  color: '#22c55e',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  borderColor: 'rgba(34, 197, 94, 0.2)'
                }}
              >
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg px-4 py-2.5 font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
              style={{
                backgroundColor: 'var(--accent)',
                color: 'var(--accent-text)',
              }}
              onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = 'var(--accent-hover)')}
              onMouseLeave={(e) => !loading && (e.currentTarget.style.backgroundColor = 'var(--accent)')}
            >
              {loading ? 'Submitting...' : 'Submit Feedback'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm" style={{ color: 'var(--foreground-secondary)' }}>
            <Link 
              href="/" 
              className="font-medium transition-colors"
              style={{ color: 'var(--accent)' }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
            >
              ← Back to home
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}


