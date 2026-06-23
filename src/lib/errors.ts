import type { AuthError } from '@supabase/supabase-js'

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  invalid_credentials: 'Invalid email or password.',
  email_not_confirmed: 'Please confirm your email before signing in.',
  user_already_registered: 'An account with this email already exists.',
  weak_password: 'Password must be at least 6 characters.',
  over_request_rate_limit: 'Too many attempts. Please wait and try again.',
}

export function getAuthErrorMessage(error: AuthError | Error): string {
  if ('code' in error && error.code && AUTH_ERROR_MESSAGES[error.code]) {
    return AUTH_ERROR_MESSAGES[error.code]
  }

  const message = error.message.toLowerCase()

  if (message.includes('invalid login credentials')) {
    return AUTH_ERROR_MESSAGES.invalid_credentials
  }

  if (message.includes('email not confirmed')) {
    return AUTH_ERROR_MESSAGES.email_not_confirmed
  }

  if (message.includes('user already registered')) {
    return AUTH_ERROR_MESSAGES.user_already_registered
  }

  return error.message || 'Something went wrong. Please try again.'
}
