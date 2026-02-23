import type { User } from './api'

const SESSION_KEY = 'sisorchest_user'

const isValidSessionUser = (value: unknown): value is User => {
  if (!value || typeof value !== 'object') return false
  const candidate = value as User
  return Boolean(
    candidate.id &&
    candidate.name &&
    candidate.role &&
    candidate.status &&
    typeof candidate.access_token === 'string' &&
    candidate.access_token.trim().length > 0,
  )
}

const getStoredUser = (): User | null => {
  try {
    const stored = localStorage.getItem(SESSION_KEY)
    if (!stored) return null
    const parsed = JSON.parse(stored) as unknown
    if (!isValidSessionUser(parsed)) {
      localStorage.removeItem(SESSION_KEY)
      return null
    }
    return parsed
  } catch {
    localStorage.removeItem(SESSION_KEY)
    return null
  }
}

let currentUser: User | null = getStoredUser()

export const setCurrentUser = (user: User | null) => {
  if (user && !isValidSessionUser(user)) {
    currentUser = null
    localStorage.removeItem(SESSION_KEY)
    return
  }

  currentUser = user
  if (user) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user))
  } else {
    localStorage.removeItem(SESSION_KEY)
  }
}

export const getCurrentUser = () => currentUser
