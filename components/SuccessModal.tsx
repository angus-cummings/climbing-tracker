'use client'

import { useEffect } from 'react'

type SuccessModalProps = {
  isOpen: boolean
  onClose: () => void
  message: string
  duration?: number // Duration in milliseconds
}

export function SuccessModal({ 
  isOpen, 
  onClose, 
  message,
  duration = 2000 
}: SuccessModalProps) {
  // Auto-close after duration
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        onClose()
      }, duration)

      return () => clearTimeout(timer)
    }
  }, [isOpen, duration, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        backdropFilter: 'blur(2px)',
      }}
    >
      <div
        className="rounded-2xl p-6 max-w-sm w-full mx-4 pointer-events-auto"
        style={{
          backgroundColor: 'var(--card-bg)',
          borderWidth: '1px',
          borderStyle: 'solid',
          borderColor: 'rgba(16, 185, 129, 0.3)',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
          animation: 'fadeIn 0.2s ease-in-out, slideUp 0.3s ease-out',
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
            style={{
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
            }}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              style={{ color: '#10b981' }}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <p className="text-sm font-medium flex-1" style={{ color: 'var(--foreground)' }}>
            {message}
          </p>
        </div>
      </div>
    </div>
  )
}

