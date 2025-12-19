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
  const [showCamera, setShowCamera] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    await handleFileUpload(file)
  }

  const handleRemove = () => {
    setPreview(null)
    onUploadComplete('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    stopCamera()
  }

  const startCamera = async () => {
    try {
      setCameraError(null)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' } // Prefer back camera on mobile
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        setShowCamera(true)
      }
    } catch (err: any) {
      console.error('Camera error:', err)
      setCameraError(err.message || 'Failed to access camera. Please check permissions.')
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setShowCamera(false)
  }

  const capturePhoto = () => {
    if (!videoRef.current) return

    const canvas = document.createElement('canvas')
    canvas.width = videoRef.current.videoWidth
    canvas.height = videoRef.current.videoHeight
    const ctx = canvas.getContext('2d')
    
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0)
      canvas.toBlob(async (blob) => {
        if (blob) {
          stopCamera()
          // Convert blob to File
          const file = new File([blob], `camera_${Date.now()}.jpg`, { type: 'image/jpeg' })
          await handleFileUpload(file)
        }
      }, 'image/jpeg', 0.9)
    }
  }

  const handleFileUpload = async (file: File) => {
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

  useEffect(() => {
    // Cleanup camera stream on unmount
    return () => {
      stopCamera()
    }
  }, [])

  useEffect(() => {
    // Update preview when currentImageUrl changes
    if (currentImageUrl) {
      setPreview(currentImageUrl)
    }
  }, [currentImageUrl])

  return (
    <div className="space-y-3">
      {!showCamera ? (
        <div className="flex items-center gap-3 flex-wrap">
          <label className="cursor-pointer">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              disabled={disabled || uploading}
              className="hidden"
            />
            <div 
              className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50"
              style={{
                backgroundColor: 'var(--button-secondary-bg)',
                color: 'var(--button-secondary-text)',
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: 'var(--border)',
              }}
              onMouseEnter={(e) => {
                if (!disabled && !uploading) {
                  e.currentTarget.style.backgroundColor = 'var(--button-secondary-hover)'
                  e.currentTarget.style.borderColor = 'var(--accent)'
                }
              }}
              onMouseLeave={(e) => {
                if (!disabled && !uploading) {
                  e.currentTarget.style.backgroundColor = 'var(--button-secondary-bg)'
                  e.currentTarget.style.borderColor = 'var(--border)'
                }
              }}
            >
              {uploading ? 'Uploading...' : preview ? 'Change image' : 'Choose image'}
            </div>
          </label>

          <button
            type="button"
            onClick={startCamera}
            disabled={disabled || uploading}
            className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              backgroundColor: 'var(--accent)',
              color: 'var(--accent-text)',
            }}
            onMouseEnter={(e) => !disabled && !uploading && (e.currentTarget.style.opacity = '0.9')}
            onMouseLeave={(e) => !disabled && !uploading && (e.currentTarget.style.opacity = '1')}
          >
            📷 Take Photo
          </button>

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
      ) : (
        <div className="space-y-3">
          <div 
            className="relative overflow-hidden rounded-lg"
            style={{
              backgroundColor: 'var(--background-secondary)',
              borderWidth: '1px',
              borderStyle: 'solid',
              borderColor: 'var(--border)',
            }}
          >
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-auto max-h-96"
              style={{ display: 'block' }}
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={capturePhoto}
              disabled={disabled || uploading}
              className="flex-1 rounded-lg px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
              style={{
                backgroundColor: 'var(--accent)',
                color: 'var(--accent-text)',
              }}
              onMouseEnter={(e) => !disabled && !uploading && (e.currentTarget.style.opacity = '0.9')}
              onMouseLeave={(e) => !disabled && !uploading && (e.currentTarget.style.opacity = '1')}
            >
              📸 Capture
            </button>
            <button
              type="button"
              onClick={stopCamera}
              disabled={disabled || uploading}
              className="rounded-lg px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50"
              style={{
                backgroundColor: 'var(--button-secondary-bg)',
                color: 'var(--button-secondary-text)',
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: 'var(--border)',
              }}
              onMouseEnter={(e) => !disabled && !uploading && (e.currentTarget.style.backgroundColor = 'var(--button-secondary-hover)')}
              onMouseLeave={(e) => !disabled && !uploading && (e.currentTarget.style.backgroundColor = 'var(--button-secondary-bg)')}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {(error || cameraError) && (
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
          {error || cameraError}
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
        Accepted formats: JPG, PNG, WebP, GIF (max 5MB)
      </p>
    </div>
  )
}
