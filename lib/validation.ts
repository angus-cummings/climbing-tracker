// Validation utility functions

/**
 * Validates email format
 */
export function validateEmail(email: string): { valid: boolean; error?: string } {
  if (!email || email.trim() === '') {
    return { valid: false, error: 'Email is required' }
  }

  // Basic email regex pattern
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Please enter a valid email address' }
  }

  // Check for common typos
  if (email.includes('..')) {
    return { valid: false, error: 'Email cannot contain consecutive dots' }
  }

  if (email.startsWith('.') || email.endsWith('.')) {
    return { valid: false, error: 'Email cannot start or end with a dot' }
  }

  return { valid: true }
}

/**
 * Validates phone number format
 * Accepts various formats: +1 (555) 123-4567, 555-123-4567, 5551234567, etc.
 */
export function validatePhoneNumber(phone: string): { valid: boolean; error?: string } {
  if (!phone || phone.trim() === '') {
    return { valid: false, error: 'Phone number is required' }
  }

  // Remove all non-digit characters except + at the start
  const cleaned = phone.replace(/[^\d+]/g, '')
  
  // Check if it starts with + and has country code, or is just digits
  const hasCountryCode = cleaned.startsWith('+')
  const digitsOnly = cleaned.replace('+', '')
  
  // Must have at least 10 digits (US format) or 7-15 digits (international)
  if (digitsOnly.length < 10 || digitsOnly.length > 15) {
    return { valid: false, error: 'Phone number must be between 10 and 15 digits' }
  }

  // Check for valid characters (digits, spaces, dashes, parentheses, plus)
  const phoneRegex = /^[\+]?[\d\s\-\(\)]+$/
  if (!phoneRegex.test(phone)) {
    return { valid: false, error: 'Phone number contains invalid characters' }
  }

  return { valid: true }
}

/**
 * Validates profile name
 * - Must be between 2 and 100 characters
 * - Can contain letters, spaces, hyphens, apostrophes
 * - Cannot be only spaces or special characters
 */
export function validateProfileName(name: string): { valid: boolean; error?: string } {
  if (!name || name.trim() === '') {
    return { valid: false, error: 'Name is required' }
  }

  const trimmed = name.trim()

  if (trimmed.length < 2) {
    return { valid: false, error: 'Name must be at least 2 characters long' }
  }

  if (trimmed.length > 100) {
    return { valid: false, error: 'Name must be less than 100 characters' }
  }

  // Allow letters, spaces, hyphens, apostrophes, and common name characters
  // This regex allows Unicode letters (for international names)
  const nameRegex = /^[\p{L}\s\-'\.]+$/u
  
  if (!nameRegex.test(trimmed)) {
    return { valid: false, error: 'Name can only contain letters, spaces, hyphens, apostrophes, and periods' }
  }

  // Check that it's not only spaces or special characters
  const lettersOnly = trimmed.replace(/[\s\-'\.]/g, '')
  if (lettersOnly.length === 0) {
    return { valid: false, error: 'Name must contain at least one letter' }
  }

  return { valid: true }
}

/**
 * Validates competitor number
 * - Must be a positive integer
 * - Must be greater than 0
 */
export function validateCompetitorNumber(competitorNumber: string): { valid: boolean; error?: string } {
  if (!competitorNumber || competitorNumber.trim() === '') {
    return { valid: false, error: 'Competitor number is required' }
  }

  const trimmed = competitorNumber.trim()
  
  // Check if it's a valid integer
  const num = parseInt(trimmed, 10)
  
  if (isNaN(num)) {
    return { valid: false, error: 'Competitor number must be a valid number' }
  }

  // Check if it's positive
  if (num <= 0) {
    return { valid: false, error: 'Competitor number must be a positive integer' }
  }

  // Check if it's a whole number (no decimals)
  if (parseFloat(trimmed) !== num) {
    return { valid: false, error: 'Competitor number must be a whole number' }
  }

  // Check for reasonable upper limit (e.g., 999999)
  if (num > 999999) {
    return { valid: false, error: 'Competitor number is too large' }
  }

  return { valid: true }
}

