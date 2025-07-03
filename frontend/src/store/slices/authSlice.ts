import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { authAPI } from '../../services/authApi'

// 类型定义
export interface User {
  _id: string
  username: string
  email: string
  fullName: string
  role: 'admin' | 'translator' | 'reviewer' | 'user'
  permissions: string[]
  avatar?: string
  organization: string
  department?: string
  jobTitle?: string
  preferences: {
    language: 'zh' | 'en'
    theme: 'light' | 'dark' | 'auto'
    defaultSourceLanguage: string
    defaultTargetLanguage: string
    translationQuality: 'fast' | 'balanced' | 'accurate'
    autoSave: boolean
    showTerminologyHints: boolean
    enableKeyboardShortcuts: boolean
    notifications: {
      email: boolean
      browser: boolean
      translationComplete: boolean
      documentGenerated: boolean
      systemUpdates: boolean
    }
  }
  statistics: {
    documentsTranslated: number
    documentsGenerated: number
    wordsTranslated: number
    projectsCompleted: number
    lastActiveAt: string
  }
  isActive: boolean
  isEmailVerified: boolean
  createdAt: string
  updatedAt: string
  lastLoginAt: string
}

export interface AuthState {
  user: User | null
  token: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  loading: boolean
  error: string | null
  loginAttempts: number
  lastLoginAttempt: number | null
}

// 登录参数
export interface LoginCredentials {
  email: string
  password: string
  rememberMe?: boolean
}

// 注册参数
export interface RegisterCredentials {
  username: string
  email: string
  password: string
  fullName: string
  confirmPassword?: string
}

// 更新资料参数
export interface UpdateProfileData {
  username?: string
  fullName?: string
  department?: string
  jobTitle?: string
  preferences?: Partial<User['preferences']>
}

// 修改密码参数
export interface ChangePasswordData {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

// 初始状态
const initialState: AuthState = {
  user: null,
  token: localStorage.getItem('token'),
  refreshToken: localStorage.getItem('refreshToken'),
  isAuthenticated: !!localStorage.getItem('token'),
  loading: false,
  error: null,
  loginAttempts: 0,
  lastLoginAttempt: null
}

// 异步操作

// 用户登录
export const loginUser = createAsyncThunk(
  'auth/login',
  async (credentials: LoginCredentials, { rejectWithValue }) => {
    try {
      const response = await authAPI.login(credentials)
      
      // 存储token
      localStorage.setItem('token', response.data.token)
      localStorage.setItem('refreshToken', response.data.refreshToken)
      
      // 设置API默认header
      authAPI.setAuthToken(response.data.token)
      
      return response.data
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || '登录失败')
    }
  }
)

// 用户注册
export const registerUser = createAsyncThunk(
  'auth/register',
  async (credentials: RegisterCredentials, { rejectWithValue }) => {
    try {
      const response = await authAPI.register(credentials)
      
      // 存储token
      localStorage.setItem('token', response.data.token)
      localStorage.setItem('refreshToken', response.data.refreshToken)
      
      // 设置API默认header
      authAPI.setAuthToken(response.data.token)
      
      return response.data
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || '注册失败')
    }
  }
)

// 获取当前用户信息
export const getCurrentUser = createAsyncThunk(
  'auth/getCurrentUser',
  async (_, { rejectWithValue }) => {
    try {
      const response = await authAPI.getCurrentUser()
      return response.data.user
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || '获取用户信息失败')
    }
  }
)

// 更新用户资料
export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async (data: UpdateProfileData, { rejectWithValue }) => {
    try {
      const response = await authAPI.updateProfile(data)
      return response.data.user
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || '更新资料失败')
    }
  }
)

// 修改密码
export const changePassword = createAsyncThunk(
  'auth/changePassword',
  async (data: ChangePasswordData, { rejectWithValue }) => {
    try {
      await authAPI.changePassword(data)
      return '密码修改成功'
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || '密码修改失败')
    }
  }
)

// 忘记密码
export const forgotPassword = createAsyncThunk(
  'auth/forgotPassword',
  async (email: string, { rejectWithValue }) => {
    try {
      const response = await authAPI.forgotPassword(email)
      return response.data.message
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || '发送重置邮件失败')
    }
  }
)

// 重置密码
export const resetPassword = createAsyncThunk(
  'auth/resetPassword',
  async ({ token, newPassword }: { token: string; newPassword: string }, { rejectWithValue }) => {
    try {
      const response = await authAPI.resetPassword(token, newPassword)
      return response.data.message
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || '密码重置失败')
    }
  }
)

// 刷新Token
export const refreshToken = createAsyncThunk(
  'auth/refreshToken',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { auth: AuthState }
      const refreshToken = state.auth.refreshToken
      
      if (!refreshToken) {
        throw new Error('没有刷新令牌')
      }
      
      const response = await authAPI.refreshToken(refreshToken)
      
      // 更新存储的token
      localStorage.setItem('token', response.data.token)
      localStorage.setItem('refreshToken', response.data.refreshToken)
      
      // 设置API默认header
      authAPI.setAuthToken(response.data.token)
      
      return response.data
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || '刷新令牌失败')
    }
  }
)

