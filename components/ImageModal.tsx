'use client'

import { useEffect, useState, useRef } from 'react'

type ImageModalProps = {
  imageUrl: string | null
  onClose: () => void
  alt?: string
}

export function ImageModal({ imageUrl, onClose, alt = 'Image' }: ImageModalProps) {
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [lastTouchDistance, setLastTouchDistance] = useState<number | null>(null)
  const [imageBaseSize, setImageBaseSize] = useState<{ width: number; height: number } | null>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const imageContainerRef = useRef<HTMLDivElement>(null)

  // Measure base image size when image loads and scale is 1
  useEffect(() => {
    if (!imageUrl || scale !== 1) return
    
    const measureBaseSize = () => {
      if (imageRef.current && imageContainerRef.current) {
        const imgRect = imageRef.current.getBoundingClientRect()
        if (imgRect.width > 0 && imgRect.height > 0) {
          setImageBaseSize({ width: imgRect.width, height: imgRect.height })
        }
      }
    }
    
    // Small delay to ensure image is rendered
    const timeout = setTimeout(measureBaseSize, 50)
    return () => clearTimeout(timeout)
  }, [imageUrl, scale])

  // Calculate pan boundaries based on image dimensions and scale
  const getPanBounds = () => {
    if (!imageContainerRef.current || scale <= 1 || !imageBaseSize) {
      return { minX: 0, maxX: 0, minY: 0, maxY: 0 }
    }

    const container = imageContainerRef.current
    const containerRect = container.getBoundingClientRect()
    const containerWidth = containerRect.width
    const containerHeight = containerRect.height
    
    // Calculate scaled dimensions
    const scaledWidth = imageBaseSize.width * scale
    const scaledHeight = imageBaseSize.height * scale
    
    // Calculate how much the image extends beyond the container
    // This is the maximum we can pan in each direction
    const overflowX = Math.max(0, (scaledWidth - containerWidth) / 2)
    const overflowY = Math.max(0, (scaledHeight - containerHeight) / 2)
    
    return {
      minX: -overflowX,
      maxX: overflowX,
      minY: -overflowY,
      maxY: overflowY,
    }
  }

  // Constrain position to bounds
  const constrainPosition = (pos: { x: number; y: number }) => {
    const bounds = getPanBounds()
    return {
      x: Math.max(bounds.minX, Math.min(bounds.maxX, pos.x)),
      y: Math.max(bounds.minY, Math.min(bounds.maxY, pos.y)),
    }
  }

  // Reset zoom and position when image changes
  useEffect(() => {
    if (imageUrl) {
      setScale(1)
      setPosition({ x: 0, y: 0 })
      setImageBaseSize(null)
    }
  }, [imageUrl])

  // Update position constraints when scale or imageBaseSize changes
  useEffect(() => {
    if (scale > 1 && imageBaseSize) {
      setPosition(prev => constrainPosition(prev))
    } else if (scale <= 1) {
      setPosition({ x: 0, y: 0 })
    }
  }, [scale, imageBaseSize])

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (imageUrl) {
      document.body.style.overflow = 'hidden'
      // Prevent browser zoom on trackpad pinch
      const preventZoom = (e: WheelEvent) => {
        if (e.ctrlKey) {
          e.preventDefault()
        }
      }
      window.addEventListener('wheel', preventZoom, { passive: false })
      return () => {
        document.body.style.overflow = 'unset'
        window.removeEventListener('wheel', preventZoom)
      }
    }
  }, [imageUrl])

  // Handle wheel zoom (including trackpad pinch with ctrlKey)
  const handleWheel = (e: React.WheelEvent) => {
    if (!imageUrl) return
    
    // Handle trackpad pinch (ctrlKey indicates pinch gesture)
    if (e.ctrlKey) {
      e.preventDefault()
      e.stopPropagation()
      
      const delta = -e.deltaY * 0.01
      const newScale = Math.max(0.5, Math.min(3, scale * (1 + delta)))
      
      if (newScale !== scale) {
        setScale(newScale)
        // Reset position when zooming out to fit
        if (newScale <= 1) {
          setPosition({ x: 0, y: 0 })
        } else {
          // Constrain position after zoom
          setPosition(prev => constrainPosition(prev))
        }
      }
      return
    }
    
    // Regular wheel zoom
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    const newScale = Math.max(0.5, Math.min(3, scale + delta))
    
    if (newScale !== scale) {
      setScale(newScale)
      if (newScale <= 1) {
        setPosition({ x: 0, y: 0 })
      } else {
        setPosition(prev => constrainPosition(prev))
      }
    }
  }

  // Handle touch pinch zoom
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault()
      e.stopPropagation()
      const touch1 = e.touches[0]
      const touch2 = e.touches[1]
      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      )
      setLastTouchDistance(distance)
    } else if (e.touches.length === 1 && scale > 1) {
      e.preventDefault()
      setIsDragging(true)
      setDragStart({ x: e.touches[0].clientX - position.x, y: e.touches[0].clientY - position.y })
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault()
      e.stopPropagation()
      const touch1 = e.touches[0]
      const touch2 = e.touches[1]
      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      )
      
      if (lastTouchDistance !== null) {
        const scaleChange = distance / lastTouchDistance
        const newScale = Math.max(0.5, Math.min(3, scale * scaleChange))
        
        if (newScale !== scale) {
          setScale(newScale)
          if (newScale <= 1) {
            setPosition({ x: 0, y: 0 })
          } else {
            setPosition(prev => constrainPosition(prev))
          }
        }
      }
      setLastTouchDistance(distance)
    } else if (e.touches.length === 1 && isDragging) {
      e.preventDefault()
      e.stopPropagation()
      const newPos = {
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y
      }
      setPosition(constrainPosition(newPos))
    }
  }

  const handleTouchEnd = () => {
    setIsDragging(false)
    setLastTouchDistance(null)
  }

  // Handle mouse drag
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      e.preventDefault()
      setIsDragging(true)
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y })
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      e.preventDefault()
      const newPos = {
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      }
      setPosition(constrainPosition(newPos))
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  // Handle double-click to zoom
  const handleDoubleClick = () => {
    if (scale === 1) {
      setScale(2)
    } else {
      setScale(1)
      setPosition({ x: 0, y: 0 })
    }
  }

  // Reset zoom
  const handleResetZoom = () => {
    setScale(1)
    setPosition({ x: 0, y: 0 })
  }

  if (!imageUrl) return null

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        backdropFilter: 'blur(4px)',
        touchAction: 'none',
      }}
      onClick={(e) => {
        // Close if clicking on the backdrop (container), but not on the image or its container
        const target = e.target as HTMLElement
        if (
          target === containerRef.current ||
          (imageContainerRef.current && !imageContainerRef.current.contains(target))
        ) {
          onClose()
        }
      }}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 rounded-full p-2 transition"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          color: '#fff',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'
        }}
        aria-label="Close"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>

      {/* Reset zoom button (shown when zoomed) */}
      {scale !== 1 && (
        <button
          onClick={handleResetZoom}
          className="absolute top-4 left-4 z-10 rounded-lg px-3 py-2 text-sm font-medium transition"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            color: '#fff',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'
          }}
        >
          Reset Zoom
        </button>
      )}

      {/* Image container */}
      <div
        ref={imageContainerRef}
        className="relative w-full h-full flex items-center justify-center overflow-hidden pointer-events-none"
        style={{
          touchAction: 'none',
        }}
      >
        <div
          style={{
            transform: `translate(${position.x}px, ${position.y}px)`,
            transition: isDragging ? 'none' : 'transform 0.1s ease-out',
            touchAction: 'none',
            pointerEvents: 'auto',
          }}
          onDoubleClick={handleDoubleClick}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <img
            ref={imageRef}
            src={imageUrl}
            alt={alt}
            className="max-w-full max-h-[90vh] object-contain select-none"
            style={{
              transform: `scale(${scale})`,
              transformOrigin: 'center center',
              transition: isDragging ? 'none' : 'transform 0.1s ease-out',
              cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in',
            }}
            draggable={false}
          />
        </div>
      </div>

      {/* Zoom hint */}
      {scale === 1 && (
        <div
          className="absolute bottom-4 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded-lg text-sm"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            color: '#fff',
          }}
        >
          Double-click or scroll to zoom • Click outside to close
        </div>
      )}
    </div>
  )
}
