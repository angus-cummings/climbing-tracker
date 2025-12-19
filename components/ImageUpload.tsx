'use client'

import { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase'

type ImageUploadProps = {
  onUploadComplete: (url: string) => void
  currentImageUrl?: string
  disabled?: boolean
}

export function ImageUpload({ onUploadComplete, currentImageUrl, disabled }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(currentImageUrl || null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be smaller than 5MB')
      return
    }

    setError(null)
    setUploading(true)

    try {
      // Create a unique file name
      const fileExt = file.name.split('.').pop() || 'jpg'
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`
      const filePath = `climb-images/${fileName}`

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('climbs')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        throw uploadError
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('climbs')
        .getPublicUrl(filePath)

      setPreview(publicUrl)
      onUploadComplete(publicUrl)
    } catch (err: any) {
      console.error('Upload error:', err)
      setError(err.message || 'Failed to upload image')
    } finally {
      setUploading(false)
    }
  }

  const handleRemove = () => {
    setPreview(null)
    onUploadComplete('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  useEffect(() => {
    // Update preview when currentImageUrl changes
    if (currentImageUrl) {
      setPreview(currentImageUrl)
    }
  }, [currentImageUrl])

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <label className="cursor-pointer">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            disabled={disabled || uploading}
            className="hidden"
          />
          <div 
            className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              backgroundColor: 'var(--accent)',
              color: 'var(--accent-text)',
            }}
            onMouseEnter={(e) => {
              if (!disabled && !uploading) {
                e.currentTarget.style.opacity = '0.9'
              }
            }}
            onMouseLeave={(e) => {
              if (!disabled && !uploading) {
                e.currentTarget.style.opacity = '1'
              }
            }}
          >
            {uploading ? 'Uploading...' : preview ? 'Change photo' : '📷 Choose or take photo'}
          </div>
        </label>

        {preview && (
          <button
            type="button"
            onClick={handleRemove}
            disabled={disabled || uploading}
            className="rounded-lg px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              color: '#ef4444',
              borderWidth: '1px',
              borderStyle: 'solid',
              borderColor: 'rgba(239, 68, 68, 0.4)'
            }}
            onMouseEnter={(e) => !disabled && !uploading && (e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.2)')}
            onMouseLeave={(e) => !disabled && !uploading && (e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)')}
          >
            Remove
          </button>
        )}
      </div>

      {error && (
        <div 
          className="rounded-lg px-3 py-2 text-sm"
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            color: '#ef4444',
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: 'rgba(239, 68, 68, 0.4)'
          }}
        >
          {error}
        </div>
      )}

      {preview && (
        <div 
          className="relative overflow-hidden rounded-lg"
          style={{
            backgroundColor: 'var(--background-secondary)',
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: 'var(--border)',
          }}
        >
          <img
            src={preview}
            alt="Climb preview"
            className="h-48 w-full object-cover"
          />
        </div>
      )}

      <p className="text-xs" style={{ color: 'var(--foreground-secondary)', opacity: 0.7 }}>
        On mobile: Opens camera app. On desktop: Choose file or use camera if available.
      </p>
    </div>
  )
}
