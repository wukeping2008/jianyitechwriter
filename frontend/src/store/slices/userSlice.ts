import { createSlice, PayloadAction } from '@reduxjs/toolkit'

// Types
export interface UserState {
  currentUser: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  preferences: UserPreferences
}

export interface User {
  id: string
  username: string
  email: string
  fullName: string
  avatar?: string
  role: 'admin' | 'translator' | 'reviewer' | 'user'
  permissions: string[]
  createdAt: number
  lastLoginAt: number
  isActive: boolean
}

export interface UserPreferences {
  language: 'zh' | 'en'
  theme: 'light' | 'dark' | 'auto'
  defaultSourceLanguage: string
  defaultTargetLanguage: string
  autoSave: boolean
  showTerminologyHints: boolean
  enableKeyboardShortcuts: boolean
  translationQuality: 'fast' | 'balanced' | 'accurate'
  notifications: {
    email: boolean
    browser: boolean
    translationComplete: boolean
    systemUpdates: boolean
  }
}

// Initial state
const initialState: UserState = {
  currentUser: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  preferences: {
    language: 'zh',
    theme: 'light',
    defaultSourceLanguage: 'en',
    defaultTargetLanguage: 'zh',
    autoSave: true,
    showTerminologyHints: true,
    enableKeyboardShortcuts: true,
    translationQuality: 'balanced',
    notifications: {
      email: true,
      browser: true,
      translationComplete: true,
      systemUpdates: false,
    },
  },
}

// Slice
const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User>) => {
      state.currentUser = action.payload
      state.isAuthenticated = true
      state.error = null
    },
    clearUser: (state) => {
      state.currentUser = null
      state.isAuthenticated = false
      state.error = null
    },
    updateUser: (state, action: PayloadAction<Partial<User>>) => {
      if (state.currentUser) {
        state.currentUser = {
          ...state.currentUser,
          ...action.payload,
        }
      }
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload
    },
    clearError: (state) => {
      state.error = null
    },
    updatePreferences: (state, action: PayloadAction<Partial<UserPreferences>>) => {
      state.preferences = {
        ...state.preferences,
        ...action.payload,
      }
    },
    updateNotificationPreferences: (state, action: PayloadAction<Partial<UserPreferences['notifications']>>) => {
      state.preferences.notifications = {
        ...state.preferences.notifications,
        ...action.payload,
      }
    },
    setLanguage: (state, action: PayloadAction<'zh' | 'en'>) => {
      state.preferences.language = action.payload
    },
    setTheme: (state, action: PayloadAction<'light' | 'dark' | 'auto'>) => {
      state.preferences.theme = action.payload
    },
    setDefaultLanguages: (state, action: PayloadAction<{ source: string; target: string }>) => {
      state.preferences.defaultSourceLanguage = action.payload.source
      state.preferences.defaultTargetLanguage = action.payload.target
    },
    setTranslationQuality: (state, action: PayloadAction<'fast' | 'balanced' | 'accurate'>) => {
      state.preferences.translationQuality = action.payload
    },
    toggleAutoSave: (state) => {
      state.preferences.autoSave = !state.preferences.autoSave
    },
    toggleTerminologyHints: (state) => {
      state.preferences.showTerminologyHints = !state.preferences.showTerminologyHints
    },
    toggleKeyboardShortcuts: (state) => {
      state.preferences.enableKeyboardShortcuts = !state.preferences.enableKeyboardShortcuts
    },
    updateLastLogin: (state) => {
      if (state.currentUser) {
        state.currentUser.lastLoginAt = Date.now()
      }
    },
  },
})

export const {
  setUser,
  clearUser,
  updateUser,
  setLoading,
  setError,
  clearError,
  updatePreferences,
  updateNotificationPreferences,
  setLanguage,
  setTheme,
  setDefaultLanguages,
  setTranslationQuality,
  toggleAutoSave,
  toggleTerminologyHints,
  toggleKeyboardShortcuts,
  updateLastLogin,
} = userSlice.actions

// Selectors
export const selectIsAuthenticated = (state: { user: UserState }) => state.user.isAuthenticated
export const selectCurrentUser = (state: { user: UserState }) => state.user.currentUser
export const selectUserPreferences = (state: { user: UserState }) => state.user.preferences
export const selectUserRole = (state: { user: UserState }) => state.user.currentUser?.role
export const selectUserPermissions = (state: { user: UserState }) => state.user.currentUser?.permissions || []

export const selectHasPermission = (permission: string) => (state: { user: UserState }) => {
  const permissions = state.user.currentUser?.permissions || []
  return permissions.includes(permission) || state.user.currentUser?.role === 'admin'
}

export const selectCanTranslate = (state: { user: UserState }) => {
  const role = state.user.currentUser?.role
  return role === 'admin' || role === 'translator' || role === 'reviewer'
}

export const selectCanReview = (state: { user: UserState }) => {
  const role = state.user.currentUser?.role
  return role === 'admin' || role === 'reviewer'
}

export const selectCanManageUsers = (state: { user: UserState }) => {
  return state.user.currentUser?.role === 'admin'
}

export default userSlice.reducer
