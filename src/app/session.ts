import type { User } from './api'

let currentUser: User | null = null

export const setCurrentUser = (user: User | null) => {
  currentUser = user
}

export const getCurrentUser = () => currentUser
