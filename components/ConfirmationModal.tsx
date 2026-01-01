'use client'

import { useEffect, useRef } from 'react'

type ConfirmationModalProps = {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel'
}: ConfirmationModalProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = 'unset'
      }
    }
  }, [isOpen])

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleConfirm = () => {
    onConfirm()
    onClose()
  }

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(4px)',
      }}
      onClick={(e) => {
        if (e.target === containerRef.current) {
          onClose()
        }
      }}
    >
      <div
        className="rounded-2xl p-6 max-w-md w-full mx-4"
        style={{
          backgroundColor: 'var(--card-bg)',
          borderWidth: '1px',
          borderStyle: 'solid',
          borderColor: 'var(--card-border)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--foreground)' }}>
          {title}
        </h3>
        <p className="text-sm mb-6" style={{ color: 'var(--foreground-secondary)' }}>
          {message}
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium transition"
            style={{
              backgroundColor: 'var(--button-secondary-bg)',
              color: 'var(--button-secondary-text)',
              borderWidth: '1px',
              borderStyle: 'solid',
              borderColor: 'var(--border)',
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--button-secondary-hover)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--button-secondary-bg)'}
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            className="rounded-lg px-4 py-2 text-sm font-medium transition"
            style={{
              backgroundColor: '#dc2626',
              color: '#fff',
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#b91c1c'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