// 登出
export const logoutUser = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await authAPI.logout()
      
      // 清除本地存储
      localStorage.removeItem('token')
      localStorage.removeItem('refreshToken')
      
      // 清除API默认header
      authAPI.setAuthToken(null)
      
      return null
    } catch (error: any) {
      // 即使API调用失败，也要清除本地数据
      localStorage.removeItem('token')
      localStorage.removeItem('refreshToken')
      authAPI.setAuthToken(null)
      
      return rejectWithValue(error.response?.data?.message || '登出失败')
    }
  }
)

// 创建slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // 清除错误
    clearError: (state) => {
      state.error = null
    },
    
    // 清除认证状态
    clearAuth: (state) => {
      state.user = null
      state.token = null
      state.refreshToken = null
      state.isAuthenticated = false
      state.error = null
      localStorage.removeItem('token')
      localStorage.removeItem('refreshToken')
      authAPI.setAuthToken(null)
    },
    
    // 设置加载状态
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload
    },
    
    // 更新用户信息
    updateUser: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload }
      }
    },
    
    // 增加登录尝试次数
    incrementLoginAttempts: (state) => {
      state.loginAttempts += 1
      state.lastLoginAttempt = Date.now()
    },
    
    // 重置登录尝试次数
    resetLoginAttempts: (state) => {
      state.loginAttempts = 0
      state.lastLoginAttempt = null
    }
  },
  extraReducers: (builder) => {
    // 登录
    builder
      .addCase(loginUser.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false
        state.user = action.payload.user
        state.token = action.payload.token
        state.refreshToken = action.payload.refreshToken
        state.isAuthenticated = true
        state.error = null
        state.loginAttempts = 0
        state.lastLoginAttempt = null
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
        state.loginAttempts += 1
        state.lastLoginAttempt = Date.now()
      })
    
    // 注册
    builder
      .addCase(registerUser.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.loading = false
        state.user = action.payload.user
        state.token = action.payload.token
        state.refreshToken = action.payload.refreshToken
        state.isAuthenticated = true
        state.error = null
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
    
    // 获取当前用户
    builder
      .addCase(getCurrentUser.pending, (state) => {
        state.loading = true
      })
      .addCase(getCurrentUser.fulfilled, (state, action) => {
        state.loading = false
        state.user = action.payload
        state.isAuthenticated = true
        state.error = null
      })
      .addCase(getCurrentUser.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
        // 如果获取用户信息失败，可能token已过期
        if (action.payload === '访问令牌已过期' || action.payload === '访问令牌无效') {
          state.user = null
          state.token = null
          state.refreshToken = null
          state.isAuthenticated = false
          localStorage.removeItem('token')
          localStorage.removeItem('refreshToken')
          authAPI.setAuthToken(null)
        }
      })
    
    // 更新资料
    builder
      .addCase(updateProfile.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.loading = false
        state.user = action.payload
        state.error = null
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
    
    // 修改密码
    builder
      .addCase(changePassword.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(changePassword.fulfilled, (state) => {
        state.loading = false
        state.error = null
      })
      .addCase(changePassword.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
    
    // 刷新Token
    builder
      .addCase(refreshToken.fulfilled, (state, action) => {
        state.token = action.payload.token
        state.refreshToken = action.payload.refreshToken
        state.error = null
      })
      .addCase(refreshToken.rejected, (state) => {
        // 刷新失败，清除认证状态
        state.user = null
        state.token = null
        state.refreshToken = null
        state.isAuthenticated = false
        localStorage.removeItem('token')
        localStorage.removeItem('refreshToken')
        authAPI.setAuthToken(null)
      })
    
    // 登出
    builder
      .addCase(logoutUser.pending, (state) => {
        state.loading = true
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.loading = false
        state.user = null
        state.token = null
        state.refreshToken = null
        state.isAuthenticated = false
        state.error = null
        state.loginAttempts = 0
        state.lastLoginAttempt = null
      })
      .addCase(logoutUser.rejected, (state) => {
        // 即使登出失败，也要清除本地状态
        state.loading = false
        state.user = null
        state.token = null
        state.refreshToken = null
        state.isAuthenticated = false
        state.loginAttempts = 0
        state.lastLoginAttempt = null
      })
  }
})

// 导出actions
export const {
  clearError,
  clearAuth,
  setLoading,
  updateUser,
  incrementLoginAttempts,
  resetLoginAttempts
} = authSlice.actions

// 选择器
export const selectAuth = (state: { auth: AuthState }) => state.auth
export const selectUser = (state: { auth: AuthState }) => state.auth.user
export const selectIsAuthenticated = (state: { auth: AuthState }) => state.auth.isAuthenticated
export const selectAuthLoading = (state: { auth: AuthState }) => state.auth.loading
export const selectAuthError = (state: { auth: AuthState }) => state.auth.error

// 导出reducer
export default authSlice.reducer
